import { WeatherData } from '../types/weather';

export function exportToCSV(data: WeatherData[], filename: string = 'weather_data.csv'): void {
  if (data.length === 0) {
    alert('ダウンロードするデータがありません');
    return;
  }

  try {

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
      formatTimestampForCSV(row.timestamp),
      row.wind_direction || '',
      row.wind_speed || '',
      row.wave_height || '',
      formatTimestampForCSV(row.created_at || '')
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
    URL.revokeObjectURL(url); // Clean up the URL object
  } else {
    alert('ダウンロードがサポートされていません');
  }
} catch (error) {
  console.error('CSV export error:', error);
  alert('CSVファイルの作成中にエラーが発生しました');
}
}

function formatTimestampForCSV(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTimeForFilename(date: Date = new Date()): string {
  return date.toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
}

export function exportToCSVForMarine(data: WeatherData[], filename: string = 'marine_weather.csv'): void {
  if (data.length === 0) {
    alert('ダウンロードするデータがありません');
    return;
  }

  try {
    // Group data by timestamp (using Iragomisaki as reference)
    const groupedData = new Map<string, {
      iragomisaki: WeatherData | null;
      iragosuido: WeatherData | null;
      daiosaki: WeatherData | null;
    }>();

    data.forEach(item => {
      const timestamp = item.timestamp;
      if (!groupedData.has(timestamp)) {
        groupedData.set(timestamp, {
          iragomisaki: null,
          iragosuido: null,
          daiosaki: null
        });
      }

      const group = groupedData.get(timestamp)!;
      switch (item.station_code) {
        case 'iragomisaki_vtss':
          group.iragomisaki = item;
          break;
        case 'iragosuido_southeast_aisss':
          group.iragosuido = item;
          break;
        case 'daiosaki_lt':
          group.daiosaki = item;
          break;
      }
    });

    const headers = [
      '日時',
      '伊良湖岬_風向',
      '伊良湖岬_風速',
      '伊勢湾2号ブイ_風向',
      '伊勢湾2号ブイ_風速',
      '伊勢湾2号ブイ_波高',
      '大王埼_風向',
      '大王埼_風速',
      '大王埼_波高'
    ];

    const csvContent = [
      headers.join(','),
      ...Array.from(groupedData.entries()).map(([timestamp, stations]) => [
        formatTimestampForCSV(timestamp),
        stations.iragomisaki?.wind_direction || '',
        stations.iragomisaki?.wind_speed || '',
        stations.iragosuido?.wind_direction || '',
        stations.iragosuido?.wind_speed || '',
        stations.iragosuido?.wave_height || '',
        stations.daiosaki?.wind_direction || '',
        stations.daiosaki?.wind_speed || '',
        stations.daiosaki?.wave_height || ''
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
      URL.revokeObjectURL(url);
    } else {
      alert('ダウンロードがサポートされていません');
    }
  } catch (error) {
    console.error('Marine CSV export error:', error);
    alert('湾内乗下船用CSVファイルの作成中にエラーが発生しました');
  }
}