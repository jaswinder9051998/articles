from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from datetime import datetime
from urllib.parse import parse_qs, urlparse
import pathlib

# Configuration
IS_PRODUCTION = True  # Force production mode since we're deploying to render.com

if IS_PRODUCTION:
    # In production, use paths relative to the current working directory
    BASE_DIR = os.path.abspath(os.path.join(os.getcwd(), '..'))
    print(f"Base directory: {BASE_DIR}")
    SUMMARY_FILE = os.path.join(BASE_DIR, "data", "article_summary.txt")
else:
    # In development, use local paths
    SUMMARY_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "article_summary.txt")

PORT = int(os.environ.get("PORT", 8000))
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

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
        if parsed_url.path == '/get_article_summary':
            self.handle_article_summary()
        elif parsed_url.path == '/health':
            self.handle_health_check()
        else:
            # Serve static files from frontend directory
            if self.path == '/':
                self.path = '/index.html'
            
            file_path = os.path.join(FRONTEND_DIR, self.path.lstrip('/'))
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                self.send_response(200)
                if file_path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css')
                elif file_path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                elif file_path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html')
                self.end_headers()
                
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, "File not found")

    def handle_health_check(self):
        response = {
            "status": "healthy",
            "environment": "production" if IS_PRODUCTION else "development",
            "summary_file": SUMMARY_FILE,
            "summary_file_exists": os.path.exists(SUMMARY_FILE)
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response, indent=2).encode())
    
    def handle_article_summary(self):
        try:
            if not os.path.exists(SUMMARY_FILE):
                self.send_error(404, "No article summaries found")
                return
            
            with open(SUMMARY_FILE, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if not content.strip():
                self.send_error(404, "No article summaries found")
                return
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, str(e))

def run(server_class=HTTPServer, handler_class=ArticleHandler, port=PORT):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Starting server on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run() 