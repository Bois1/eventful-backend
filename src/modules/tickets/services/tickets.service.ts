import crypto from 'crypto';
import { prisma } from '../../../config/database';
import redis from '../../../config/redis';
import { generateQRCode } from '../../../shared/utils/qr';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../../core/errors/AppError';
import { Ticket } from '../../../shared/types';

export class TicketsService {
  async purchaseTicket(userId: string, eventId: string): Promise<Ticket> {
 
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.status !== 'PUBLISHED') {
      throw new BadRequestError('Event is not available for ticket purchase');
    }

    if (event.startTime.getTime() < Date.now()) {
      throw new BadRequestError('Event has already started or ended');
    }

    // Check if user already has a ticket for this event
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        userId,
        eventId,
        status: { in: ['PENDING', 'PAID'] }
      }
    });

    if (existingTicket) {
      throw new BadRequestError('You already have a ticket for this event');
    }

    // Check capacity
    const ticketCount = await prisma.ticket.count({
      where: {
        eventId,
        status: 'PAID'
      }
    });

    if (ticketCount >= event.capacity) {
      throw new BadRequestError('Event is sold out');
    }

    // Create pending ticket
    const qrToken = crypto.randomUUID();
    const ticket = await prisma.ticket.create({
      data: {
        userId,
        eventId,
        status: 'PENDING',
        qrToken
      }
    });

    return ticket;
  }

  async generateQRCode(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { event: true }
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Generate QR code with verification URL
    const qrData = `${process.env.FRONTEND_URL}/verify/${ticket.qrToken}`;
    const qrCode = await generateQRCode(qrData);

    // Save QR code to ticket
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { qrCode }
    });

    // Store verification data in Redis
    const ttl = Math.floor((ticket.event.endTime.getTime() - Date.now()) / 1000) + 86400;
    await redis.setex(
      `qr:verify:${ticket.qrToken}`,
      ttl > 0 ? ttl : 86400,
      JSON.stringify({
        ticketId: ticket.id,
        eventId: ticket.eventId,
        eventName: ticket.event.title
      })
    );

    return qrCode;
  }

  async verifyTicket(qrToken: string) {
    // Use Lua script for atomic verification
    const luaScript = `
      local data = redis.call('GET', KEYS[1])
      if not data then return nil end
      redis.call('DEL', KEYS[1])
      return data
    `;

    const result = await redis.eval(
      luaScript,
      1,
      `qr:verify:${qrToken}`
    ) as string | null;

    if (!result) {
      throw new BadRequestError('Invalid, expired, or already scanned ticket');
    }

    const { ticketId, eventId, eventName } = JSON.parse(result);

    // Update ticket status
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { 
        status: 'SCANNED',
        scannedAt: new Date()
      }
    });

    return {
      valid: true,
      ticketId,
      eventId,
      eventName
    };
  }

  async getMyTickets(userId: string) {
    return prisma.ticket.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            location: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async cancelTicket(ticketId: string, userId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenError('You do not have permission to cancel this ticket');
    }

    if (ticket.status === 'SCANNED') {
      throw new BadRequestError('Cannot cancel a scanned ticket');
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CANCELLED' }
    });

    return { success: true };
  }
}