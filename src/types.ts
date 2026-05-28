export enum ConsultationType {
  CHAT = 'chat',
  VIDEO = 'video',
  PHONE = 'phone',
  BOOK = 'book'
}

export interface Lawyer {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  experience: number; // years
  price: number;
  image: string;
  description: string;
  isOnline: boolean;
  languages: string[];
  education: string[];
  certifications: string[];
  availability: { day: string; times: string[] }[];
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  VOICE = 'voice'
}

export interface Message {
  id: string;
  senderId?: string;
  sender?: string;
  senderImage?: string;
  content: string;
  lastMessage?: string;
  unreadCount?: number;
  timestamp?: Date;
  time?: string;
  avatar?: string;
  type?: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
}

export interface ChatSession {
  id: string;
  lawyerId: string;
  clientId: string;
  startTime: Date;
  durationMinutes: number;
  status: 'active' | 'completed' | 'expired';
}

export interface Consultation {
  id: string;
  clientName: string;
  lawyerName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'Pending' | 'Ongoing' | 'Completed' | 'In Review' | 'Cancelled';
  type: 'In-Person' | 'Virtual Session';
  price: number;
  lawyerNotes?: string;
  files?: { name: string; date: string; size: string }[];
}

export interface Request {
  id: string;
  clientName: string;
  category: string;
  description: string;
  priority?: boolean;
}
