import { WeatherData, Station } from '../types/weather';

const API_BASE_URL = 'http://localhost:8000';

export class ApiService {
  private async fetchWithErrorHandling(url: string, options?: RequestInit): Promise<any> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getLatestData(): Promise<WeatherData[]> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/api/weather/latest`);
  }

  async getWeatherData(
    startDate?: string,
    endDate?: string,
    stationCode?: string,
    limit?: number
  ): Promise<WeatherData[]> {
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (stationCode) params.append('station_code', stationCode);
    if (limit) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/api/weather/data${params.toString() ? '?' + params.toString() : ''}`;
    return this.fetchWithErrorHandling(url);
  }

  async scrapeData(): Promise<{ success: boolean; message: string; records_saved?: number }> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/api/weather/scrape`, {
      method: 'POST',
    });
  }

  async getStations(): Promise<Station[]> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/api/stations`);
  }

  async getStats(): Promise<{ total_records: number }> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/api/weather/stats`);
  }
}

export const apiService = new ApiService();