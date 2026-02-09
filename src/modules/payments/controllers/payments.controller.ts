import { Request, Response, NextFunction } from 'express';
import { PaystackService } from '../services/paystack.service';
import { AuthRequest } from '../../../shared/types';

const paystackService = new PaystackService();

export const initializePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ticketId, email, amount } = req.body;
    
    const result = await paystackService.initializePayment({
      userId: req.user!.id,
      ticketId,
      email,
      amount
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reference } = req.query;
    
    const result = await paystackService.verifyPayment(reference as string);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    
    const result = await paystackService.handleWebhook(req.body, signature);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};