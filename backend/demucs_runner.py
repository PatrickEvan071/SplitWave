import sys
import subprocess
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("file_path", help="Path to the audio file")
    args = parser.parse_args()

    file_path = Path(args.file_path)
    # Saves the tracks in a 'separated' folder inside your backend directory
    output_dir = Path(__file__).parent / "separated" 

    print(f"Processing: {file_path}")

    # THE FIX: Using sys.executable bypasses Windows PATH issues completely 
    # by forcing the current Python environment to run the module directly.
    command = [
            sys.executable, 
            "-m", "demucs.separate",
            "-n", "htdemucs_6s", # <-- CHANGED TO 6-STEM MODEL
            "-o", str(output_dir),
            str(file_path)
        ]

    try:
        subprocess.run(command, check=True)
        print("Successfully separated tracks!")
    except Exception as e:
        print(f"Error running demucs: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()