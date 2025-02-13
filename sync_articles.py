import os
import paramiko
import sys
from datetime import datetime
import json
import argparse

def load_config():
    """Load configuration from config.json"""
    try:
        with open('sync_config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "host": "",
            "username": "",
            "private_key_path": "",
            "remote_path": "/data/ftimes",
            "local_path": r"E:\ftimes"
        }

def save_config(config):
    """Save configuration to config.json"""
    with open('sync_config.json', 'w') as f:
        json.dump(config, f, indent=4)

def setup_sftp_connection(config):
    """Set up SFTP connection using private key authentication"""
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        private_key = paramiko.RSAKey.from_private_key_file(config['private_key_path'])
        
        ssh.connect(
            hostname=config['host'],
            username=config['username'],
            pkey=private_key
        )
        
        sftp = ssh.open_sftp()
        return ssh, sftp
    except Exception as e:
        print(f"Error connecting to server: {str(e)}")
        sys.exit(1)

def sync_directory(sftp, local_dir, remote_dir):
    """Sync local directory to remote directory"""
    try:
        # Create remote directory if it doesn't exist
        try:
            sftp.mkdir(remote_dir)
        except IOError:
            pass  # Directory probably already exists

        # Get list of local folders
        local_folders = [f for f in os.listdir(local_dir) 
                        if os.path.isdir(os.path.join(local_dir, f))
                        and f[0].isdigit()]

        # Sort folders by date (assuming YYYY-MM-DD format)
        local_folders.sort()

        # Keep only the 5 most recent folders
        folders_to_sync = local_folders[-5:]

        print(f"Found {len(folders_to_sync)} recent folders to sync")

        for folder in folders_to_sync:
            local_folder_path = os.path.join(local_dir, folder)
            remote_folder_path = f"{remote_dir}/{folder}"

            # Create remote folder
            try:
                sftp.mkdir(remote_folder_path)
            except IOError:
                pass  # Folder might already exist

            # Sync article_summary.txt
            local_summary = os.path.join(local_folder_path, "article_summary.txt")
            if os.path.exists(local_summary):
                remote_summary = f"{remote_folder_path}/article_summary.txt"
                print(f"Syncing {local_summary} to {remote_summary}")
                sftp.put(local_summary, remote_summary)

        print("Sync completed successfully!")

    except Exception as e:
        print(f"Error during sync: {str(e)}")
        raise

def main():
    parser = argparse.ArgumentParser(description='Sync articles to render.com')
    parser.add_argument('--configure', action='store_true', help='Configure connection settings')
    args = parser.parse_args()

    config = load_config()

    if args.configure or not all([config['host'], config['username'], config['private_key_path']]):
        print("Please configure your connection settings:")
        config['host'] = input("Enter render.com SFTP hostname: ").strip()
        config['username'] = input("Enter SFTP username: ").strip()
        config['private_key_path'] = input("Enter path to private key file: ").strip()
        save_config(config)
        print("Configuration saved!")
        return

    print(f"Connecting to {config['host']}...")
    ssh, sftp = setup_sftp_connection(config)

    try:
        print("Starting sync process...")
        sync_directory(sftp, config['local_path'], config['remote_path'])
    finally:
        sftp.close()
        ssh.close()

if __name__ == "__main__":
    main() 