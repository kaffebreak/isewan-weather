"""Regression tests for the 2026-08-15 outage.

海上保安庁 (Japan Coast Guard) weather pages don't declare a charset in
their HTTP Content-Type header. `requests` then defaults `response.encoding`
to ISO-8859-1 per RFC 2616 instead of leaving it unset -- and because
decoding arbitrary bytes as ISO-8859-1 never raises, the scraper silently
turned every station's UTF-8 HTML into mojibake and stopped recognizing the
日付/時刻/風向/風速 table headers, returning 0 records from every station for
hours before anyone noticed.

Run with: python -m unittest discover -s backend/tests (from the repo's
isewan-weather/ directory), or via pytest if available.
"""
import logging
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.scraper import WeatherScraper  # noqa: E402


def _utf8_table_html():
    """A minimal weather table shaped like the real 気象庁 pages, with a
    <meta charset> declaration and encoded as UTF-8 -- the encoding those
    pages actually use."""
    return (
        '<html><head><meta charset="utf-8"></head><body><table>'
        '<tr><th>日付</th><th>時刻</th><th>風向</th><th>風速</th></tr>'
        '<tr><td>2026/08/15</td><td>12:00</td><td>北北西</td><td>3.5m/s</td></tr>'
        '</table></body></html>'
    ).encode('utf-8')


class FakeResponse:
    """Stand-in for requests.Response reproducing the outage: no charset
    in Content-Type, so `requests` mis-reports `encoding` (defaulting to
    ISO-8859-1) even though the real bytes are UTF-8."""

    def __init__(self, content, content_type='text/html', encoding='ISO-8859-1',
                 apparent_encoding='utf-8'):
        self.content = content
        self.headers = {'Content-Type': content_type}
        self.encoding = encoding
        self.apparent_encoding = apparent_encoding

    def raise_for_status(self):
        pass


class EncodingRegressionTest(unittest.TestCase):
    def setUp(self):
        self.scraper = WeatherScraper()
        self.station = next(
            s for s in self.scraper.stations if s['code'] == 'iragomisaki_vtss'
        )

    @patch('modules.scraper.requests.get')
    def test_scrape_station_recovers_utf8_data_despite_iso_8859_1_header(self, mock_get):
        mock_get.return_value = FakeResponse(_utf8_table_html())

        data = self.scraper.scrape_station(self.station)

        self.assertEqual(len(data), 1)
        record = data[0]
        self.assertEqual(record['timestamp'], '2026-08-15 12:00:00')
        self.assertEqual(record['wind_direction'], '北北西')
        self.assertEqual(record['wind_speed'], 3.5)

    @patch('modules.scraper.requests.get')
    def test_scrape_station_recovers_utf8_data_when_requests_leaves_encoding_unset(self, mock_get):
        # Some responses leave response.encoding as None entirely rather
        # than defaulting to ISO-8859-1 -- both must be handled, not just
        # the one specific encoding name seen in this outage.
        mock_get.return_value = FakeResponse(_utf8_table_html(), encoding=None)

        data = self.scraper.scrape_station(self.station)

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['wind_direction'], '北北西')

    @patch('modules.scraper.requests.get')
    def test_scrape_station_still_works_when_charset_is_declared_correctly(self, mock_get):
        # Pages that *do* declare UTF-8 explicitly must keep working --
        # the fix must not just trade one blind guess for another.
        mock_get.return_value = FakeResponse(
            _utf8_table_html(), content_type='text/html; charset=utf-8', encoding='utf-8',
        )

        data = self.scraper.scrape_station(self.station)

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['wind_direction'], '北北西')


class ZeroRecordAnomalyLoggingTest(unittest.TestCase):
    """All-stations-empty scrapes previously looked identical to a
    genuine 'no new data' cycle. They must now be logged as a warning,
    escalating to an error once they repeat for
    CONSECUTIVE_EMPTY_SCRAPE_ALERT_THRESHOLD cycles in a row."""

    def setUp(self):
        self.scraper = WeatherScraper()
        self.addCleanup(patch.stopall)
        patch('modules.scraper.time.sleep').start()
        patch.object(self.scraper, 'scrape_station', return_value=[]).start()

    def test_all_zero_scrape_logs_warning_and_increments_counter(self):
        with self.assertLogs('modules.scraper', level='WARNING') as logs:
            self.scraper.scrape_all_stations()

        self.assertEqual(self.scraper._consecutive_empty_scrapes, 1)
        self.assertTrue(any('no weather records were parsed' in m for m in logs.output))

    def test_repeated_zero_scrapes_escalate_to_error(self):
        threshold = self.scraper.CONSECUTIVE_EMPTY_SCRAPE_ALERT_THRESHOLD

        for _ in range(threshold - 1):
            with self.assertLogs('modules.scraper', level='WARNING'):
                self.scraper.scrape_all_stations()

        with self.assertLogs('modules.scraper', level='WARNING') as logs:
            self.scraper.scrape_all_stations()

        self.assertEqual(self.scraper._consecutive_empty_scrapes, threshold)
        self.assertTrue(any(record.levelno == logging.ERROR for record in logs.records))


if __name__ == '__main__':
    unittest.main()
