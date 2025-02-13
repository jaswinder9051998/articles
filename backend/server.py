from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from datetime import datetime
from urllib.parse import parse_qs, urlparse

# Configuration
FT_DIRECTORY = os.environ.get("FTIMES_BASE_DIR", r"E:\ftimes")
ECONOMIST_DIRECTORY = os.environ.get("ECONOMIST_BASE_DIR", r"E:\Economist")
PORT = int(os.environ.get("PORT", 8000))

class ArticleHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for all responses
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Parse the URL
        parsed_url = urlparse(self.path)
        
        # Handle API endpoints
        if parsed_url.path == '/get_latest_folder':
            self.handle_get_latest_folder()
        elif parsed_url.path == '/get_article_summary':
            self.handle_article_summary()
        elif parsed_url.path == '/health':
            # Add health check endpoint
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy"}).encode())
        else:
            # Serve static files from frontend directory
            self.path = '/frontend' + self.path
            super().do_GET()
    
    def get_latest_folder(self, base_dir):
        try:
            folders = [f for f in os.listdir(base_dir) 
                      if os.path.isdir(os.path.join(base_dir, f))
                      and f[0].isdigit()]
            
            if not folders:
                return None
                
            latest_folder = sorted(folders)[-1]
            return os.path.join(base_dir, latest_folder)
            
        except Exception as e:
            print(f"Error finding latest folder in {base_dir}: {e}")
            return None
    
    def handle_get_latest_folder(self):
        try:
            latest_ft = self.get_latest_folder(FT_DIRECTORY)
            latest_economist = self.get_latest_folder(ECONOMIST_DIRECTORY)
            
            if not latest_ft and not latest_economist:
                self.send_error(404, "No dated folders found in either directory")
                return
                
            latest_folders = []
            if latest_ft:
                latest_folders.append(latest_ft)
            if latest_economist:
                latest_folders.append(latest_economist)
                
            latest_folder = sorted(latest_folders)[-1]
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"folder": latest_folder}).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_article_summary(self):
        try:
            latest_ft = self.get_latest_folder(FT_DIRECTORY)
            latest_economist = self.get_latest_folder(ECONOMIST_DIRECTORY)
            
            if not latest_ft and not latest_economist:
                self.send_error(404, "No dated folders found in either directory")
                return
            
            summaries = []
            
            # Check FT directory
            if latest_ft:
                ft_summary_path = os.path.join(latest_ft, "article_summary.txt")
                if os.path.exists(ft_summary_path):
                    with open(ft_summary_path, 'r', encoding='utf-8') as f:
                        summaries.append(f.read())
            
            # Check Economist directory
            if latest_economist:
                economist_summary_path = os.path.join(latest_economist, "article_summary.txt")
                if os.path.exists(economist_summary_path):
                    with open(economist_summary_path, 'r', encoding='utf-8') as f:
                        summaries.append(f.read())
            
            if not summaries:
                self.send_error(404, "No article summaries found in either directory")
                return
            
            combined_summary = "\n\n" + "="*80 + "\n\n".join(summaries)
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(combined_summary.encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, str(e))

def run(server_class=HTTPServer, handler_class=ArticleHandler, port=PORT):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Starting server on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run() 