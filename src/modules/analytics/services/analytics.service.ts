import { prisma } from '../../../config/database';
import redis from '../../../config/redis';
import { NotFoundError } from '../../../core/errors/AppError';
import { EventAnalytics, CreatorAnalytics } from '../../../shared/types';

export class AnalyticsService {
  private static readonly CACHE_TTL = 60 * 5; // 5 minutes

  async getEventAnalytics(eventId: string, creatorId: string): Promise<EventAnalytics> {
    const cacheKey = `analytics:event:${eventId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId, creatorId }
    });

    if (!event) {
      throw new NotFoundError('Event not found or access denied');
    }

    const [totalTickets, scannedTickets, totalRevenue] = await Promise.all([
      prisma.ticket.count({
        where: { eventId, status: 'PAID' }
      }),
      prisma.ticket.count({
        where: { eventId, status: 'SCANNED' }
      }),
      prisma.payment.aggregate({
        where: { 
          ticket: { eventId },
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      })
    ]);

    const scanRate = totalTickets > 0 
      ? (scannedTickets / totalTickets) * 100 
      : 0;

    const result: EventAnalytics = {
      eventId,
      totalTickets,
      scannedTickets,
      scanRate: parseFloat(scanRate.toFixed(2)),
      totalRevenue: Number(totalRevenue._sum.amount || 0)
    };

    await redis.setex(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async getCreatorAnalytics(creatorId: string): Promise<CreatorAnalytics> {
    const cacheKey = `analytics:creator:${creatorId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const [totalEvents, totalTickets, totalRevenue] = await Promise.all([
      prisma.event.count({
        where: { creatorId }
      }),
      prisma.ticket.count({
        where: { 
          event: { creatorId },
          status: 'PAID'
        }
      }),
      prisma.payment.aggregate({
        where: { 
          ticket: { 
            event: { creatorId }
          },
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      })
    ]);

    const result: CreatorAnalytics = {
      creatorId,
      totalEvents,
      totalTickets,
      totalRevenue: Number(totalRevenue._sum.amount || 0)
    };

    await redis.setex(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async clearCache(eventId?: string) {
    if (eventId) {
      await redis.del(`analytics:event:${eventId}`);
    } else {
      const keys = await redis.keys('analytics:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }
}