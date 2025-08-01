import axios from 'axios';
import * as cheerio from 'cheerio';
import { WeatherData, STATIONS } from '../types/weather';
import { format, parse, isValid } from 'date-fns';

export class WeatherScraper {
  private async fetchPageContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  private parseTableData($: cheerio.CheerioAPI, stationCode: string, hasWaveHeight: boolean): WeatherData[] {
    const data: WeatherData[] = [];
    const table = $('table').first();
    
    if (!table.length) {
      console.warn(`No table found for station: ${stationCode}`);
      return data;
    }

    const rows = table.find('tr');
    let headerRow = -1;
    
    // Find header row
    rows.each((index, row) => {
      const $row = $(row);
      const text = $row.text().toLowerCase();
      if (text.includes('時刻') || text.includes('time')) {
        headerRow = index;
        return false;
      }
    });

    if (headerRow === -1) {
      console.warn(`No header row found for station: ${stationCode}`);
      return data;
    }

    // Parse data rows
    rows.slice(headerRow + 1).each((index, row) => {
      const $row = $(row);
      const cells = $row.find('td, th');
      
      if (cells.length < 3) return;

      const timeText = $(cells[0]).text().trim();
      const windDirText = $(cells[1]).text().trim();
      const windSpeedText = $(cells[2]).text().trim();
      const waveHeightText = hasWaveHeight && cells.length > 3 ? $(cells[3]).text().trim() : '';

      // Parse time
      const currentDate = new Date();
      let timestamp: Date;
      
      try {
        if (timeText.includes(':')) {
          const [hours, minutes] = timeText.split(':').map(Number);
          timestamp = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hours, minutes || 0);
        } else {
          timestamp = new Date(timeText);
        }

        if (!isValid(timestamp)) {
          return;
        }
      } catch (error) {
        return;
      }

      const weatherData: WeatherData = {
        station_name: STATIONS.find(s => s.code === stationCode)?.name || stationCode,
        station_code: stationCode,
        timestamp: format(timestamp, 'yyyy-MM-dd HH:mm:ss'),
        wind_direction: windDirText && windDirText !== '-' ? windDirText : undefined,
        wind_speed: windSpeedText && windSpeedText !== '-' ? parseFloat(windSpeedText) : undefined,
        wave_height: hasWaveHeight && waveHeightText && waveHeightText !== '-' ? parseFloat(waveHeightText) : undefined
      };

      data.push(weatherData);
    });

    return data;
  }

  async scrapeStation(stationCode: string): Promise<WeatherData[]> {
    const station = STATIONS.find(s => s.code === stationCode);
    if (!station) {
      throw new Error(`Unknown station: ${stationCode}`);
    }

    try {
      console.log(`Scraping ${station.name}...`);
      const html = await this.fetchPageContent(station.url);
      const $ = cheerio.load(html);
      const data = this.parseTableData($, stationCode, station.hasWaveHeight);
      
      console.log(`Scraped ${data.length} records from ${station.name}`);
      return data;
    } catch (error) {
      console.error(`Error scraping ${station.name}:`, error);
      return [];
    }
  }

  async scrapeAllStations(): Promise<WeatherData[]> {
    const allData: WeatherData[] = [];
    
    for (const station of STATIONS) {
      try {
        const stationData = await this.scrapeStation(station.code);
        allData.push(...stationData);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to scrape ${station.name}:`, error);
      }
    }

    return allData;
  }

  // Align data to reference station (iragomisaki_vtss) time intervals
  alignToReferenceTime(allData: WeatherData[]): WeatherData[] {
    const referenceStation = 'iragomisaki_vtss';
    const referenceData = allData.filter(d => d.station_code === referenceStation);
    
    if (referenceData.length === 0) {
      console.warn('No reference station data found');
      return allData;
    }

    const referenceTimestamps = referenceData.map(d => d.timestamp);
    const alignedData: WeatherData[] = [];

    // For each reference timestamp, try to find matching data from other stations
    referenceTimestamps.forEach(refTime => {
      STATIONS.forEach(station => {
        const stationData = allData.find(d => 
          d.station_code === station.code && d.timestamp === refTime
        );

        if (stationData) {
          alignedData.push(stationData);
        } else {
          // Create empty record for missing data
          alignedData.push({
            station_name: station.name,
            station_code: station.code,
            timestamp: refTime,
            wind_direction: undefined,
            wind_speed: undefined,
            wave_height: undefined
          });
        }
      });
    });

    return alignedData;
  }
}