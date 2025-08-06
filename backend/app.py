#!/usr/bin/env python3
import json
import sqlite3
import requests
from bs4 import BeautifulSoup
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import re
from datetime import datetime, timedelta
import threading
import time
import os

class HTMLTableParser:
    def __init__(self):
        self.rows = []
    
    def parse_html(self, html_content):
        """Parse HTML content using BeautifulSoup"""
        soup = BeautifulSoup(html_content, 'html.parser')
        tables = soup.find_all('table')
        
        for table in tables:
            rows = []
            for tr in table.find_all('tr'):
                row = []
                for cell in tr.find_all(['td', 'th']):
                    row.append(cell.get_text(strip=True))
                if row:  # Only add non-empty rows
                    rows.append(row)
            
            if rows:
                self.rows = rows
                break  # Use the first table with data

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
                'has_wave_height': False,  # 波高なし
                'update_interval': 15  # 15分更新
            },
            {
                'name': '伊勢湾2号ブイ',
                'code': 'iragosuido_southeast_aisss',
                'url': 'https://www6.kaiho.mlit.go.jp/isewan/kisyou/iragosuido_southeast_aisss.html',
                'has_wave_height': True,  # 波高あり
                'update_interval': 30  # 30分更新
            },
            {
                'name': '大王埼灯台',
                'code': 'daiosaki_lt',
                'url': 'https://www6.kaiho.mlit.go.jp/isewan/kisyou/daiosaki_lt.html',
                'has_wave_height': True,  # 波高あり（気圧の後）
                'update_interval': 15  # 15分更新
            },
            {
                'name': '名古屋港高潮防波堤',
                'code': 'nagoyako_bw',
                'url': 'https://www6.kaiho.mlit.go.jp/nagoyako/kisyou/nagoyako_bw.html',
                'has_wave_height': False,  # 波高なし
                'update_interval': 15  # 15分更新
            },
            {
                'name': '四日市港防波堤信号所',
                'code': 'yokkaichiko_bkw_lt',
                'url': 'https://www6.kaiho.mlit.go.jp/04kanku/yokkaichi/yokkaichiko_bkw_lt/kisyou/index.html',
                'has_wave_height': False,  # 波高なし
                'update_interval': 30  # 30分更新
            }
        ]
    
    def fetch_page_content(self, url):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            # Try different encodings
            for encoding in ['utf-8', 'shift_jis', 'euc-jp']:
                try:
                    response.encoding = encoding
                    return response.text
                except UnicodeDecodeError:
                    continue
            
            # Fallback to utf-8 with errors='ignore'
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
            return None
    
    def parse_table_data(self, html_content, station_code, has_wave_height):
        parser = HTMLTableParser()
        parser.parse_html(html_content)
        
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
                # Handle different table structures
                if len(row) >= 4:  # Date and time in separate columns
                    date_text = row[0].strip()
                    time_text = row[1].strip()
                    wind_dir_text = row[2].strip()
                    wind_speed_text = row[3].strip()
                    # Check if there's a wave height column (last column)
                    wave_height_text = row[-1].strip() if len(row) > 4 else ''
                else:  # Time in first column
                    time_text = row[0].strip()
                    wind_dir_text = row[1].strip()
                    wind_speed_text = row[2].strip()
                    wave_height_text = row[3].strip() if len(row) > 3 else ''
                    date_text = None
                
                # Parse time
                current_date = datetime.now()
                if ':' in time_text:
                    try:
                        time_parts = time_text.split(':')
                        hours = int(time_parts[0])
                        minutes = int(time_parts[1]) if len(time_parts) > 1 else 0
                        timestamp = current_date.replace(hour=hours, minute=minutes, second=0, microsecond=0)
                        
                        # If we have a date, use it instead of current date
                        if date_text and '/' in date_text:
                            try:
                                date_parts = date_text.split('/')
                                year = int(date_parts[0])
                                month = int(date_parts[1])
                                day = int(date_parts[2])
                                timestamp = timestamp.replace(year=year, month=month, day=day)
                            except (ValueError, IndexError):
                                pass  # Use current date if date parsing fails
                    except ValueError:
                        continue
                else:
                    continue
                
                # Parse wind speed
                wind_speed = None
                if wind_speed_text and wind_speed_text != '-':
                    try:
                        # Extract numeric value (handle formats like "8m", "8.5m/s", etc.)
                        numeric_match = re.search(r'(\d+\.?\d*)', wind_speed_text)
                        if numeric_match:
                            wind_speed = float(numeric_match.group(1))
                    except ValueError:
                        pass
                
                # Parse wave height
                wave_height = None
                if wave_height_text and wave_height_text != '-':
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
                # Find the closest data point for this station based on update interval
                station_data = self._find_closest_data(all_data, station, ref_time)
                
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
    
    def _find_closest_data(self, all_data, station, reference_time):
        """Find the closest data point for a station based on its update interval"""
        station_data = [d for d in all_data if d['station_code'] == station['code']]
        
        if not station_data:
            return None
        
        # Try exact match first
        exact_match = next((d for d in station_data if d['timestamp'] == reference_time), None)
        if exact_match:
            return exact_match
        
        # If no exact match, find the closest data within the update interval
        ref_dt = datetime.fromisoformat(reference_time)
        update_interval = station.get('update_interval', 15)  # Default to 15 minutes
        
        for data in station_data:
            data_dt = datetime.fromisoformat(data['timestamp'])
            time_diff = abs((ref_dt - data_dt).total_seconds() / 60)  # Difference in minutes
            
            # If within update interval, use this data
            if time_diff <= update_interval:
                return data
        
        # If no data within interval, return the closest one
        closest_data = min(station_data, key=lambda d: abs((ref_dt - datetime.fromisoformat(d['timestamp'])).total_seconds()))
        return closest_data

class WeatherAPIHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.db = WeatherDatabase()
        self.scraper = WeatherScraper()
        super().__init__(*args, **kwargs)
    
    def do_OPTIONS(self):
        self.send_response(200)
        # 本番環境では特定のドメインを指定することを推奨
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        # 本番環境では特定のドメインを指定することを推奨
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
    import os
    port = int(os.environ.get('PORT', 8000))
    run_server(port)