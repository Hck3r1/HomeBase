import { createApp } from './app';
import { parseEnv } from './config/env';
import { logger } from './lib/logger';

const env = parseEnv(process.env);
const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`HomeBase API listening on :${env.PORT}`);
});
