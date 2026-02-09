import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Eventful API',
      version: '1.0.0',
      description: 'Event ticketing platform API documentation',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['CREATOR', 'EVENTEE'] },
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            location: { type: 'string' },
            capacity: { type: 'integer' },
            price: { type: 'number' },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] },
            ticketsSold: { type: 'integer' },
            creator: { $ref: '#/components/schemas/User' }
          }
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            eventId: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'SCANNED', 'CANCELLED'] },
            qrCode: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] },
            paystackReference: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/modules/**/*.ts', './src/docs/*.yaml'],
};

export const swaggerSpec = swaggerJsdoc(options);