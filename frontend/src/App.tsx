import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { UploadCloud, Volume2, VolumeX, Play, Pause, SlidersHorizontal, Download } from 'lucide-react';import WaveSurfer from 'wavesurfer.js';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';

export interface TrackRef {
  setTime: (time: number) => void;
  resetFader: () => void;
  getDb: () => number;
  getMuted: () => boolean;
}

interface TrackProps {
  title: string;
  color: string;
  audioUrl?: string;
  isPlaying: boolean;
  isGlobalSoloActive: boolean;
  isThisTrackSoloed: boolean;
  masterVolumeDb: number; 
  onToggleSolo: () => void;
  onSeek: (time: number) => void; 
  onTimeUpdate?: (time: number, duration: number) => void;
  onExportRaw: () => void; // <-- ADD THIS LINE
}

const AudioTrack = forwardRef<TrackRef, TrackProps>(({ 
  title, 
  color, 
  audioUrl, 
  isPlaying,
  isGlobalSoloActive,
  isThisTrackSoloed,
  masterVolumeDb,
  onToggleSolo,
  onSeek,
  onTimeUpdate,
  onExportRaw
}, ref) => {
  const [isMuted, setIsMuted] = useState(false);
  const [trackDb, setTrackDb] = useState(0); 
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceConnected = useRef(false);

  useImperativeHandle(ref, () => ({
    setTime: (time: number) => { if (wavesurfer.current) wavesurfer.current.setTime(time); },
    resetFader: () => setTrackDb(0),
    getDb: () => trackDb,
    getMuted: () => isMuted
  }));

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
      
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const gainNode = ctx.createGain();
        gainNodeRef.current = gainNode;

        try {
          if (!sourceConnected.current) {
            const source = ctx.createMediaElementSource(mediaElement);
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            sourceConnected.current = true;
          }
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
      audioCtxRef.current?.close();
    };
  }, [color, audioUrl]);

  useEffect(() => {
    if (!wavesurfer.current) return;
    if (isPlaying) {
      wavesurfer.current.play();
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
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
      gainNodeRef.current.gain.value = finalGainMultiplier;
      if (wavesurfer.current) wavesurfer.current.setVolume(1.0); 
    } else if (wavesurfer.current) {
      wavesurfer.current.setVolume(Math.min(finalGainMultiplier, 1.0));
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

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [stemFolder, setStemFolder] = useState<string | null>(null);

  const [soloedTracks, setSoloedTracks] = useState<string[]>([]);
  const isGlobalSoloActive = soloedTracks.length > 0;
  
  // NEW: Drag and Drop visual state
  const [isDragging, setIsDragging] = useState(false);

  const vocalsRef = useRef<TrackRef>(null);
  const drumsRef = useRef<TrackRef>(null);
  const bassRef = useRef<TrackRef>(null);
  const otherRef = useRef<TrackRef>(null);
  const pianoRef = useRef<TrackRef>(null);
  const guitarRef = useRef<TrackRef>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [masterVolumeDb, setMasterVolumeDb] = useState(0);

  // 1. Reusable Audio Processor (Used by both Button and Drag-and-Drop)
  const processAudioFile = async (filePath: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setIsPlaying(false);
    setSoloedTracks([]); 
    setCurrentTime(0);
    setDuration(0);
    setStemFolder(null); // Clear previous waveforms while processing

    try {
      const result = await invoke<string>('run_demucs', { filePath });
      setStemFolder(result);
    } catch (error) {
      setErrorMsg(String(error));
    } finally {
      setIsProcessing(false);
      setIsDragging(false);
    }
  };

  // 2. Button Upload Trigger
  const handleFileUpload = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav'] }]
      });

      if (selectedPath) {
        processAudioFile(selectedPath);
      }
    } catch (error) {
      setErrorMsg(String(error));
    }
  };

  // 3. Native Tauri Drag & Drop Listeners
  useEffect(() => {
    let unlistenEnter: () => void;
    let unlistenLeave: () => void;
    let unlistenDrop: () => void;

    const setupListeners = async () => {
      unlistenEnter = await listen('tauri://drag-enter', () => setIsDragging(true));
      unlistenLeave = await listen('tauri://drag-leave', () => setIsDragging(false));
      
      unlistenDrop = await listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
        setIsDragging(false);
        
        // Prevent dropping a new file while Demucs is already running
        if (isProcessing) return; 

        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          const filePath = paths[0];
          // Ensure it's a valid audio extension before processing
          if (filePath.toLowerCase().endsWith('.mp3') || filePath.toLowerCase().endsWith('.wav')) {
            processAudioFile(filePath);
          } else {
            setErrorMsg("Please drop a valid .mp3 or .wav file.");
          }
        }
      });
    };

    setupListeners();

    return () => {
      if (unlistenEnter) unlistenEnter();
      if (unlistenLeave) unlistenLeave();
      if (unlistenDrop) unlistenDrop();
    };
  }, [isProcessing]); // Re-bind if processing state changes to block concurrent drops

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); 
        if (stemFolder && !isProcessing) {
          setIsPlaying(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [stemFolder, isProcessing]);

  const getAudioUrl = (stemName: string) => {
    if (!stemFolder) return undefined;
    const fullPath = `${stemFolder}/${stemName}.wav`;
    return convertFileSrc(fullPath);
  };

  const toggleSolo = (title: string) => {
    setSoloedTracks(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleSeek = (time: number, sourceTrack: string) => {
    if (sourceTrack !== 'Vocals') vocalsRef.current?.setTime(time);
    if (sourceTrack !== 'Drums') drumsRef.current?.setTime(time);
    if (sourceTrack !== 'Bass') bassRef.current?.setTime(time);
    if (sourceTrack !== 'Other') otherRef.current?.setTime(time);
    if (sourceTrack !== 'Piano') pianoRef.current?.setTime(time);
    if (sourceTrack !== 'Guitar') guitarRef.current?.setTime(time);
    setCurrentTime(time);
  };

  const handleResetFaders = () => {
    setMasterVolumeDb(0);
    vocalsRef.current?.resetFader();
    drumsRef.current?.resetFader();
    bassRef.current?.resetFader();
    pianoRef.current?.resetFader();
    guitarRef.current?.resetFader();
    otherRef.current?.resetFader();
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isReady = !!stemFolder && !isProcessing;

  const handleExportRaw = async (stemName: string) => {
    if (!stemFolder) return;
    try {
      const destPath = await save({
        filters: [{ name: 'Audio', extensions: ['wav'] }],
        defaultPath: `${stemName}_stem.wav`
      });
      if (destPath) {
        await invoke('export_raw_stem', { 
          sourcePath: `${stemFolder}/${stemName}.wav`, 
          destPath 
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportMaster = async () => {
    if (!stemFolder) return;
    try {
      const destPath = await save({
        filters: [{ name: 'Audio', extensions: ['wav'] }],
        defaultPath: `Master_Mix.wav`
      });

      if (destPath) {
        setIsProcessing(true); // Spin the UI while mixing
        
        // Helper to extract state and calculate final gain for Python
        const buildTrackData = (name: string, ref: React.RefObject<TrackRef | null>, trackSoloed: boolean) => {
          const db = ref.current?.getDb() || 0;
          const isMuted = ref.current?.getMuted() || false;
          const isMutedBySolo = isGlobalSoloActive && !trackSoloed;
          
          const shouldBeSilent = isMuted || isMutedBySolo || db === -60 || masterVolumeDb === -60;
          const combinedDb = db + masterVolumeDb;
          const finalGain = shouldBeSilent ? 0 : Math.pow(10, combinedDb / 20);

          return { muted: shouldBeSilent, gain: finalGain };
        };

        const mixData = {
          vocals: buildTrackData('vocals', vocalsRef, soloedTracks.includes('Vocals')),
          drums: buildTrackData('drums', drumsRef, soloedTracks.includes('Drums')),
          bass: buildTrackData('bass', bassRef, soloedTracks.includes('Bass')),
          piano: buildTrackData('piano', pianoRef, soloedTracks.includes('Piano')),
          guitar: buildTrackData('guitar', guitarRef, soloedTracks.includes('Guitar')),
          other: buildTrackData('other', otherRef, soloedTracks.includes('Other')),
        };

        await invoke('export_master', {
          stemDir: stemFolder,
          destPath: destPath,
          mixData: JSON.stringify(mixData)
        });
        
        setIsProcessing(false);
      }
    } catch (err) {
      setErrorMsg(String(err));
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-blue-500/30 relative">
      
      {/* 4. Full-Screen Visual Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-blue-500/10 backdrop-blur-sm border-4 border-blue-500 border-dashed flex items-center justify-center transition-all">
          <div className="bg-zinc-900 px-10 py-8 rounded-2xl flex flex-col items-center shadow-2xl border border-zinc-800">
            <UploadCloud size={64} className="text-blue-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Drop Audio to Split</h2>
            <p className="text-zinc-400 mt-2 font-mono text-sm">Supports .mp3 and .wav</p>
          </div>
        </div>
      )}

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">SplitWave</h1>
          <p className="text-zinc-400 text-sm mt-1">Local AI Stem Separation</p>
        </div>

        <div className="flex items-center gap-4">
          {isProcessing && (
            <div className="flex items-center gap-3 text-zinc-400 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
              <span className="text-sm font-bold animate-pulse">Running Demucs...</span>
            </div>
          )}
          
          <button 
            onClick={handleFileUpload} 
            disabled={isProcessing}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all ${isProcessing ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10'}`}
          >
            <UploadCloud size={20} />
            {stemFolder ? 'Load New Audio' : 'Upload Audio'}
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="bg-red-500/20 text-red-500 p-4 rounded-lg mb-6 border border-red-500/50">
          Error: {errorMsg}
        </div>
      )}

      <div className={`transition-opacity duration-500`}>
        <div className={`flex items-center justify-between gap-4 mb-8 p-4 bg-zinc-900 rounded-xl border border-zinc-800 w-full transition-opacity ${!isReady ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!isReady}
              className="bg-white text-black p-4 rounded-full hover:bg-zinc-200 transition shadow-lg shadow-white/10"
            >
              {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} />}
            </button>
            <span className="font-mono text-lg font-bold text-zinc-300 tracking-wider">
              {formatTime(currentTime)} <span className="text-zinc-600">/</span> {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4 bg-black/40 px-6 py-3 rounded-lg border border-zinc-800/50">
            <button 
              onClick={handleResetFaders}
              disabled={!isReady}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Vol
            </button>
            <button 
              onClick={handleExportMaster}
              disabled={!isReady}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export Mix
            </button>

            <div className="w-[1px] h-6 bg-zinc-800 mx-2"></div>

            <SlidersHorizontal size={18} className="text-zinc-500" />
            <div className="flex flex-col w-48">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                <span>Master</span>
                <span className={masterVolumeDb > 0 ? 'text-red-400' : 'text-zinc-400'}>
                  {masterVolumeDb === -60 ? '-INF' : `${masterVolumeDb > 0 ? '+' : ''}${masterVolumeDb} dB`}
                </span>
              </div>
              <div className="relative flex items-center group">
                <input 
                  type="range" min="-60" max="12" step="1" 
                  value={masterVolumeDb} 
                  onChange={(e) => setMasterVolumeDb(parseInt(e.target.value))} 
                  disabled={!isReady}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer relative z-10 accent-white" 
                />
                <div className="absolute left-[83.33%] w-[2px] h-3 bg-zinc-500 -mt-[1px] rounded z-0 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <AudioTrack 
            ref={vocalsRef} title="Vocals" color="#3b82f6" audioUrl={getAudioUrl('vocals')} isPlaying={isPlaying} 
            isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Vocals')} 
            masterVolumeDb={masterVolumeDb} onToggleSolo={() => toggleSolo('Vocals')} 
            onSeek={(time) => handleSeek(time, 'Vocals')}
            onTimeUpdate={(time, dur) => { setCurrentTime(time); setDuration(dur); }}
            onExportRaw={() => handleExportRaw('vocals')} // <-- ADD THIS
          />
          <AudioTrack 
            ref={drumsRef} title="Drums" color="#ef4444" audioUrl={getAudioUrl('drums')} isPlaying={isPlaying} 
            isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Drums')} 
            masterVolumeDb={masterVolumeDb} onToggleSolo={() => toggleSolo('Drums')} 
            onSeek={(time) => handleSeek(time, 'Drums')}
            onExportRaw={() => handleExportRaw('drums')} // <-- ADD THIS
          />
          <AudioTrack 
            ref={bassRef} title="Bass" color="#eab308" audioUrl={getAudioUrl('bass')} isPlaying={isPlaying} 
            isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Bass')} 
            masterVolumeDb={masterVolumeDb} onToggleSolo={() => toggleSolo('Bass')} 
            onSeek={(time) => handleSeek(time, 'Bass')}
            onExportRaw={() => handleExportRaw('bass')} // <-- ADD THIS
          />
          <AudioTrack 
            ref={pianoRef} title="Piano" color="#a855f7" audioUrl={getAudioUrl('piano')} isPlaying={isPlaying} 
            isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Piano')} 
            masterVolumeDb={masterVolumeDb} onToggleSolo={() => toggleSolo('Piano')} 
            onSeek={(time) => handleSeek(time, 'Piano')}
            onExportRaw={() => handleExportRaw('piano')} // <-- ADD THIS
          />
          <AudioTrack 
            ref={guitarRef} title="Guitar" color="#f97316" audioUrl={getAudioUrl('guitar')} isPlaying={isPlaying} 
            isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Guitar')} 
            masterVolumeDb={masterVolumeDb} onToggleSolo={() => toggleSolo('Guitar')} 
            onSeek={(time) => handleSeek(time, 'Guitar')}
            onExportRaw={() => handleExportRaw('guitar')} // <-- ADD THIS
          />
          <AudioTrack 
            ref={otherRef} title="Other" color="#10b981" audioUrl={getAudioUrl('other')} isPlaying={isPlaying} 
            isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Other')} 
            masterVolumeDb={masterVolumeDb} onToggleSolo={() => toggleSolo('Other')} 
            onSeek={(time) => handleSeek(time, 'Other')}
            onExportRaw={() => handleExportRaw('other')} // <-- ADD THIS
          />
        </div>
      </div>
    </div>
  );
}