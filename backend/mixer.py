import sys
import json
import numpy as np
import soundfile as sf
import librosa
from pathlib import Path

def main():
    # Now expects 5 arguments
    if len(sys.argv) < 6:
        sys.exit("Usage: mixer.py <stem_dir> <output_path> <json_mix_data> <speed> <transpose>")

    stem_dir = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    mix_data = json.loads(sys.argv[3])
    speed = float(sys.argv[4])
    transpose = int(sys.argv[5])

    mixed_audio = None
    sample_rate = 44100

    for stem_name, settings in mix_data.items():
        if settings['muted']:
            continue

        file_path = stem_dir / f"{stem_name}.wav"
        if not file_path.exists():
            continue

        data, sr = sf.read(file_path, dtype='float32')
        sample_rate = sr
        data = data * settings['gain']

        if mixed_audio is None:
            mixed_audio = data
        else:
            mixed_audio += data

    if mixed_audio is not None:
        # --- NEW: LIBROSA DSP PROCESSING ---
        
        # Soundfile shapes audio as (frames, channels). Librosa requires (channels, frames).
        is_stereo = mixed_audio.ndim > 1
        if is_stereo:
            mixed_audio = mixed_audio.T 

        # 1. Apply Speed (Time-Stretch)
        if speed != 1.0:
            mixed_audio = librosa.effects.time_stretch(mixed_audio, rate=speed)
            
        # 2. Apply Transpose (Pitch-Shift)
        if transpose != 0:
            mixed_audio = librosa.effects.pitch_shift(mixed_audio, sr=sample_rate, n_steps=transpose)

        # Revert shape back to (frames, channels) for Soundfile export
        if is_stereo:
            mixed_audio = mixed_audio.T

        # -----------------------------------

        # Clamp and export
        mixed_audio = np.clip(mixed_audio, -1.0, 1.0)
        sf.write(output_path, mixed_audio, sample_rate)
        print("Export complete")
    else:
        print("No audio to mix")

if __name__ == "__main__":
    main()