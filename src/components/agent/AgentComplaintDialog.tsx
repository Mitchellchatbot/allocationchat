import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Bug, CheckCircle, MessageSquareHeart, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const complaintSchema = z.object({
  category: z.enum(['general', 'technical', 'scheduling', 'management', 'safety', 'other']),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(3000),
});

interface AgentComplaintDialogProps {
  agentId: string;
  assignedPropertyIds: string[];
}

type FormType = 'feedback' | 'bug' | 'complaint';

export function AgentComplaintDialog({ agentId, assignedPropertyIds }: AgentComplaintDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<FormType>('feedback');
  const [form, setForm] = useState({
    category: '' as string,
    subject: '',
    message: '',
  });

  const categoryOptions: Record<FormType, { value: string; label: string }[]> = {
    feedback: [
      { value: 'general', label: 'General Feedback' },
      { value: 'suggestion', label: 'Feature Suggestion' },
      { value: 'praise', label: 'Positive Feedback' },
      { value: 'other', label: 'Other' },
    ],
    bug: [
      { value: 'technical', label: 'App Not Working' },
      { value: 'chat_issue', label: 'Chat Issue' },
      { value: 'notification_issue', label: 'Notification Problem' },
      { value: 'other', label: 'Other' },
    ],
    complaint: [
      { value: 'general', label: 'General' },
      { value: 'scheduling', label: 'Scheduling' },
      { value: 'management', label: 'Management' },
      { value: 'safety', label: 'Safety Concern' },
      { value: 'other', label: 'Other' },
    ],
  };

  const tabConfig: Record<FormType, { title: string; description: string; subjectPlaceholder: string; messagePlaceholder: string; successTitle: string; successMessage: string }> = {
    feedback: {
      title: 'Send Feedback',
      description: 'Share ideas or suggestions to help us improve.',
      subjectPlaceholder: 'What\'s your feedback about?',
      messagePlaceholder: 'Tell us what you think...',
      successTitle: 'Feedback Sent!',
      successMessage: 'Thank you for your input. We appreciate it.',
    },
    bug: {
      title: 'Report a Bug',
      description: 'Something broken? Let us know so we can fix it.',
      subjectPlaceholder: 'Brief description of the issue',
      messagePlaceholder: 'What happened? What did you expect? Steps to reproduce...',
      successTitle: 'Bug Report Submitted!',
      successMessage: 'Our team will investigate and follow up.',
    },
    complaint: {
      title: 'Submit a Complaint',
      description: 'Report a concern to management for review.',
      subjectPlaceholder: 'Brief summary of your complaint',
      messagePlaceholder: 'Describe the issue in detail...',
      successTitle: 'Complaint Submitted',
      successMessage: 'Management will review your complaint and follow up.',
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = complaintSchema.parse(form);

      const { error } = await supabase.from('agent_complaints' as any).insert({
        agent_id: agentId,
        property_id: assignedPropertyIds[0] || null,
        category: `${activeTab}:${validated.category}`,
        subject: validated.subject,
        message: validated.message,
      } as any);

      if (error) throw error;

      setSubmitted(true);
      toast.success(tabConfig[activeTab].successTitle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Failed to submit. Please try again.');
        console.error('Submission error:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({ category: '', subject: '', message: '' });
    setSubmitted(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setForm({ category: '', subject: '', message: '' });
        setSubmitted(false);
        setActiveTab('feedback');
      }, 200);
    }
  };

  const config = tabConfig[activeTab];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="sm">
          <MessageSquareHeart className="h-4 w-4 mr-2" />
          Feedback & Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Feedback & Reports</DialogTitle>
          <DialogDescription>
            Send feedback, report bugs, or submit a complaint.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">{config.successTitle}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {config.successMessage}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Submit Another
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as FormType); setForm({ category: '', subject: '', message: '' }); }}>
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="feedback" className="text-xs h-7 gap-1">
                  <MessageSquareHeart className="h-3 w-3" />
                  Feedback
                </TabsTrigger>
                <TabsTrigger value="bug" className="text-xs h-7 gap-1">
                  <Bug className="h-3 w-3" />
                  Bug
                </TabsTrigger>
                <TabsTrigger value="complaint" className="text-xs h-7 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Complaint
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-xs text-muted-foreground">{config.description}</p>

              <div className="space-y-1.5">
                <Label htmlFor="report-category" className="text-xs">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm({ ...form, category: value })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions[activeTab].map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-subject" className="text-xs">Subject</Label>
                <Input
                  id="report-subject"
                  placeholder={config.subjectPlaceholder}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  maxLength={200}
                  className="h-8 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-message" className="text-xs">Details</Label>
                <Textarea
                  id="report-message"
                  placeholder={config.messagePlaceholder}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                  maxLength={3000}
                  className="text-sm"
                  required
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {form.message.length}/3000
                </p>
              </div>

              <Button type="submit" disabled={isSubmitting || !form.category} className="w-full" size="sm">
                <Send className="h-3.5 w-3.5 mr-2" />
                {isSubmitting ? 'Submitting...' : `Submit ${activeTab === 'feedback' ? 'Feedback' : activeTab === 'bug' ? 'Bug Report' : 'Complaint'}`}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
