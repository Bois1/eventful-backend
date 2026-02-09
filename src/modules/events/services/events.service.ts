import { prisma } from '../../../config/database';
import redis from '../../../config/redis';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../../core/errors/AppError';
import { CreateEventData, UpdateEventData } from '../../../shared/types';


export class EventsService {
  private static readonly CACHE_TTL = 60 * 10; // 10 minutes

  async createEvent(userId: string, data: CreateEventData) {
    
    if (data.startTime >= data.endTime) {
      throw new BadRequestError('End time must be after start time');
    }

    if (data.startTime.getTime() < Date.now()) {
      throw new BadRequestError('Start time must be in the future');
    }


    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        capacity: data.capacity,
        price: data.price || 0,
        creatorId: userId,
        status: 'DRAFT'
      }
    });

   
    await redis.del('events:published');

    return event;
  }

  async getEvents(params: { 
    page?: number; 
    limit?: number; 
    status?: string;
    creatorId?: string;
  }) {
    const { page = 1, limit = 20, status, creatorId } = params;
    const skip = (page - 1) * limit;

   
    if (!status && !creatorId) {
      const cacheKey = `events:published:${page}:${limit}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const where: any = {};
    if (status) where.status = status;
    if (creatorId) where.creatorId = creatorId;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              tickets: { where: { status: 'PAID' } }
            }
          }
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: limit
      }),
      prisma.event.count({ where })
    ]);

    const result = {
      data: events.map((event: any) => ({
        ...event,
        ticketsSold: event._count.tickets
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    
    if (!status && !creatorId) {
      const cacheKey = `events:published:${page}:${limit}`;
      await redis.setex(cacheKey, EventsService.CACHE_TTL, JSON.stringify(result));
    }

    return result;
  }

  async getEventById(id: string, userId?: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            tickets: { where: { status: 'PAID' } }
          }
        }
      }
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

  
    if (event.status !== 'PUBLISHED' && userId !== event.creatorId) {
      throw new ForbiddenError('You do not have permission to view this event');
    }

    return {
      ...event,
      ticketsSold: event._count.tickets
    };
  }

  async updateEvent(id: string, userId: string, data: UpdateEventData) {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.creatorId !== userId) {
      throw new ForbiddenError('You do not have permission to update this event');
    }

  
    if (data.startTime && data.endTime) {
      if (data.startTime >= data.endTime) {
        throw new BadRequestError('End time must be after start time');
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });


    await redis.del('events:published');

    return updatedEvent;
  }

  async deleteEvent(id: string, userId: string) {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.creatorId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this event');
    }

    await prisma.event.delete({ where: { id } });

  
    await redis.del('events:published');

    return { success: true };
  }

  async publishEvent(id: string, userId: string) {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.creatorId !== userId) {
      throw new ForbiddenError('You do not have permission to publish this event');
    }

    const publishedEvent = await prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED' }
    });

    
    await redis.del('events:published');

    return publishedEvent;
  }

  async getMyEvents(userId: string) {
    return this.getEvents({ creatorId: userId });
  }
}