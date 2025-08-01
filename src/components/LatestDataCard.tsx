import React from 'react';
import { WeatherData } from '../types/weather';
import { Wind, Waves, MapPin, Clock } from 'lucide-react';

interface LatestDataCardProps {
  data: WeatherData;
  onClick?: () => void;
}

export const LatestDataCard: React.FC<LatestDataCardProps> = ({ data, onClick }) => {
  const getStationColor = (stationCode: string): string => {
    const colors: Record<string, string> = {
      'iragomisaki_vtss': 'from-blue-500 to-blue-600',
      'iragosuido_southeast_aisss': 'from-teal-500 to-teal-600',
      'daiosaki_lt': 'from-green-500 to-green-600',
      'nagoyako_bw': 'from-yellow-500 to-yellow-600',
      'yokkaichiko_bkw_lt': 'from-purple-500 to-purple-600'
    };
    return colors[stationCode] || 'from-gray-500 to-gray-600';
  };

  const formatValue = (value?: number, unit: string = ''): string => {
    if (value === undefined || value === null) return '-';
    return `${value}${unit}`;
  };

  const formatWindDirection = (direction?: string): string => {
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
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className={`bg-gradient-to-r ${getStationColor(data.station_code)} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {data.station_name}
          </h3>
          <div className="text-white text-sm flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(data.timestamp)}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Wind className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-xs text-gray-500 mb-1">風向</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatWindDirection(data.wind_direction)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Wind className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-xs text-gray-500 mb-1">風速</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatValue(data.wind_speed, ' m/s')}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Waves className="w-5 h-5 text-teal-600" />
            </div>
            <div className="text-xs text-gray-500 mb-1">波高</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatValue(data.wave_height, ' m')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};