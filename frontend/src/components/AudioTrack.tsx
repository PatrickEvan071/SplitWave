import * as Tone from 'tone';
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Volume2, VolumeX, Download } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { masterBus } from '../lib/audioengine';

export interface TrackRef {
  setTime: (time: number) => void;
  resetFader: () => void;
  getDb: () => number;
  getMuted: () => boolean;
  resetMute: () => void;
}

export interface TrackProps {
  title: string;
  color: string;
  audioUrl?: string;
  isPlaying: boolean;
  isGlobalSoloActive: boolean;
  isThisTrackSoloed: boolean;
  masterVolumeDb: number; 
  playbackRate: number;   
  onToggleSolo: () => void;
  onSeek: (time: number) => void; 
  onTimeUpdate?: (time: number, duration: number) => void;
  onExportRaw: () => void; 
}

export const AudioTrack = forwardRef<TrackRef, TrackProps>(({ 
  title, 
  color, 
  audioUrl, 
  isPlaying,
  isGlobalSoloActive,
  isThisTrackSoloed,
  masterVolumeDb,
  playbackRate,
  onToggleSolo,
  onSeek,
  onTimeUpdate,
  onExportRaw
}, ref) => {
  const [isMuted, setIsMuted] = useState(false);
  const [trackDb, setTrackDb] = useState(0); 
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  const gainNodeRef = useRef<Tone.Gain | null>(null);
  const sourceConnected = useRef(false);

  useImperativeHandle(ref, () => ({
    setTime: (time: number) => { if (wavesurfer.current) wavesurfer.current.setTime(time); },
    resetFader: () => setTrackDb(0),
    getDb: () => trackDb,
    getMuted: () => isMuted,
    resetMute: () => setIsMuted(false)
  }));

  useEffect(() => {
    if (!wavesurfer.current) return;
    wavesurfer.current.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    if (!waveformRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: color,
      progressColor: '#ffffff',
      height: 48,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      cursorWidth: 2,
      cursorColor: '#ffffff',
      dragToSeek: true,
    });
    
    wavesurfer.current = ws;

    ws.on('ready', () => {
      const mediaElement = ws.getMediaElement();
      
      if (!sourceConnected.current) {
        const gainNode = new Tone.Gain(1);
        gainNodeRef.current = gainNode;

        try {
          // @ts-ignore
          const source = Tone.context.createMediaElementSource(mediaElement);
          Tone.connect(source, gainNode);
          gainNode.connect(masterBus);
          
          sourceConnected.current = true;
        } catch (e) {
          console.warn("Audio routing already established for this node.");
        }
      }
    });

    if (audioUrl) {
      ws.load(audioUrl);
    }

    return () => {
      ws.destroy();
    };
  }, [color, audioUrl]);

  useEffect(() => {
    if (!wavesurfer.current) return;
    if (isPlaying) {
      Tone.start(); 
      wavesurfer.current.play();
    } else {
      wavesurfer.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const isMutedBySolo = isGlobalSoloActive && !isThisTrackSoloed;
    const shouldBeSilent = isMuted || isMutedBySolo || trackDb === -60 || masterVolumeDb === -60;
    
    const combinedDb = trackDb + masterVolumeDb;
    const finalGainMultiplier = shouldBeSilent ? 0 : Math.pow(10, combinedDb / 20);

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.rampTo(finalGainMultiplier, 0.1);
    } 
  }, [trackDb, masterVolumeDb, isMuted, isGlobalSoloActive, isThisTrackSoloed]);

  useEffect(() => {
    if (!wavesurfer.current) return;
    
    const ws = wavesurfer.current;
    const handleInteraction = (newTime: number) => onSeek(newTime);
    const handleTimeUpdate = (currentTime: number) => {
      if (onTimeUpdate) onTimeUpdate(currentTime, ws.getDuration());
    };

    ws.on('interaction', handleInteraction);
    if (onTimeUpdate) ws.on('timeupdate', handleTimeUpdate);

    return () => {
      ws.un('interaction', handleInteraction);
      if (onTimeUpdate) ws.un('timeupdate', handleTimeUpdate);
    };
  }, [onSeek, onTimeUpdate]);


  return (
    <div className="flex items-center gap-6 bg-zinc-900 p-4 rounded-xl mb-4 border border-zinc-800">
      <div className="w-24">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          disabled={!audioUrl}
          className={`px-3 py-1 text-xs font-bold rounded transition-colors ${!audioUrl ? 'opacity-50 cursor-not-allowed' : ''} ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          M
        </button>
        <button 
          onClick={onToggleSolo} 
          disabled={!audioUrl}
          className={`px-3 py-1 text-xs font-bold rounded transition-colors ${!audioUrl ? 'opacity-50 cursor-not-allowed' : ''} ${isThisTrackSoloed ? 'bg-yellow-500/20 text-yellow-500' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          S
        </button>
        <button 
          onClick={onExportRaw} 
          disabled={!audioUrl}
          title="Export Raw Stem"
          className={`px-3 py-1 flex items-center justify-center rounded transition-colors ${!audioUrl ? 'opacity-50 cursor-not-allowed' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          <Download size={14} />
        </button>
      </div>

      <div className="flex items-center gap-3 w-56">
        {isMuted || (isGlobalSoloActive && !isThisTrackSoloed) || trackDb === -60 ? (
          <VolumeX size={16} className="text-zinc-600" />
        ) : (
          <Volume2 size={16} className={trackDb > 0 ? "text-red-400" : "text-zinc-400"} />
        )}
        
        <div className="relative flex-1 flex items-center group">
          <input 
            type="range" min="-60" max="12" step="1" 
            value={trackDb} 
            onChange={(e) => setTrackDb(parseInt(e.target.value))} 
            disabled={!audioUrl}
            className={`w-full h-1 bg-zinc-700 rounded-lg appearance-none relative z-10 accent-white ${!audioUrl ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} 
          />
          <div className="absolute left-[83.33%] w-[2px] h-3 bg-zinc-500 -mt-[1px] rounded z-0 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="w-14 text-right">
          <span className={`text-xs font-mono font-bold ${trackDb > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
            {trackDb === -60 ? '-INF' : `${trackDb > 0 ? '+' : ''}${trackDb}`}
          </span>
        </div>
      </div>

      <div ref={waveformRef} className="flex-1 h-12 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
        {!audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-[1px] bg-zinc-800"></div>
          </div>
        )}
      </div>
    </div>
  );
});