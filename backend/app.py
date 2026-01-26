#!/usr/bin/env python3
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from modules.database import WeatherDatabase
from modules.scraper import WeatherScraper

class WeatherAPIHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Allow initializing without args for testing/inheritance if needed
        # but BaseHTTPRequestHandler requires args usually provided by HTTPServer
        
        # We need to initialize db and scraper before calling super().__init__
        # because the super class constructor calls do_GET/do_POST immediately
        # when a request comes in (but here we are defining the class, not instance per request...
        # actually BaseHTTPRequestHandler is instantiated per request).
        # So we should initialize shared resources at class level or pass them in?
        # Standard way is to set them on the handler class or use global variables.
        # But here we can just init them in init.
        
        # However, BaseHTTPRequestHandler signature is (request, client_address, server)
        # We should not override __init__ signature if used by HTTPServer.
        pass

    def __init__(self, request, client_address, server):
        # Initialize resources
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        self.db = WeatherDatabase(os.path.join(data_dir, 'weather_data.db'))
        self.scraper = WeatherScraper()
        
        super().__init__(request, client_address, server)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query)
        
        try:
            if path == '/api/weather/latest':
                data = self.db.get_latest_data()
                self.send_json_response(data)
                
            elif path == '/api/weather/data':
                start_date = query_params.get('start_date', [None])[0]
                end_date = query_params.get('end_date', [None])[0]
                station_code = query_params.get('station_code', [None])[0]
                limit = query_params.get('limit', [None])[0]
                
                # フロントエンドからの日時は既に日本時間なので、そのまま使用
                if start_date:
                    from datetime import datetime
                    dt = datetime.fromisoformat(start_date.replace('T', ' '))
                    start_date = dt.strftime('%Y-%m-%d %H:%M:%S')
                
                if end_date:
                    from datetime import datetime
                    dt = datetime.fromisoformat(end_date.replace('T', ' '))
                    end_date = dt.strftime('%Y-%m-%d %H:%M:%S')
                
                print(f"DEBUG: Using JST directly - start_date: {start_date}, end_date: {end_date}, station_code: {station_code}")
                
                if limit:
                    limit = int(limit)
                
                data = self.db.get_weather_data(start_date, end_date, station_code, limit)
                print(f"DEBUG: Found {len(data)} records")
                self.send_json_response(data)
                
            elif path == '/api/weather/stats':
                count = self.db.get_data_count()
                self.send_json_response({'total_records': count})
                
            elif path == '/api/weather/last-scraped':
                last_record = self.db.get_latest_data()
                if last_record:
                    self.send_json_response({
                        'last_scraped': last_record[0]['created_at']
                    })
                else:
                    self.send_json_response({'last_scraped': None})
                
            elif path == '/api/stations':
                self.send_json_response(self.scraper.stations)
                
            elif path.startswith('/assets/') or path == '/vite.svg':
                asset_rel_path = path.lstrip('/')
                file_path = os.path.join('/app/static', asset_rel_path)
                if os.path.exists(file_path):
                    if file_path.endswith('.html'):
                        content_type = 'text/html'
                    elif file_path.endswith('.js'):
                        content_type = 'application/javascript'
                    elif file_path.endswith('.css'):
                        content_type = 'text/css'
                    elif file_path.endswith('.svg'):
                        content_type = 'image/svg+xml'
                    else:
                        content_type = 'application/octet-stream'

                    self.send_response(200)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()

                    with open(file_path, 'rb') as f:
                        self.wfile.write(f.read())
                else:
                    self.send_json_response({'error': 'Not found'}, 404)

            elif path.startswith('/static/'):
                static_path = path[8:]
                if not static_path:
                    static_path = 'index.html'
                
                file_path = os.path.join('/app/static', static_path)
                if os.path.exists(file_path):
                    if static_path.endswith('.html'):
                        content_type = 'text/html'
                    elif static_path.endswith('.js'):
                        content_type = 'application/javascript'
                    elif static_path.endswith('.css'):
                        content_type = 'text/css'
                    else:
                        content_type = 'application/octet-stream'
                    
                    self.send_response(200)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    with open(file_path, 'rb') as f:
                        self.wfile.write(f.read())
                else:
                    index_path = '/app/static/index.html'
                    if os.path.exists(index_path):
                        self.send_response(200)
                        self.send_header('Content-Type', 'text/html')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        
                        with open(index_path, 'rb') as f:
                            self.wfile.write(f.read())
                    else:
                        self.send_json_response({'error': 'Not found'}, 404)
                
            else:
                self.send_json_response({'error': 'Not found'}, 404)
                
        except Exception as e:
            print(f"Error handling GET request: {e}")
            self.send_json_response({'error': str(e)}, 500)
    
    def do_POST(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        
        try:
            if path == '/api/weather/scrape':
                print("Starting weather data scraping...")
                scraped_data = self.scraper.scrape_all_stations()
                
                if scraped_data:
                    saved_count = self.db.save_weather_data(scraped_data)
                    self.send_json_response({
                        'success': True,
                        'message': f'Successfully scraped and saved {saved_count} records',
                        'records_saved': saved_count
                    })
                else:
                    self.send_json_response({
                        'success': False,
                        'message': 'No data was scraped'
                    })
            else:
                self.send_json_response({'error': 'Not found'}, 404)
                
        except Exception as e:
            print(f"Error handling POST request: {e}")
            self.send_json_response({'error': str(e)}, 500)

def run_server(port=8000):
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, WeatherAPIHandler)
    print(f"Starting Python weather API server on port {port}")
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    print(f"Database will be saved as: {os.path.join(data_dir, 'weather_data.db')}")
    print("Available endpoints:")
    print("  GET  /api/weather/latest - Get latest data from all stations")
    print("  GET  /api/weather/data - Get weather data with optional filters")
    print("  GET  /api/stations - Get station information")
    print("  POST /api/weather/scrape - Scrape new data from all stations")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(logs_dir, exist_ok=True)
    
    run_server(port)