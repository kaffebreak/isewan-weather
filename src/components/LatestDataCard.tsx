import React from 'react';
import { WeatherData } from '../types/weather';
import { Wind, Waves, MapPin, Clock } from 'lucide-react';

interface LatestDataCardProps {
  data: WeatherData;
  onClick?: () => void;
}

export const LatestDataCard: React.FC<LatestDataCardProps> = ({ data, onClick }) => {
  const formatValue = (value?: number, unit: string = ''): string => {
    if (value === undefined || value === null) return '-';
    return `${value}${unit}`;
  };

  const formatWindDirection = (direction?: string, status?: string): string => {
    if (status === 'weak') return '風弱く';
    if (!direction) return '-';
    return direction;
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <button
      type="button"
      className="group w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      onClick={onClick}
      aria-label={`${data.station_name}の最近のデータを表示`}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-900">
              {data.station_name}
            </h3>
            <p className="mt-1 truncate text-xs text-slate-400">{data.station_code}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-1 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {formatTime(data.timestamp)}
        </div>
      </div>
      
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60 px-2 py-4">
        <div className="px-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Wind className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            風向
          </div>
          <div className="text-base font-semibold tabular-nums text-slate-900">
              {formatWindDirection(data.wind_direction, data.wind_status)}
          </div>
        </div>
          
        <div className="px-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Wind className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            風速
          </div>
          <div className="text-base font-semibold tabular-nums text-slate-900">
            {formatValue(data.wind_speed, ' m/s')}
          </div>
        </div>
          
        <div className="px-2 text-center">
          <div className="mb-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Waves className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            波高
          </div>
          <div className="text-base font-semibold tabular-nums text-slate-900">
            {formatValue(data.wave_height, ' m')}
          </div>
        </div>
      </div>
    </button>
  );
};
