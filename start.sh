#!/bin/sh
set -e

# Railway assigns the public port via $PORT (default 3000)
PUBLIC_PORT=${PORT:-3000}

# Start Express API on fixed internal port 4000
PORT=4000 node api/dist/server.js &
API_PID=$!

# Brief pause so Express is ready before Next.js starts proxying
sleep 2

# Start Next.js on Railway's public port
cd /app/ui && PORT=$PUBLIC_PORT node_modules/.bin/next start -H 0.0.0.0 -p $PUBLIC_PORT &
UI_PID=$!

echo "API PID=$API_PID (port 4000) | UI PID=$UI_PID (port $PUBLIC_PORT)"

# Exit if either process dies
wait $API_PID $UI_PID
