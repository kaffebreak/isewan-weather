import { WeatherData } from '../types/weather';
import { apiService } from './api';

export class WeatherScraper {
  async scrapeAllStations(): Promise<WeatherData[]> {
    const result = await apiService.scrapeData();
    if (!result.success) {
      throw new Error(result.message);
    }
    // Return empty array since the actual data is saved in the backend
    return [];
  }

  alignToReferenceTime(allData: WeatherData[]): WeatherData[] {
    // Alignment is now handled by the Python backend
    return allData;
  }
}