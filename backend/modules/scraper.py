import json
import logging
import os
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timedelta
import time

logger = logging.getLogger(__name__)

class HTMLTableParser:
    def __init__(self):
        self.rows = []
        self.table_count = 0

    def parse_html(self, html_content):
        """Parse HTML content using BeautifulSoup.

        `html_content` should be raw bytes rather than a pre-decoded str.
        Bytes let BeautifulSoup's UnicodeDammit resolve the real encoding
        itself (checking any in-page <meta charset> declaration first,
        then falling back to content-based sniffing) instead of trusting
        a charset that was already baked into a decoded string.
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        tables = soup.find_all('table')
        self.table_count = len(tables)
        logger.debug(
            "Parsed HTML using detected encoding=%r: found %d table(s)",
            getattr(soup, 'original_encoding', None), self.table_count,
        )

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
    # If every station returns 0 records for this many scrape cycles in a
    # row, treat it as a scraper failure (bad HTML/encoding, site layout
    # change, etc.) rather than a genuine lack of new upstream data --
    # the 2026-08-15 mojibake outage looked identical to "no new data"
    # for hours before anyone noticed.
    CONSECUTIVE_EMPTY_SCRAPE_ALERT_THRESHOLD = 3

    def __init__(self):
        self.stations = self._load_stations()
        self._consecutive_empty_scrapes = 0

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

            content_type = response.headers.get('Content-Type', '')
            logger.debug(
                "Fetched %s: Content-Type=%r requests_encoding=%r apparent_encoding=%r",
                url, content_type, response.encoding, response.apparent_encoding,
            )

            # Some of these government sites don't declare a charset in
            # their Content-Type header. Per RFC 2616, `requests` then
            # defaults response.encoding to ISO-8859-1 (rather than
            # leaving it unset) -- this is almost never correct for a
            # Japanese page and silently mangled every station's HTML
            # into mojibake during the 2026-08-15 outage, since decoding
            # bytes as ISO-8859-1 always "succeeds" without raising.
            #
            # Rather than special-case that one encoding name, hand the
            # raw bytes to the caller so BeautifulSoup can resolve the
            # encoding itself: it checks for a <meta charset> declaration
            # in the HTML first, then falls back to content-based
            # detection -- more reliable than trusting a charset-less
            # Content-Type header either way.
            if 'charset=' not in content_type.lower():
                logger.warning(
                    "%s: no charset declared in Content-Type (%r); requests reported "
                    "encoding=%r, which is unreliable here. Letting BeautifulSoup "
                    "detect the real encoding from the page content instead.",
                    url, content_type, response.encoding,
                )

            return response.content
        except Exception as e:
            print(f"Failed to fetch {url}: {e}")
            return None
    
    def parse_table_data(self, html_content, station_code, has_wave_height):
        parser = HTMLTableParser()
        parser.parse_html(html_content)
        
        if not parser.rows:
            logger.warning(
                "%s: no data rows found (parsed %d table(s) from the page). This can mean "
                "the page layout changed, or that the HTML was decoded with the wrong "
                "character encoding.",
                station_code, parser.table_count,
            )
            return []

        data = []
        header_found = False

        for row in parser.rows:
            if not header_found:
                # Look for header row containing time-related keywords
                row_text = ' '.join(row).lower()
                if '時刻' in row_text or 'time' in row_text or '時' in row_text:
                    header_found = True
                    logger.debug("%s: header row detected: %r", station_code, row)
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
                        elif timestamp > current_date + timedelta(minutes=5):
                            # No date column: a scraped time later than "now"
                            # (e.g. a 23:58 reading fetched at 00:03) means
                            # the source page hasn't rolled over yet and the
                            # reading actually belongs to yesterday.
                            timestamp -= timedelta(days=1)
                    except ValueError:
                        continue
                else:
                    continue
                
                # Parse wind speed
                wind_speed = None
                is_weak_wind = '風弱く' in wind_speed_text
                if wind_speed_text and wind_speed_text != '-' and not is_weak_wind:
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
                    'wave_height': wave_height,
                    'wind_status': 'weak' if is_weak_wind else None
                }
                
                data.append(weather_data)
                
            except Exception as e:
                print(f"Error parsing row for {station_code}: {e}")
                continue

        if not header_found:
            logger.warning(
                "%s: could not find a header row containing '時刻'/'time' among %d row(s); "
                "first row was %r. No records were parsed -- likely a page layout change or "
                "a character-encoding problem.",
                station_code, len(parser.rows), parser.rows[0] if parser.rows else None,
            )

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

        if self.stations and not all_data:
            self._consecutive_empty_scrapes += 1
            logger.warning(
                "HTTP requests succeeded but no weather records were parsed from any of "
                "the %d station(s) (%d consecutive empty scrape(s)). This usually means an "
                "HTML structure or character-encoding problem, not a genuine lack of new "
                "data.",
                len(self.stations), self._consecutive_empty_scrapes,
            )
            if self._consecutive_empty_scrapes >= self.CONSECUTIVE_EMPTY_SCRAPE_ALERT_THRESHOLD:
                logger.error(
                    "No weather records have been parsed from any station for %d scrape "
                    "cycles in a row. Treat this as a scraper failure and investigate -- it "
                    "is very unlikely that all %d stations genuinely had zero new data for "
                    "that long.",
                    self._consecutive_empty_scrapes, len(self.stations),
                )
        else:
            self._consecutive_empty_scrapes = 0

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
                        'wave_height': None,
                        'wind_status': None
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
