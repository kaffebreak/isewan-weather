import { WeatherData, Station, WindChartData } from '../types/weather';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiService {
  private async fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
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
    limit?: number,
    offset?: number
  ): Promise<WeatherData[]> {
    const params = new URLSearchParams();

    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (stationCode) params.append('station_code', stationCode);
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());

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

  async getStats(
    startDate?: string,
    endDate?: string,
    stationCode?: string
  ): Promise<{ total_records: number }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (stationCode) params.append('station_code', stationCode);

    const url = `${API_BASE_URL}/api/weather/stats${params.toString() ? '?' + params.toString() : ''}`;
    return this.fetchWithErrorHandling(url);
  }

  async getWindChartData(
    startDate: string,
    endDate: string,
    stationCode: string
  ): Promise<WindChartData> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      station_code: stationCode,
    });
    return this.fetchWithErrorHandling(
      `${API_BASE_URL}/api/weather/wind-chart?${params.toString()}`
    );
  }

  async getLastScrapedTime(): Promise<{ last_scraped: string | null }> {
    return this.fetchWithErrorHandling(`${API_BASE_URL}/api/weather/last-scraped`);
  }
}

export const apiService = new ApiService();
