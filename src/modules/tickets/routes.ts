import { Router } from 'express';
import { 
  purchaseTicket, 
  generateQRCode, 
  verifyTicket, 
  getMyTickets,
  cancelTicket 
} from './controllers/tickets.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.post('/', authenticate, purchaseTicket);
router.post('/:ticketId/generate-qr', authenticate, generateQRCode);
router.get('/verify/:token', verifyTicket); // Public endpoint for staff
router.get('/my-tickets', authenticate, getMyTickets);
router.delete('/:id', authenticate, cancelTicket);

export default router;