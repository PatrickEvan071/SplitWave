# SplitWave

SplitWave is a high-performance, local AI-powered stem separation and desktop audio mixing application built with **Tauri**, **React**, and **Python (Demucs)**. It allows musicians, producers, and students to isolate audio tracks (vocals, drums, bass, guitar, piano, and other instruments) from local audio files, manipulate them in real-time with professional digital audio workstation (DAW) features, and export custom mixdowns.

---

## Features

* **Local AI Stem Separation:** Leverages Meta's Demucs (`htdemucs_6s`) locally to split `.mp3` and `.wav` tracks into isolated stems without relying on cloud services.
* **Global Drag-and-Drop:** Native OS-level drag-and-drop support allowing users to drag audio files anywhere into the app window to instantly begin processing.
* **Multi-Track Waveform Viewer:** Powered by `wavesurfer.js` to provide real-time interactive audio scrubbing, time tracking, and synchronized playback across all separated stems.
* **Advanced Routing & Signal Chain:** 
  * Real-time Web Audio API `GainNode` routing for volume adjustments, muting, and soloing.
  * Individual decibel sliders with precise custom gain staging and a Master bus control.
  * Instant global keyboard shortcuts (Spacebar for Play/Pause).
* **Dual Export Engine:**
  * **Raw Stem Export:** Instantly save pristine, uncompressed `.wav` stems (e.g., isolated bass lines) directly to your hard drive at unity gain.
  * **Master Mixdown Export:** Render and "print" a custom master `.wav` file that dynamically incorporates your active fader values, mutes, solos, and master volume levels.

---

## Tech Stack

* **Desktop Framework:** Tauri (Rust backend for system-level operations, native file dialogs, and subprocess management).
* **Frontend UI:** React, TypeScript, Tailwind CSS, and Lucide Icons.
* **Audio Visualization:** WaveSurfer.js.
* **AI & Audio Processing Backend:** Python, Demucs, PyTorch, and SoundFile.

---

## Project Structure

```text
SplitWave/
├── src/                # React frontend application (App.tsx, components)
├── src-tauri/          # Rust backend (main.rs, Tauri configurations)
├── backend/            # Python scripts (Demucs runner, mixer.py)
├── package.json        # Frontend dependencies and scripts
└── README.md