import { Router } from 'express';
import { register, login, logout, getProfile } from './controllers/auth.controller';
import { authenticate } from '../../core/middleware/auth';
import { validateRegister, validateLogin } from './validators';

const router = Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);

export default router;