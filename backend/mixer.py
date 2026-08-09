import sys
import json
import numpy as np
import soundfile as sf
from pathlib import Path

def main():
    if len(sys.argv) < 4:
        sys.exit("Usage: mixer.py <stem_dir> <output_path> <json_mix_data>")

    stem_dir = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    mix_data = json.loads(sys.argv[3])

    mixed_audio = None
    sample_rate = 44100

    for stem_name, settings in mix_data.items():
        if settings['muted']:
            continue

        file_path = stem_dir / f"{stem_name}.wav"
        if not file_path.exists():
            continue

        # Load audio using soundfile natively (bypassing torchaudio completely)
        data, sr = sf.read(file_path, dtype='float32')
        sample_rate = sr

        # Apply the linear gain calculated by the React frontend
        data = data * settings['gain']

        if mixed_audio is None:
            mixed_audio = data
        else:
            mixed_audio += data

    if mixed_audio is not None:
        # Clamp between -1.0 and 1.0 to prevent digital clipping on export
        mixed_audio = np.clip(mixed_audio, -1.0, 1.0)
        sf.write(output_path, mixed_audio, sample_rate)
        print("Export complete")
    else:
        print("No audio to mix")

if __name__ == "__main__":
    main()