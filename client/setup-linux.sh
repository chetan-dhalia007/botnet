#!/bin/bash
# Install bot as a daemon on Linux
EXE_PATH=$(pwd)/bot-linux
SERVICE_PATH=/etc/systemd/system/bot.service

sudo bash -c "cat > $SERVICE_PATH" <<EOF
[Unit]
Description=Bot Daemon
After=network.target

[Service]
ExecStart=$EXE_PATH
Restart=always
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable bot
sudo systemctl start bot
echo "Bot installed and started as a daemon."
