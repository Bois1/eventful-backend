import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export type UserRole = 'CREATOR' | 'EVENTEE';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  sessionId: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

export interface CreateEventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location: string;
  capacity: number;
  price: number;
  reminders?: string[];
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  capacity?: number;
  price?: number;
  status?: EventStatus;
}

export type TicketStatus = 'PENDING' | 'PAID' | 'SCANNED' | 'CANCELLED';

export interface Ticket {
  id: string;
  userId: string;
  eventId: string;
  status: TicketStatus;
  qrToken: string;
  qrCode: string | null;
  scannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface InitializePaymentData {
  userId: string;
  ticketId: string;
  email: string;
  amount: number;
}

export interface Payment {
  id: string;
  ticketId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paystackReference?: string;
  paystackData?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventAnalytics {
  eventId: string;
  totalTickets: number;
  scannedTickets: number;
  scanRate: number;
  totalRevenue: number;
}

export interface CreatorAnalytics {
  creatorId: string;
  totalEvents: number;
  totalTickets: number;
  totalRevenue: number;
}
