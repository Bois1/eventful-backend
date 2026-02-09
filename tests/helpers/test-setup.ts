import { prisma } from '../../src/config/database';
import { User, UserRole, CreateEventData } from '../../src/shared/types';

type UserWithPassword = User & { password?: string };


export async function createTestUser(overrides: Partial<UserWithPassword> = {}) {
  const userData = {
    email: `test_${Date.now()}@eventful.com`,
    password: await require('argon2').hash('password123'),
    role: 'EVENTEE' as UserRole,
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };

  return prisma.user.create({ data: userData as any });
}

export async function createTestEvent(creatorId: string, overrides: Partial<CreateEventData> = {}) {
  const eventData = {
    title: 'Test Event',
    description: 'Test description',
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), 
    location: 'Test Location',
    capacity: 100,
    price: 5000,
    status: 'PUBLISHED',
    creatorId,
    ...overrides,
  };

  return prisma.event.create({ data: eventData as any });
}

export function generateTestToken(userId: string, role: string = 'EVENTEE') {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET || 'test-secret-key-change-in-production',
    { expiresIn: '1h' }
  );
}


export function authHeaders(token: string, sessionId?: string) {
  const headers: any = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }
  
  return headers;
}