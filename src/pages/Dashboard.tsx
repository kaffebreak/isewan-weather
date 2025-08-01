import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types/weather';
import { WeatherScraper } from '../services/scraper';
import { dbService } from '../services/database';
import { LatestDataGrid } from '../components/LatestDataGrid';
import { DataTable } from '../components/DataTable';

export const Dashboard: React.FC = () => {
  const [latestData, setLatestData] = useState<WeatherData[]>([]);
  const [recentData, setRecentData] = useState<WeatherData[]>([]);
  const [filteredRecentData, setFilteredRecentData] = useState<WeatherData[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const scraper = new WeatherScraper();

  useEffect(() => {
    loadLatestData();
    loadRecentData();
  }, []);

  const loadLatestData = async () => {
    try {
      const data = await dbService.getLatestData();
      setLatestData(data);
    } catch (error) {
      console.error('Error loading latest data:', error);
    }
  };

  const loadRecentData = async () => {
    try {
      // Get data from last 3 hours
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const data = await dbService.getWeatherData(
        threeHoursAgo.toISOString().slice(0, 19),
        undefined,
        undefined
      );
      const recentDataSlice = data.slice(0, 50); // Limit to 50 most recent records
      setRecentData(recentDataSlice);
      setFilteredRecentData(recentDataSlice);
    } catch (error) {
      console.error('Error loading recent data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      console.log('Starting data scraping...');
      await scraper.scrapeAllStations();
      
      // Reload data from the backend
      await loadLatestData();
      await loadRecentData();
      console.log('Successfully scraped and saved data');
      alert('データを取得しました');
    } catch (error) {
      console.error('Scraping error:', error);
      alert('データ取得中にエラーが発生しました。Pythonサーバーが起動していることを確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStationClick = (stationCode: string) => {
    setSelectedStation(stationCode);
    if (stationCode) {
      // Filter data for the selected station from recent data
      const filtered = recentData.filter(data => 
        data.station_code === stationCode
      );
      setFilteredRecentData(filtered);
    } else {
      setFilteredRecentData(recentData);
    }
  };

  const handleClearFilter = () => {
    setSelectedStation('');
    setFilteredRecentData(recentData);
  };

  return (
    <div className="space-y-8">
      {/* Latest Data Section */}
      <LatestDataGrid
        data={latestData}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        onStationClick={handleStationClick}
      />

      {/* Recent Data Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            最近のデータ (過去3時間)
            {selectedStation && (
              <span className="text-lg font-normal text-gray-600 ml-2">
                - {latestData.find(d => d.station_code === selectedStation)?.station_name} (フィルター適用)
              </span>
            )}
          </h2>
          {selectedStation && (
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              フィルタークリア
            </button>
          )}
        </div>
        <DataTable
          data={filteredRecentData}
          title="最近の観測データ"
        />
      </div>

      {/* System Info */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">システム情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <strong>観測地点:</strong> 5箇所<br />
            <strong>データ項目:</strong> 風向・風速・波高
          </div>
          <div>
            <strong>更新間隔:</strong> 伊良湖岬基準<br />
            <strong>時間精度:</strong> 時まで
          </div>
          <div>
            <strong>データ形式:</strong> CSV出力対応<br />
            <strong>履歴保存:</strong> 継続蓄積型
          </div>
        </div>
      </div>
    </div>
  );
};