import { Router } from 'express';
import { 
  getEventAnalytics, 
  getCreatorAnalytics 
} from './controllers/analytics.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.get('/creator', authenticate, authorize('CREATOR'), getCreatorAnalytics);
router.get('/event/:id', authenticate, authorize('CREATOR'), getEventAnalytics);

export default router;