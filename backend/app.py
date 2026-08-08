#!/usr/bin/env python3
import json
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from modules.database import MAX_PAGE_SIZE, MAX_QUERY_OFFSET, WeatherDatabase
from modules.scraper import WeatherScraper


class RequestValidationError(ValueError):
    """Raised when an API query parameter cannot be accepted."""


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

    @staticmethod
    def parse_datetime_parameter(value, name):
        if not value:
            return None

        try:
            # フロントエンドからの日時は既に日本時間なので、そのまま使用
            parsed = datetime.fromisoformat(value.replace('T', ' '))
        except (TypeError, ValueError) as error:
            raise RequestValidationError(
                f'{name} must be a valid ISO 8601 date-time'
            ) from error

        return parsed.strftime('%Y-%m-%d %H:%M:%S')

    @staticmethod
    def parse_integer_parameter(value, name, minimum, maximum=None):
        if value is None or value == '':
            if value == '':
                raise RequestValidationError(f'{name} must be an integer')
            return None

        try:
            parsed = int(value)
        except (TypeError, ValueError) as error:
            raise RequestValidationError(f'{name} must be an integer') from error

        if parsed < minimum:
            raise RequestValidationError(f'{name} must be at least {minimum}')
        if maximum is not None and parsed > maximum:
            raise RequestValidationError(f'{name} must be at most {maximum}')

        return parsed

    def get_weather_filters(self, query_params):
        start_date = self.parse_datetime_parameter(
            query_params.get('start_date', [None])[0], 'start_date'
        )
        end_date = self.parse_datetime_parameter(
            query_params.get('end_date', [None])[0], 'end_date'
        )
        station_code = query_params.get('station_code', [None])[0] or None
        return start_date, end_date, station_code
    
    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query, keep_blank_values=True)
        
        try:
            if path == '/api/weather/latest':
                data = self.db.get_latest_data()
                self.send_json_response(data)
                
            elif path == '/api/weather/data':
                start_date, end_date, station_code = self.get_weather_filters(
                    query_params
                )
                limit = self.parse_integer_parameter(
                    query_params.get('limit', [None])[0],
                    'limit',
                    minimum=1,
                    maximum=MAX_PAGE_SIZE,
                )
                offset = self.parse_integer_parameter(
                    query_params.get('offset', [None])[0],
                    'offset',
                    minimum=0,
                    maximum=MAX_QUERY_OFFSET,
                )

                data = self.db.get_weather_data(
                    start_date,
                    end_date,
                    station_code,
                    limit,
                    offset or 0,
                )
                self.send_json_response(data)
                
            elif path == '/api/weather/stats':
                start_date, end_date, station_code = self.get_weather_filters(
                    query_params
                )
                count = self.db.get_data_count(
                    start_date, end_date, station_code
                )
                self.send_json_response({'total_records': count})

            elif path == '/api/weather/wind-chart':
                start_date, end_date, station_code = self.get_weather_filters(
                    query_params
                )
                if not station_code:
                    raise RequestValidationError(
                        'station_code is required for wind charts'
                    )
                data = self.db.get_wind_chart_data(
                    start_date, end_date, station_code
                )
                self.send_json_response(data)
                
            elif path == '/api/weather/last-scraped':
                # Kept for backward compatibility. This value represents the
                # latest database write, not the time of a scrape attempt.
                self.send_json_response({
                    'last_scraped': self.db.get_last_updated_at()
                })

            elif path == '/api/weather/last-updated':
                self.send_json_response({
                    'last_updated': self.db.get_last_updated_at()
                })
                
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
                
        except RequestValidationError as e:
            self.send_json_response({'error': str(e)}, 400)
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

def run_server(port=8000, host='0.0.0.0'):
    server_address = (host, port)
    httpd = HTTPServer(server_address, WeatherAPIHandler)
    print(f"Starting Python weather API server on {host}:{port}")
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
    host = os.environ.get('HOST', '0.0.0.0')
    
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(logs_dir, exist_ok=True)
    
    run_server(port, host)
