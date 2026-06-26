import http from 'http';
import 'dotenv/config';
import { createApp } from './app';
import { createSocketServer } from './realtime/socket';
import { parseEnv } from './config/env';
import { logger } from './lib/logger';
import { mailProvider } from './lib/mail';
import { cloudinaryConfigured } from './lib/cloudinary';

const env = parseEnv(process.env);
const app = createApp();
const httpServer = http.createServer(app);

createSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`HomeBase API + realtime listening on :${env.PORT}`);
  const provider = mailProvider();
  logger.info({ mailProvider: provider, cloudinary: cloudinaryConfigured() }, 'Startup config');
});
