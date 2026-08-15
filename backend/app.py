#!/usr/bin/env python3
import json
import logging
import os
import threading
import time
from datetime import datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from modules.database import MAX_PAGE_SIZE, MAX_QUERY_OFFSET, WeatherDatabase
from modules.scraper import WeatherScraper


STATIC_ROOT = '/app/static'
SCRAPE_INTERVAL_SECONDS = 5 * 60

CONTENT_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
}


class RequestValidationError(ValueError):
    """Raised when an API query parameter cannot be accepted."""


class WeatherAPIHandler(BaseHTTPRequestHandler):
    # db/scraper are created once in run_server() and shared by every
    # request through the server instance, instead of being rebuilt (and
    # re-running schema init) on every single request.
    @property
    def db(self):
        return self.server.db

    @property
    def scraper(self):
        return self.server.scraper

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

    @staticmethod
    def _resolve_static_path(rel_path):
        """Resolve a request path to a real file path inside STATIC_ROOT.

        Returns None if the resolved path would escape STATIC_ROOT (e.g. via
        `..` segments in the URL), which prevents path traversal.
        """
        root = os.path.realpath(STATIC_ROOT)
        candidate = os.path.realpath(os.path.join(root, rel_path.lstrip('/')))
        if candidate != root and not candidate.startswith(root + os.sep):
            return None
        return candidate

    def _serve_static_file(self, file_path):
        _, ext = os.path.splitext(file_path)
        content_type = CONTENT_TYPES.get(ext, 'application/octet-stream')

        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        with open(file_path, 'rb') as f:
            self.wfile.write(f.read())

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
                file_path = self._resolve_static_path(path)
                if file_path and os.path.isfile(file_path):
                    self._serve_static_file(file_path)
                else:
                    self.send_json_response({'error': 'Not found'}, 404)

            elif path.startswith('/static/'):
                rel_path = path[len('/static/'):] or 'index.html'
                file_path = self._resolve_static_path(rel_path)
                if file_path and os.path.isfile(file_path):
                    self._serve_static_file(file_path)
                else:
                    index_path = self._resolve_static_path('index.html')
                    if index_path and os.path.isfile(index_path):
                        self._serve_static_file(index_path)
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


class WeatherAPIServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, server_address, handler_class, db, scraper):
        super().__init__(server_address, handler_class)
        self.db = db
        self.scraper = scraper


def run_periodic_scrape(db, scraper, interval_seconds):
    """Background loop that replaces the old root-owned cron job.

    Runs as a daemon thread inside the API process so scheduled scraping
    keeps working without granting the container root just to run cron.
    """
    while True:
        time.sleep(interval_seconds)
        try:
            print(f"[{datetime.now()}] Starting scheduled weather data scraping...")
            latest_timestamps = {
                item['station_code']: item['timestamp']
                for item in db.get_latest_data()
            }
            scraped_data = scraper.scrape_all_stations()
            new_data = [
                item for item in scraped_data
                if item['timestamp'] > latest_timestamps.get(item['station_code'], '')
            ]

            if new_data:
                saved_count = db.save_weather_data(new_data)
                print(f"[{datetime.now()}] Saved {saved_count} new records")
            else:
                print(f"[{datetime.now()}] No new data to save")
        except Exception as e:
            print(f"[{datetime.now()}] Error during scheduled scraping: {e}")


def run_server(port=8000, host='0.0.0.0'):
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)

    db = WeatherDatabase(os.path.join(data_dir, 'weather_data.db'))
    scraper = WeatherScraper()

    scrape_thread = threading.Thread(
        target=run_periodic_scrape,
        args=(db, scraper, SCRAPE_INTERVAL_SECONDS),
        daemon=True,
    )
    scrape_thread.start()

    server_address = (host, port)
    httpd = WeatherAPIServer(server_address, WeatherAPIHandler, db, scraper)
    print(f"Starting Python weather API server on {host}:{port}")
    print(f"Database will be saved as: {os.path.join(data_dir, 'weather_data.db')}")
    print(f"Automatic scraping runs every {SCRAPE_INTERVAL_SECONDS // 60} minute(s)")
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
    # WARNING/ERROR (e.g. the scraper's "0 records parsed" anomaly alerts)
    # show up by default; set LOG_LEVEL=DEBUG for the scraper's per-request
    # encoding/table-count diagnostics.
    logging.basicConfig(
        level=os.environ.get('LOG_LEVEL', 'INFO'),
        format='%(asctime)s %(levelname)s %(name)s: %(message)s',
    )

    port = int(os.environ.get('PORT', 8000))
    host = os.environ.get('HOST', '0.0.0.0')

    run_server(port, host)
