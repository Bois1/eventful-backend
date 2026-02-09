# Eventful

Eventful is a comprehensive event ticketing platform designed for creators to manage events and for users to purchase tickets seamlessly.

## Project Structure

- `backend/`: Node.js Express server with TypeScript, Prisma, and Redis.
- `nginx/`: Nginx configuration for production deployment.
- `docker-compose.prod.yml`: Docker configuration for production.

## Getting Started

To get started with the project, please follow the detailed instructions in the `backend` directory.

### Quick Start (Backend)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables (see `backend/.env.example`).
4. Run migrations and seed the database:
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Key Features

- **Auth**: Secure user registration and login with roles (CREATOR, EVENTEE).
- **Events**: Create, manage, and discover events.
- **Tickets**: Digital ticket generation with unique QR codes.
- **Payments**: Integrated payment processing using Paystack.
- **Reminders**: Automated event reminders via BullMQ.
- **Analytics**: Event performance tracking.

## Technology Stack

- **Server**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Cache & Queues**: Redis, BullMQ
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest, Supertest
- **Logging**: Winston, Morgan
