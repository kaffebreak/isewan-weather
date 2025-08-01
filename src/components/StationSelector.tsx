import React from 'react';
import { STATIONS } from '../types/weather';
import { MapPin } from 'lucide-react';

interface StationSelectorProps {
  selectedStation: string;
  onStationChange: (stationCode: string) => void;
  isMarineMode?: boolean;
  onMarineModeChange?: (isMarine: boolean) => void;
}

export const StationSelector: React.FC<StationSelectorProps> = ({
  selectedStation,
  onStationChange,
  isMarineMode = false,
  onMarineModeChange
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        観測地点選択
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="station"
            value=""
            checked={selectedStation === ''}
            onChange={(e) => onStationChange(e.target.value)}
            className="mr-3 text-blue-600"
          />
          <span className="text-sm font-medium">全地点</span>
        </label>
        
        {STATIONS.map((station) => (
          <label
            key={station.code}
            className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
          >
            <input
              type="radio"
              name="station"
              value={station.code}
              checked={selectedStation === station.code}
              onChange={(e) => onStationChange(e.target.value)}
              className="mr-3 text-blue-600"
            />
            <span className="text-sm font-medium">{station.name}</span>
          </label>
        ))}
        
        {onMarineModeChange && (
          <label className="flex items-center p-3 border-2 border-teal-500 rounded-lg cursor-pointer hover:bg-teal-50 col-span-full">
            <input
              type="radio"
              name="station"
              value="marine"
              checked={isMarineMode}
              onChange={(e) => {
                onMarineModeChange(true);
                onStationChange(''); // Clear individual station selection
              }}
              className="mr-3 text-teal-600"
            />
            <span className="text-sm font-medium text-teal-700">湾内乗下船用（3箇所横並び）</span>
          </label>
        )}
      </div>
    </div>
  );
};