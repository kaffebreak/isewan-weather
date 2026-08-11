#!/bin/bash

# エラー時に終了
set -e

echo "=== 伊勢湾気象データ管理システム 起動中 ==="

# データディレクトリを用意する。/app/data はホストからバインドマウント
# されることがあり、その場合ホスト側の所有権（root になりがち）で上書き
# されるため、起動のたびに appuser の所有へ揃える。
# (このスクリプト自体はコンテナ起動直後・root権限で動くのでchownできる)
mkdir -p /app/data
chown -R appuser:appuser /app/data

# 定期スクレイピングはPythonプロセス内のバックグラウンドスレッドで行う
# ため、root権限が必要なcronデーモンは不要。ここで非rootユーザーに
# 権限を落としてからアプリケーションを起動する。
echo "🚀 Pythonアプリケーションを非rootユーザー(appuser)で起動中..."
exec su appuser -s /bin/sh -c 'exec python app.py'
