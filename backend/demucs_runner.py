import sys
import argparse
import os
from pathlib import Path
from demucs.separate import main as demucs_main

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("file_path", help="Path to the audio file")
    args = parser.parse_args()

    file_path = Path(args.file_path)
    
    # Save directly to the user's Documents folder
    output_dir = Path.home() / "Documents" / "SplitWave" / "separated"
    os.makedirs(output_dir, exist_ok=True)

    print(f"Processing: {file_path}")
    print(f"Outputting to: {output_dir}")

    # Set up arguments for Demucs internally, bypassing CLI mismatch
    sys.argv = [
        "demucs",
        "-n", "htdemucs_6s",
        "-o", str(output_dir),
        str(file_path)
    ]

    try:
        demucs_main()
        print("Successfully separated tracks!")
    except Exception as e:
        print(f"Error running demucs: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()