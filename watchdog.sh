#!/bin/bash
cd /home/z/my-project
while true; do
    if ! ss -tlnp 2>/dev/null | grep -q ":3000 "; then
        PORT=3000 HOSTNAME=127.0.0.1 nohup node .next/standalone/server.js &>/dev/null &
        sleep 5
    fi
    sleep 5
done
