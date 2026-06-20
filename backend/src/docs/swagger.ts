import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import openApiSpec from './openapi.json';

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiSpec);
  });
}
