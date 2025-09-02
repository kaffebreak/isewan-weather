import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types/weather';
import { apiService } from '../services/api';
import { DateTimeSelector } from '../components/DateTimeSelector';
import { StationSelector } from '../components/StationSelector';
import { DataTable } from '../components/DataTable';
import { exportToCSV, exportToCSVForMarine, formatDateTimeForFilename } from '../utils/csvExport';
import { Download, Database } from 'lucide-react';

export const DownloadPage: React.FC = () => {
  const [filteredData, setFilteredData] = useState<WeatherData[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [isMarineMode, setIsMarineMode] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 定数
  const HOURS_24 = 24 * 60 * 60 * 1000;
  const PREVIEW_LIMIT = 100;

  // 日時フォーマット用ユーティリティ
  const formatForDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // ファイル名生成用ユーティリティ
  const generateFilename = (prefix: string) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 16).replace(/:/g, '');
    return `${prefix}_${dateStr}_${timeStr}.csv`;
  };

  useEffect(() => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - HOURS_24);
    
    setStartDate(formatForDateTimeLocal(yesterday));
    setEndDate(formatForDateTimeLocal(now));
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      handleSearch();
    }
  }, [selectedStation, isMarineMode, startDate, endDate]);

  const handleSearch = async () => {
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
    }
  };

  const handleDownload = () => {
    if (filteredData.length === 0) {
      alert('ダウンロードするデータがありません');
      return;
    }
    
    const stationStr = selectedStation ? `_${selectedStation}` : '_all_stations';
    const filename = `isewan_weather${stationStr}_${generateFilename('').replace('.csv', '')}.csv`;
    
    exportToCSV(filteredData, filename);
  };

  const handleMarineDownload = () => {
    if (filteredData.length === 0) {
      alert('ダウンロードするデータがありません');
      return;
    }
    
    const filename = generateFilename('isewan_marine');
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
          期間と観測地点を指定してデータをダウンロードできます。「湾内乗下船用」は3箇所の観測データを横並びで出力します。
        </p>
      </div>

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

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Database className="w-5 h-5" />
            <span>検索結果: {filteredData.length}件</span>
          </div>
          
          <div className="flex gap-4">
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

      <DataTable
        data={filteredData.slice(0, PREVIEW_LIMIT)}
        title={`検索結果プレビュー ${selectedStation ? `- ${selectedStation}` : '- 全地点'}`}
      />

      {filteredData.length > PREVIEW_LIMIT && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>注意:</strong> プレビューは{PREVIEW_LIMIT}件まで。CSVダウンロードでは全{filteredData.length}件が含まれます。
          </p>
        </div>
      )}
    </div>
  );
};