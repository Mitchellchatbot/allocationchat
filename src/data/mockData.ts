import { Conversation, Message, Property, Agent, Visitor } from '@/types/chat';

export const mockProperties: Property[] = [
  {
    id: 'prop-1',
    name: 'Acme Corp Website',
    domain: 'acme.com',
    ownerId: 'user-1',
    widgetColor: '#14b8a6',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'prop-2',
    name: 'TechStart App',
    domain: 'techstart.io',
    ownerId: 'user-1',
    widgetColor: '#8b5cf6',
    createdAt: new Date('2024-02-20'),
  },
];

export const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    userId: 'user-1',
    propertyIds: ['prop-1', 'prop-2'],
    name: 'Sarah Chen',
    email: 'sarah@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    status: 'online',
  },
  {
    id: 'agent-2',
    userId: 'user-2',
    propertyIds: ['prop-1'],
    name: 'Mike Johnson',
    email: 'mike@company.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    status: 'away',
  },
];

export const mockVisitors: Visitor[] = [
  {
    id: 'visitor-1',
    sessionId: 'sess-abc123',
    name: 'John Doe',
    email: 'john@example.com',
    propertyId: 'prop-1',
    browserInfo: 'Chrome 120, macOS',
    location: 'New York, US',
    currentPage: '/pricing',
    createdAt: new Date('2024-03-10T14:30:00'),
  },
  {
    id: 'visitor-2',
    sessionId: 'sess-def456',
    propertyId: 'prop-1',
    browserInfo: 'Safari 17, iOS',
    location: 'London, UK',
    currentPage: '/features',
    createdAt: new Date('2024-03-10T15:00:00'),
  },
  {
    id: 'visitor-3',
    sessionId: 'sess-ghi789',
    name: 'Emma Wilson',
    propertyId: 'prop-2',
    browserInfo: 'Firefox 122, Windows',
    location: 'Berlin, DE',
    currentPage: '/contact',
    createdAt: new Date('2024-03-10T15:15:00'),
  },
];

const createMessages = (conversationId: string): Message[] => {
  const baseTime = new Date();
  return [
    {
      id: `msg-${conversationId}-1`,
      conversationId,
      senderId: 'visitor-1',
      senderType: 'visitor',
      content: "Hi, I have a question about your pricing plans.",
      timestamp: new Date(baseTime.getTime() - 300000),
      read: true,
    },
    {
      id: `msg-${conversationId}-2`,
      conversationId,
      senderId: 'agent-1',
      senderType: 'agent',
      content: "Hello! I'd be happy to help you with our pricing. What would you like to know?",
      timestamp: new Date(baseTime.getTime() - 240000),
      read: true,
    },
    {
      id: `msg-${conversationId}-3`,
      conversationId,
      senderId: 'visitor-1',
      senderType: 'visitor',
      content: "What's the difference between the Pro and Enterprise plans?",
      timestamp: new Date(baseTime.getTime() - 180000),
      read: true,
    },
    {
      id: `msg-${conversationId}-4`,
      conversationId,
      senderId: 'agent-1',
      senderType: 'agent',
      content: "Great question! The Pro plan includes 5 team members and 10,000 monthly visitors. The Enterprise plan offers unlimited team members, priority support, and custom integrations.",
      timestamp: new Date(baseTime.getTime() - 120000),
      read: true,
    },
    {
      id: `msg-${conversationId}-5`,
      conversationId,
      senderId: 'visitor-1',
      senderType: 'visitor',
      content: "That's helpful, thanks! Can I try the Pro plan first?",
      timestamp: new Date(baseTime.getTime() - 60000),
      read: false,
    },
  ];
};

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    propertyId: 'prop-1',
    visitorId: 'visitor-1',
    visitor: mockVisitors[0],
    assignedAgentId: 'agent-1',
    status: 'active',
    messages: createMessages('conv-1'),
    unreadCount: 1,
    createdAt: new Date('2024-03-10T14:30:00'),
    updatedAt: new Date(),
  },
  {
    id: 'conv-2',
    propertyId: 'prop-1',
    visitorId: 'visitor-2',
    visitor: mockVisitors[1],
    assignedAgentId: 'agent-1',
    status: 'active',
    messages: [
      {
        id: 'msg-conv2-1',
        conversationId: 'conv-2',
        senderId: 'visitor-2',
        senderType: 'visitor',
        content: "Is there a free trial available?",
        timestamp: new Date(Date.now() - 600000),
        read: false,
      },
    ],
    unreadCount: 1,
    createdAt: new Date('2024-03-10T15:00:00'),
    updatedAt: new Date(Date.now() - 600000),
  },
  {
    id: 'conv-3',
    propertyId: 'prop-2',
    visitorId: 'visitor-3',
    visitor: mockVisitors[2],
    status: 'pending',
    messages: [
      {
        id: 'msg-conv3-1',
        conversationId: 'conv-3',
        senderId: 'visitor-3',
        senderType: 'visitor',
        content: "Hello, I need help with integration",
        timestamp: new Date(Date.now() - 1800000),
        read: false,
      },
    ],
    unreadCount: 1,
    createdAt: new Date('2024-03-10T15:15:00'),
    updatedAt: new Date(Date.now() - 1800000),
  },
  {
    id: 'conv-4',
    propertyId: 'prop-1',
    visitorId: 'visitor-1',
    visitor: mockVisitors[0],
    assignedAgentId: 'agent-2',
    status: 'closed',
    messages: [
      {
        id: 'msg-conv4-1',
        conversationId: 'conv-4',
        senderId: 'visitor-1',
        senderType: 'visitor',
        content: "Thanks for your help earlier!",
        timestamp: new Date(Date.now() - 86400000),
        read: true,
      },
      {
        id: 'msg-conv4-2',
        conversationId: 'conv-4',
        senderId: 'agent-2',
        senderType: 'agent',
        content: "You're welcome! Feel free to reach out anytime.",
        timestamp: new Date(Date.now() - 86300000),
        read: true,
      },
    ],
    unreadCount: 0,
    createdAt: new Date('2024-03-09T10:00:00'),
    updatedAt: new Date(Date.now() - 86300000),
  },
];

// Add lastMessage to conversations
mockConversations.forEach(conv => {
  conv.lastMessage = conv.messages[conv.messages.length - 1];
});

// Blog Analytics for Addiction Treatment Center SEO Tracking
export interface BlogAnalytics {
  id: string;
  title: string;
  slug: string;
  url: string;
  views: number;
  leads: number;
  publishedAt: Date;
}

export const mockBlogAnalytics: BlogAnalytics[] = [
  {
    id: 'blog-1',
    title: 'Signs of Alcohol Addiction: When to Seek Help',
    slug: '/blog/signs-of-alcohol-addiction',
    url: 'https://example.com/blog/signs-of-alcohol-addiction',
    views: 12450,
    leads: 89,
    publishedAt: new Date('2024-01-15'),
  },
  {
    id: 'blog-2',
    title: 'Understanding Opioid Withdrawal Symptoms',
    slug: '/blog/opioid-withdrawal-symptoms',
    url: 'https://example.com/blog/opioid-withdrawal-symptoms',
    views: 9820,
    leads: 67,
    publishedAt: new Date('2024-02-01'),
  },
  {
    id: 'blog-3',
    title: 'How Long Does Drug Detox Take?',
    slug: '/blog/how-long-drug-detox',
    url: 'https://example.com/blog/how-long-drug-detox',
    views: 8340,
    leads: 54,
    publishedAt: new Date('2024-02-10'),
  },
  {
    id: 'blog-4',
    title: 'Inpatient vs Outpatient Rehab: Which is Right for You?',
    slug: '/blog/inpatient-vs-outpatient-rehab',
    url: 'https://example.com/blog/inpatient-vs-outpatient-rehab',
    views: 7650,
    leads: 48,
    publishedAt: new Date('2024-02-20'),
  },
  {
    id: 'blog-5',
    title: 'Family Support During Addiction Recovery',
    slug: '/blog/family-support-addiction-recovery',
    url: 'https://example.com/blog/family-support-addiction-recovery',
    views: 6890,
    leads: 41,
    publishedAt: new Date('2024-03-01'),
  },
  {
    id: 'blog-6',
    title: 'Dual Diagnosis: Treating Addiction and Mental Health',
    slug: '/blog/dual-diagnosis-treatment',
    url: 'https://example.com/blog/dual-diagnosis-treatment',
    views: 5420,
    leads: 38,
    publishedAt: new Date('2024-03-05'),
  },
  {
    id: 'blog-7',
    title: 'What to Expect at Your First AA Meeting',
    slug: '/blog/first-aa-meeting-guide',
    url: 'https://example.com/blog/first-aa-meeting-guide',
    views: 4980,
    leads: 29,
    publishedAt: new Date('2024-03-08'),
  },
];
