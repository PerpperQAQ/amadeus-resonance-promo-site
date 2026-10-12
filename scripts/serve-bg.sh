#!/bin/bash
# 后台启动预览服务（vite preview，端口 5287），PID 写入 .preview.pid，日志写入 .preview.log
cd "$(dirname "$0")/.."
export PATH=/usr/local/bin:/opt/homebrew/bin:$PATH
if [ -f .preview.pid ] && kill -0 "$(cat .preview.pid)" 2>/dev/null; then echo "已在运行 PID $(cat .preview.pid)"; exit 0; fi
python3 - <<'PY'
import subprocess
f = open('.preview.log', 'w')
p = subprocess.Popen(['node', 'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5287', '--strictPort'],
                     stdout=f, stderr=f, stdin=subprocess.DEVNULL, start_new_session=True)
open('.preview.pid', 'w').write(str(p.pid))
print('started PID', p.pid)
PY
