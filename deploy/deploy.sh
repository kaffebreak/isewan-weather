#!/bin/bash

# 海洋気象データ管理システム デプロイスクリプト
# Ubuntu Server用

set -e

echo "=== 海洋気象データ管理システム デプロイ開始 ==="

# 変数設定
PROJECT_DIR="/var/www/marine-weather"
DOMAIN="your-domain.com"  # あなたのドメインに変更
DB_DIR="/var/lib/marine-weather"

# 1. システム更新とパッケージインストール
echo "1. システムパッケージを更新中..."
sudo apt update
sudo apt install -y nginx python3 python3-pip python3-venv nodejs npm git

# 2. プロジェクトディレクトリ作成
echo "2. プロジェクトディレクトリを作成中..."
sudo mkdir -p $PROJECT_DIR
sudo mkdir -p $DB_DIR
sudo chown -R $USER:www-data $PROJECT_DIR
sudo chown -R www-data:www-data $DB_DIR

# 3. プロジェクトファイルをコピー（現在のディレクトリから）
echo "3. プロジェクトファイルをコピー中..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# 4. Python仮想環境セットアップ
echo "4. Python仮想環境をセットアップ中..."
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 5. Node.js依存関係インストールとビルド
echo "5. フロントエンドをビルド中..."
npm install
npm run build

# 6. データベースディレクトリ設定
echo "6. データベース設定中..."
sudo ln -sf $DB_DIR/weather_data.db $PROJECT_DIR/backend/weather_data.db

# 7. systemdサービス設定
echo "7. systemdサービスを設定中..."
sudo cp deploy/marine-weather.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable marine-weather
sudo systemctl start marine-weather

# 8. Nginx設定
echo "8. Nginxを設定中..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/marine-weather
sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/marine-weather
sudo ln -sf /etc/nginx/sites-available/marine-weather /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 9. Cron設定
echo "9. Cronジョブを設定中..."
sudo cp deploy/crontab /tmp/marine-weather-cron
sudo sed -i "s|/var/www/marine-weather|$PROJECT_DIR|g" /tmp/marine-weather-cron
sudo crontab -u www-data /tmp/marine-weather-cron

# 10. ファイル権限設定
echo "10. ファイル権限を設定中..."
sudo chown -R www-data:www-data $PROJECT_DIR/backend
sudo chown -R www-data:www-data $DB_DIR
sudo chmod +x $PROJECT_DIR/backend/app.py
sudo chmod +x $PROJECT_DIR/backend/scraper_cron.py

# 11. ファイアウォール設定（必要に応じて）
echo "11. ファイアウォールを設定中..."
sudo ufw allow 'Nginx Full'

echo "=== デプロイ完了 ==="
echo ""
echo "サービス状態確認:"
echo "  sudo systemctl status marine-weather"
echo "  sudo systemctl status nginx"
echo ""
echo "ログ確認:"
echo "  sudo journalctl -u marine-weather -f"
echo "  sudo tail -f /var/log/marine-weather-cron.log"
echo ""
echo "アクセス: http://$DOMAIN"