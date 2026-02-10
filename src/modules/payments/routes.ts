import { Router } from 'express';
import { 
  initializePayment, 
  verifyPayment, 
  handleWebhook 
} from './controllers/payments.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.post('/initialize', authenticate, initializePayment);
router.get('/verify', verifyPayment);
router.post('/webhook', handleWebhook); 

export default router;