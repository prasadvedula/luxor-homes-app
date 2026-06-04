#!/bin/sh
set -e

# Express API binds to Railway's $PORT so the healthcheck at $PORT/health works.
# Express also proxies all non-API traffic to Next.js on port 3000.
node api/dist/server.js &
API_PID=$!

# Give Express a moment to start before Next.js begins receiving proxied requests
sleep 2

# Next.js UI on fixed internal port 3000
cd /app/ui && PORT=3000 node_modules/.bin/next start -H 0.0.0.0 -p 3000 &
UI_PID=$!

echo "API PID=$API_PID (port ${PORT:-4000}) | UI PID=$UI_PID (port 3000)"

wait $API_PID $UI_PID
