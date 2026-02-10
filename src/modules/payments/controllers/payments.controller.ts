import { Request, Response, NextFunction } from 'express';
import { PaystackService } from '../services/paystack.service';
import { AuthRequest } from '../../../shared/types';
import { BadRequestError } from '../../../core/errors/AppError';

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
    
    if (!reference) {
      throw new BadRequestError('Payment reference is required');
    }

    const paystackData = await paystackService.verifyPayment(reference as string);

    res.json({
      success: true,
      data: {
        status: paystackData.status,
        reference: paystackData.reference,
        amount: paystackData.amount,
        gateway_response: paystackData.gateway_response,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body;
    
    if (event.event === 'charge.success') {
      await paystackService.verifyPayment(event.data.reference);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};