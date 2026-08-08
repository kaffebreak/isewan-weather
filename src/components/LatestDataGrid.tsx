import React from 'react';
import { WeatherData } from '../types/weather';
import { LatestDataCard } from './LatestDataCard';
import { AlertCircle, Clock } from 'lucide-react';

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
  onStationClick: (stationCode: string) => void;
  lastUpdated?: string | null;
}

const formatDatabaseTimestamp = (timestamp: string) => {
  const [datePart, timePart = ''] = timestamp.replace(' ', 'T').split('T');
  const [, month = '', day = ''] = datePart.split('-');
  const [hour = '', minute = ''] = timePart.split(':');

  if (!month || !day || !hour || !minute) return timestamp;
  return `${Number(month)}月${Number(day)}日 ${hour}:${minute}`;
};

export const LatestDataGrid: React.FC<LatestDataGridProps> = ({
  data,
  onStationClick,
  lastUpdated
}) => {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
          <AlertCircle className="h-5 w-5 text-slate-500" aria-hidden="true" />
        </div>
        <p className="font-medium text-slate-800">最新データがありません</p>
        <p className="mt-1 text-sm text-slate-500">データは自動的に更新されます</p>
      </div>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="latest-data-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Overview</p>
          <h2 id="latest-data-heading" className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            最新観測データ
          </h2>
        </div>
        {lastUpdated && (
          <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            DB最終更新: {formatDatabaseTimestamp(lastUpdated)}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {getOrderedStations(data).map((stationData) => (
          <LatestDataCard
            key={stationData.station_code}
            data={stationData}
            onClick={() => onStationClick(stationData.station_code)}
          />
        ))}
      </div>
      
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
        <p>
          データは5分間隔で自動更新されます
        </p>
      </div>
    </section>
  );
};
