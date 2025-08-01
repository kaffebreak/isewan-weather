import { WeatherData } from '../types/weather';

export function exportToCSV(data: WeatherData[], filename: string = 'weather_data.csv'): void {
  if (data.length === 0) {
    alert('データがありません');
    return;
  }

  const headers = [
    '観測地点',
    '地点コード',
    '日時',
    '風向',
    '風速(m/s)',
    '波高(m)',
    '登録日時'
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      `"${row.station_name}"`,
      row.station_code,
      row.timestamp,
      row.wind_direction || '',
      row.wind_speed || '',
      row.wave_height || '',
      row.created_at || ''
    ].join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function formatDateTimeForFilename(date: Date = new Date()): string {
  return date.toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
}