#!/usr/bin/env python3
"""
Standalone scraper script for cron execution
Usage: python scraper_cron.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import WeatherDatabase, WeatherScraper
from datetime import datetime

def main():
    print(f"[{datetime.now()}] Starting scheduled weather data scraping...")
    
    try:
        db = WeatherDatabase()
        scraper = WeatherScraper()
        
        # Get latest data from database to check for updates
        latest_db_data = db.get_latest_data()
        latest_timestamps = {}
        for data in latest_db_data:
            latest_timestamps[data['station_code']] = data['timestamp']
        
        # Scrape data from all stations
        scraped_data = scraper.scrape_all_stations()
        
        if scraped_data:
            # Filter out data that already exists in database
            new_data = []
            for data in scraped_data:
                station_code = data['station_code']
                timestamp = data['timestamp']
                
                if station_code not in latest_timestamps or timestamp > latest_timestamps[station_code]:
                    new_data.append(data)
            
            if new_data:
                saved_count = db.save_weather_data(new_data)
                print(f"[{datetime.now()}] Successfully saved {saved_count} new records")
                
                # Print summary
                total_records = db.get_data_count()
                print(f"[{datetime.now()}] Total records in database: {total_records}")
            else:
                print(f"[{datetime.now()}] No new data to save")
        else:
            print(f"[{datetime.now()}] No data was scraped")
            
    except Exception as e:
        print(f"[{datetime.now()}] Error during scraping: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()