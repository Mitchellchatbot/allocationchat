
-- Create properties table (websites/tenants)
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  widget_color TEXT DEFAULT '#6B7280',
  greeting TEXT DEFAULT 'Hi there! How can we help you today?',
  offline_message TEXT DEFAULT 'We are currently offline. Leave a message!',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agents table
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create property_agents junction table
CREATE TABLE public.property_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, agent_id)
);

-- Create visitors table
CREATE TABLE public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  browser_info TEXT,
  location TEXT,
  current_page TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, session_id)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'closed', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('agent', 'visitor')),
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Users can view their own properties" ON public.properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own properties" ON public.properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own properties" ON public.properties FOR DELETE USING (auth.uid() = user_id);

-- Agents policies
CREATE POLICY "Users can view their own agent profile" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agent profile" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agent profile" ON public.agents FOR UPDATE USING (auth.uid() = user_id);

-- Property agents policies
CREATE POLICY "Property owners can manage agents" ON public.property_agents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
);
CREATE POLICY "Agents can view their assignments" ON public.property_agents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.user_id = auth.uid())
);

-- Visitors policies (property owners and assigned agents can view)
CREATE POLICY "Property owners can view visitors" ON public.visitors FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
);
CREATE POLICY "Assigned agents can view visitors" ON public.visitors FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.property_agents pa
    JOIN public.agents a ON a.id = pa.agent_id
    WHERE pa.property_id = property_id AND a.user_id = auth.uid()
  )
);
CREATE POLICY "Anyone can create visitors" ON public.visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update visitors" ON public.visitors FOR UPDATE USING (true);

-- Conversations policies
CREATE POLICY "Property owners can view conversations" ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
);
CREATE POLICY "Assigned agents can view conversations" ON public.conversations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.property_agents pa
    JOIN public.agents a ON a.id = pa.agent_id
    WHERE pa.property_id = property_id AND a.user_id = auth.uid()
  )
);
CREATE POLICY "Anyone can create conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Property owners can update conversations" ON public.conversations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
);
CREATE POLICY "Assigned agents can update conversations" ON public.conversations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.property_agents pa
    JOIN public.agents a ON a.id = pa.agent_id
    WHERE pa.property_id = property_id AND a.user_id = auth.uid()
  )
);

-- Messages policies
CREATE POLICY "Property owners can view messages" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.properties p ON p.id = c.property_id
    WHERE c.id = conversation_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Assigned agents can view messages" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.property_agents pa ON pa.property_id = c.property_id
    JOIN public.agents a ON a.id = pa.agent_id
    WHERE c.id = conversation_id AND a.user_id = auth.uid()
  )
);
CREATE POLICY "Anyone can create messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Property owners can update messages" ON public.messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.properties p ON p.id = c.property_id
    WHERE c.id = conversation_id AND p.user_id = auth.uid()
  )
);

-- Create updated_at triggers
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
