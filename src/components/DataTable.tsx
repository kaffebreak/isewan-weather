import React from 'react';
import { WeatherData } from '../types/weather';
import { Wind, Waves, MapPin, Inbox } from 'lucide-react';
import { parseJstTimestamp } from '../utils/datetime';

interface DataTableProps {
  data: WeatherData[];
  title?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, title = 'Weather Data' }) => {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <Inbox className="h-5 w-5 text-slate-500" aria-hidden="true" />
        </div>
        <p className="font-medium text-slate-700">データがありません</p>
      </div>
    );
  }

  const formatWindDirection = (direction?: string, status?: string): string => {
    if (status === 'weak') return '風弱く';
    if (!direction) return '-';
    return direction;
  };

  const formatValue = (value?: number, unit: string = ''): string => {
    if (value === undefined || value === null) return '-';
    return `${value}${unit}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <MapPin className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 className="font-semibold text-slate-900">
          {title}
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <caption className="sr-only">{title}</caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 sm:px-6">
                観測地点
              </th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 sm:px-6">
                日時
              </th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 sm:px-6">
                <div className="flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                  風向
                </div>
              </th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 sm:px-6">
                <div className="flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                  風速
                </div>
              </th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 sm:px-6">
                <div className="flex items-center gap-1">
                  <Waves className="h-3.5 w-3.5" aria-hidden="true" />
                  波高
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((row, index) => (
              <tr key={`${row.station_code}-${row.timestamp}-${index}`} className="transition-colors hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-5 py-3.5 sm:px-6">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                    {row.station_name}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-sm tabular-nums text-slate-700 sm:px-6">
                  {parseJstTimestamp(row.timestamp).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium text-slate-800 sm:px-6">
                  {formatWindDirection(row.wind_direction, row.wind_status)}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium tabular-nums text-slate-800 sm:px-6">
                  {formatValue(row.wind_speed, ' m/s')}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium tabular-nums text-slate-800 sm:px-6">
                  {formatValue(row.wave_height, ' m')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
