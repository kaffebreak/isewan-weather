#!/usr/bin/env python3
import json
import sqlite3
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import re
from datetime import datetime, timedelta
import html.parser
import threading
import time
import os

class HTMLTableParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.current_row = []
        self.rows = []
        self.cell_data = ""
        
    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.in_table = True
        elif tag == 'tr' and self.in_table:
            self.in_row = True
            self.current_row = []
        elif tag in ['td', 'th'] and self.in_row:
            self.in_cell = True
            self.cell_data = ""
    
    def handle_endtag(self, tag):
        if tag == 'table':
            self.in_table = False
        elif tag == 'tr' and self.in_row:
            self.in_row = False
            if self.current_row:
                self.rows.append(self.current_row)
        elif tag in ['td', 'th'] and self.in_cell:
            self.in_cell = False
            self.current_row.append(self.cell_data.strip())
    
    def handle_data(self, data):
        if self.in_cell:
            self.cell_data += data

class WeatherDatabase:
    def __init__(self, db_path='weather_data.db'):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS weather_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                station_name TEXT NOT NULL,
                station_code TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                wind_direction TEXT,
                wind_speed REAL,
                wave_height REAL,
                created_at TEXT NOT NULL,
                UNIQUE(station_code, timestamp)
            )
        ''')
        
        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_station_timestamp ON weather_data(station_code, timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON weather_data(timestamp)')
        
        conn.commit()
        conn.close()
        print(f"Database initialized: {self.db_path}")
    
    def save_weather_data(self, data_list):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        saved_count = 0
        for data in data_list:
            try:
                cursor.execute('''
                    INSERT OR REPLACE INTO weather_data 
                    (station_name, station_code, timestamp, wind_direction, wind_speed, wave_height, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data['station_name'],
                    data['station_code'],
                    data['timestamp'],
                    data.get('wind_direction'),
                    data.get('wind_speed'),
                    data.get('wave_height'),
                    datetime.now().isoformat()
                ))
                saved_count += 1
            except Exception as e:
                print(f"Error saving data: {e}")
        
        conn.commit()
        conn.close()
        print(f"Saved {saved_count} weather records to database")
        return saved_count
    
    def get_weather_data(self, start_date=None, end_date=None, station_code=None, limit=None):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM weather_data WHERE 1=1'
        params = []
        
        if start_date:
            query += ' AND timestamp >= ?'
            params.append(start_date)
        
        if end_date:
            query += ' AND timestamp <= ?'
            params.append(end_date)
        
        if station_code:
            query += ' AND station_code = ?'
            params.append(station_code)
        
        query += ' ORDER BY timestamp DESC'
        
        if limit:
            query += ' LIMIT ?'
            params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        columns = ['id', 'station_name', 'station_code', 'timestamp', 
                  'wind_direction', 'wind_speed', 'wave_height', 'created_at']
        
        return [dict(zip(columns, row)) for row in rows]
    
    def get_latest_data(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM weather_data w1
            WHERE timestamp = (
                SELECT MAX(timestamp) FROM weather_data w2 
                WHERE w2.station_code = w1.station_code
            )
            ORDER BY station_code
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        columns = ['id', 'station_name', 'station_code', 'timestamp', 
                  'wind_direction', 'wind_speed', 'wave_height', 'created_at']
        
        return [dict(zip(columns, row)) for row in rows]
    
    def get_data_count(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM weather_data')
        count = cursor.fetchone()[0]
        conn.close()
        return count

class WeatherScraper:
    def __init__(self):
        self.stations = [
            {
                'name': '伊良湖岬',
                'code': 'iragomisaki_vtss',
                'url': 'https://www6.kaiho.mlit.go.jp/isewan/kisyou/iragomisaki_vtss.html',
                'has_wave_height': True
            },
            {
                'name': '伊勢湾2番ブイ',
                'code': 'iragosuido_southeast_aisss',
                'url': 'https://www6.kaiho.mlit.go.jp/isewan/kisyou/iragosuido_southeast_aisss.html',
                'has_wave_height': True
            },
            {
                'name': '大王埼灯台',
                'code': 'daiosaki_lt',
                'url': 'https://www6.kaiho.mlit.go.jp/isewan/kisyou/daiosaki_lt.html',
                'has_wave_height': False
            },
            {
                'name': '高潮防波堤',
                'code': 'nagoyako_bw',
                'url': 'https://www6.kaiho.mlit.go.jp/nagoyako/kisyou/nagoyako_bw.html',
                'has_wave_height': False
            },
            {
                'name': '四日市防波堤信号所',
                'code': 'yokkaichiko_bkw_lt',
                'url': 'https://www6.kaiho.mlit.go.jp/04kanku/yokkaichi/yokkaichiko_bkw_lt/kisyou/index.html',
                'has_wave_height': False
            }
        ]
    
    def fetch_page_content(self, url):
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                content = response.read()
                # Try different encodings
                for encoding in ['utf-8', 'shift_jis', 'euc-jp']:
                    try:
                        return content.decode(encoding)
                    except UnicodeDecodeError:
                        continue
                return content.decode('utf-8', errors='ignore')
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
            return None
    
    def parse_table_data(self, html_content, station_code, has_wave_height):
        parser = HTMLTableParser()
        parser.feed(html_content)
        
        if not parser.rows:
            print(f"No table found for station: {station_code}")
            return []
        
        data = []
        header_found = False
        
        for row in parser.rows:
            if not header_found:
                # Look for header row containing time-related keywords
                row_text = ' '.join(row).lower()
                if '時刻' in row_text or 'time' in row_text or '時' in row_text:
                    header_found = True
                continue
            
            if len(row) < 3:
                continue
            
            try:
                time_text = row[0].strip()
                wind_dir_text = row[1].strip()
                wind_speed_text = row[2].strip()
                wave_height_text = row[3].strip() if has_wave_height and len(row) > 3 else ''
                
                # Parse time
                current_date = datetime.now()
                if ':' in time_text:
                    try:
                        time_parts = time_text.split(':')
                        hours = int(time_parts[0])
                        minutes = int(time_parts[1]) if len(time_parts) > 1 else 0
                        timestamp = current_date.replace(hour=hours, minute=minutes, second=0, microsecond=0)
                    except ValueError:
                        continue
                else:
                    continue
                
                # Parse wind speed
                wind_speed = None
                if wind_speed_text and wind_speed_text != '-':
                    try:
                        # Extract numeric value
                        numeric_match = re.search(r'(\d+\.?\d*)', wind_speed_text)
                        if numeric_match:
                            wind_speed = float(numeric_match.group(1))
                    except ValueError:
                        pass
                
                # Parse wave height
                wave_height = None
                if has_wave_height and wave_height_text and wave_height_text != '-':
                    try:
                        numeric_match = re.search(r'(\d+\.?\d*)', wave_height_text)
                        if numeric_match:
                            wave_height = float(numeric_match.group(1))
                    except ValueError:
                        pass
                
                station_name = next((s['name'] for s in self.stations if s['code'] == station_code), station_code)
                
                weather_data = {
                    'station_name': station_name,
                    'station_code': station_code,
                    'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    'wind_direction': wind_dir_text if wind_dir_text and wind_dir_text != '-' else None,
                    'wind_speed': wind_speed,
                    'wave_height': wave_height
                }
                
                data.append(weather_data)
                
            except Exception as e:
                print(f"Error parsing row for {station_code}: {e}")
                continue
        
        return data
    
    def scrape_station(self, station):
        print(f"Scraping {station['name']}...")
        html_content = self.fetch_page_content(station['url'])
        
        if not html_content:
            return []
        
        data = self.parse_table_data(html_content, station['code'], station['has_wave_height'])
        print(f"Scraped {len(data)} records from {station['name']}")
        return data
    
    def scrape_all_stations(self):
        all_data = []
        
        for station in self.stations:
            try:
                station_data = self.scrape_station(station)
                all_data.extend(station_data)
                time.sleep(2)  # Delay between requests to be respectful
            except Exception as e:
                print(f"Failed to scrape {station['name']}: {e}")
        
        return self.align_to_reference_time(all_data)
    
    def align_to_reference_time(self, all_data):
        reference_station = 'iragomisaki_vtss'
        reference_data = [d for d in all_data if d['station_code'] == reference_station]
        
        if not reference_data:
            print("No reference station data found, returning all data")
            return all_data
        
        reference_timestamps = [d['timestamp'] for d in reference_data]
        aligned_data = []
        
        for ref_time in reference_timestamps:
            for station in self.stations:
                station_data = next((d for d in all_data 
                                   if d['station_code'] == station['code'] and d['timestamp'] == ref_time), None)
                
                if station_data:
                    aligned_data.append(station_data)
                else:
                    # Create empty record for missing data
                    aligned_data.append({
                        'station_name': station['name'],
                        'station_code': station['code'],
                        'timestamp': ref_time,
                        'wind_direction': None,
                        'wind_speed': None,
                        'wave_height': None
                    })
        
        print(f"Aligned {len(aligned_data)} records to reference time")
        return aligned_data

class WeatherAPIHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.db = WeatherDatabase()
        self.scraper = WeatherScraper()
        super().__init__(*args, **kwargs)
    
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
                
                if limit:
                    limit = int(limit)
                
                data = self.db.get_weather_data(start_date, end_date, station_code, limit)
                self.send_json_response(data)
                
            elif path == '/api/weather/stats':
                count = self.db.get_data_count()
                self.send_json_response({'total_records': count})
                
            elif path == '/api/stations':
                self.send_json_response(self.scraper.stations)
                
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
    server_address = ('', port)
    httpd = HTTPServer(server_address, WeatherAPIHandler)
    print(f"Starting Python weather API server on port {port}")
    print(f"Database will be saved as: weather_data.db")
    print("Available endpoints:")
    print("  GET  /api/weather/latest - Get latest data from all stations")
    print("  GET  /api/weather/data - Get weather data with optional filters")
    print("  GET  /api/weather/stats - Get database statistics")
    print("  GET  /api/stations - Get station information")
    print("  POST /api/weather/scrape - Scrape new data from all stations")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == '__main__':
    run_server()