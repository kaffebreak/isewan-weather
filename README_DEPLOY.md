# Ubuntuサーバーデプロイガイド

## 前提条件
- Ubuntu 20.04 LTS以上 (固定IP: 10.10.10.11)
- sudo権限を持つユーザー
- 固定IPアドレス設定済み

## デプロイ手順

### 1. サーバーにファイルをアップロード
```bash
# プロジェクトファイルをサーバーにアップロード
scp -r . user@10.10.10.11:/tmp/isewan-weather/
```

### 2. デプロイスクリプト実行
```bash
# サーバーにSSH接続
ssh user@10.10.10.11

# デプロイディレクトリに移動
cd /tmp/isewan-weather

# デプロイスクリプトに実行権限付与
chmod +x deploy/deploy.sh

# ドメイン名を設定（deploy.sh内のyour-domain.comを変更）
nano deploy/deploy.sh

# デプロイ実行
sudo ./deploy/deploy.sh
```

### 3. SSL証明書設定（Let's Encrypt）
社内ネットワーク限定のため、SSL設定は不要です。

## システム構成

```
/var/www/isewan-weather/          # プロジェクトルート
├── backend/                      # Pythonバックエンド
│   ├── app.py                   # APIサーバー
│   ├── scraper_cron.py          # データ取得スクリプト
│   └── requirements.txt         # Python依存関係
├── dist/                        # ビルド済みフロントエンド
└── venv/                        # Python仮想環境

/var/lib/isewan-weather/         # データディレクトリ
└── weather_data.db              # SQLiteデータベース

/etc/systemd/system/
└── isewan-weather.service       # systemdサービス

/etc/nginx/sites-available/
└── isewan-weather               # Nginx設定
```

## 運用コマンド

### サービス管理
```bash
# サービス状態確認
sudo systemctl status isewan-weather

# サービス再起動
sudo systemctl restart isewan-weather

# ログ確認
sudo journalctl -u isewan-weather -f
```

### データベース管理
```bash
# データベースバックアップ
sudo cp /var/lib/isewan-weather/weather_data.db /backup/weather_data_$(date +%Y%m%d).db

# データベース確認
sqlite3 /var/lib/isewan-weather/weather_data.db "SELECT COUNT(*) FROM weather_data;"
```

### Cron確認
```bash
# Cronジョブ確認
sudo crontab -u www-data -l

# Cronログ確認
sudo tail -f /var/log/isewan-weather-cron.log
```

### システム更新
```bash
# 更新スクリプト実行
cd /var/www/isewan-weather
sudo ./deploy/update.sh
```

## トラブルシューティング

### よくある問題

1. **APIが応答しない**
```bash
sudo systemctl status isewan-weather
sudo journalctl -u isewan-weather -n 50
```

2. **データが更新されない**
```bash
sudo tail -f /var/log/isewan-weather-cron.log
sudo crontab -u www-data -l
```

3. **Nginxエラー**
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

## セキュリティ設定

### ファイアウォール
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### 定期バックアップ
```bash
# /etc/cron.daily/isewan-weather-backup
#!/bin/bash
cp /var/lib/isewan-weather/weather_data.db /backup/weather_data_$(date +%Y%m%d).db
find /backup -name "weather_data_*.db" -mtime +30 -delete
```

## 監視設定

### ログローテーション
```bash
# /etc/logrotate.d/isewan-weather
/var/log/isewan-weather-cron.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```