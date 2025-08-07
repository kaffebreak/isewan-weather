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
  // 日本時間のタイムゾーンオフセットを取得
  const getJSTOffset = (): number => {
    return 9 * 60; // JST is UTC+9, so 9 hours * 60 minutes
  };

  // UTC時刻を日本時間に変換
  const convertUTCToJST = (utcDateStr: string): string => {
    if (!utcDateStr) return '';
    const utcDate = new Date(utcDateStr);
    const jstDate = new Date(utcDate.getTime() + getJSTOffset() * 60 * 1000);
    return jstDate.toISOString().slice(0, 16);
  };

  // 日本時間をUTCに変換
  const convertJSTToUTC = (jstDateStr: string): string => {
    if (!jstDateStr) return '';
    const jstDate = new Date(jstDateStr);
    const utcDate = new Date(jstDate.getTime() - getJSTOffset() * 60 * 1000);
    return utcDate.toISOString().slice(0, 19);
  };

  const formatDateTimeLocal = (dateStr: string): string => {
    if (!dateStr) return '';
    return convertUTCToJST(dateStr);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onStartDateChange(convertJSTToUTC(value + ':00'));
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onEndDateChange(convertJSTToUTC(value + ':00'));
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
            value={formatDateTimeLocal(startDate)}
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
            value={formatDateTimeLocal(endDate)}
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