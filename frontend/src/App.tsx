import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
// 1. Import Tauri IPC and Dialog APIs
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface TrackProps {
  title: string;
  color: string;
  audioUrl?: string; 
}

const AudioTrack: React.FC<TrackProps> = ({ title, color, audioUrl }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [volume, setVolume] = useState(100);
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

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

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(isMuted ? 0 : volume / 100);
    }
  }, [volume, isMuted]);

  return (
    <div className="flex items-center gap-6 bg-zinc-900 p-4 rounded-xl mb-4 border border-zinc-800">
      <div className="w-24">
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setIsMuted(!isMuted)} className={`px-3 py-1 text-xs font-bold rounded ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>M</button>
        <button onClick={() => setIsSolo(!isSolo)} className={`px-3 py-1 text-xs font-bold rounded ${isSolo ? 'bg-yellow-500/20 text-yellow-500' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>S</button>
      </div>
      <div className="flex items-center gap-2 w-32">
        {isMuted || volume === 0 ? <VolumeX size={16} className="text-zinc-500" /> : <Volume2 size={16} className="text-zinc-400" />}
        <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
      </div>
      <div ref={waveformRef} className="flex-1 h-12 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden" />
    </div>
  );
};

export default function App() {
  const [fileSelected, setFileSelected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 2. The real connection function!
  const handleFileUpload = async () => {
    try {
      // Open native OS file picker
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav'] }]
      });

      if (selectedPath) {
        setFileSelected(true);
        setIsProcessing(true);
        setErrorMsg(null);

        console.log("Selected file:", selectedPath);

        // Call the Rust function 'run_demucs' and wait for Python to finish
        const result = await invoke('run_demucs', { filePath: selectedPath });
        
        console.log("Rust returned:", result);
        setIsProcessing(false); // Done! Move to the tracks UI
      }
    } catch (error) {
      console.error("Backend error:", error);
      setErrorMsg(String(error));
      setIsProcessing(false);
      setFileSelected(false);
    }
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
            <button className="bg-white text-black p-3 rounded-full hover:bg-zinc-200 transition">
              <Play fill="currentColor" size={20} />
            </button>
            <span className="font-mono text-zinc-400 tracking-wider">00:00 / 03:45</span>
          </div>

          <div className="flex flex-col">
            <AudioTrack title="Vocals" color="#3b82f6" />
            <AudioTrack title="Drums" color="#ef4444" />
            <AudioTrack title="Bass" color="#eab308" />
            <AudioTrack title="Other" color="#10b981" />
          </div>
        </div>
      )}
    </div>
  );
}