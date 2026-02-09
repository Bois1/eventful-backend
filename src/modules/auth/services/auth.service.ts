import crypto from 'crypto';
import { sign, Secret, SignOptions } from 'jsonwebtoken';
import argon2 from 'argon2';
import { prisma } from '../../../config/database';
import redis from '../../../config/redis';
import { BadRequestError, UnauthorizedError } from '../../../core/errors/AppError';
import { LoginData, RegisterData, AuthResponse } from '../../../shared/types';


export class AuthService {
  private static readonly SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

  async register(data: RegisterData): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new BadRequestError('User already exists');
    }

    // Hash password
    const hashedPassword = await argon2.hash(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true
      }
    });

    // Generate tokens
    return this.generateAuthTokens(user);
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await argon2.verify(user.password, data.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Return user with minimal data
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    return this.generateAuthTokens(userData);
  }

  private async generateAuthTokens(user: any): Promise<AuthResponse> {
    // Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    const accessToken = sign(
      { sub: user.id, role: user.role },
      secret as Secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '2h' } as SignOptions
    );

    // Create session for revocation
    const sessionId = crypto.randomUUID();
    await redis.setex(
      `session:${sessionId}`,
      AuthService.SESSION_TTL,
      JSON.stringify({ userId: user.id })
    );

    return {
      accessToken,
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };
  }

  async logout(sessionId: string): Promise<void> {
    if (sessionId) {
      await redis.del(`session:${sessionId}`);
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return user;
  }
}