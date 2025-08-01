import React from 'react';
import { WeatherData } from '../types/weather';
import { Wind, Waves, MapPin } from 'lucide-react';

interface DataTableProps {
  data: WeatherData[];
  title?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, title = 'Weather Data' }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-500">データがありません</p>
      </div>
    );
  }

  const getStationColor = (stationCode: string): string => {
    const colors: Record<string, string> = {
      'iragomisaki_vtss': 'bg-blue-100 text-blue-800',
      'iragosuido_southeast_aisss': 'bg-teal-100 text-teal-800',
      'daiosaki_lt': 'bg-green-100 text-green-800',
      'nagoyako_bw': 'bg-yellow-100 text-yellow-800',
      'yokkaichiko_bkw_lt': 'bg-purple-100 text-purple-800'
    };
    return colors[stationCode] || 'bg-gray-100 text-gray-800';
  };

  const formatWindDirection = (direction?: string): string => {
    if (!direction) return '-';
    return direction;
  };

  const formatValue = (value?: number, unit: string = ''): string => {
    if (value === undefined || value === null) return '-';
    return `${value}${unit}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-teal-600">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          {title}
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                観測地点
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Wind className="w-4 h-4" />
                  風向
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Wind className="w-4 h-4" />
                  風速
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Waves className="w-4 h-4" />
                  波高
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={`${row.station_code}-${row.timestamp}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStationColor(row.station_code)}`}>
                    {row.station_name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(row.timestamp).toLocaleString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatWindDirection(row.wind_direction)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(row.wind_speed, ' m/s')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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