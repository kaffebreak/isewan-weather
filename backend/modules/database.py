import sqlite3
from datetime import datetime


MAX_PAGE_SIZE = 500
MAX_QUERY_OFFSET = 1_000_000
MAX_CHART_POINTS = 500
WEATHER_COLUMNS = [
    'id',
    'station_name',
    'station_code',
    'timestamp',
    'wind_direction',
    'wind_speed',
    'wave_height',
    'wind_status',
    'created_at',
]

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
                wind_status TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(station_code, timestamp)
            )
        ''')

        existing_columns = {
            row[1] for row in cursor.execute('PRAGMA table_info(weather_data)')
        }
        if 'wind_status' not in existing_columns:
            cursor.execute('ALTER TABLE weather_data ADD COLUMN wind_status TEXT')
        
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
                    (station_name, station_code, timestamp, wind_direction, wind_speed, wave_height, wind_status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data['station_name'],
                    data['station_code'],
                    data['timestamp'],
                    data.get('wind_direction'),
                    data.get('wind_speed'),
                    data.get('wave_height'),
                    data.get('wind_status'),
                    datetime.now().isoformat()
                ))
                saved_count += 1
            except Exception as e:
                print(f"Error saving data: {e}")
        
        conn.commit()
        conn.close()
        print(f"Saved {saved_count} weather records to database")
        return saved_count
    
    def get_weather_data(
        self,
        start_date=None,
        end_date=None,
        station_code=None,
        limit=None,
        offset=0,
    ):
        if limit is not None:
            if isinstance(limit, bool) or not isinstance(limit, int):
                raise ValueError('limit must be an integer')
            if limit < 1 or limit > MAX_PAGE_SIZE:
                raise ValueError(f'limit must be between 1 and {MAX_PAGE_SIZE}')

        if isinstance(offset, bool) or not isinstance(offset, int):
            raise ValueError('offset must be an integer')
        if offset < 0 or offset > MAX_QUERY_OFFSET:
            raise ValueError(
                f'offset must be between 0 and {MAX_QUERY_OFFSET}'
            )

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = '''
            SELECT id, station_name, station_code, timestamp,
                   wind_direction, wind_speed, wave_height, wind_status, created_at
            FROM weather_data
            WHERE 1=1
        '''
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
        
        # id is used as a tie-breaker so that pagination remains stable when
        # multiple stations have observations with the same timestamp.
        query += ' ORDER BY timestamp DESC, id DESC'
        
        if limit is not None:
            query += ' LIMIT ? OFFSET ?'
            params.extend((limit, offset))
        elif offset:
            # SQLite requires LIMIT when OFFSET is present. -1 means no limit
            # and preserves the existing unbounded response when limit is
            # omitted.
            query += ' LIMIT -1 OFFSET ?'
            params.append(offset)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(zip(WEATHER_COLUMNS, row)) for row in rows]
    
    def get_latest_data(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT w1.id, w1.station_name, w1.station_code, w1.timestamp,
                   w1.wind_direction, w1.wind_speed, w1.wave_height,
                   w1.wind_status, w1.created_at
            FROM weather_data w1
            WHERE timestamp = (
                SELECT MAX(timestamp) FROM weather_data w2 
                WHERE w2.station_code = w1.station_code
            )
            ORDER BY station_code
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(zip(WEATHER_COLUMNS, row)) for row in rows]
    
    def get_data_count(self, start_date=None, end_date=None, station_code=None):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        query = 'SELECT COUNT(*) FROM weather_data WHERE 1=1'
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

        cursor.execute(query, params)
        count = cursor.fetchone()[0]
        conn.close()
        return count

    def get_wind_chart_data(self, start_date, end_date, station_code):
        """Return an exact period summary and a bounded trend series for one station."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        conditions = ['station_code = ?']
        params = [station_code]
        if start_date:
            conditions.append('timestamp >= ?')
            params.append(start_date)
        if end_date:
            conditions.append('timestamp <= ?')
            params.append(end_date)
        where_clause = ' AND '.join(conditions)

        cursor.execute(
            f'''
                SELECT COUNT(*), AVG(wind_speed), MAX(wind_speed),
                       SUM(CASE WHEN wind_status = 'weak' THEN 1 ELSE 0 END)
                FROM weather_data
                WHERE {where_clause}
            ''',
            params,
        )
        total_records, average_speed, max_speed, weak_wind_count = cursor.fetchone()

        cursor.execute(
            f'''
                SELECT wind_speed
                FROM weather_data
                WHERE {where_clause} AND wind_speed IS NOT NULL
                ORDER BY timestamp DESC, id DESC
                LIMIT 1
            ''',
            params,
        )
        latest_row = cursor.fetchone()
        latest_speed = latest_row[0] if latest_row else None

        cursor.execute(
            f'''
                SELECT wind_direction, COUNT(*)
                FROM weather_data
                WHERE {where_clause} AND wind_direction IS NOT NULL
                GROUP BY wind_direction
            ''',
            params,
        )
        direction_counts = {
            direction: count for direction, count in cursor.fetchall()
        }

        if total_records <= MAX_CHART_POINTS:
            cursor.execute(
                f'''
                    SELECT id, station_name, station_code, timestamp,
                           wind_direction, wind_speed, wave_height,
                           wind_status, created_at
                    FROM weather_data
                    WHERE {where_clause}
                    ORDER BY timestamp ASC, id ASC
                ''',
                params,
            )
        else:
            # Keep the response bounded while retaining the first and last
            # observations. Exact averages, maxima and direction counts above
            # still use every record in the requested period.
            sample_step = (
                total_records + MAX_CHART_POINTS - 3
            ) // (MAX_CHART_POINTS - 1)
            cursor.execute(
                f'''
                    WITH ordered AS (
                        SELECT id, station_name, station_code, timestamp,
                               wind_direction, wind_speed, wave_height,
                               wind_status, created_at,
                               ROW_NUMBER() OVER (
                                   ORDER BY timestamp ASC, id ASC
                               ) AS row_number
                        FROM weather_data
                        WHERE {where_clause}
                    )
                    SELECT id, station_name, station_code, timestamp,
                           wind_direction, wind_speed, wave_height,
                           wind_status, created_at
                    FROM ordered
                    WHERE (row_number - 1) % ? = 0 OR row_number = ?
                    ORDER BY timestamp ASC, id ASC
                ''',
                [*params, sample_step, total_records],
            )

        rows = cursor.fetchall()
        conn.close()

        return {
            'trend_data': [dict(zip(WEATHER_COLUMNS, row)) for row in rows],
            'summary': {
                'total_records': total_records,
                'latest_wind_speed': latest_speed,
                'average_wind_speed': average_speed,
                'max_wind_speed': max_speed,
                'weak_wind_count': weak_wind_count or 0,
                'is_sampled': total_records > MAX_CHART_POINTS,
            },
            'direction_counts': direction_counts,
        }
