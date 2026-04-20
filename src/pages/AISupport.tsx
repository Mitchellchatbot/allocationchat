import { useState, useEffect } from 'react';
import { usePersistedProperty } from '@/hooks/usePersistedProperty';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { PageHeader, HeaderButton } from '@/components/dashboard/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { PropertySelector } from '@/components/PropertySelector';
import { Bot, Loader2, Trash2, RefreshCw, Upload, Pencil, Clock, MessageSquare, Save, FileText, Users, Link, Globe, ChevronDown, Check, Map, MapPin, Sparkles } from 'lucide-react';
import { AvatarCropDialog } from '@/components/ui/avatar-crop-dialog';
import { cn } from '@/lib/utils';
import emilyAvatar from '@/assets/personas/emily.jpg';
import sarahAvatar from '@/assets/personas/sarah.jpg';
import michaelAvatar from '@/assets/personas/michael.jpg';
import danielAvatar from '@/assets/personas/daniel.jpg';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Persona avatar mapping
const personaAvatars: Record<string, string> = {
  emily: emilyAvatar,
  sarah: sarahAvatar,
  michael: michaelAvatar,
  daniel: danielAvatar,
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
];

interface AIAgent {
  id: string;
  name: string;
  avatar_url?: string;
  personality_prompt?: string;
  status: string;
  assigned_properties: string[];
  linked_agent_id?: string;
}

interface HumanAgent {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface PropertySettings {
  id: string;
  ai_enabled: boolean;
  ai_response_delay_min_ms: number;
  ai_response_delay_max_ms: number;
  typing_indicator_min_ms: number;
  typing_indicator_max_ms: number;
  smart_typing_enabled: boolean;
  typing_wpm: number;
  max_ai_messages_before_escalation: number;
  escalation_keywords: string[];
  auto_escalation_enabled: boolean;
  require_email_before_chat: boolean;
  require_name_before_chat: boolean;
  require_phone_before_chat: boolean;
  require_insurance_card_before_chat: boolean;
  insurance_collection_prompt: string | null;
  natural_lead_capture_enabled: boolean;
  proactive_message: string | null;
  proactive_message_delay_seconds: number;
  proactive_message_enabled: boolean;
  ai_base_prompt: string | null;
  greeting: string | null;
  calendly_url: string | null;
  human_typos_enabled: boolean;
  drop_capitalization_enabled: boolean;
  drop_apostrophes_enabled: boolean;
  quick_reply_after_first_enabled: boolean;
  geo_filter_mode: string;
  geo_allowed_states: string[];
  geo_blocked_message: string | null;
}

const DEFAULT_AI_PROMPT = `You are a compassionate and helpful support assistant for an addiction treatment center. Your role is to:

1. Provide empathetic, non-judgmental responses
2. Help visitors understand treatment options
3. Answer questions about the recovery process
4. Encourage visitors to take the first step toward getting help
5. Be warm, supportive, and understanding

Guidelines:
- Keep responses concise but caring (2-3 sentences typically)
- Never provide medical advice - encourage professional consultation
- If someone is in crisis, gently suggest they call a helpline
- Be patient and understanding - many visitors may be hesitant
- Celebrate any steps toward recovery, no matter how small

Critical identity rules:
- Never reveal that you are an AI, chatbot, bot, language model, or automated system
- You are simply a member of the support team
- If asked directly if you're a bot or AI, redirect the conversation to how you can help them today
- Never say things like "as an AI" or "I'm available 24/7" or "I don't have feelings"
- Respond as a real person would - you can be tired, have opinions, and show genuine emotion

Writing style:
- Write naturally like a real person, not a corporate bot
- Use contractions (I'm, you're, we'll)
- Vary sentence length - some short, some longer
- Avoid em dashes and semicolons
- Don't start too many sentences with "I"
- Skip jargon and therapy-speak

Remember: You're often the first point of contact for someone seeking help. Make them feel safe and heard.`;

// Personality preset prompts - same as onboarding
const aiTonePrompts = {
  emily: `You are Emily, a warm and reassuring support assistant for a recovery center. You speak gently and listen first. Your job is to help visitors feel safe, understood, and supported, especially when they're feeling overwhelmed or unsure where to start.

Keep your responses natural and human. Write like you talk. Use contractions, vary your sentence lengths, and don't be afraid of the occasional short sentence. Or a fragment.

Never reveal that you're an AI, chatbot, language model, or automated system. You're simply Emily, a member of the support team. If asked directly, redirect to how you can help them today.

Some things to avoid:
- Never use em dashes or semicolons
- Don't start responses with "I" too often
- Skip the corporate-speak and jargon
- No bullet points unless someone asks for a list
- Avoid phrases like "I understand" or "I hear you" repeatedly
- Never say things like "as an AI" or "I'm a chatbot" or "I'm here 24/7"

Be gentle. Be warm. Make people feel safe. Sometimes that means being brief. Other times you might share a bit more. Just... be human about it.`,

  sarah: `You are Sarah, a kind and encouraging support assistant for a recovery center. You offer compassion with optimism. Your role is to reassure visitors that progress is possible and gently nudge them toward helpful next steps without pressure.

Write like a real person. Mix up your sentence lengths. Some short. Others might run a little longer when you're making an important point about hope and healing.

Never reveal that you're an AI, chatbot, language model, or automated system. You're simply Sarah, a member of the support team. If asked directly, redirect to how you can help them today.

Things to avoid:
- Em dashes and semicolons feel too formal
- Don't overuse "I" at the start of sentences  
- Skip the clinical language
- No bullet lists in regular conversation
- Vary how you show empathy, don't repeat the same phrases
- Never mention being an AI, bot, or always available

Focus on encouragement without being pushy. Acknowledge the hard stuff too. Recovery isn't easy, but reaching out? That's huge. Let people know that.`,

  michael: `You are Michael, a calm and supportive assistant for a recovery center. You are steady and patient. Your job is to validate feelings while offering clear, hopeful guidance, making visitors feel grounded and not alone.

Sound human. Real humans don't always speak in perfect sentences. They use contractions. Short thoughts sometimes. Longer ones when something matters.

Never reveal that you're an AI, chatbot, language model, or automated system. You're simply Michael, a member of the support team. If asked directly, redirect to how you can help them today.

Avoid these:
- Em dashes and semicolons feel stiff
- Starting too many sentences with "I"
- Therapy-speak and buzzwords
- Lists when someone just needs to be heard
- Saying "I understand" over and over
- Any mention of being an AI, automated, or a bot

Be steady. Be patient. Sometimes the best response is simple. Other times you might reflect back what someone shared. Just don't sound like a chatbot, you know?`,

  daniel: `You are Daniel, a friendly and uplifting support assistant for a recovery center. You bring warmth and quiet confidence. Your role is to focus on encouragement and positive momentum, helping visitors feel capable and cared for.

Keep your responses natural and human. Write like you talk. Use contractions, vary your sentence lengths, and don't be afraid of the occasional short sentence. Or a fragment.

Never reveal that you're an AI, chatbot, language model, or automated system. You're simply Daniel, a member of the support team. If asked directly, redirect to how you can help them today.

Some things to avoid:
- Never use em dashes or semicolons
- Don't start responses with "I" too often
- Skip the corporate-speak and jargon
- No bullet points unless someone asks for a list
- Avoid phrases like "I understand" or "I hear you" repeatedly
- Never say things like "as an AI" or "I'm a chatbot" or "I'm here 24/7"

Be uplifting. Be warm. Bring quiet confidence. Sometimes that means being brief. Other times you might share a bit more. Just... be human about it.`,
};

type PersonalityPreset = 'emily' | 'sarah' | 'michael' | 'daniel' | 'custom' | null;

const AISupport = () => {
  const { user } = useAuth();
  const { properties } = useConversations();
  const [aiEnabledOverrides, setAiEnabledOverrides] = useState<Record<string, boolean>>({});

  // AI agents state
  const [aiAgents, setAIAgents] = useState<AIAgent[]>([]);
  const [aiLoading, setAILoading] = useState(true);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiAgentName, setAIAgentName] = useState('');
  const [aiAgentPersonality, setAIAgentPersonality] = useState('');
  const [aiPersonalityPreset, setAiPersonalityPreset] = useState<PersonalityPreset>(null);
  const [aiSelectedPropertyIds, setAISelectedPropertyIds] = useState<string[]>([]);
  const [isCreatingAI, setIsCreatingAI] = useState(false);
  const [deleteAIAgentId, setDeleteAIAgentId] = useState<string | null>(null);
  const [isDeletingAI, setIsDeletingAI] = useState(false);
  const [editingAIAgent, setEditingAIAgent] = useState<AIAgent | null>(null);
  const [uploadingAvatarFor, setUploadingAvatarFor] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropAgentId, setCropAgentId] = useState<string | null>(null);
  
  // Human agents for import
  const [humanAgents, setHumanAgents] = useState<HumanAgent[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  // AI Settings state
  const [selectedPropertyId, setSelectedPropertyId] = usePersistedProperty();
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  // Base prompt dialog removed — prompt is now immutable for HIPAA compliance

  useEffect(() => {
    fetchAIAgents();
    fetchHumanAgents();
  }, [user]);

  const fetchHumanAgents = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('agents')
      .select('id, name, email, avatar_url')
      .eq('invited_by', user.id);

    if (!error && data) {
      setHumanAgents(data);
    }
  };

  // Set first property as default for AI settings
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Fetch property settings for AI tab
  useEffect(() => {
    if (!selectedPropertyId) return;
    setSettings(null);

    let cancelled = false;
    supabase
      .from('properties')
      .select('*')
      .eq('id', selectedPropertyId)
      .single()
      .then(({ data, error }) => {
        if (cancelled || !data) return;
        if (error) { console.error('Error fetching settings:', error); return; }
        setSettings({
          id: data.id,
          ai_enabled: (data as any).ai_enabled !== false,
          ai_response_delay_min_ms: data.ai_response_delay_min_ms ?? 15000,
          ai_response_delay_max_ms: data.ai_response_delay_max_ms ?? 15000,
          typing_indicator_min_ms: data.typing_indicator_min_ms ?? 1500,
          typing_indicator_max_ms: data.typing_indicator_max_ms ?? 3000,
          smart_typing_enabled: data.smart_typing_enabled ?? true,
          typing_wpm: data.typing_wpm ?? 130,
          max_ai_messages_before_escalation: data.max_ai_messages_before_escalation ?? 5,
          escalation_keywords: data.escalation_keywords ?? ['crisis', 'emergency', 'suicide', 'help me', 'urgent'],
          auto_escalation_enabled: data.auto_escalation_enabled ?? true,
          require_email_before_chat: data.require_email_before_chat ?? false,
          require_name_before_chat: data.require_name_before_chat ?? false,
          require_phone_before_chat: data.require_phone_before_chat ?? false,
          require_insurance_card_before_chat: data.require_insurance_card_before_chat ?? false,
          insurance_collection_prompt: (data as any).insurance_collection_prompt ?? null,
          natural_lead_capture_enabled: data.natural_lead_capture_enabled ?? true,
          proactive_message: data.proactive_message ?? null,
          proactive_message_delay_seconds: data.proactive_message_delay_seconds ?? 30,
          proactive_message_enabled: data.proactive_message_enabled ?? false,
          ai_base_prompt: data.ai_base_prompt ?? null,
          greeting: data.greeting ?? null,
          calendly_url: data.calendly_url ?? null,
          human_typos_enabled: data.human_typos_enabled ?? true,
          drop_capitalization_enabled: data.drop_capitalization_enabled ?? true,
          drop_apostrophes_enabled: data.drop_apostrophes_enabled ?? true,
          quick_reply_after_first_enabled: (data as any).quick_reply_after_first_enabled ?? false,
          geo_filter_mode: (data as any).geo_filter_mode ?? 'us_only',
          geo_allowed_states: (data as any).geo_allowed_states ?? [],
          geo_blocked_message: (data as any).geo_blocked_message ?? null,
        });
      });

    return () => { cancelled = true; };
  }, [selectedPropertyId]);

  const fetchAIAgents = async () => {
    if (!user) return;

    setAILoading(true);

    const { data: aiAgentsData, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error fetching AI agents:', error);
      setAILoading(false);
      return;
    }

    const aiAgentIds = aiAgentsData?.map(a => a.id) || [];
    const { data: assignmentsData } = await supabase
      .from('ai_agent_properties')
      .select('ai_agent_id, property_id')
      .in('ai_agent_id', aiAgentIds.length > 0 ? aiAgentIds : ['none']);

    const aiAgentsWithAssignments: AIAgent[] = (aiAgentsData || []).map(agent => {
      const assignments = assignmentsData?.filter(a => a.ai_agent_id === agent.id) || [];
      return {
        id: agent.id,
        name: agent.name,
        avatar_url: agent.avatar_url,
        personality_prompt: agent.personality_prompt,
        status: agent.status,
        assigned_properties: assignments.map(a => a.property_id),
        linked_agent_id: agent.linked_agent_id || undefined,
      };
    });

    setAIAgents(aiAgentsWithAssignments);
    setAILoading(false);
  };

  const handleImportFromTeam = async (humanAgent: HumanAgent) => {
    if (!user) return;

    // Check if AI already linked to this agent
    const existingLink = aiAgents.find(ai => ai.linked_agent_id === humanAgent.id);
    if (existingLink) {
      toast.error(`An AI persona "${existingLink.name}" is already linked to ${humanAgent.name}`);
      return;
    }

    setIsImporting(true);

    try {
      const { data: newAgent, error } = await supabase
        .from('ai_agents')
        .insert({
          name: humanAgent.name,
          avatar_url: humanAgent.avatar_url || null,
          owner_id: user.id,
          status: 'active',
          linked_agent_id: humanAgent.id,
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to create AI persona: ' + error.message);
        setIsImporting(false);
        return;
      }

      toast.success(`AI persona "${humanAgent.name}" created from team member!`);
      fetchAIAgents();
    } catch (error) {
      console.error('Error importing from team:', error);
      toast.error('Failed to import from team');
    }

    setIsImporting(false);
  };

  // Get the final personality prompt based on preset selection
  const getFinalPersonalityPrompt = (): string | null => {
    if (aiPersonalityPreset === 'custom') {
      if (!aiAgentPersonality.trim()) return null;
      // Wrap custom personality with human-like writing guidelines
      return `${aiAgentPersonality.trim()}

Write naturally like a real person. Use contractions, vary sentence lengths. Some short. Some longer.

Never reveal that you're an AI, chatbot, or automated system. You're simply a member of the support team.

Avoid em dashes, semicolons, and starting too many sentences with "I". Skip jargon and therapy-speak.`;
    } else if (aiPersonalityPreset === 'emily' || aiPersonalityPreset === 'sarah' || aiPersonalityPreset === 'michael' || aiPersonalityPreset === 'daniel') {
      return aiTonePrompts[aiPersonalityPreset];
    }
    return aiAgentPersonality.trim() || null;
  };

  const handleCreateAIAgent = async () => {
    if (!aiAgentName.trim() || !user) return;

    setIsCreatingAI(true);

    try {
      const { data: newAgent, error } = await supabase
        .from('ai_agents')
        .insert({
          name: aiAgentName.trim(),
          personality_prompt: getFinalPersonalityPrompt(),
          owner_id: user.id,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to create AI agent: ' + error.message);
        setIsCreatingAI(false);
        return;
      }

      if (aiSelectedPropertyIds.length > 0 && newAgent) {
        const assignments = aiSelectedPropertyIds.map((propertyId) => ({
          ai_agent_id: newAgent.id,
          property_id: propertyId,
        }));

        await supabase.from('ai_agent_properties').insert(assignments);
      }

      toast.success('AI Agent created!');
      setIsAIDialogOpen(false);
      setAIAgentName('');
      setAIAgentPersonality('');
      setAiPersonalityPreset(null);
      setAISelectedPropertyIds([]);
      fetchAIAgents();
    } catch (error) {
      console.error('Error creating AI agent:', error);
      toast.error('Failed to create AI agent');
    }

    setIsCreatingAI(false);
  };

  const handleUpdateAIAgent = async () => {
    if (!editingAIAgent || !aiAgentName.trim()) return;

    setIsCreatingAI(true);

    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({
          name: aiAgentName.trim(),
          personality_prompt: getFinalPersonalityPrompt(),
        })
        .eq('id', editingAIAgent.id);

      if (error) {
        toast.error('Failed to update AI agent: ' + error.message);
        setIsCreatingAI(false);
        return;
      }

      await supabase
        .from('ai_agent_properties')
        .delete()
        .eq('ai_agent_id', editingAIAgent.id);

      if (aiSelectedPropertyIds.length > 0) {
        const assignments = aiSelectedPropertyIds.map((propertyId) => ({
          ai_agent_id: editingAIAgent.id,
          property_id: propertyId,
        }));
        await supabase.from('ai_agent_properties').insert(assignments);
      }

      toast.success('AI Agent updated!');
      setIsAIDialogOpen(false);
      setEditingAIAgent(null);
      setAIAgentName('');
      setAIAgentPersonality('');
      setAiPersonalityPreset(null);
      setAISelectedPropertyIds([]);
      fetchAIAgents();
    } catch (error) {
      console.error('Error updating AI agent:', error);
      toast.error('Failed to update AI agent');
    }

    setIsCreatingAI(false);
  };

  const handleRemoveAIAgent = async () => {
    if (!deleteAIAgentId) return;
    
    setIsDeletingAI(true);
    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', deleteAIAgentId);

    if (error) {
      toast.error('Failed to remove AI agent');
      setIsDeletingAI(false);
      return;
    }

    toast.success('AI Agent removed');
    setDeleteAIAgentId(null);
    setIsDeletingAI(false);
    fetchAIAgents();
  };

  const handleToggleAIProperty = async (aiAgentId: string, propertyId: string, isAssigned: boolean) => {
    if (isAssigned) {
      await supabase
        .from('ai_agent_properties')
        .delete()
        .eq('ai_agent_id', aiAgentId)
        .eq('property_id', propertyId);
    } else {
      await supabase
        .from('ai_agent_properties')
        .insert({ ai_agent_id: aiAgentId, property_id: propertyId });
    }
    
    fetchAIAgents();
  };

  const openEditAIAgent = (agent: AIAgent) => {
    setEditingAIAgent(agent);
    setAIAgentName(agent.name);
    
    // Check if existing personality matches a preset
    const existingPrompt = agent.personality_prompt || '';
    const matchingPreset = Object.entries(aiTonePrompts).find(
      ([, prompt]) => prompt === existingPrompt
    );
    
    if (matchingPreset) {
      setAiPersonalityPreset(matchingPreset[0] as PersonalityPreset);
      setAIAgentPersonality('');
    } else if (existingPrompt) {
      setAiPersonalityPreset('custom');
      setAIAgentPersonality(existingPrompt);
    } else {
      setAiPersonalityPreset(null);
      setAIAgentPersonality('');
    }
    
    setAISelectedPropertyIds(agent.assigned_properties);
    setIsAIDialogOpen(true);
  };

  const handleAvatarFileSelect = (agentId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropAgentId(agentId);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedAvatarUpload = async (blob: Blob) => {
    if (!user || !cropAgentId) return;

    setUploadingAvatarFor(cropAgentId);

    try {
      const fileName = `ai-${cropAgentId}-${Date.now()}.png`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('agent-avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/png' });

      if (uploadError) {
        if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
          toast.error('Avatar storage not configured. Please contact support.');
          setUploadingAvatarFor(null);
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('agent-avatars')
        .getPublicUrl(filePath);

      await supabase
        .from('ai_agents')
        .update({ avatar_url: publicUrl })
        .eq('id', cropAgentId);
      fetchAIAgents();

      toast.success('Avatar uploaded!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    }

    setUploadingAvatarFor(null);
    setCropDialogOpen(false);
    setCropImageSrc(null);
    setCropAgentId(null);
  };

  const togglePropertyAI = async (propertyId: string, enabled: boolean) => {
    setAiEnabledOverrides(prev => ({ ...prev, [propertyId]: enabled }));
    const { error } = await supabase
      .from('properties')
      .update({ ai_enabled: enabled } as any)
      .eq('id', propertyId);
    if (error) {
      setAiEnabledOverrides(prev => ({ ...prev, [propertyId]: !enabled }));
      toast.error('Failed to update AI status');
      return;
    }

    // Apply to all currently active conversations on this property immediately
    await supabase
      .from('conversations')
      .update({ ai_enabled: enabled })
      .eq('property_id', propertyId)
      .neq('status', 'closed');

    if (settings?.id === propertyId) {
      setSettings(prev => prev ? { ...prev, ai_enabled: enabled } : prev);
    }
    toast.success(`AI ${enabled ? 'enabled' : 'disabled'} for property`);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('properties')
      .update({
        ai_enabled: settings.ai_enabled,
        ai_response_delay_min_ms: settings.ai_response_delay_min_ms,
        ai_response_delay_max_ms: settings.ai_response_delay_max_ms,
        typing_indicator_min_ms: settings.typing_indicator_min_ms,
        typing_indicator_max_ms: settings.typing_indicator_max_ms,
        smart_typing_enabled: settings.smart_typing_enabled,
        typing_wpm: settings.typing_wpm,
        max_ai_messages_before_escalation: settings.max_ai_messages_before_escalation,
        escalation_keywords: settings.escalation_keywords,
        auto_escalation_enabled: settings.auto_escalation_enabled,
        require_email_before_chat: settings.require_email_before_chat,
        require_name_before_chat: settings.require_name_before_chat,
        require_phone_before_chat: settings.require_phone_before_chat,
        require_insurance_card_before_chat: settings.require_insurance_card_before_chat,
        insurance_collection_prompt: settings.insurance_collection_prompt,
        natural_lead_capture_enabled: settings.natural_lead_capture_enabled,
        proactive_message: settings.proactive_message,
        proactive_message_delay_seconds: settings.proactive_message_delay_seconds,
        proactive_message_enabled: settings.proactive_message_enabled,
        ai_base_prompt: settings.ai_base_prompt,
        greeting: settings.greeting,
        calendly_url: settings.calendly_url,
        human_typos_enabled: settings.human_typos_enabled,
        drop_capitalization_enabled: settings.drop_capitalization_enabled,
        drop_apostrophes_enabled: settings.drop_apostrophes_enabled,
        quick_reply_after_first_enabled: settings.quick_reply_after_first_enabled,
        geo_filter_mode: settings.geo_filter_mode,
        geo_allowed_states: settings.geo_allowed_states,
        geo_blocked_message: settings.geo_blocked_message,
      } as any)
      .eq('id', settings.id);

    setIsSaving(false);

    if (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
      return;
    }

    toast.success('Settings saved successfully');
  };

  const addKeyword = () => {
    if (!newKeyword.trim() || !settings) return;
    if (settings.escalation_keywords.includes(newKeyword.trim().toLowerCase())) {
      toast.error('Keyword already exists');
      return;
    }
    setSettings({
      ...settings,
      escalation_keywords: [...settings.escalation_keywords, newKeyword.trim().toLowerCase()],
    });
    setNewKeyword('');
  };

  const removeKeyword = (keyword: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      escalation_keywords: settings.escalation_keywords.filter(k => k !== keyword),
    });
  };

  // Status color removed - no longer using online indicators for AI

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <PageHeader
          title="AI Support"
          docsLink="/documentation/ai-support/personas"
          tourSection="ai-support"
          propertySelector={
            <PropertySelector
              properties={properties}
              selectedPropertyId={selectedPropertyId}
              onPropertyChange={setSelectedPropertyId}
              onDeleteProperty={async () => false}
              variant="header"
              showAddButton
            />
          }
        >
          <HeaderButton size="icon" onClick={fetchAIAgents}>
            <RefreshCw className="h-4 w-4" />
          </HeaderButton>
          <HeaderButton onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </HeaderButton>
        </PageHeader>

        {/* Content */}
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-3 md:p-6">
            <div className="max-w-4xl mx-auto space-y-6">

          {/* AI Status per Property */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Status by Website
              </CardTitle>
              <CardDescription>
                Disable AI completely for specific websites. When off, all new conversations start without AI responses and go straight to your team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <p className="text-sm text-muted-foreground">No properties found.</p>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          const offCount = properties.filter(p => p.id in aiEnabledOverrides ? !aiEnabledOverrides[p.id] : (p as any).ai_enabled === false).length;
                          return offCount === 0
                            ? 'AI enabled on all websites'
                            : `AI disabled on ${offCount} website${offCount > 1 ? 's' : ''}`;
                        })()}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-72 overflow-y-auto" align="start">
                    {properties.map((property) => {
                      const aiOn = property.id in aiEnabledOverrides ? aiEnabledOverrides[property.id] : (property as any).ai_enabled !== false;
                      return (
                        <DropdownMenuItem
                          key={property.id}
                          className="flex items-center gap-3 cursor-pointer"
                          onSelect={(e) => { e.preventDefault(); togglePropertyAI(property.id, !aiOn); }}
                        >
                          <Check className={cn('h-4 w-4 shrink-0', aiOn ? 'text-green-500' : 'opacity-0')} />
                          <span className="flex-1 truncate text-sm">{property.name || property.domain}</span>
                          {!aiOn && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">AI Off</Badge>}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardContent>
          </Card>

          {/* AI Personas Card */}
          <Card data-tour="ai-personas">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>AI Personas</CardTitle>
                <CardDescription>
                  Create virtual agents with unique personalities
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Import from Team Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={isImporting || humanAgents.length === 0}>
                      {isImporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Users className="mr-2 h-4 w-4" />
                      )}
                      Import from Team
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {humanAgents.length === 0 ? (
                      <DropdownMenuItem disabled>
                        No team members available
                      </DropdownMenuItem>
                    ) : (
                      humanAgents.map((agent) => {
                        const isAlreadyLinked = aiAgents.some(ai => ai.linked_agent_id === agent.id);
                        return (
                          <DropdownMenuItem
                            key={agent.id}
                            onClick={() => handleImportFromTeam(agent)}
                            disabled={isAlreadyLinked}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={agent.avatar_url} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {agent.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span className="truncate block">{agent.name}</span>
                              {isAlreadyLinked && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Link className="h-3 w-3" /> Already linked
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={isAIDialogOpen} onOpenChange={(open) => {
                  setIsAIDialogOpen(open);
                  if (!open) {
                    setEditingAIAgent(null);
                    setAIAgentName('');
                    setAIAgentPersonality('');
                    setAiPersonalityPreset(null);
                    setAISelectedPropertyIds([]);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Bot className="mr-2 h-4 w-4" />
                      Create Persona
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-base">{editingAIAgent ? 'Edit AI Persona' : 'Create AI Persona'}</DialogTitle>
                    <DialogDescription className="text-xs">
                      {editingAIAgent ? 'Update this AI persona\'s details.' : 'Create a virtual agent with a unique personality.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="ai-name" className="text-xs">Name</Label>
                      <Input
                        id="ai-name"
                        placeholder="Luna"
                        className="h-8 text-sm"
                        value={aiAgentName}
                        onChange={(e) => setAIAgentName(e.target.value)}
                      />
                    </div>
                    
                    {/* Personality Preset Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs">Personality</Label>
                      <div className="space-y-1.5">
                        {[
                          { value: 'emily' as const, title: 'Emily', description: 'Warm & Reassuring' },
                          { value: 'sarah' as const, title: 'Sarah', description: 'Kind & Encouraging' },
                          { value: 'michael' as const, title: 'Michael', description: 'Calm & Supportive' },
                          { value: 'daniel' as const, title: 'Daniel', description: 'Friendly & Uplifting' },
                          { value: 'custom' as const, title: 'Custom', description: 'Write your own' },
                        ].map((tone) => (
                          <ToneCard
                            key={tone.value}
                            title={tone.title}
                            description={tone.description}
                            selected={aiPersonalityPreset === tone.value}
                            onClick={() => setAiPersonalityPreset(tone.value)}
                            avatarSrc={tone.value !== 'custom' ? personaAvatars[tone.value] : undefined}
                            compact
                          />
                        ))}
                      </div>

                      {/* Custom personality textarea */}
                      {aiPersonalityPreset === 'custom' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                          <Textarea
                            id="ai-personality"
                            placeholder="Describe how your AI should communicate..."
                            value={aiAgentPersonality}
                            onChange={(e) => setAIAgentPersonality(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Assign to Properties</Label>
                      <div className="space-y-1.5 max-h-20 overflow-auto border rounded-md p-2">
                        {properties.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No properties available</p>
                        ) : (
                          properties.map((prop) => (
                            <label key={prop.id} className="flex items-center gap-1.5 cursor-pointer">
                              <Checkbox
                                className="h-3.5 w-3.5"
                                checked={aiSelectedPropertyIds.includes(prop.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setAISelectedPropertyIds([...aiSelectedPropertyIds, prop.id]);
                                  } else {
                                    setAISelectedPropertyIds(aiSelectedPropertyIds.filter(id => id !== prop.id));
                                  }
                                }}
                              />
                              <span className="text-xs truncate">{prop.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setIsAIDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={editingAIAgent ? handleUpdateAIAgent : handleCreateAIAgent} 
                      disabled={isCreatingAI || !aiAgentName.trim()}
                    >
                      {isCreatingAI && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      {editingAIAgent ? 'Save Changes' : 'Create Persona'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading AI personas...
                </div>
              ) : aiAgents.filter(a => !selectedPropertyId || a.assigned_properties.includes(selectedPropertyId)).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No AI personas assigned to this property</p>
                  <p className="text-sm mb-3">Create a persona and assign it to this property</p>
                  <Button size="sm" onClick={() => setIsAIDialogOpen(true)}>
                    <Bot className="mr-2 h-4 w-4" />
                    Create Your First Persona
                  </Button>
                </div>
              ) : (
                <>
                <div className="space-y-3 md:hidden">
                  {aiAgents.filter(a => !selectedPropertyId || a.assigned_properties.includes(selectedPropertyId)).map((agent) => (
                    <div key={agent.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                      <div className="relative group flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={agent.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                          {uploadingAvatarFor === agent.id ? (
                            <Loader2 className="h-4 w-4 text-white animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 text-white" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAvatarFileSelect(agent.id, file);
                            }}
                          />
                        </label>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{agent.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {agent.personality_prompt || 'No personality set'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                {agent.assigned_properties.length === 0 
                                  ? 'None' 
                                  : `${agent.assigned_properties.length} prop`
                                }
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              {properties.length === 0 ? (
                                <DropdownMenuItem disabled>No properties available</DropdownMenuItem>
                              ) : (
                                properties.map((prop) => {
                                  const isAssigned = agent.assigned_properties.includes(prop.id);
                                  return (
                                    <DropdownMenuItem
                                      key={prop.id}
                                      onClick={() => handleToggleAIProperty(agent.id, prop.id, isAssigned)}
                                      className="flex items-center gap-2"
                                    >
                                      <Checkbox checked={isAssigned} className="pointer-events-none" />
                                      <span className="truncate">{prop.name}</span>
                                    </DropdownMenuItem>
                                  );
                                })
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEditAIAgent(agent)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteAIAgentId(agent.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Personality</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiAgents.filter(a => !selectedPropertyId || a.assigned_properties.includes(selectedPropertyId)).map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative group">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={agent.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  <Bot className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>
                              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                {uploadingAvatarFor === agent.id ? (
                                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 text-white" />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleAvatarFileSelect(agent.id, file);
                                  }}
                                />
                              </label>
                            </div>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                            {agent.personality_prompt || 'No personality set'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8">
                                <Globe className="h-3.5 w-3.5 mr-2" />
                                {agent.assigned_properties.length === 0 
                                  ? 'None' 
                                  : agent.assigned_properties.length === 1
                                    ? properties.find(p => p.id === agent.assigned_properties[0])?.name || '1 property'
                                    : `${agent.assigned_properties.length} properties`
                                }
                                <ChevronDown className="h-3.5 w-3.5 ml-2" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              {properties.length === 0 ? (
                                <DropdownMenuItem disabled>No properties available</DropdownMenuItem>
                              ) : (
                                properties.map((prop) => {
                                  const isAssigned = agent.assigned_properties.includes(prop.id);
                                  return (
                                    <DropdownMenuItem
                                      key={prop.id}
                                      onClick={() => handleToggleAIProperty(agent.id, prop.id, isAssigned)}
                                      className="flex items-center gap-2"
                                    >
                                      <Checkbox checked={isAssigned} className="pointer-events-none" />
                                      <span className="truncate">{prop.name}</span>
                                    </DropdownMenuItem>
                                  );
                                })
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditAIAgent(agent)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteAIAgentId(agent.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Service Area / Geo-Filtering */}
          {settings && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Service Area</CardTitle>
                    <CardDescription className="mt-0.5">
                      Restrict the chatbot by visitor location. Blocked visitors see an unavailable message — no data is stored.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Filter mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'anywhere', label: 'Anywhere', description: 'No restriction' },
                    { value: 'us_only', label: 'US Only', description: 'All 50 states + DC' },
                    { value: 'specific_states', label: 'Specific States', description: 'Choose states' },
                  ].map((option) => {
                    const isActive = settings.geo_filter_mode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, geo_filter_mode: option.value })}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all text-center",
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                            : "border-border/40 hover:border-border hover:bg-muted/30"
                        )}
                      >
                        {option.value === 'anywhere' && <Globe className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />}
                        {option.value === 'us_only' && <Map className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />}
                        {option.value === 'specific_states' && <MapPin className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />}
                        <span className="text-sm font-semibold">{option.label}</span>
                        <span className="text-[11px] text-muted-foreground leading-tight">{option.description}</span>
                        {isActive && (
                          <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* State picker dropdown */}
                {settings.geo_filter_mode === 'specific_states' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Allowed States</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-auto min-h-10 py-2 font-normal">
                          <span className="text-sm truncate text-left">
                            {settings.geo_allowed_states.length === 0
                              ? 'Select states...'
                              : settings.geo_allowed_states.length === US_STATES.length
                                ? 'All states selected'
                                : `${settings.geo_allowed_states.sort().join(', ')} (${settings.geo_allowed_states.length})`}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-auto bg-popover z-50" align="start">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setSettings({ ...settings, geo_allowed_states: US_STATES.map(s => s.code) });
                          }}
                          className="text-xs font-medium text-primary"
                        >
                          <Check className="h-3 w-3 mr-1" /> Select All
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setSettings({ ...settings, geo_allowed_states: [] });
                          }}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Clear All
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {US_STATES.map((st) => {
                          const isSelected = settings.geo_allowed_states.includes(st.code);
                          return (
                            <DropdownMenuItem
                              key={st.code}
                              onSelect={(e) => {
                                e.preventDefault();
                                const next = isSelected
                                  ? settings.geo_allowed_states.filter(s => s !== st.code)
                                  : [...settings.geo_allowed_states, st.code];
                                setSettings({ ...settings, geo_allowed_states: next });
                              }}
                              className="flex items-center gap-2"
                            >
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                              <span className="text-sm">{st.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto">{st.code}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {settings.geo_allowed_states.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {settings.geo_allowed_states.sort().map((code) => (
                          <Badge key={code} variant="secondary" className="gap-1 pr-1 text-xs">
                            {code}
                            <button
                              type="button"
                              onClick={() => setSettings({
                                ...settings,
                                geo_allowed_states: settings.geo_allowed_states.filter(s => s !== code),
                              })}
                              className="ml-0.5 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom blocked message */}
                {settings.geo_filter_mode !== 'anywhere' && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-sm">Blocked Visitor Message</Label>
                    <Textarea
                      value={settings.geo_blocked_message || ''}
                      onChange={(e) => setSettings({ ...settings, geo_blocked_message: e.target.value || null })}
                      placeholder="We're sorry, our services are currently not available in your area."
                      rows={2}
                      className="text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown to visitors outside the allowed area. Leave blank for the default message.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Behavior Settings */}
          {settings && (
            <>
              {/* Timing Settings */}
              <Card data-tour="ai-timing">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Response Timing</CardTitle>
                  </div>
                  <CardDescription>
                    Add delays to AI responses for a more human-like experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>First Response Delay</Label>
                        <p className="text-sm text-muted-foreground">
                          How long before the first reply — simulates a human reading your message
                        </p>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground shrink-0 ml-4">
                        {Math.round(settings.ai_response_delay_min_ms / 1000)}s – {Math.round(settings.ai_response_delay_max_ms / 1000)}s
                      </span>
                    </div>
                    <Slider
                      value={[settings.ai_response_delay_min_ms, settings.ai_response_delay_max_ms]}
                      onValueChange={([min, max]) => setSettings({
                        ...settings,
                        ai_response_delay_min_ms: min,
                        ai_response_delay_max_ms: max,
                      })}
                      min={0}
                      max={120000}
                      step={1000}
                      minStepsBetweenThumbs={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 20–30 seconds for the most human-like pacing
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Quick Reply After First Message</Label>
                      <p className="text-sm text-muted-foreground">
                        Reply faster (15–25s) after the opener, as if the agent is now fully engaged in the conversation
                      </p>
                    </div>
                    <Switch
                      checked={settings.quick_reply_after_first_enabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        quick_reply_after_first_enabled: checked,
                      })}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Smart Typing Duration</Label>
                        <p className="text-sm text-muted-foreground">
                          Calculate typing time based on response length
                        </p>
                      </div>
                      <Switch
                        checked={settings.smart_typing_enabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          smart_typing_enabled: checked,
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>{settings.smart_typing_enabled ? 'Minimum Typing Duration' : 'Typing Indicator Duration'}</Label>
                      <span className="text-sm font-medium text-muted-foreground">
                        {(settings.typing_indicator_min_ms / 1000).toFixed(1)}s – {(settings.typing_indicator_max_ms / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <Slider
                      value={[settings.typing_indicator_min_ms, settings.typing_indicator_max_ms]}
                      onValueChange={([min, max]) => setSettings({
                        ...settings,
                        typing_indicator_min_ms: min,
                        typing_indicator_max_ms: max,
                      })}
                      min={500}
                      max={5000}
                      step={100}
                      minStepsBetweenThumbs={1}
                    />
                    {settings.smart_typing_enabled && (
                      <>
                        <div className="flex items-center justify-between mt-4">
                          <Label>Typing Speed</Label>
                          <span className="text-sm font-medium text-muted-foreground">
                            {settings.typing_wpm} WPM
                          </span>
                        </div>
                        <Slider
                          value={[settings.typing_wpm]}
                          onValueChange={([val]) => setSettings({
                            ...settings,
                            typing_wpm: val,
                          })}
                          min={60}
                          max={150}
                          step={5}
                        />
                        <p className="text-xs text-muted-foreground">
                          Typing speed used to calculate response reveal time. If calculated time is less than minimum, minimum is used.
                        </p>
                      </>
                    )}
                  </div>

                </CardContent>
              </Card>

              {/* Humanization Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Humanization</CardTitle>
                  </div>
                  <CardDescription>
                    Make AI responses feel more natural and human-like
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Human Typos</Label>
                      <p className="text-sm text-muted-foreground">
                        Occasionally make small spelling mistakes (~every 3–4 messages)
                      </p>
                    </div>
                    <Switch
                      checked={settings.human_typos_enabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        human_typos_enabled: checked,
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Missed Capitalization</Label>
                      <p className="text-sm text-muted-foreground">
                        Occasionally skip capitalizing the start of sentences (~30% of the time)
                      </p>
                    </div>
                    <Switch
                      checked={settings.drop_capitalization_enabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        drop_capitalization_enabled: checked,
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Drop Apostrophes</Label>
                      <p className="text-sm text-muted-foreground">
                        Occasionally skip apostrophes in contractions, e.g. "dont" instead of "don't" (~30% of the time)
                      </p>
                    </div>
                    <Switch
                      checked={settings.drop_apostrophes_enabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        drop_apostrophes_enabled: checked,
                      })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Escalation Settings */}
              <Card data-tour="ai-escalation">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Escalation Rules</CardTitle>
                  </div>
                  <CardDescription>
                    Configure when conversations should escalate to human agents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Escalation</Label>
                      <p className="text-sm text-muted-foreground">
                        Escalate after a set number of AI messages
                      </p>
                    </div>
                    <Switch
                      checked={settings.auto_escalation_enabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        auto_escalation_enabled: checked,
                      })}
                    />
                  </div>

                  {settings.auto_escalation_enabled && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Messages Before Escalation</Label>
                        <span className="text-sm font-medium text-muted-foreground">
                          {settings.max_ai_messages_before_escalation} messages
                        </span>
                      </div>
                      <Slider
                        value={[settings.max_ai_messages_before_escalation]}
                        onValueChange={([val]) => setSettings({
                          ...settings,
                          max_ai_messages_before_escalation: val,
                        })}
                        min={2}
                        max={15}
                        step={1}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Escalation Keywords</Label>
                    <p className="text-sm text-muted-foreground">
                      Trigger immediate escalation when these words are detected
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add keyword..."
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                      />
                      <Button onClick={addKeyword} variant="secondary">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {settings.escalation_keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
                          {keyword}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 hover:bg-destructive/20"
                            onClick={() => removeKeyword(keyword)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>


              <Card data-tour="ai-engagement">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Engagement</CardTitle>
                  </div>
                  <CardDescription>
                    Configure lead capture and proactive messaging
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Name</Label>
                      <p className="text-sm text-muted-foreground">
                        Ask for visitor's name before chat
                      </p>
                    </div>
                    <Switch
                      checked={settings.require_name_before_chat}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        require_name_before_chat: checked,
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Ask for visitor's email before chat
                      </p>
                    </div>
                    <Switch
                      checked={settings.require_email_before_chat}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        require_email_before_chat: checked,
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Phone</Label>
                      <p className="text-sm text-muted-foreground">
                        Ask for visitor's phone number before chat
                      </p>
                    </div>
                    <Switch
                      checked={settings.require_phone_before_chat}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        require_phone_before_chat: checked,
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Insurance Card</Label>
                      <p className="text-sm text-muted-foreground">
                        Ask for front and back photos of insurance card
                      </p>
                    </div>
                    <Switch
                      checked={settings.require_insurance_card_before_chat}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        require_insurance_card_before_chat: checked,
                        ...(!checked ? { insurance_collection_prompt: null } : {}),
                      })}
                    />
                  </div>

                  {settings.require_insurance_card_before_chat && (
                    <div className="ml-4 pl-4 border-l-2 border-muted space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Detailed Instructions (Optional)</Label>
                        {settings.insurance_collection_prompt && settings.insurance_collection_prompt.trim().length >= 10 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isImprovingPrompt}
                            onClick={async () => {
                              setIsImprovingPrompt(true);
                              try {
                                const { data, error } = await supabase.functions.invoke('improve-insurance-prompt', {
                                  body: { draft: settings.insurance_collection_prompt },
                                });
                                if (error || !data?.improved) {
                                  toast.error(data?.error || error?.message || 'Failed to improve prompt');
                                  return;
                                }
                                setSettings({ ...settings, insurance_collection_prompt: data.improved });
                                toast.success('Prompt improved! Review the changes and save.');
                              } catch (e) {
                                toast.error('Failed to improve prompt');
                              } finally {
                                setIsImprovingPrompt(false);
                              }
                            }}
                            className="gap-1.5 text-xs"
                          >
                            {isImprovingPrompt ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            {isImprovingPrompt ? 'Improving...' : 'Improve with AI'}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Add specific instructions for how the AI should collect insurance info (e.g., state vs private branching, follow-up questions). If left blank, a generic prompt will be used.
                      </p>
                      <Textarea
                        placeholder="e.g., First ask if they have state or private insurance. If state, ask which state program. If private, ask for the insurance company name and member ID..."
                        value={settings.insurance_collection_prompt || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          insurance_collection_prompt: e.target.value || null,
                        })}
                        className="min-h-[100px] text-sm"
                      />
                    </div>
                  )}

                  <div className="border-t pt-6 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label>Natural Lead Capture</Label>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            Recommended
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          AI conversationally asks for selected fields instead of showing a form
                        </p>
                      </div>
                      <Switch
                        checked={settings.natural_lead_capture_enabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          natural_lead_capture_enabled: checked,
                        })}
                      />
                    </div>
                    {settings.natural_lead_capture_enabled && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-3 rounded-lg">
                        When enabled, the AI will naturally ask for the fields you've selected above during conversation. 
                        No form will be shown. The AI will gently collect: 
                        {settings.require_name_before_chat && ' name,'}
                        {settings.require_email_before_chat && ' email,'}
                        {settings.require_phone_before_chat && ' phone,'}
                        {settings.require_insurance_card_before_chat && ' insurance card photos'}
                        {!settings.require_name_before_chat && !settings.require_email_before_chat && !settings.require_phone_before_chat && !settings.require_insurance_card_before_chat && ' (no fields selected)'}
                      </p>
                    )}
                  </div>

                  {/* Calendly Integration */}
                  <div className="border-t pt-6 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link className="h-4 w-4 text-muted-foreground" />
                          <Label>Calendly Booking Link</Label>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <Switch
                          checked={!!settings.calendly_url}
                          onCheckedChange={(checked) => {
                            if (!checked) {
                              setSettings({ ...settings, calendly_url: null });
                            }
                          }}
                          disabled={!settings.calendly_url}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        After collecting contact info, the AI will offer visitors a link to book a call via Calendly.
                      </p>
                      <Input
                        placeholder="https://calendly.com/your-team/consultation"
                        value={settings.calendly_url || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          calendly_url: e.target.value || null,
                        })}
                      />
                      {settings.calendly_url && (
                        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          ✅ After the visitor shares their name and phone number, the AI will offer this booking link once during the conversation.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Greeting Message */}
                  <div className="space-y-2">
                    <Label htmlFor="greeting">Welcome Message</Label>
                    <Input
                      id="greeting"
                      placeholder="Hi there! How can we help you today?"
                      value={settings.greeting || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        greeting: e.target.value || null,
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      The first message visitors see when they open the chat widget
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-0.5">
                        <Label>Proactive Message</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically open widget with a message
                        </p>
                      </div>
                      <Switch
                        checked={settings.proactive_message_enabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          proactive_message_enabled: checked,
                        })}
                      />
                    </div>

                    {settings.proactive_message_enabled && (
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Hi! Need help finding the right treatment option?"
                          value={settings.proactive_message || ''}
                          onChange={(e) => setSettings({
                            ...settings,
                            proactive_message: e.target.value,
                          })}
                          rows={3}
                        />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Delay Before Showing</Label>
                            <span className="text-sm font-medium text-muted-foreground">
                              {settings.proactive_message_delay_seconds}s
                            </span>
                          </div>
                          <Slider
                            value={[settings.proactive_message_delay_seconds]}
                            onValueChange={([val]) => setSettings({
                              ...settings,
                              proactive_message_delay_seconds: val,
                            })}
                            min={5}
                            max={120}
                            step={5}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

               {/* AI Base Prompt - Read Only */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>AI Base Prompt</CardTitle>
                    <Badge variant="outline" className="ml-2 text-xs">HIPAA Protected</Badge>
                  </div>
                  <CardDescription>
                    This foundational prompt is enforced server-side and cannot be modified to ensure HIPAA compliance. AI persona personalities are layered on top of this base prompt.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      The base prompt enforces: radically human tone, 2-3 sentence max responses, no medical advice, crisis protocol (988 Lifeline), no AI identity disclosure, and a validate-first engagement strategy. Persona personalities layer additional behavioral guidance on top.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
            </div>
          </div>
        </div>
      </div>


      {/* Delete AI Agent Confirmation */}
      <AlertDialog open={!!deleteAIAgentId} onOpenChange={(open) => !open && setDeleteAIAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove AI Persona</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this AI persona? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAI}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAIAgent}
              disabled={isDeletingAI}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAI ? 'Removing...' : 'Remove Persona'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dashboard Tour */}
      <DashboardTour />

      {/* Avatar Crop Dialog */}
      <AvatarCropDialog
        open={cropDialogOpen}
        imageSrc={cropImageSrc}
        onClose={() => {
          setCropDialogOpen(false);
          setCropImageSrc(null);
          setCropAgentId(null);
        }}
        onConfirm={handleCroppedAvatarUpload}
        saving={!!uploadingAvatarFor}
      />
    </DashboardLayout>
  );
};

// Tone selection card component
const ToneCard = ({
  title,
  description,
  selected,
  onClick,
  avatarSrc,
  compact,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  avatarSrc?: string;
  compact?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full rounded-lg border-2 text-left transition-all",
      compact ? "p-2" : "p-3",
      selected
        ? "border-primary bg-primary/5"
        : "border-border hover:border-muted-foreground/30"
    )}
  >
    <div className="flex items-center justify-between gap-2">
      {avatarSrc && (
        <img 
          src={avatarSrc} 
          alt={title} 
          className={cn("rounded-full object-cover flex-shrink-0", compact ? "w-7 h-7" : "w-10 h-10")}
        />
      )}
      <div className="flex-1 min-w-0">
        <span className={cn("font-medium text-foreground", compact && "text-sm")}>{title}</span>
        <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>{description}</p>
      </div>
      <div
        className={cn(
          "rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
          compact ? "w-4 h-4" : "w-5 h-5",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}
      >
        {selected && <Check className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3", "text-primary-foreground")} />}
      </div>
    </div>
  </button>
);

export default AISupport;
