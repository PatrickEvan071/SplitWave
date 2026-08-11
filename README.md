# SplitWave

SplitWave is a high-performance, local AI-powered stem separation and desktop audio mixing application built with **Tauri**, **React**, and **Python (Demucs)**. It allows musicians to isolate audio tracks (vocals, drums, bass, guitar, piano, and other instruments) from local audio files, manipulate them in real-time with professional digital audio workstation (DAW) features, and export custom mixdowns. What motivated me to create this was the fact that existing stem separation tools like Moises and LALAL.ai required a subscription to fully function. Furthermore, as a musician myself, having access to tools like this has been a massive quality-of-life improvement for my own musical workflow.

---

## Features

* **Local AI Stem Separation:** Leverages Meta's Demucs (`htdemucs_6s`) locally via packaged Python sidecars to split `.mp3` and `.wav` tracks into isolated stems without relying on cloud services.
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

* **Desktop Framework:** Tauri (Rust backend for system-level operations, native file dialogs, and subprocess management of bundled Python sidecars).
* **Frontend UI:** React, TypeScript, Tailwind CSS, and Lucide Icons.
* **Audio Visualization:** WaveSurfer.js.
* **AI & Audio Processing Backend:** Python, Demucs, PyTorch, and SoundFile (packaged via PyInstaller).

---

## Project Structure

```text
SplitWave/
├── frontend/                 # React frontend and Tauri wrapper
│   ├── src/                  # React components, UI logic, and styling
│   └── src-tauri/            # Rust backend (main.rs, configuration, sidecar bins)
├── backend/                  # Python source scripts (Demucs runner, mixer.py)
├── package.json              # Root/frontend dependencies and scripts
└── README.md