import os
import shutil
from datetime import datetime
import sys
import subprocess

def run_git_command(command):
    """Run a git command and return the output"""
    try:
        result = subprocess.run(command, 
                              capture_output=True, 
                              text=True, 
                              shell=True, 
                              check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Git command failed: {e.stderr}")
        return None

def git_commit_and_push():
    """Commit changes and push to remote repository"""
    # Add the changes
    if run_git_command("git add data/article_summary.txt") is None:
        return False
    
    # Create commit message with timestamp
    commit_message = f"Update article summaries - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    if run_git_command(f'git commit -m "{commit_message}"') is None:
        return False
    
    # Push changes
    if run_git_command("git push") is None:
        return False
    
    return True

def sync_directory(source_dir, target_base_dir, source_name):
    """Sync and concatenate summaries from source directory"""
    try:
        # Get list of all dated folders
        folders = [f for f in os.listdir(source_dir) 
                  if os.path.isdir(os.path.join(source_dir, f))
                  and f[0].isdigit()]
        
        # Sort folders by date
        folders.sort()
        
        summaries = []
        
        # Collect all summaries
        for folder in folders:
            source_folder_path = os.path.join(source_dir, folder)
            summary_path = os.path.join(source_folder_path, "article_summary.txt")
            
            if os.path.exists(summary_path):
                print(f"Reading summary from {summary_path}")
                with open(summary_path, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:  # Only add non-empty summaries
                        summaries.append(f"Source: {source_name}")
                        summaries.append(f"Date: {folder}")
                        summaries.append(content)
                        summaries.append("=" * 80)  # Separator
        
        return summaries

    except Exception as e:
        print(f"Error processing {source_dir}: {str(e)}")
        return []

def main():
    # Source directories
    ft_source = r"E:\ftimes"
    economist_source = r"E:\Economist"
    
    # Target directory (in the repository)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "data")
    
    # Create data directory if it doesn't exist
    os.makedirs(data_dir, exist_ok=True)
    
    all_summaries = []
    
    # Process FT articles
    if os.path.exists(ft_source):
        ft_summaries = sync_directory(ft_source, data_dir, "Financial Times")
        all_summaries.extend(ft_summaries)
    
    # Process Economist articles
    if os.path.exists(economist_source):
        economist_summaries = sync_directory(economist_source, data_dir, "The Economist")
        all_summaries.extend(economist_summaries)
    
    # Write combined summaries to single file
    if all_summaries:
        combined_file = os.path.join(data_dir, "article_summary.txt")
        print(f"Writing combined summaries to {combined_file}")
        with open(combined_file, 'w', encoding='utf-8') as f:
            f.write("\n\n".join(all_summaries))
        print("Combined summary file created successfully!")
        
        #Attempt to commit and push changes
        print("\nCommitting and pushing changes...")
        if git_commit_and_push():
            print("Successfully committed and pushed changes to GitHub!")
        else:
            print("Failed to commit and push changes. Please do it manually:")
            print("   git add data/article_summary.txt")
            print('   git commit -m "Update article summaries"')
            print("   git push")
    else:
        print("No summaries found to combine!")

if __name__ == "__main__":
    main() 