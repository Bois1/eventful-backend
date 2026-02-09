import { Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { AuthRequest } from '../../../shared/types';

const analyticsService = new AnalyticsService();

export const getEventAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const analytics = await analyticsService.getEventAnalytics(id, req.user!.id);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

export const getCreatorAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analytics = await analyticsService.getCreatorAnalytics(req.user!.id);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};