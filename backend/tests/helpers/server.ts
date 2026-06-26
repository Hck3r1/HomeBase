import http from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../../src/app';
import { createSocketServer, getIo, setIo } from '../../src/realtime/socket';

export async function startTestServer() {
  const app = createApp();
  const httpServer = http.createServer(app);
  createSocketServer(httpServer);
  if (!getIo()) throw new Error('Socket.IO failed to initialize');
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  return { httpServer, port, baseURL: `http://127.0.0.1:${port}` };
}

export async function stopTestServer(httpServer: http.Server) {
  await new Promise<void>((resolve) => {
    const io = getIo();
    if (io) {
      io.close(() => {
        setIo(null);
        httpServer.close(() => resolve());
      });
    } else {
      httpServer.close(() => resolve());
    }
  });
}
