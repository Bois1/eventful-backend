import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';
import { createTestUser } from '../helpers/test-setup';

describe('Authentication Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    server = app;
  });

  describe('POST /api/v1/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'EVENTEE'
      };

      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data.user).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      });

    
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(user).not.toBeNull();
      expect(user?.email).toBe(userData.email);
    });

    test('should return 400 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'password123',
        role: 'EVENTEE'
      };

      
      await request(server)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('User already exists');
    });

    test('should return 400 for invalid email format', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          role: 'EVENTEE'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('should return 400 for short password', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 'short',
          role: 'EVENTEE'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('should hash password securely', async () => {
      const userData = {
        email: 'secure@test.com',
        password: 'verysecurepassword123',
        role: 'CREATOR'
      };

      await request(server)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      expect(user?.password).not.toBe(userData.password);
      expect(user?.password.length).toBeGreaterThan(50); 
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
     
      await createTestUser({
        email: 'login@test.com',
        password: await require('argon2').hash('password123'),
        role: 'EVENTEE'
      });
    });

    test('should login successfully with correct credentials', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data.user.email).toBe('login@test.com');
    });

    test('should return 401 for incorrect password', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should return 401 for non-existent user', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should return 400 for missing credentials', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let token: string;
    let sessionId: string;

    beforeEach(async () => {
      await createTestUser({
        email: 'login@test.com',
        password: await require('argon2').hash('password123'),
        role: 'EVENTEE'
      });
      
      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });

      token = loginResponse.body.data.accessToken;
      sessionId = loginResponse.body.data.sessionId;
    });

    test('should logout successfully and revoke session', async () => {
      const response = await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Session-Id', sessionId)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    test('should invalidate session after logout', async () => {
 
      await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Session-Id', sessionId);

      
      const response = await request(server)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Session-Id', sessionId)
        .expect(401);

      expect(response.body.error).toBe('Session expired or revoked');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let token: string;
    beforeEach(async () => {
     
      await createTestUser({
        email: 'profile@test.com',
        password: await require('argon2').hash('password123'),
        role: 'EVENTEE'
      });

      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'profile@test.com',
          password: 'password123'
        });

      token = loginResponse.body.data.accessToken;
    });

    test('should return user profile when authenticated', async () => {
      const response = await request(server)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        email: 'profile@test.com',
        role: 'EVENTEE'
      });
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    test('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    test('should return 401 with invalid token', async () => {
      const response = await request(server)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });
  });

  describe('Authentication Security', () => {
    test('should not return password in profile response', async () => {
      await createTestUser({
        email: 'security@test.com',
        password: await require('argon2').hash('password123'),
        role: 'EVENTEE'
      });
      
      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'security@test.com',
          password: 'password123'
        });

      const token = loginResponse.body.data.accessToken;

      const profileResponse = await request(server)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.data).not.toHaveProperty('password');
    });

    test('should use secure password hashing', async () => {
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'hash@test.com',
          password: 'testpassword123',
          role: 'EVENTEE'
        });

      const user = await prisma.user.findUnique({
        where: { email: 'hash@test.com' }
      });

        
      expect(user?.password).toMatch(/^\$argon2/);
    });
  });
});