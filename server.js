const http = require("http");
const net = require("net");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8000;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/apiws") {
    res.writeHead(426, { "Content-Type": "text/plain" });
    res.end("Expected websocket");
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname !== "/apiws") {
    socket.destroy();
    return;
  }
  const dst = url.searchParams.get("dst");
  if (!dst) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    const tcp = net.connect({ host: dst, port: 443 }, () => {
      ws.on("message", (data) => {
        if (tcp.writable) tcp.write(Buffer.from(data));
      });
    });
    tcp.on("data", (chunk) => {
      if (ws.readyState === 1) ws.send(chunk);
    });
    const cleanup = () => {
      try { tcp.destroy(); } catch {}
      try { ws.close(); } catch {}
    };
    ws.on("close", cleanup);
    ws.on("error", cleanup);
    tcp.on("close", cleanup);
    tcp.on("error", cleanup);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Bridge listening on port ${PORT}`);
});
