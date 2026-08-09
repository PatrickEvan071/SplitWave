import { Play, Pause, SkipBack, SkipForward, MegaphoneOff, Volume2, Repeat, SlidersHorizontal } from 'lucide-react';
import { formatTime } from '../lib/utils';

interface MasterControlsProps {
  isReady: boolean;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  duration: number;
  fileName: string | null;
  handleSkipToStart: () => void;
  handleSkipToEnd: () => void;
  handleClearMutes: () => void;
  setSoloedTracks: (tracks: string[]) => void;
  isGlobalSoloActive: boolean;
  isLoopActive: boolean;
  setIsLoopActive: (active: boolean) => void;
  loopRegion: { start: number; end: number } | null;
  uiTranspose: number;
  setUiTranspose: (val: number) => void;
  setMasterTranspose: (val: number) => void;
  uiPlaybackRate: number;
  setUiPlaybackRate: (val: number) => void;
  setPlaybackRate: (val: number) => void;
  handleResetFaders: () => void;
  handleExportMaster: () => void;
  masterVolumeDb: number;
  setMasterVolumeDb: (val: number) => void;
}

export default function MasterControls({
  isReady, isPlaying, setIsPlaying, currentTime, duration, fileName,
  handleSkipToStart, handleSkipToEnd, handleClearMutes, setSoloedTracks,
  isGlobalSoloActive, isLoopActive, setIsLoopActive, loopRegion,
  uiTranspose, setUiTranspose, setMasterTranspose,
  uiPlaybackRate, setUiPlaybackRate, setPlaybackRate,
  handleResetFaders, handleExportMaster, masterVolumeDb, setMasterVolumeDb
}: MasterControlsProps) {
  return (
    <div className={`flex flex-wrap xl:flex-nowrap items-center justify-between gap-4 mb-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800 w-full transition-opacity ${!isReady ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      
      {/* LEFT: Transport Controls */}
      <div className="flex items-center gap-4 bg-black/40 px-4 py-2.5 rounded-lg border border-zinc-800/50">
        <button onClick={handleSkipToStart} disabled={!isReady} className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50">
          <SkipBack size={20} fill="currentColor" />
        </button>
        <button onClick={() => setIsPlaying(!isPlaying)} disabled={!isReady} className="bg-white text-black p-3 rounded-full hover:bg-zinc-200 transition shadow-lg shadow-white/10">
          {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
        </button>
        <button onClick={handleSkipToEnd} disabled={!isReady} className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50">
          <SkipForward size={20} fill="currentColor" />
        </button>
        <div className="w-[1px] h-6 bg-zinc-800 mx-2"></div>
        <span className="font-mono text-sm font-bold text-zinc-300 tracking-wider w-28 text-center">
          {formatTime(currentTime)} <span className="text-zinc-600">/</span> {formatTime(duration)}
        </span>
      </div>

      {/* CENTER: Track Title & Mix Utilities */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="relative overflow-hidden max-w-[320px] w-full text-center">
          <div className={`text-xs font-bold uppercase tracking-widest text-zinc-300 ${fileName && fileName.length > 50 ? 'animate-marquee' : 'truncate'}`} title={fileName || 'No track loaded'}>
            {fileName ? fileName : 'NO TRACK LOADED'}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-zinc-800/50">
            <button onClick={handleClearMutes} title="Clear All Mutes" className="flex items-center gap-2 px-3 py-1 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[9px] font-bold uppercase tracking-widest rounded transition-colors">
              <MegaphoneOff size={12} /> Unmute All
            </button>
            <button onClick={() => setSoloedTracks([])} disabled={!isGlobalSoloActive} title="Clear All Solos" className={`flex items-center gap-2 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded transition-colors ${isGlobalSoloActive ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'}`}>
              <Volume2 size={12} /> Clear Solos
            </button>
          </div>
          <button onClick={() => setIsLoopActive(!isLoopActive)} disabled={!loopRegion} title="Toggle Loop Playback" className={`flex items-center gap-2 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg border transition-all ${!loopRegion ? 'bg-zinc-900/50 border-zinc-800 text-zinc-700 cursor-not-allowed' : isLoopActive ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-white'}`}>
            <Repeat size={12} /> {isLoopActive ? 'Loop: ON' : 'Loop: OFF'}
          </button>
        </div>
      </div>

      {/* RIGHT: Speed, Transpose, and Export Master */}
      <div className="flex items-center gap-4 bg-black/40 px-6 py-3 rounded-lg border border-zinc-800/50">
        <div className="flex flex-col w-32 mr-2 gap-3">
          <div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              <span>Transpose</span>
              <span className={uiTranspose !== 0 ? 'text-blue-400' : 'text-zinc-400'}>{uiTranspose > 0 ? '+' : ''}{uiTranspose} st</span>
            </div>
            <input type="range" min="-12" max="12" step="1" value={uiTranspose} onChange={(e) => setUiTranspose(parseInt(e.target.value))} onPointerUp={() => setMasterTranspose(uiTranspose)} onKeyUp={() => setMasterTranspose(uiTranspose)} disabled={!isReady} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer relative z-10 accent-blue-500" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              <span>Speed</span>
              <span className={uiPlaybackRate !== 1 ? 'text-blue-400' : 'text-zinc-400'}>{uiPlaybackRate.toFixed(2)}x</span>
            </div>
            <input type="range" min="0.5" max="2.0" step="0.05" value={uiPlaybackRate} onChange={(e) => setUiPlaybackRate(parseFloat(e.target.value))} onPointerUp={() => setPlaybackRate(uiPlaybackRate)} onKeyUp={() => setPlaybackRate(uiPlaybackRate)} disabled={!isReady} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer relative z-10 accent-blue-500" />
          </div>
        </div>
        <div className="w-[1px] h-10 bg-zinc-800 mx-2"></div>
        <div className="flex flex-col gap-2">
          <button onClick={handleResetFaders} disabled={!isReady} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Reset Vol</button>
          <button onClick={handleExportMaster} disabled={!isReady} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Export Mix</button>
        </div>
        <div className="w-[1px] h-10 bg-zinc-800 mx-2"></div>
        <SlidersHorizontal size={18} className="text-zinc-500" />
        <div className="flex flex-col w-48">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
            <span>Master</span>
            <span className={masterVolumeDb > 0 ? 'text-red-400' : 'text-zinc-400'}>{masterVolumeDb === -60 ? '-INF' : `${masterVolumeDb > 0 ? '+' : ''}${masterVolumeDb} dB`}</span>
          </div>
          <div className="relative flex items-center group">
            <input type="range" min="-60" max="12" step="1" value={masterVolumeDb} onChange={(e) => setMasterVolumeDb(parseInt(e.target.value))} disabled={!isReady} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer relative z-10 accent-white" />
            <div className="absolute left-[83.33%] w-[2px] h-3 bg-zinc-500 -mt-[1px] rounded z-0 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  );
}