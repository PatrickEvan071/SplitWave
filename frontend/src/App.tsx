import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { UploadCloud, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

// 1. Define how the parent can control the track (setting the time directly)
export interface TrackRef {
  setTime: (time: number) => void;
}

interface TrackProps {
  title: string;
  color: string;
  audioUrl?: string;
  isPlaying: boolean;
  isGlobalSoloActive: boolean;
  isThisTrackSoloed: boolean;
  onToggleSolo: () => void;
  onSeek: (time: number) => void; // Triggered when user clicks this track's waveform
  onTimeUpdate?: (time: number, duration: number) => void; // Used for the Master Clock
}

// 2. Wrap the component in forwardRef so the parent can command it
const AudioTrack = forwardRef<TrackRef, TrackProps>(({ 
  title, 
  color, 
  audioUrl, 
  isPlaying,
  isGlobalSoloActive,
  isThisTrackSoloed,
  onToggleSolo,
  onSeek,
  onTimeUpdate
}, ref) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  // 3. Expose the setTime command to the parent App component
  useImperativeHandle(ref, () => ({
    setTime: (time: number) => {
      if (wavesurfer.current) {
        wavesurfer.current.setTime(time);
      }
    }
  }));

  useEffect(() => {
    if (!waveformRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: color,
      progressColor: '#ffffff',
      height: 48,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      cursorWidth: 0,
    });

    if (audioUrl) {
      wavesurfer.current.load(audioUrl);
    }

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [color, audioUrl]);

  // Handle Play/Pause
  useEffect(() => {
    if (!wavesurfer.current) return;
    if (isPlaying) {
      wavesurfer.current.play();
    } else {
      wavesurfer.current.pause();
    }
  }, [isPlaying]);

  // Handle Solo/Mute
  useEffect(() => {
    if (wavesurfer.current) {
      const isMutedBySolo = isGlobalSoloActive && !isThisTrackSoloed;
      const shouldBeSilent = isMuted || isMutedBySolo;
      wavesurfer.current.setVolume(shouldBeSilent ? 0 : volume / 100);
    }
  }, [volume, isMuted, isGlobalSoloActive, isThisTrackSoloed]);

  // 4. Listen for User Scrubbing and Time Updates
  useEffect(() => {
    if (!wavesurfer.current) return;
    
    const ws = wavesurfer.current;

    // When the user clicks or drags this specific timeline
    const handleInteraction = (newTime: number) => {
      onSeek(newTime);
    };

    // When the audio naturally plays forward (only assigned to the master clock track)
    const handleTimeUpdate = (currentTime: number) => {
      if (onTimeUpdate) {
        // getDuration() returns the total length of the track
        onTimeUpdate(currentTime, ws.getDuration());
      }
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
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`px-3 py-1 text-xs font-bold rounded ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          M
        </button>
        <button 
          onClick={onToggleSolo} 
          className={`px-3 py-1 text-xs font-bold rounded ${isThisTrackSoloed ? 'bg-yellow-500/20 text-yellow-500' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          S
        </button>
      </div>
      <div className="flex items-center gap-2 w-32">
        {isMuted || (isGlobalSoloActive && !isThisTrackSoloed) || volume === 0 ? <VolumeX size={16} className="text-zinc-500" /> : <Volume2 size={16} className="text-zinc-400" />}
        <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
      </div>
      <div ref={waveformRef} className="flex-1 h-12 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden" />
    </div>
  );
});

export default function App() {
  const [fileSelected, setFileSelected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [stemFolder, setStemFolder] = useState<string | null>(null);

  const [soloedTracks, setSoloedTracks] = useState<string[]>([]);
  const isGlobalSoloActive = soloedTracks.length > 0;

  // 5. Track Refs to command the children components
  const vocalsRef = useRef<TrackRef>(null);
  const drumsRef = useRef<TrackRef>(null);
  const bassRef = useRef<TrackRef>(null);
  const otherRef = useRef<TrackRef>(null);
  const pianoRef = useRef<TrackRef>(null);
  const guitarRef = useRef<TrackRef>(null);

  // Master Clock States
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the key pressed is the spacebar
      if (e.code === 'Space') {
        // Stop the browser from clicking focused buttons or scrolling
        e.preventDefault(); 
        
        // Only toggle play/pause if a file has actually been loaded
        if (stemFolder) {
          setIsPlaying(prev => !prev);
        }
      }
    };

    // Attach the listener to the whole window
    window.addEventListener('keydown', handleKeyDown);

    // Clean up the listener when the app closes
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [stemFolder]);

  const handleFileUpload = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav'] }]
      });

      if (selectedPath) {
        setFileSelected(true);
        setIsProcessing(true);
        setErrorMsg(null);
        setIsPlaying(false);
        setSoloedTracks([]); 
        setCurrentTime(0);

        const result = await invoke<string>('run_demucs', { filePath: selectedPath });
        
        setStemFolder(result);
        setIsProcessing(false);
      }
    } catch (error) {
      setErrorMsg(String(error));
      setIsProcessing(false);
      setFileSelected(false);
    }
  };

  const getAudioUrl = (stemName: string) => {
    if (!stemFolder) return undefined;
    const fullPath = `${stemFolder}/${stemName}.wav`;
    return convertFileSrc(fullPath);
  };

  const toggleSolo = (title: string) => {
    setSoloedTracks(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title) 
        : [...prev, title]
    );
  };

  // 6. The Master Sync Function
  const handleSeek = (time: number, sourceTrack: string) => {
    // If you clicked Vocals, update Drums, Bass, and Other.
    if (sourceTrack !== 'Vocals') vocalsRef.current?.setTime(time);
    if (sourceTrack !== 'Drums') drumsRef.current?.setTime(time);
    if (sourceTrack !== 'Bass') bassRef.current?.setTime(time);
    if (sourceTrack !== 'Other') otherRef.current?.setTime(time);
    if (sourceTrack !== 'Piano') pianoRef.current?.setTime(time);
    if (sourceTrack !== 'Guitar') guitarRef.current?.setTime(time);
    
    // Immediately update the clock text so it doesn't lag
    setCurrentTime(time);
  };

  // Helper to format 65 seconds into "01:05"
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-blue-500/30">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white">SplitWave</h1>
        <p className="text-zinc-400 text-sm mt-1">Local AI Stem Separation</p>
      </header>

      {errorMsg && (
        <div className="bg-red-500/20 text-red-500 p-4 rounded-lg mb-6 border border-red-500/50">
          Error: {errorMsg}
        </div>
      )}

      {!fileSelected ? (
        <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-16 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-800/50 transition cursor-pointer" onClick={handleFileUpload}>
          <UploadCloud size={48} className="text-zinc-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">Click to Upload Audio</h2>
          <p className="text-zinc-500 text-sm mb-6">Supports MP3 and WAV</p>
          <button className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-zinc-200 transition">
            Browse Files
          </button>
        </div>
      ) : isProcessing ? (
        <div className="flex flex-col items-center justify-center h-64">
           <div className="w-8 h-8 border-4 border-zinc-700 border-t-white rounded-full animate-spin mb-4"></div>
           <p className="text-zinc-400 animate-pulse">Running Demucs Inference...</p>
           <p className="text-zinc-500 text-xs mt-2">This may take a few minutes depending on your CPU/GPU.</p>
        </div>
      ) : (
        <div className="animate-in fade-in duration-700">
          <div className="flex items-center gap-4 mb-8 p-4 bg-zinc-900 rounded-xl border border-zinc-800 w-fit">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-white text-black p-3 rounded-full hover:bg-zinc-200 transition"
            >
              {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
            </button>
            <span className="font-mono text-zinc-400 tracking-wider">
              {/* 7. Live Master Clock UI */}
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex flex-col">
            {/* Vocals acts as the master clock provider for the text UI */}
            <AudioTrack 
              ref={vocalsRef}
              title="Vocals" color="#3b82f6" audioUrl={getAudioUrl('vocals')} isPlaying={isPlaying} 
              isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Vocals')} 
              onToggleSolo={() => toggleSolo('Vocals')} 
              onSeek={(time) => handleSeek(time, 'Vocals')}
              onTimeUpdate={(time, dur) => { setCurrentTime(time); setDuration(dur); }}
            />
            <AudioTrack 
              ref={drumsRef}
              title="Drums" color="#ef4444" audioUrl={getAudioUrl('drums')} isPlaying={isPlaying} 
              isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Drums')} 
              onToggleSolo={() => toggleSolo('Drums')} 
              onSeek={(time) => handleSeek(time, 'Drums')}
            />
            <AudioTrack 
              ref={bassRef}
              title="Bass" color="#eab308" audioUrl={getAudioUrl('bass')} isPlaying={isPlaying} 
              isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Bass')} 
              onToggleSolo={() => toggleSolo('Bass')} 
              onSeek={(time) => handleSeek(time, 'Bass')}
            />
            <AudioTrack 
              ref={pianoRef}
              title="Piano" color="#a855f7" audioUrl={getAudioUrl('piano')} isPlaying={isPlaying} 
              isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Piano')} 
              onToggleSolo={() => toggleSolo('Piano')} 
              onSeek={(time) => handleSeek(time, 'Piano')}
            />
            <AudioTrack 
              ref={guitarRef}
              title="Guitar" color="#f97316" audioUrl={getAudioUrl('guitar')} isPlaying={isPlaying} 
              isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Guitar')} 
              onToggleSolo={() => toggleSolo('Guitar')} 
              onSeek={(time) => handleSeek(time, 'Guitar')}
            />
            <AudioTrack 
              ref={otherRef}
              title="Other" color="#10b981" audioUrl={getAudioUrl('other')} isPlaying={isPlaying} 
              isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Other')} 
              onToggleSolo={() => toggleSolo('Other')} 
              onSeek={(time) => handleSeek(time, 'Other')}
            />
          </div>
        </div>
      )}
    </div>
  );
}