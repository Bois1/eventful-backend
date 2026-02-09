import { Router } from 'express';
import { 
  createEvent, 
  getEvents, 
  getEventById, 
  updateEvent, 
  deleteEvent, 
  publishEvent,
  getMyEvents 
} from './controllers/events.controller';
import { authenticate, authorize } from '../../core/middleware/auth';

const router = Router();

router.get('/', getEvents);
router.get('/my-events', authenticate, getMyEvents);
router.post('/', authenticate, authorize('CREATOR'), createEvent);
router.get('/:id', getEventById);
router.put('/:id', authenticate, updateEvent);
router.delete('/:id', authenticate, deleteEvent);
router.patch('/:id/publish', authenticate, publishEvent);

export default router;