import { WeatherData } from '../types/weather';

// Mock database service - replace with actual Supabase implementation
export class DatabaseService {
  private data: WeatherData[] = [];
  private nextId = 1;

  async saveWeatherData(weatherData: WeatherData[]): Promise<void> {
    console.log(`Saving ${weatherData.length} weather records to database`);
    
    weatherData.forEach(record => {
      const existingIndex = this.data.findIndex(
        d => d.station_code === record.station_code && d.timestamp === record.timestamp
      );

      if (existingIndex >= 0) {
        // Update existing record
        this.data[existingIndex] = { ...record, id: this.data[existingIndex].id };
      } else {
        // Add new record
        this.data.push({
          ...record,
          id: this.nextId++,
          created_at: new Date().toISOString()
        });
      }
    });

    console.log(`Database now contains ${this.data.length} total records`);
  }

  async getWeatherData(
    startDate?: string,
    endDate?: string,
    stationCode?: string
  ): Promise<WeatherData[]> {
    let filtered = [...this.data];

    if (startDate) {
      filtered = filtered.filter(d => d.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(d => d.timestamp <= endDate);
    }

    if (stationCode) {
      filtered = filtered.filter(d => d.station_code === stationCode);
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getLatestData(): Promise<WeatherData[]> {
    const latest = new Map<string, WeatherData>();
    
    this.data.forEach(record => {
      const existing = latest.get(record.station_code);
      if (!existing || new Date(record.timestamp) > new Date(existing.timestamp)) {
        latest.set(record.station_code, record);
      }
    });

    return Array.from(latest.values());
  }

  async getStationData(stationCode: string, limit: number = 100): Promise<WeatherData[]> {
    return this.data
      .filter(d => d.station_code === stationCode)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const dbService = new DatabaseService();