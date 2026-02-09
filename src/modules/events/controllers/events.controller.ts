import { Request, Response, NextFunction } from 'express';
import { EventsService } from '../services/events.service';
import { AuthRequest } from '../../../shared/types';

const eventsService = new EventsService();

export const createEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const event = await eventsService.createEvent(req.user!.id, req.body);
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status } = req.query;
    
    const events = await eventsService.getEvents({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string
    });

    res.json({
      success: true,
      data: events.data,
      meta: events.meta
    });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.id;
    
    const event = await eventsService.getEventById(id, userId);

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const event = await eventsService.updateEvent(id, req.user!.id, req.body);

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    await eventsService.deleteEvent(id, req.user!.id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const publishEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const event = await eventsService.publishEvent(id, req.user!.id);

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

export const getMyEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const events = await eventsService.getMyEvents(req.user!.id);

    res.json({
      success: true,
      data: events.data,
      meta: events.meta
    });
  } catch (error) {
    next(error);
  }
};