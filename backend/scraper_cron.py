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
        
        # Scrape data from all stations
        scraped_data = scraper.scrape_all_stations()
        
        if scraped_data:
            saved_count = db.save_weather_data(scraped_data)
            print(f"[{datetime.now()}] Successfully saved {saved_count} records")
            
            # Print summary
            total_records = db.get_data_count()
            print(f"[{datetime.now()}] Total records in database: {total_records}")
        else:
            print(f"[{datetime.now()}] No data was scraped")
            
    except Exception as e:
        print(f"[{datetime.now()}] Error during scraping: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()