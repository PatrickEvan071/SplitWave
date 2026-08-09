import React, { useState, useRef, useEffect } from 'react';
import { Download } from 'lucide-react';
import { formatTime } from '../lib/utils';

interface LooperBarProps {
  isReady: boolean;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isLoopActive: boolean;
  loopRegion: { start: number; end: number } | null;
  setLoopRegion: React.Dispatch<React.SetStateAction<{ start: number; end: number } | null>>;
  handleSeek: (time: number, sourceTrack: string) => void;
}

export default function LooperBar({ 
  isReady, duration, currentTime, isPlaying, isLoopActive, 
  loopRegion, setLoopRegion, handleSeek 
}: LooperBarProps) {
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingLoop, setIsDraggingLoop] = useState(false);

  // LOOPER BAR BOUNCE INTERCEPTOR
  useEffect(() => {
    if (!loopRegion || !isPlaying || isDraggingLoop || !isLoopActive) return;
    
    const realEnd = Math.max(loopRegion.start, loopRegion.end);
    const realStart = Math.min(loopRegion.start, loopRegion.end);

    if (currentTime >= realEnd) {
      handleSeek(realStart, 'LOOP');
    }
  }, [currentTime, loopRegion, isPlaying, isDraggingLoop, isLoopActive, handleSeek]);

  const handleLoopPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration || !isReady) return;
    e.currentTarget.setPointerCapture(e.pointerId); 
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = percent * duration;
    setLoopRegion({ start: time, end: time });
    setIsDraggingLoop(true);
  };

  const handleLoopPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingLoop || !loopRegion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = percent * duration;
    setLoopRegion(prev => prev ? { ...prev, end: time } : null);
  };

  const handleLoopPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDraggingLoop(false);
    setLoopRegion(prev => {
      if (!prev) return null;
      if (Math.abs(prev.start - prev.end) < 0.5) return null; 
      return {
        start: Math.min(prev.start, prev.end),
        end: Math.max(prev.start, prev.end)
      };
    });
  };

  return (
    <div className={`flex items-center gap-6 px-4 mb-4 transition-opacity ${!isReady ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      <div className="w-24 flex items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Loop Region</span>
      </div>
      
      <div className="relative flex gap-2">
        <div className="flex gap-2 invisible pointer-events-none">
          <button className="px-3 py-1 text-xs font-bold">M</button>
          <button className="px-3 py-1 text-xs font-bold">S</button>
          <button className="px-3 py-1 flex items-center justify-center"><Download size={14} /></button>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <button 
            onClick={() => setLoopRegion(null)}
            disabled={!loopRegion}
            className={`px-3 py-1.5 w-full text-[9px] font-bold uppercase tracking-widest rounded transition-colors ${loopRegion ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-zinc-900/50 text-zinc-700 cursor-not-allowed border border-zinc-800'}`}
            title="Clear Loop"
          >
            Clear ✕
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 w-56">
        <div className="flex items-center justify-between w-full text-[10px] font-mono font-bold bg-zinc-900/50 rounded-md py-1.5 px-3 border border-zinc-800">
          <span className={loopRegion ? "text-zinc-300" : "text-zinc-700"}>{formatTime(loopRegion ? Math.min(loopRegion.start, loopRegion.end) : 0)}</span>
          <span className="text-zinc-700">-</span>
          <span className={loopRegion ? "text-zinc-300" : "text-zinc-700"}>{formatTime(loopRegion ? Math.max(loopRegion.start, loopRegion.end) : 0)}</span>
          <div className="w-[1px] h-3 bg-zinc-700 mx-1"></div>
          <span className={loopRegion ? "text-blue-400" : "text-zinc-700"} title="Loop Duration">{formatTime(loopRegion ? Math.abs(loopRegion.end - loopRegion.start) : 0)}</span>
        </div>
      </div>

      <div 
        ref={timelineRef}
        onPointerDown={handleLoopPointerDown}
        onPointerMove={handleLoopPointerMove}
        onPointerUp={handleLoopPointerUp}
        className="relative flex-1 h-8 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden cursor-crosshair group hover:border-zinc-700 transition-colors"
      >
        {isReady && duration > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: Math.floor(duration / 30) }).map((_, idx) => {
              const time = (idx + 1) * 30;
              const position = (time / duration) * 100;
              return (
                <div key={time} className="absolute top-0 bottom-0 w-px bg-zinc-800 flex flex-col justify-end pb-0.5 z-0" style={{ left: `${position}%` }}>
                  <span className="text-[7px] text-zinc-500 font-mono leading-none -translate-x-1/2">{formatTime(time)}</span>
                </div>
              );
            })}
          </div>
        )}

        {isReady && duration > 0 && (
          <div className="absolute top-0 bottom-0 w-[2px] bg-white z-20 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }} />
        )}
        
        {loopRegion && duration > 0 && (
          <div className="absolute top-0 bottom-0 bg-blue-500/30 border-x border-blue-500 z-10 pointer-events-none" style={{ left: `${(Math.min(loopRegion.start, loopRegion.end) / duration) * 100}%`, width: `${(Math.abs(loopRegion.end - loopRegion.start) / duration) * 100}%` }} />
        )}

        {!loopRegion && isReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800">Drag to create loop</span>
          </div>
        )}
      </div>
    </div>
  );
}