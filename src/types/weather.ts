export interface WeatherData {
  id?: number;
  station_name: string;
  station_code: string;
  timestamp: string;
  wind_direction?: string;
  wind_speed?: number;
  wave_height?: number;
  wind_status?: 'weak';
  created_at?: string;
}

export interface WindChartData {
  trend_data: WeatherData[];
  summary: {
    total_records: number;
    latest_wind_speed: number | null;
    average_wind_speed: number | null;
    max_wind_speed: number | null;
    weak_wind_count: number;
    is_sampled: boolean;
  };
  direction_counts: Record<string, number>;
}

export interface Station {
  name: string;
  code: string;
  url: string;
  hasWaveHeight: boolean;
}

// 観測地点の色定義
export const STATION_COLORS = {
  iragomisaki_vtss: {
    bg: 'bg-blue-100 text-blue-800',
    gradient: 'from-blue-500 to-blue-600'
  },
  iragosuido_southeast_aisss: {
    bg: 'bg-teal-100 text-teal-800',
    gradient: 'from-teal-500 to-teal-600'
  },
  daiosaki_lt: {
    bg: 'bg-green-100 text-green-800',
    gradient: 'from-green-500 to-green-600'
  },
  nagoyako_bw: {
    bg: 'bg-yellow-100 text-yellow-800',
    gradient: 'from-yellow-500 to-yellow-600'
  },
  yokkaichiko_bkw_lt: {
    bg: 'bg-purple-100 text-purple-800',
    gradient: 'from-purple-500 to-purple-600'
  }
} as const;

export const STATIONS: Station[] = [
  {
    name: '伊良湖岬',
    code: 'iragomisaki_vtss',
    url: 'https://www6.kaiho.mlit.go.jp/isewan/kisyou/iragomisaki_vtss.html',
    hasWaveHeight: false
  },
  {
    name: '伊勢湾2号ブイ',
    code: 'iragosuido_southeast_aisss',
    url: 'https://www6.kaiho.mlit.go.jp/isewan/kisyou/iragosuido_southeast_aisss.html',
    hasWaveHeight: true
  },
  {
    name: '大王埼灯台',
    code: 'daiosaki_lt',
    url: 'https://www6.kaiho.mlit.go.jp/isewan/kisyou/daiosaki_lt.html',
    hasWaveHeight: true
  },
  {
    name: '名古屋港高潮防波堤',
    code: 'nagoyako_bw',
    url: 'https://www6.kaiho.mlit.go.jp/nagoyako/kisyou/nagoyako_bw.html',
    hasWaveHeight: false
  },
  {
    name: '四日市港防波堤信号所',
    code: 'yokkaichiko_bkw_lt',
    url: 'https://www6.kaiho.mlit.go.jp/04kanku/yokkaichi/yokkaichiko_bkw_lt/kisyou/index.html',
    hasWaveHeight: false
  }
];
