import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

// 1. Define our strict TypeScript interfaces
interface TrackProps {
  title: string;
  color: string;
  audioUrl?: string; // Will be used when we load real audio files
}

const AudioTrack: React.FC<TrackProps> = ({ title, color, audioUrl }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [volume, setVolume] = useState(100);
  
  // 2. Refs to hold the DOM element and the Wavesurfer instance
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  // 3. Initialize Wavesurfer when the component mounts
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

    // If we passed an actual audio URL, load it!
    if (audioUrl) {
      wavesurfer.current.load(audioUrl);
    }

    // Cleanup function to destroy the instance when the component unmounts
    return () => {
      wavesurfer.current?.destroy();
    };
  }, [color, audioUrl]);

  // Handle Mute/Volume changes linking to Wavesurfer
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
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`px-3 py-1 text-xs font-bold rounded ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          M
        </button>
        <button 
          onClick={() => setIsSolo(!isSolo)}
          className={`px-3 py-1 text-xs font-bold rounded ${isSolo ? 'bg-yellow-500/20 text-yellow-500' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          S
        </button>
      </div>

      <div className="flex items-center gap-2 w-32">
        {isMuted || volume === 0 ? <VolumeX size={16} className="text-zinc-500" /> : <Volume2 size={16} className="text-zinc-400" />}
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* 4. The container where Wavesurfer will inject the canvas */}
      <div 
        ref={waveformRef} 
        className="flex-1 h-12 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden"
      />
    </div>
  );
};

export default function App() {
  const [fileSelected, setFileSelected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileSelected(true);
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-blue-500/30">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white">SplitWave</h1>
        <p className="text-zinc-400 text-sm mt-1">Local AI Stem Separation</p>
      </header>

      {!fileSelected ? (
        <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-16 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-800/50 transition cursor-pointer">
          <UploadCloud size={48} className="text-zinc-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">Drag & Drop Audio File</h2>
          <p className="text-zinc-500 text-sm mb-6">Supports MP3 and WAV</p>
          <label className="bg-white text-black px-6 py-2 rounded-full font-bold cursor-pointer hover:bg-zinc-200 transition">
            Browse Files
            <input type="file" className="hidden" accept=".mp3, .wav" onChange={handleFileUpload} />
          </label>
        </div>
      ) : isProcessing ? (
        <div className="flex flex-col items-center justify-center h-64">
           <div className="w-8 h-8 border-4 border-zinc-700 border-t-white rounded-full animate-spin mb-4"></div>
           <p className="text-zinc-400 animate-pulse">Running Demucs Inference...</p>
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