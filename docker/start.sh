#!/bin/bash

# Start cron daemon
service cron start

# Start Python application
exec python app.py