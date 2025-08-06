# Ubuntuサーバーデプロイガイド

## 前提条件
- Ubuntu 20.04 LTS以上
- sudo権限を持つユーザー
- ドメイン名（オプション）

## デプロイ手順

### 1. サーバーにファイルをアップロード
```bash
# プロジェクトファイルをサーバーにアップロード
scp -r . user@your-server:/tmp/marine-weather/
```

### 2. デプロイスクリプト実行
```bash
# サーバーにSSH接続
ssh user@your-server

# デプロイディレクトリに移動
cd /tmp/marine-weather

# デプロイスクリプトに実行権限付与
chmod +x deploy/deploy.sh

# ドメイン名を設定（deploy.sh内のyour-domain.comを変更）
nano deploy/deploy.sh

# デプロイ実行
sudo ./deploy/deploy.sh
```

### 3. SSL証明書設定（Let's Encrypt）
```bash
# Certbot インストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書取得
sudo certbot --nginx -d your-domain.com

# 自動更新設定
sudo crontab -e
# 以下を追加:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## システム構成

```
/var/www/marine-weather/          # プロジェクトルート
├── backend/                      # Pythonバックエンド
│   ├── app.py                   # APIサーバー
│   ├── scraper_cron.py          # データ取得スクリプト
│   └── requirements.txt         # Python依存関係
├── dist/                        # ビルド済みフロントエンド
└── venv/                        # Python仮想環境

/var/lib/marine-weather/         # データディレクトリ
└── weather_data.db              # SQLiteデータベース

/etc/systemd/system/
└── marine-weather.service       # systemdサービス

/etc/nginx/sites-available/
└── marine-weather               # Nginx設定
```

## 運用コマンド

### サービス管理
```bash
# サービス状態確認
sudo systemctl status marine-weather

# サービス再起動
sudo systemctl restart marine-weather

# ログ確認
sudo journalctl -u marine-weather -f
```

### データベース管理
```bash
# データベースバックアップ
sudo cp /var/lib/marine-weather/weather_data.db /backup/weather_data_$(date +%Y%m%d).db

# データベース確認
sqlite3 /var/lib/marine-weather/weather_data.db "SELECT COUNT(*) FROM weather_data;"
```

### Cron確認
```bash
# Cronジョブ確認
sudo crontab -u www-data -l

# Cronログ確認
sudo tail -f /var/log/marine-weather-cron.log
```

### システム更新
```bash
# 更新スクリプト実行
cd /var/www/marine-weather
sudo ./deploy/update.sh
```

## トラブルシューティング

### よくある問題

1. **APIが応答しない**
```bash
sudo systemctl status marine-weather
sudo journalctl -u marine-weather -n 50
```

2. **データが更新されない**
```bash
sudo tail -f /var/log/marine-weather-cron.log
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
# /etc/cron.daily/marine-weather-backup
#!/bin/bash
cp /var/lib/marine-weather/weather_data.db /backup/weather_data_$(date +%Y%m%d).db
find /backup -name "weather_data_*.db" -mtime +30 -delete
```

## 監視設定

### ログローテーション
```bash
# /etc/logrotate.d/marine-weather
/var/log/marine-weather-cron.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```