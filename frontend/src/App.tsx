import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';

import { masterPitchShift } from './lib/audioEngine';
import { AudioTrack, TrackRef } from './components/AudioTrack';
import MasterControls from './components/MasterControls';
import LooperBar from './components/LooperBar';

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null); 
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [stemFolder, setStemFolder] = useState<string | null>(null);

  const [soloedTracks, setSoloedTracks] = useState<string[]>([]);
  const isGlobalSoloActive = soloedTracks.length > 0;
  const [isDragging, setIsDragging] = useState(false);

  const [loopRegion, setLoopRegion] = useState<{start: number, end: number} | null>(null);
  const [isLoopActive, setIsLoopActive] = useState(true);

  const vocalsRef = useRef<TrackRef>(null);
  const drumsRef = useRef<TrackRef>(null);
  const bassRef = useRef<TrackRef>(null);
  const otherRef = useRef<TrackRef>(null);
  const pianoRef = useRef<TrackRef>(null);
  const guitarRef = useRef<TrackRef>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [masterVolumeDb, setMasterVolumeDb] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [masterTranspose, setMasterTranspose] = useState(0);

  const [uiPlaybackRate, setUiPlaybackRate] = useState(1.0); 
  const [uiTranspose, setUiTranspose] = useState(0); 

  useEffect(() => {
    masterPitchShift.pitch = masterTranspose;
  }, [masterTranspose]);

  const handleSkipToStart = () => handleSeek(0, 'MASTER');
  const handleSkipToEnd = () => {
    handleSeek(duration, 'MASTER');
    setIsPlaying(false);
  };
  
  const handleClearMutes = () => {
    vocalsRef.current?.resetMute();
    drumsRef.current?.resetMute();
    bassRef.current?.resetMute();
    pianoRef.current?.resetMute();
    guitarRef.current?.resetMute();
    otherRef.current?.resetMute();
  };

  const processAudioFile = async (filePath: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setIsPlaying(false);
    setSoloedTracks([]); 
    setCurrentTime(0);
    setDuration(0);
    setLoopRegion(null); 
    setStemFolder(null); 

    const name = filePath.split(/[/\\]/).pop() || 'Unknown File';
    setFileName(name);

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

  useEffect(() => {
    let unlistenEnter: () => void;
    let unlistenLeave: () => void;
    let unlistenDrop: () => void;

    const setupListeners = async () => {
      unlistenEnter = await listen('tauri://drag-enter', () => setIsDragging(true));
      unlistenLeave = await listen('tauri://drag-leave', () => setIsDragging(false));
      unlistenDrop = await listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
        setIsDragging(false);
        if (isProcessing) return; 
        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          const filePath = paths[0];
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
  }, [isProcessing]);

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
    setSoloedTracks(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);
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

  const isReady = !!stemFolder && !isProcessing;

  const handleExportRaw = async (stemName: string) => {
    if (!stemFolder) return;
    try {
      const destPath = await save({
        filters: [{ name: 'Audio', extensions: ['wav'] }],
        defaultPath: `${stemName}_stem.wav`
      });
      if (destPath) {
        await invoke('export_raw_stem', { sourcePath: `${stemFolder}/${stemName}.wav`, destPath });
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
        setIsExporting(true); 
          const buildTrackData = (ref: React.RefObject<TrackRef | null>, trackSoloed: boolean) => {          const db = ref.current?.getDb() || 0;
          const isMuted = ref.current?.getMuted() || false;
          const isMutedBySolo = isGlobalSoloActive && !trackSoloed;
          const shouldBeSilent = isMuted || isMutedBySolo || db === -60 || masterVolumeDb === -60;
          const combinedDb = db + masterVolumeDb;
          const finalGain = shouldBeSilent ? 0 : Math.pow(10, combinedDb / 20);
          return { muted: shouldBeSilent, gain: finalGain };
        };

        const mixData = {
          vocals: buildTrackData(vocalsRef, soloedTracks.includes('Vocals')),
          drums: buildTrackData(drumsRef, soloedTracks.includes('Drums')),
          bass: buildTrackData(bassRef, soloedTracks.includes('Bass')),
          piano: buildTrackData(pianoRef, soloedTracks.includes('Piano')),
          guitar: buildTrackData(guitarRef, soloedTracks.includes('Guitar')),
          other: buildTrackData(otherRef, soloedTracks.includes('Other')),
        };

        await invoke('export_master', {
          stemDir: stemFolder,
          destPath: destPath,
          mixData: JSON.stringify(mixData),
          speed: playbackRate,       
          transpose: masterTranspose 
        });
        setIsExporting(false);
      }
    } catch (err) {
      setErrorMsg(String(err));
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-blue-500/30 relative overflow-x-hidden">
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
          {(isProcessing || isExporting) && (
            <div className="flex items-center gap-3 text-zinc-400 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
              <span className="text-sm font-bold animate-pulse">
                {isExporting ? 'Exporting Mix...' : 'Running Demucs...'}
              </span>
            </div>
          )}
          <button onClick={handleFileUpload} disabled={isProcessing || isExporting} className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all ${(isProcessing || isExporting) ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10'}`}>
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
        <MasterControls
          isReady={isReady} isPlaying={isPlaying} setIsPlaying={setIsPlaying}
          currentTime={currentTime} duration={duration} fileName={fileName}
          handleSkipToStart={handleSkipToStart} handleSkipToEnd={handleSkipToEnd}
          handleClearMutes={handleClearMutes} setSoloedTracks={setSoloedTracks}
          isGlobalSoloActive={isGlobalSoloActive} isLoopActive={isLoopActive}
          setIsLoopActive={setIsLoopActive} loopRegion={loopRegion}
          uiTranspose={uiTranspose} setUiTranspose={setUiTranspose} setMasterTranspose={setMasterTranspose}
          uiPlaybackRate={uiPlaybackRate} setUiPlaybackRate={setUiPlaybackRate} setPlaybackRate={setPlaybackRate}
          handleResetFaders={handleResetFaders} handleExportMaster={handleExportMaster}
          masterVolumeDb={masterVolumeDb} setMasterVolumeDb={setMasterVolumeDb}
        />

        <LooperBar
          isReady={isReady} duration={duration} currentTime={currentTime}
          isPlaying={isPlaying} isLoopActive={isLoopActive}
          loopRegion={loopRegion} setLoopRegion={setLoopRegion} handleSeek={handleSeek}
        />

        <div className="flex flex-col">
          <AudioTrack ref={vocalsRef} title="Vocals" color="#3b82f6" audioUrl={getAudioUrl('vocals')} isPlaying={isPlaying} isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Vocals')} masterVolumeDb={masterVolumeDb} playbackRate={playbackRate} onToggleSolo={() => toggleSolo('Vocals')} onSeek={(time) => handleSeek(time, 'Vocals')} onTimeUpdate={(time, dur) => { setCurrentTime(time); setDuration(dur); }} onExportRaw={() => handleExportRaw('vocals')} />
          <AudioTrack ref={drumsRef} title="Drums" color="#ef4444" audioUrl={getAudioUrl('drums')} isPlaying={isPlaying} isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Drums')} masterVolumeDb={masterVolumeDb} playbackRate={playbackRate} onToggleSolo={() => toggleSolo('Drums')} onSeek={(time) => handleSeek(time, 'Drums')} onExportRaw={() => handleExportRaw('drums')} />
          <AudioTrack ref={bassRef} title="Bass" color="#eab308" audioUrl={getAudioUrl('bass')} isPlaying={isPlaying} isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Bass')} masterVolumeDb={masterVolumeDb} playbackRate={playbackRate} onToggleSolo={() => toggleSolo('Bass')} onSeek={(time) => handleSeek(time, 'Bass')} onExportRaw={() => handleExportRaw('bass')} />
          <AudioTrack ref={pianoRef} title="Piano" color="#a855f7" audioUrl={getAudioUrl('piano')} isPlaying={isPlaying} isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Piano')} masterVolumeDb={masterVolumeDb} playbackRate={playbackRate} onToggleSolo={() => toggleSolo('Piano')} onSeek={(time) => handleSeek(time, 'Piano')} onExportRaw={() => handleExportRaw('piano')} />
          <AudioTrack ref={guitarRef} title="Guitar" color="#f97316" audioUrl={getAudioUrl('guitar')} isPlaying={isPlaying} isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Guitar')} masterVolumeDb={masterVolumeDb} playbackRate={playbackRate} onToggleSolo={() => toggleSolo('Guitar')} onSeek={(time) => handleSeek(time, 'Guitar')} onExportRaw={() => handleExportRaw('guitar')} />
          <AudioTrack ref={otherRef} title="Other" color="#10b981" audioUrl={getAudioUrl('other')} isPlaying={isPlaying} isGlobalSoloActive={isGlobalSoloActive} isThisTrackSoloed={soloedTracks.includes('Other')} masterVolumeDb={masterVolumeDb} playbackRate={playbackRate} onToggleSolo={() => toggleSolo('Other')} onSeek={(time) => handleSeek(time, 'Other')} onExportRaw={() => handleExportRaw('other')} />
        </div>
      </div>
    </div>
  );
}