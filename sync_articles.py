import os
import shutil
from datetime import datetime
import sys

def sync_directory(source_dir, target_dir):
    """Sync local directory to repository directory"""
    try:
        # Create target directory if it doesn't exist
        os.makedirs(target_dir, exist_ok=True)

        # Get list of local folders
        local_folders = [f for f in os.listdir(source_dir) 
                        if os.path.isdir(os.path.join(source_dir, f))
                        and f[0].isdigit()]

        # Sort folders by date (assuming YYYY-MM-DD format)
        local_folders.sort()

        # Keep only the 5 most recent folders
        folders_to_sync = local_folders[-5:]

        print(f"Found {len(folders_to_sync)} recent folders to sync")

        for folder in folders_to_sync:
            source_folder_path = os.path.join(source_dir, folder)
            target_folder_path = os.path.join(target_dir, folder)

            # Create target folder
            os.makedirs(target_folder_path, exist_ok=True)

            # Sync article_summary.txt
            source_summary = os.path.join(source_folder_path, "article_summary.txt")
            if os.path.exists(source_summary):
                target_summary = os.path.join(target_folder_path, "article_summary.txt")
                print(f"Syncing {source_summary} to {target_summary}")
                shutil.copy2(source_summary, target_summary)

        print("Sync completed successfully!")

    except Exception as e:
        print(f"Error during sync: {str(e)}")
        raise

def main():
    # Source directory (your local E:\ftimes)
    source_dir = r"E:\ftimes"
    
    # Target directory (in the repository)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_dir = os.path.join(script_dir, "data", "ftimes")

    print(f"Syncing from {source_dir} to {target_dir}...")
    sync_directory(source_dir, target_dir)

    print("\nNext steps:")
    print("1. Review the changes in the data/ftimes directory")
    print("2. Commit and push the changes to GitHub:")
    print("   git add data/ftimes")
    print('   git commit -m "Update article summaries"')
    print("   git push")

if __name__ == "__main__":
    main() 