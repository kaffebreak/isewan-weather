import React from 'react';
import { WeatherData } from '../types/weather';
import { LatestDataCard } from './LatestDataCard';
import { RefreshCw, AlertCircle } from 'lucide-react';

const STATION_ORDER = [
  'iragomisaki_vtss',      // 伊良湖岬
  'iragosuido_southeast_aisss', // 伊勢湾2号ブイ
  'daiosaki_lt',           // 大王埼灯台
  'nagoyako_bw',           // 名古屋港高潮防波堤
  'yokkaichiko_bkw_lt'     // 四日市港防波堤信号所
];

const getOrderedStations = (data: WeatherData[]): WeatherData[] => {
  const stationMap = new Map(data.map(item => [item.station_code, item]));
  return STATION_ORDER
    .map(code => stationMap.get(code))
    .filter(Boolean) as WeatherData[];
};

interface LatestDataGridProps {
  data: WeatherData[];
  onRefresh: () => void;
  isLoading: boolean;
  onStationClick: (stationCode: string) => void;
}

export const LatestDataGrid: React.FC<LatestDataGridProps> = ({
  data,
  onRefresh,
  isLoading,
  onStationClick
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">最新データがありません</p>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          データを取得
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">最新観測データ</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          更新
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getOrderedStations(data).map((stationData) => (
          <LatestDataCard
            key={stationData.station_code}
            data={stationData}
            onClick={() => onStationClick(stationData.station_code)}
          />
        ))}
      </div>
    </div>
  );
};