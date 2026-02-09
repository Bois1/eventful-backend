import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import redis from '../../src/config/redis';
import { createTestUser, createTestEvent, generateTestToken } from '../helpers/test-setup';
import axios from 'axios';

jest.mock('axios');

describe('Payments Integration Tests', () => {
  let server: any;
  let eventeeToken: string;
  let testEvent: any;
  let creator: any;
  let eventee: any;

  beforeAll(async () => {
    server = app;
  });

  beforeEach(async () => {
   
    await prisma.$transaction([
      prisma.reminder.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.ticket.deleteMany(),
      prisma.event.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    await redis.flushdb();

    
    creator = await createTestUser({
      email: 'creator@test.com',
      password: await require('argon2').hash('password123'),
      role: 'CREATOR'
    });

    eventee = await createTestUser({
      email: 'eventee@test.com',
      password: await require('argon2').hash('password123'),
      role: 'EVENTEE'
    });

 
    eventeeToken = generateTestToken(eventee.id, 'EVENTEE');

    testEvent = await createTestEvent(creator.id, {
      title: 'Payment Test Event',
      price: 10000, 
      capacity: 50
    });

    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/test',
          access_code: 'test_code',
          reference: 'test_ref'
        }
      }
    });
  });

  describe('POST /api/v1/payments/initialize', () => {
    let testTicket: any;

    beforeEach(async () => {

        testTicket = await prisma.ticket.create({
        data: {
          userId: eventee.id,
          eventId: testEvent.id,
          status: 'PENDING',
          qrToken: require('crypto').randomUUID()
        }
      });
    });

    test('should initialize payment successfully', async () => {
      const response = await request(server)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${eventeeToken}`)
        .send({
          ticketId: testTicket.id,
          email: eventee.email,
          amount: 1000000 
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authorizationUrl');
      expect(response.body.data).toHaveProperty('paymentId');
      expect(response.body.data).toHaveProperty('reference');

    
      const payment = await prisma.payment.findUnique({
        where: { id: response.body.data.paymentId }
      });
      expect(payment).not.toBeNull();
      expect(payment?.status).toBe('PENDING');
      expect(Number(payment?.amount)).toBe(1000000);
    });

    test('should return 400 for invalid ticket ownership', async () => {
      const otherUser = await createTestUser({
        email: 'other@test.com',
        password: await require('argon2').hash('password123'),
        role: 'EVENTEE'
      });

      const otherToken = generateTestToken(otherUser.id);

      const response = await request(server)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          ticketId: testTicket.id,
          email: otherUser.email,
          amount: 1000000
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid ticket ownership');
    });

    test('should return 400 for ticket not in PENDING state', async () => {
    
      await prisma.ticket.update({
        where: { id: testTicket.id },
        data: { status: 'PAID' }
      });

      const response = await request(server)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${eventeeToken}`)
        .send({
          ticketId: testTicket.id,
          email: eventee.email,
          amount: 1000000
        })
        .expect(400);

      expect(response.body.error).toBe('Ticket is not in pending state');
    });

    test('should return 400 for amount mismatch', async () => {
      const response = await request(server)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${eventeeToken}`)
        .send({
          ticketId: testTicket.id,
          email: eventee.email,
          amount: 500000 
        })
        .expect(400);

      expect(response.body.error).toBe('Payment amount does not match ticket price');
    });

    test('should create payment record before calling Paystack', async () => {
      await request(server)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${eventeeToken}`)
        .send({
          ticketId: testTicket.id,
          email: eventee.email,
          amount: 1000000
        });

      
      const paymentCount = await prisma.payment.count({
        where: { ticketId: testTicket.id }
      });
      expect(paymentCount).toBe(1);
    });
  });

  describe('Payment Webhook Handling', () => {
    let testTicket: any;
    let testPayment: any;

    beforeEach(async () => {
      
        testTicket = await prisma.ticket.create({
        data: {
          userId: eventee.id,
          eventId: testEvent.id,
          status: 'PENDING',
          qrToken: require('crypto').randomUUID()
        }
      });

      testPayment = await prisma.payment.create({
        data: {
          ticketId: testTicket.id,
          eventId: testEvent.id,
          amount: 1000000,
          currency: 'NGN',
          status: 'PENDING'
        }
      });
    });

    test('should process successful payment webhook', async () => {
      const paystackReference = `test_ref_${Date.now()}`;
      
      
      await prisma.payment.update({
        where: { id: testPayment.id },
        data: { paystackReference }
      });

      const webhookPayload = {
        id: Date.now(),
        event: 'charge.success',
        data: {
          id: Date.now(),
          status: 'success',
          reference: paystackReference,
          amount: 1000000,
          customer: {
            email: eventee.email
          }
        }
      };

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      const response = await request(server)
        .post('/api/v1/payments/webhook')
        .set('x-paystack-signature', signature)
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(true);

     
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: testPayment.id }
      });
      expect(updatedPayment?.status).toBe('SUCCESS');

      
      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: testTicket.id }
      });
      expect(updatedTicket?.status).toBe('PAID');

     
      const qrData = await redis.get(`qr:verify:${updatedTicket?.qrToken}`);
      expect(qrData).not.toBeNull();
    });

    test('should handle duplicate webhooks (idempotency)', async () => {
      const paystackReference = `test_ref_${Date.now()}`;
      
      await prisma.payment.update({
        where: { id: testPayment.id },
        data: { paystackReference, status: 'SUCCESS' }
      });

      const webhookPayload = {
        id: Date.now(),
        event: 'charge.success',
        data: {
          status: 'success',
          reference: paystackReference,
          amount: 1000000
        }
      };

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

     
      await request(server)
        .post('/api/v1/payments/webhook')
        .set('x-paystack-signature', signature)
        .send(webhookPayload);

    
      const response2 = await request(server)
        .post('/api/v1/payments/webhook')
        .set('x-paystack-signature', signature)
        .send(webhookPayload);

     
      expect(response2.body.data.processed).toBe(false);
      expect(response2.body.data.reason).toBe('duplicate');
    });

    test('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          status: 'success',
          reference: 'test_ref',
          amount: 1000000
        }
      };

      const response = await request(server)
        .post('/api/v1/payments/webhook')
        .set('x-paystack-signature', 'invalid-signature')
        .send(webhookPayload)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    test('should ignore non-success events', async () => {
      const webhookPayload = {
        id: Date.now(),
        event: 'charge.failed',
        data: {
          status: 'failed',
          reference: 'test_ref',
          amount: 1000000
        }
      };

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      const response = await request(server)
        .post('/api/v1/payments/webhook')
        .set('x-paystack-signature', signature)
        .send(webhookPayload)
        .expect(200);

      expect(response.body.data.processed).toBe(false);
      expect(response.body.data.reason).toBe('non_success_event');
    });
  });

  describe('Payment Flow Integration', () => {
    test('should complete full payment flow: ticket → payment → success', async () => {
     
      const ticketResponse = await request(server)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${eventeeToken}`)
        .send({ eventId: testEvent.id })
        .expect(201);

      const ticketId = ticketResponse.body.data.id;

     
      const paymentResponse = await request(server)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${eventeeToken}`)
        .send({
          ticketId,
          email: eventee.email,
          amount: 1000000
        })
        .expect(201);

      const paystackReference = paymentResponse.body.data.reference;

      const webhookPayload = {
        id: Date.now(),
        event: 'charge.success',
        data: {
          id: Date.now(),
          status: 'success',
          reference: paystackReference,
          amount: 1000000,
          customer: { email: eventee.email }
        }
      };

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      await request(server)
        .post('/api/v1/payments/webhook')
        .set('x-paystack-signature', signature)
        .send(webhookPayload)
        .expect(200);


      const [updatedTicket, updatedPayment] = await Promise.all([
        prisma.ticket.findUnique({ where: { id: ticketId } }),
        prisma.payment.findFirst({ where: { ticketId } })
      ]);

      expect(updatedTicket?.status).toBe('PAID');
      expect(updatedPayment?.status).toBe('SUCCESS');
      expect(updatedTicket?.qrCode).not.toBeNull();
    });
  });

  describe('Payment Security', () => {
    test('should not expose sensitive payment data in responses', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          userId: eventee.id,
          eventId: testEvent.id,
          status: 'PENDING',
          qrToken: require('crypto').randomUUID()
        }
      });

      const response = await request(server)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${eventeeToken}`)
        .send({
          ticketId: ticket.id,
          email: eventee.email,
          amount: 1000000
        });

  
      const responseBody = JSON.stringify(response.body);
      expect(responseBody).not.toContain(process.env.PAYSTACK_SECRET_KEY || '');
    });

    test('should validate webhook signatures before processing', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: { status: 'success', reference: 'test', amount: 1000000 }
      };

   
      const response = await request(server)
        .post('/api/v1/payments/webhook')
        .send(webhookPayload)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});