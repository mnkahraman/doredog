#!/bin/bash
# DoReDog local dev server — serves the static site on http://127.0.0.1:4173
# Start:  ./serve.sh        Stop: press Ctrl+C  (or run ./serve.sh stop from another terminal)

cd "$(dirname "$0")" || exit 1

if [ "$1" = "stop" ]; then
  PIDS=$(lsof -ti tcp:4173 2>/dev/null)
  if [ -n "$PIDS" ]; then kill $PIDS && echo "stopped server on :4173"; else echo "nothing running on :4173"; fi
  exit 0
fi

# free the port first (in case a server is already running)
lsof -ti tcp:4173 2>/dev/null | xargs kill 2>/dev/null

echo "DoReDog → http://127.0.0.1:4173   (press Ctrl+C to stop)"
exec node -e "const http=require('http'),fs=require('fs'),path=require('path');const T={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/'||p==='')p='/index.html';const fp=path.join(process.cwd(),p);fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404);return res.end('not found');}res.writeHead(200,{'content-type':T[path.extname(fp)]||'application/octet-stream','cache-control':'no-store'});res.end(d);});}).listen(4173,'127.0.0.1',()=>console.log('serving on http://127.0.0.1:4173'));"
