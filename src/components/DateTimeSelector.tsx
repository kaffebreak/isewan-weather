import React from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface DateTimeSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

interface DateTimeComponents {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) => {
  // UTC文字列を日本時間の各コンポーネントに分解
  const parseUTCToJSTComponents = (utcString: string): DateTimeComponents => {
    if (!utcString) {
      const now = new Date();
      return {
        year: now.getFullYear().toString(),
        month: (now.getMonth() + 1).toString().padStart(2, '0'),
        day: now.getDate().toString().padStart(2, '0'),
        hour: now.getHours().toString().padStart(2, '0'),
        minute: now.getMinutes().toString().padStart(2, '0')
      };
    }
    
    try {
      const utcDate = new Date(utcString);
      // 日本時間に変換（UTC+9時間）
      const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
      
      return {
        year: jstDate.getUTCFullYear().toString(),
        month: (jstDate.getUTCMonth() + 1).toString().padStart(2, '0'),
        day: jstDate.getUTCDate().toString().padStart(2, '0'),
        hour: jstDate.getUTCHours().toString().padStart(2, '0'),
        minute: jstDate.getUTCMinutes().toString().padStart(2, '0')
      };
    } catch (error) {
      console.error('Error parsing UTC to JST components:', error);
      const now = new Date();
      return {
        year: now.getFullYear().toString(),
        month: (now.getMonth() + 1).toString().padStart(2, '0'),
        day: now.getDate().toString().padStart(2, '0'),
        hour: now.getHours().toString().padStart(2, '0'),
        minute: now.getMinutes().toString().padStart(2, '0')
      };
    }
  };

  // 各コンポーネントからUTC文字列を作成
  const componentsToUTC = (components: DateTimeComponents): string => {
    try {
      const { year, month, day, hour, minute } = components;
      
      // 入力値の検証
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      const hourNum = parseInt(hour);
      const minuteNum = parseInt(minute);
      
      if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || isNaN(hourNum) || isNaN(minuteNum)) {
        return '';
      }
      
      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || 
          hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
        return '';
      }
      
      // 日本時間として日付を作成
      const jstDate = new Date(yearNum, monthNum - 1, dayNum, hourNum, minuteNum);
      
      // UTCに変換（-9時間）
      const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
      
      return utcDate.toISOString().slice(0, 19);
    } catch (error) {
      console.error('Error converting components to UTC:', error);
      return '';
    }
  };

  const startComponents = parseUTCToJSTComponents(startDate);
  const endComponents = parseUTCToJSTComponents(endDate);

  // バリデーション：開始時間が終了時間より未来かチェック
  const validateDateRange = (): string | null => {
    if (!startDate || !endDate) return null;
    
    try {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      
      if (startTime >= endTime) {
        return '開始時間は終了時間より前に設定してください';
      }
      
      return null;
    } catch (error) {
      return '日時の形式が正しくありません';
    }
  };

  const validationError = validateDateRange();

  const handleStartComponentChange = (field: keyof DateTimeComponents, value: string) => {
    const newComponents = { ...startComponents, [field]: value };
    const utcString = componentsToUTC(newComponents);
    if (utcString) {
      onStartDateChange(utcString);
    }
  };

  const handleEndComponentChange = (field: keyof DateTimeComponents, value: string) => {
    const newComponents = { ...endComponents, [field]: value };
    const utcString = componentsToUTC(newComponents);
    if (utcString) {
      onEndDateChange(utcString);
    }
  };

  const inputClassName = "w-full px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        期間選択（日本時間）
      </h3>
      
      <div className="space-y-6">
        {/* 開始日時 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            開始日時（JST）
          </label>
          <div className="flex gap-4">
            {/* 年月日 */}
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">年月日</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="number"
                    value={startComponents.year}
                    onChange={(e) => handleStartComponentChange('year', e.target.value)}
                    placeholder="2025"
                    min="2020"
                    max="2030"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">年</div>
                </div>
                <div>
                  <input
                    type="number"
                    value={startComponents.month}
                    onChange={(e) => handleStartComponentChange('month', e.target.value.padStart(2, '0'))}
                    placeholder="01"
                    min="1"
                    max="12"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">月</div>
                </div>
                <div>
                  <input
                    type="number"
                    value={startComponents.day}
                    onChange={(e) => handleStartComponentChange('day', e.target.value.padStart(2, '0'))}
                    placeholder="15"
                    min="1"
                    max="31"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">日</div>
                </div>
              </div>
            </div>
            
            {/* 時分 */}
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">時刻</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    value={startComponents.hour}
                    onChange={(e) => handleStartComponentChange('hour', e.target.value.padStart(2, '0'))}
                    placeholder="14"
                    min="0"
                    max="23"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">時</div>
                </div>
                <div>
                  <input
                    type="number"
                    value={startComponents.minute}
                    onChange={(e) => handleStartComponentChange('minute', e.target.value.padStart(2, '0'))}
                    placeholder="30"
                    min="0"
                    max="59"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">分</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 終了日時 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            終了日時（JST）
          </label>
          <div className="flex gap-4">
            {/* 年月日 */}
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">年月日</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="number"
                    value={endComponents.year}
                    onChange={(e) => handleEndComponentChange('year', e.target.value)}
                    placeholder="2025"
                    min="2020"
                    max="2030"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">年</div>
                </div>
                <div>
                  <input
                    type="number"
                    value={endComponents.month}
                    onChange={(e) => handleEndComponentChange('month', e.target.value.padStart(2, '0'))}
                    placeholder="01"
                    min="1"
                    max="12"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">月</div>
                </div>
                <div>
                  <input
                    type="number"
                    value={endComponents.day}
                    onChange={(e) => handleEndComponentChange('day', e.target.value.padStart(2, '0'))}
                    placeholder="15"
                    min="1"
                    max="31"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">日</div>
                </div>
              </div>
            </div>
            
            {/* 時分 */}
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">時刻</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    value={endComponents.hour}
                    onChange={(e) => handleEndComponentChange('hour', e.target.value.padStart(2, '0'))}
                    placeholder="15"
                    min="0"
                    max="23"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">時</div>
                </div>
                <div>
                  <input
                    type="number"
                    value={endComponents.minute}
                    onChange={(e) => handleEndComponentChange('minute', e.target.value.padStart(2, '0'))}
                    placeholder="30"
                    min="0"
                    max="59"
                    className={inputClassName}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">分</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* バリデーションエラー表示 */}
      {validationError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{validationError}</span>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        ※ 入力された時刻は日本標準時（JST）として処理されます
      </div>
    </div>
  );
};