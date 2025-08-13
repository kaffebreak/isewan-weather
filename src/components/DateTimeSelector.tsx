import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface DateTimeSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) => {
  // UTC文字列を日本時間のdatetime-local形式に変換
  const utcToJSTLocal = (utcString: string): string => {
    if (!utcString) return '';
    
    const utcDate = new Date(utcString);
    // 日本時間に変換（UTC+9時間）
    const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    
    // datetime-local形式（YYYY-MM-DDTHH:mm）に変換
    return jstDate.toISOString().slice(0, 16);
  };

  // 日本時間のdatetime-local形式をUTC文字列に変換
  const jstLocalToUTC = (jstLocalString: string): string => {
    if (!jstLocalString) return '';
    
    // datetime-local形式の文字列を日本時間として解釈
    const jstDate = new Date(jstLocalString);
    // UTC時間に変換（-9時間）
    const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
    
    return utcDate.toISOString().slice(0, 19);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onStartDateChange(jstLocalToUTC(value));
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onEndDateChange(jstLocalToUTC(value));
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        期間選択（日本時間）
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            開始日時（JST）
          </label>
          <input
            type="datetime-local"
            id="startDate"
            value={utcToJSTLocal(startDate)}
            onChange={handleStartDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            終了日時（JST）
          </label>
          <input
            type="datetime-local"
            id="endDate"
            value={utcToJSTLocal(endDate)}
            onChange={handleEndDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        ※ 入力された時刻は日本標準時（JST）として処理されます
      </div>
    </div>
  );
};