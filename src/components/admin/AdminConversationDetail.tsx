import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageRow {
  message_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
  read: boolean;
  sequence_number: number;
}

interface ConversationInfo {
  conversation_id: string;
  status: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  property_name: string;
  client_email: string;
  ai_enabled: boolean;
  created_at: string;
}

interface Props {
  conversation: ConversationInfo;
  onBack: () => void;
}

export function AdminConversationDetail({ conversation, onBack }: Props) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.rpc('admin_conversation_messages', {
        p_conversation_id: conversation.conversation_id,
      });
      if (data) setMessages(data as any[]);
      setLoading(false);
    };
    fetch();
  }, [conversation.conversation_id]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">
            {conversation.visitor_name || 'Anonymous Visitor'}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{conversation.property_name}</span>
            <span>•</span>
            <span>{conversation.client_email}</span>
            {conversation.visitor_phone && (
              <>
                <span>•</span>
                <span className="text-primary font-medium">{conversation.visitor_phone}</span>
              </>
            )}
          </div>
        </div>
        <Badge
          className={cn(
            conversation.status === 'active' && 'bg-green-100 text-green-700 border-green-200',
            conversation.status === 'pending' && 'bg-amber-100 text-amber-700 border-amber-200',
            conversation.status === 'closed' && 'text-muted-foreground',
          )}
          variant={conversation.status === 'closed' ? 'outline' : 'default'}
        >
          {conversation.status}
        </Badge>
        {conversation.ai_enabled && (
          <Badge variant="secondary" className="gap-1">
            <Bot className="h-3 w-3" /> AI
          </Badge>
        )}
      </div>

      {/* Messages */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No messages in this conversation</div>
      ) : (
        <ScrollArea className="h-[600px] border rounded-lg bg-muted/30 p-4">
          <div className="space-y-3 max-w-3xl mx-auto">
            <p className="text-xs text-center text-muted-foreground mb-4">
              {formatTime(conversation.created_at)} — Conversation started
            </p>
            {messages.map((msg) => {
              const isVisitor = msg.sender_type === 'visitor';
              return (
                <div
                  key={msg.message_id}
                  className={cn('flex', isVisitor ? 'justify-start' : 'justify-end')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                      isVisitor
                        ? 'bg-card border text-card-foreground rounded-bl-md'
                        : 'bg-primary text-primary-foreground rounded-br-md',
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {isVisitor ? (
                        <User className="h-3 w-3 opacity-60" />
                      ) : (
                        <Bot className="h-3 w-3 opacity-60" />
                      )}
                      <span className="text-[10px] font-medium opacity-60 uppercase">
                        {msg.sender_type === 'visitor' ? 'Visitor' : msg.sender_type === 'agent' ? 'Agent' : 'AI'}
                      </span>
                      <span className="text-[10px] opacity-40 ml-auto">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-center text-muted-foreground mt-4">
              {messages.length} message{messages.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
