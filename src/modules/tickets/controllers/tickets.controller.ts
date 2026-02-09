import { Request, Response, NextFunction } from 'express';
import { TicketsService } from '../services/tickets.service';
import { AuthRequest } from '../../../shared/types';

const ticketsService = new TicketsService();

export const purchaseTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.body;
    
    const ticket = await ticketsService.purchaseTicket(req.user!.id, eventId);

    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

export const generateQRCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ticketId } = req.params;
    
    const qrCode = await ticketsService.generateQRCode(ticketId);

    res.json({
      success: true,
      data: { qrCode }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    
    const result = await ticketsService.verifyTicket(token);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getMyTickets = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tickets = await ticketsService.getMyTickets(req.user!.id);

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

export const cancelTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    await ticketsService.cancelTicket(id, req.user!.id);

    res.json({
      success: true,
      message: 'Ticket cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};