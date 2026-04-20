export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'agent';
  status: 'online' | 'offline' | 'away';
  createdAt: Date;
}

export interface Property {
  id: string;
  name: string;
  domain: string;
  ownerId: string;
  widgetColor: string;
  createdAt: Date;
}

export interface Agent {
  id: string;
  userId: string;
  propertyIds: string[];
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
}

export interface Visitor {
  id: string;
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  age?: string;
  occupation?: string;
  propertyId: string;
  browserInfo?: string;
  location?: string;
  currentPage?: string;
  createdAt: Date;
  addiction_history?: string;
  drug_of_choice?: string;
  treatment_interest?: string;
  insurance_info?: string;
  insurance_card_url?: string;
  urgency_level?: string;
  gclid?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'agent' | 'visitor';
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  propertyId: string;
  propertyName?: string;
  visitorId: string;
  visitor: Visitor;
  assignedAgentId?: string;
  status: 'active' | 'closed' | 'pending';
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  aiQueuedAt?: Date | null;
  aiQueuedPreview?: string | null;
  aiQueuedPaused?: boolean;
  aiQueuedWindowMs?: number | null;
  /** True when conversation closed/inactive and no agent/AI reply was ever sent */
  missedReply?: boolean;
}

export interface ChatWidgetConfig {
  propertyId: string;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  greeting: string;
  offlineMessage: string;
}
