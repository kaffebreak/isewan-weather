import json
import os
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import time

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

class WeatherScraper:
    def __init__(self):
        self.stations = self._load_stations()
    
    def _load_stations(self):
        try:
            # Assuming stations.json is in parent directory of modules
            # app.py is in backend/, this file is in backend/modules/
            # so move up one level from this file's dir
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            json_path = os.path.join(base_dir, 'stations.json')
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading stations: {e}")
            return []
    
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
