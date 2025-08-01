export interface WeatherData {
  id?: number;
  station_name: string;
  station_code: string;
  timestamp: string;
  wind_direction?: string;
  wind_speed?: number;
  wave_height?: number;
  created_at?: string;
}

export interface Station {
  name: string;
  code: string;
  url: string;
  hasWaveHeight: boolean;
}

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