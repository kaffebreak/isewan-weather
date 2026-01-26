import sqlite3
from datetime import datetime
import os

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
