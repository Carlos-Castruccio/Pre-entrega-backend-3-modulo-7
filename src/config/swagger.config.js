import { AppError } from '../utils/AppError.js';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
export const openapi = JSON.parse(readFileSync(new URL('../docs/openapi.json', import.meta.url), 'utf8'));
export function setupSwagger(app) {
  app.use('/api/docs', (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next(new AppError('ROUTE_NOT_FOUND'));
    next();
  });
  app.get('/api/docs/openapi.json', (req, res) => res.json(openapi));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: 'ShipNow API — Swagger',
    swaggerOptions: { persistAuthorization: false }
  }));
}

