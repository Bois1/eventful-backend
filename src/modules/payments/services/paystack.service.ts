import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../../../config/database';
import redis from '../../../config/redis';
import { BadRequestError, NotFoundError } from '../../../core/errors/AppError';
import { TicketsService } from '../../tickets/services/tickets.service';
import { InitializePaymentData } from '../../../shared/types';

const ticketsService = new TicketsService();

export class PaystackService {
  private static readonly WEBHOOK_TTL = 60 * 60; 

 async initializePayment(data: InitializePaymentData) {
  const { userId, ticketId, email, amount } = data;

 
  if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
    throw new BadRequestError(
      'Invalid amount format. Amount must be a positive integer in KOBO (smallest currency unit). ' +
      `Received: ${amount}. Example: ₦100 = 10000 kobo.`
    );
  }

  
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { event: true }
  });

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  if (ticket.userId !== userId) {
    throw new BadRequestError('Invalid ticket ownership');
  }

  if (ticket.status !== 'PENDING') {
    throw new BadRequestError('Ticket is not in pending state');
  }

  
  const expectedAmount = Math.round(Number(ticket.event.price) * 100);
  if (Math.abs(amount - expectedAmount) > 1) { 
    throw new BadRequestError(
      `Payment amount mismatch. Expected ${expectedAmount} kobo (₦${(expectedAmount/100).toFixed(2)}), ` +
      `received ${amount} kobo (₦${(amount/100).toFixed(2)}).`
    );
  }

  
  const payment = await prisma.payment.create({
    data: {
      ticketId,
      eventId: ticket.eventId,
      amount,
      currency: 'NGN',
      status: 'PENDING'
    }
  });

  try {
    
    const response = await axios.post(
      `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount, 
        reference: payment.id,
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

   
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paystackReference: response.data.data.reference }
    });

    return {
      authorizationUrl: response.data.data.authorization_url,
      paymentId: payment.id,
      reference: response.data.data.reference
    };
  } catch (error: any) {
    
    await prisma.payment.delete({ where: { id: payment.id } });
    
    const paystackError = error.response?.data?.message || error.message;
    
    throw new BadRequestError(
      `Payment gateway error: ${paystackError}. ` +
      `Please verify your Paystack keys are correct and in the right mode (test/live).`
    );
  }
};

  async verifyPayment(reference: string) {
    try {
      const response = await axios.get(
        `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      return response.data.data;
    } catch (error: any) {
      throw new BadRequestError(
        error.response?.data?.message || 'Failed to verify payment'
      );
    }
  }

  async handleWebhook(payload: any, signature: string) {
    
    if (!this.verifySignature(JSON.stringify(payload), signature)) {
      throw new Error('Invalid webhook signature');
    }

    
    const eventKey = `paystack:webhook:${payload.id}`;
    const alreadyProcessed = await this.checkAndSetWebhook(eventKey);
    if (alreadyProcessed) {
      return { processed: false, reason: 'duplicate' };
    }

 
    if (payload.event !== 'charge.success') {
      return { processed: false, reason: 'non_success_event' };
    }

    const eventData = payload.data;
    if (eventData.status !== 'success') {
      return { processed: false, reason: 'failed_payment' };
    }

   
    const payment = await prisma.payment.findUnique({
      where: { paystackReference: eventData.reference },
      include: { ticket: { include: { event: true } } }
    });

    if (!payment) {
      return { processed: false, reason: 'payment_not_found' };
    }

    if (payment.status === 'SUCCESS') {
      return { processed: false, reason: 'already_processed' };
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        paystackData: eventData as any
      }
    });

   
    const updatedTicket = await prisma.ticket.update({
      where: { id: payment.ticketId },
      data: { status: 'PAID' }
    });

   
    await ticketsService.generateQRCode(updatedTicket.id);

    return { processed: true, paymentId: payment.id };
  }

  private verifySignature(payload: string, signature: string): boolean {
    if (!signature) return false;

    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(payload)
      .digest('hex');
    
    if (hash.length !== signature.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(signature)
      );
    } catch (error) {
      return false;
    }
  }

  private async checkAndSetWebhook(key: string): Promise<boolean> {
    const exists = await redis.exists(key);
    if (exists) return true;
    
    await redis.setex(key, PaystackService.WEBHOOK_TTL, '1');
    return false;
  }
}