import argparse
import os
import subprocess
import sys

def main():
    parser = argparse.ArgumentParser(description='Run Demucs audio separation')
    parser.add_argument('audio_file', type=str, help='Path to the input audio file')
    parser.add_argument('--output', type=str, default='separated', help='Output folder for separated tracks (default: separated)')
    args = parser.parse_args()

    # Validate input file
    if not os.path.exists(args.audio_file):
        print(f"Error: Input file not found: {args.audio_file}")
        sys.exit(1)

    # Create output directory if it doesn't exist
    os.makedirs(args.output, exist_ok=True)

    # Run Demucs separation (Defaults to 4 stems: vocals, bass, drums, other)
    command = [
        'demucs',
        '-o', args.output,
        args.audio_file
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Separation completed. Output saved to: {args.output}")
    except subprocess.CalledProcessError as e:
        print(f"Error running Demucs: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()