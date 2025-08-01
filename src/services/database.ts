import { WeatherData } from '../types/weather';
import { apiService } from './api';

// Database service that connects to Python backend
export class DatabaseService {
  async saveWeatherData(weatherData: WeatherData[]): Promise<void> {
    // This is handled by the scraping endpoint
    throw new Error('Use apiService.scrapeData() instead');
  }

  async getWeatherData(
    startDate?: string,
    endDate?: string,
    stationCode?: string
  ): Promise<WeatherData[]> {
    return apiService.getWeatherData(startDate, endDate, stationCode);
  }

  async getLatestData(): Promise<WeatherData[]> {
    return apiService.getLatestData();
  }

  async getStationData(stationCode: string, limit: number = 100): Promise<WeatherData[]> {
    return apiService.getWeatherData(undefined, undefined, stationCode, limit);
  }
}

export const dbService = new DatabaseService();