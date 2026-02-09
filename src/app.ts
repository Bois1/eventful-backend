import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { apiLimiter } from './core/middleware/rateLimiter';
import { errorHandler } from './core/middleware/errorHandler';
import { logger } from './core/logger/logger';
import authRoutes from './modules/auth/routes';
import eventsRoutes from './modules/events/routes';
import ticketsRoutes from './modules/tickets/routes';
import paymentsRoutes from './modules/payments/routes';
import analyticsRoutes from './modules/analytics/routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(compression());
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

  app.use(apiLimiter);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/events', eventsRoutes);
  app.use('/api/v1/tickets', ticketsRoutes);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  });


  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;