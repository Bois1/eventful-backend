import { prisma } from '../src/config/database';
import redis from '../src/config/redis';

beforeAll(async () => {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }

  try {
    await redis.ping();
  } catch (error) {
    console.error('Redis connection failed:', error);
    process.exit(1);
  }
});

beforeEach(async () => {
  await prisma.$transaction([
    prisma.reminder.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.event.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
  try {
    await redis.quit();
  } catch (error) {
   
  }
});
