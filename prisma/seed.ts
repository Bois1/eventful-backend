import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
 
  const hashedPassword = await argon2.hash('admin123');
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@eventful.com' },
    update: {},
    create: {
      email: 'admin@eventful.com',
      password: hashedPassword,
      role: 'CREATOR',
      firstName: 'Admin',
      lastName: 'User'
    }
  });

  console.log('Created admin user:', admin.email);


  const event1 = await prisma.event.create({
    data: {
      title: 'Tech Conference 2024',
      description: 'Join us for the biggest tech conference of the year!',
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), 
      location: 'Lagos Convention Center',
      capacity: 500,
      price: 10000, 
      status: 'PUBLISHED',
      creatorId: admin.id
    }
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Music Festival',
      description: 'A weekend of amazing music and fun!',
      startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 
      endTime: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), 
      location: 'Victoria Island Beach',
      capacity: 1000,
      price: 5000, 
      status: 'PUBLISHED',
      creatorId: admin.id
    }
  });

  console.log('Created sample events:', event1.title, event2.title);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });