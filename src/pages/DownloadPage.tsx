import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types/weather';
import { apiService } from '../services/api';
import { DateTimeSelector } from '../components/DateTimeSelector';
import { StationSelector } from '../components/StationSelector';
import { DataTable } from '../components/DataTable';
import { exportToCSV, exportToCSVForMarine, formatDateTimeForFilename } from '../utils/csvExport';
import { Download, Search, Database } from 'lucide-react';

export const DownloadPage: React.FC = () => {
  const [filteredData, setFilteredData] = useState<WeatherData[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [isMarineMode, setIsMarineMode] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // 初期状態は空文字列（ブランク）
    setStartDate('');
    setEndDate('');
  }, []);

  useEffect(() => {
    // Auto-search when parameters change
    if (startDate && endDate) {
      handleSearch();
    }
  }, [selectedStation, isMarineMode, startDate, endDate]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const data = await apiService.getWeatherData(
        startDate || undefined,
        endDate || undefined,
        selectedStation || undefined
      );
      setFilteredData(data);
    } catch (error) {
      console.error('Error filtering data:', error);
      setFilteredData([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = () => {
    if (filteredData.length === 0) {
      alert('ダウンロードするデータがありません');
      return;
    }
    
    // Create a more descriptive filename
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 16).replace(/:/g, '');
    const stationStr = selectedStation ? `_${selectedStation}` : '_all_stations';
    const filename = `isewan_weather_${dateStr}_${timeStr}${stationStr}.csv`;
    
    exportToCSV(filteredData, filename);
  };

  const handleMarineDownload = () => {
    if (filteredData.length === 0) {
      alert('ダウンロードするデータがありません');
      return;
    }
    
    // Create marine-specific filename
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 16).replace(/:/g, '');
    const filename = `isewan_marine_${dateStr}_${timeStr}.csv`;
    
    exportToCSVForMarine(filteredData, filename);
  };

  const handleStationChange = (stationCode: string) => {
    setSelectedStation(stationCode);
    if (stationCode !== '') {
      setIsMarineMode(false);
    }
  };

  const handleMarineModeChange = (isMarine: boolean) => {
    setIsMarineMode(isMarine);
    if (isMarine) {
      setSelectedStation('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">データダウンロード</h2>
        <p className="text-gray-600 mb-6">
          期間と観測地点を指定してデータを検索し、CSVファイルとしてダウンロードできます。
          「湾内乗下船用」を選択すると、伊良湖岬基準の時間軸で3箇所の観測データを横並びで出力できます。
        </p>
      </div>

      {/* Search Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DateTimeSelector
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
        <StationSelector
          selectedStation={selectedStation}
          onStationChange={handleStationChange}
          isMarineMode={isMarineMode}
          onMarineModeChange={handleMarineModeChange}
        />
      </div>

      {/* Search and Download Actions */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Database className="w-5 h-5" />
            <span>検索結果: {filteredData.length}件</span>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
              {isSearching ? '検索中...' : '検索'}
            </button>
            
            {isMarineMode ? (
              <button
                onClick={handleMarineDownload}
                disabled={filteredData.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                CSVダウンロード
              </button>
            ) : (
              <button
                onClick={handleDownload}
                disabled={filteredData.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                CSVダウンロード
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Preview */}
      {filteredData.length > 0 && (
        <DataTable
          data={filteredData.slice(0, 100)} // Show first 100 records for preview
          title={`検索結果プレビュー ${selectedStation ? `- ${selectedStation}` : '- 全地点'}`}
        />
      )}

      {filteredData.length > 100 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>注意:</strong> 検索結果が100件を超えています。プレビューでは最初の100件のみ表示されていますが、
            CSVダウンロードでは全{filteredData.length}件のデータが含まれます。
          </p>
        </div>
      )}
    </div>
  );
};