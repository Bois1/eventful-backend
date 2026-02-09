import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { env } from './config/env';
import { logger } from './core/logger/logger';
import { prisma } from './config/database';

const PORT = parseInt(env.PORT);

async function startServer() {
  try {
   
    await prisma.$connect();
    logger.info('Database connected successfully');

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api/docs`);
    });

    process.on('SIGTERM', shutdown(server));
    process.on('SIGINT', shutdown(server));
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

function shutdown(server: any) {
  return async () => {
    logger.info('Shutting down gracefully...');
    
    server.close(async () => {
      try {
        await prisma.$disconnect();
        logger.info('Database disconnected');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
}

startServer();