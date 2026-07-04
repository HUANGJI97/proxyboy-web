#!/bin/bash

# 代理服务管理脚本

PROJECT_DIR="/home/ubuntu/.openclaw/workspace/proxy-server"
PID_FILE="/tmp/proxy-server.pid"
WEB_PID_FILE="/tmp/web-server.pid"
CERT_PID_FILE="/tmp/cert-server.pid"

case "$1" in
  start)
    echo "Starting proxy server..."
    cd "$PROJECT_DIR"
    nohup node server.js start -p 8080 > /tmp/proxy.log 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1
    if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
      echo "✅ Proxy server started (PID: $(cat "$PID_FILE"))"
      echo "📜 Logs: tail -f /tmp/proxy.log"
    else
      echo "❌ Failed to start"
      exit 1
    fi
    ;;
    
  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p $PID > /dev/null 2>&1; then
        echo "Stopping proxy server (PID: $PID)..."
        kill $PID
        rm -f "$PID_FILE"
        echo "✅ Stopped"
      else
        echo "⚠️  Process not running"
        rm -f "$PID_FILE"
      fi
    else
      echo "⚠️  PID file not found, trying to kill by name..."
      pkill -f "node.*server.js"
      echo "✅ Killed"
    fi
    ;;
    
  restart)
    $0 stop
    sleep 1
    $0 start
    ;;
    
  status)
    # 检查代理服务
    echo "=== 代理服务状态 ==="
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p $PID > /dev/null 2>&1; then
        echo "✅ Proxy server is running (PID: $PID)"
        netstat -tlnp 2>/dev/null | grep 8080 || ss -tlnp | grep 8080
      else
        echo "❌ Proxy server is not running (stale PID file)"
        rm -f "$PID_FILE"
      fi
    else
      if pgrep -f "node.*server.js" > /dev/null; then
        echo "✅ Proxy server is running (PID: $(pgrep -f 'node.*server.js'))"
      else
        echo "❌ Proxy server is not running"
      fi
    fi
    
    # 检查 Web 管理端
    echo ""
    echo "=== Web 管理端状态 ==="
    if pgrep -f "node.*web-server.js" > /dev/null; then
      echo "✅ Web server is running (PID: $(pgrep -f 'node.*web-server.js'))"
      netstat -tlnp 2>/dev/null | grep 3000 || ss -tlnp | grep 3000
    else
      echo "❌ Web server is not running"
    fi
    
    # 检查证书下载服务
    echo ""
    echo "=== 证书下载服务状态 ==="
    if pgrep -f "node.*cert-server.js" > /dev/null; then
      echo "✅ Cert server is running (PID: $(pgrep -f 'node.*cert-server.js'))"
      netstat -tlnp 2>/dev/null | grep 8888 || ss -tlnp | grep 8888
    else
      echo "❌ Cert server is not running"
    fi
    ;;
    
  logs)
    echo "📜 Proxy logs (Ctrl+C to exit):"
    tail -f /tmp/proxy.log
    ;;
    
  capture)
    CAPTURE_FILE="$PROJECT_DIR/logs/capture-$(date +%Y-%m-%d).json"
    if [ -f "$CAPTURE_FILE" ]; then
      echo "📦 Capture logs: $CAPTURE_FILE"
      if [ "$2" == "-f" ]; then
        tail -f "$CAPTURE_FILE"
      else
        cat "$CAPTURE_FILE" | head -50
        echo "..."
        echo "💡 Use '$0 capture -f' to follow logs"
      fi
    else
      echo "❌ No capture logs found for today"
    fi
    ;;
    
  cert)
    echo "📜 CA Certificate info:"
    cd "$PROJECT_DIR"
    node server.js show-ca
    ;;
    
  web-start)
    echo "Starting web server..."
    cd "$PROJECT_DIR"
    nohup node web-server.js > /tmp/web-server.log 2>&1 &
    echo $! > "$WEB_PID_FILE"
    sleep 1
    if ps -p $(cat "$WEB_PID_FILE") > /dev/null 2>&1; then
      echo "✅ Web server started (PID: $(cat "$WEB_PID_FILE"))"
      echo "🌐 URL: http://localhost:3000"
      echo "🌐 URL: http://115.159.196.184:3000"
    else
      echo "❌ Failed to start"
      exit 1
    fi
    ;;
    
  web-stop)
    if [ -f "$WEB_PID_FILE" ]; then
      PID=$(cat "$WEB_PID_FILE")
      if ps -p $PID > /dev/null 2>&1; then
        echo "Stopping web server (PID: $PID)..."
        kill $PID
        rm -f "$WEB_PID_FILE"
        echo "✅ Stopped"
      else
        echo "⚠️  Process not running"
        rm -f "$WEB_PID_FILE"
      fi
    else
      echo "⚠️  PID file not found, trying to kill by name..."
      pkill -f "node.*web-server.js"
      echo "✅ Killed"
    fi
    ;;
    
  web-restart)
    $0 web-stop
    sleep 1
    $0 web-start
    ;;
    
  cert-start)
    echo "Starting certificate download server..."
    cd "$PROJECT_DIR"
    nohup node cert-server.js > /tmp/cert-server.log 2>&1 &
    echo $! > "$CERT_PID_FILE"
    sleep 1
    if ps -p $(cat "$CERT_PID_FILE") > /dev/null 2>&1; then
      echo "✅ Cert server started (PID: $(cat "$CERT_PID_FILE"))"
      echo "🌐 URL: http://115.159.196.184:8888"
      echo "🌐 Download: http://115.159.196.184:8888/ca.crt"
    else
      echo "❌ Failed to start"
      exit 1
    fi
    ;;
    
  cert-stop)
    if [ -f "$CERT_PID_FILE" ]; then
      PID=$(cat "$CERT_PID_FILE")
      if ps -p $PID > /dev/null 2>&1; then
        echo "Stopping cert server (PID: $PID)..."
        kill $PID
        rm -f "$CERT_PID_FILE"
        echo "✅ Stopped"
      else
        echo "⚠️  Process not running"
        rm -f "$CERT_PID_FILE"
      fi
    else
      echo "⚠️  PID file not found, trying to kill by name..."
      pkill -f "node.*cert-server.js"
      echo "✅ Killed"
    fi
    ;;
    
  cert-restart)
    $0 cert-stop
    sleep 1
    $0 cert-start
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs|capture|cert|web-start|web-stop|web-restart|cert-start|cert-stop|cert-restart}"
    echo ""
    echo "Proxy Commands:"
    echo "  start       - Start proxy server"
    echo "  stop        - Stop proxy server"
    echo "  restart     - Restart proxy server"
    echo "  status      - Check server status"
    echo "  logs        - View server logs"
    echo "  capture     - View capture logs (add -f to follow)"
    echo "  cert        - Show CA certificate info"
    echo ""
    echo "Web Server Commands:"
    echo "  web-start   - Start web management server"
    echo "  web-stop    - Stop web management server"
    echo "  web-restart  - Restart web management server"
    echo ""
    echo "Cert Server Commands:"
    echo "  cert-start  - Start certificate download server"
    echo "  cert-stop   - Stop certificate download server"
    echo "  cert-restart - Restart certificate download server"
    exit 1
    ;;
esac

exit 0
