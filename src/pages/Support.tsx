import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Bug, HelpCircle, Send, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000, 'Message must be less than 2000 characters'),
});

const bugSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  severity: z.enum(['low', 'medium', 'high', 'critical'], { required_error: 'Severity is required' }),
  title: z.string().trim().min(1, 'Bug title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(3000, 'Description must be less than 3000 characters'),
  stepsToReproduce: z.string().trim().max(2000, 'Steps must be less than 2000 characters').optional(),
});

const faqItems = [
  {
    question: 'How do I install the chat widget on my website?',
    answer: 'Navigate to Widget Code in your dashboard sidebar, copy the provided script tag, and paste it into your website\'s HTML just before the closing </body> tag. The widget will automatically appear on your site.',
  },
  {
    question: 'Can I customize the widget appearance?',
    answer: 'Yes! Go to Widget Code in your dashboard to customize colors, position, welcome messages, and more. You can also configure pre-chat forms to collect visitor information.',
  },
  {
    question: 'How does AI Support work?',
    answer: 'AI Support uses advanced language models to automatically respond to common visitor questions. You can configure the AI\'s personality, set up escalation rules, and define custom responses in the AI Support section.',
  },
  {
    question: 'How do I add team members?',
    answer: 'Go to Team Members in your dashboard, click "Invite Agent", enter their email address, and they\'ll receive an invitation to join your team. You can manage their assigned properties and permissions.',
  },
  {
    question: 'What integrations are available?',
    answer: 'We currently support Slack, Email notifications, and Salesforce CRM. Navigate to Settings to configure these integrations for your properties.',
  },
  {
    question: 'How do I set up notifications?',
    answer: 'In Settings, you\'ll find tabs for Slack, Email, and Salesforce integrations. Enable the ones you need and configure notification preferences for new conversations and escalations.',
  },
  {
    question: 'Can I use multiple properties/websites?',
    answer: 'Yes! You can add multiple properties to manage chat for different websites. Each property has its own widget, settings, and team assignments.',
  },
  {
    question: 'How is billing calculated?',
    answer: 'Billing is based on your plan and usage. Contact our team for detailed pricing information or to discuss enterprise options.',
  },
];

const Support = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('contact');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [bugSubmitted, setBugSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  // Bug report form state
  const [bugForm, setBugForm] = useState({
    name: '',
    email: user?.email || '',
    severity: '' as 'low' | 'medium' | 'high' | 'critical' | '',
    title: '',
    description: '',
    stepsToReproduce: '',
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = contactSchema.parse(contactForm);
      
      // TODO: Send to backend/email service
      console.log('Contact form submitted:', validated);
      
      setContactSubmitted(true);
      toast({
        title: 'Message sent!',
        description: 'We\'ll get back to you as soon as possible.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = bugSchema.parse(bugForm);
      
      // TODO: Send to backend/bug tracking service
      console.log('Bug report submitted:', validated);
      
      setBugSubmitted(true);
      toast({
        title: 'Bug report submitted!',
        description: 'Our team will investigate and follow up.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetContactForm = () => {
    setContactForm({ name: '', email: user?.email || '', subject: '', message: '' });
    setContactSubmitted(false);
  };

  const resetBugForm = () => {
    setBugForm({ name: '', email: user?.email || '', severity: '', title: '', description: '', stepsToReproduce: '' });
    setBugSubmitted(false);
  };

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <PageHeader title="Support" />

        {/* Content */}
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-6">
            <div className="max-w-4xl mx-auto space-y-6">

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Contact Us
              </TabsTrigger>
              <TabsTrigger value="faq" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                FAQ
              </TabsTrigger>
              <TabsTrigger value="bug" className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Report Bug
              </TabsTrigger>
            </TabsList>

            {/* Contact Form Tab */}
            <TabsContent value="contact" className="mt-6 space-y-6">
              {/* Calendly Embed */}
              <Card>
                <CardHeader>
                  <CardTitle>Book a Support Call</CardTitle>
                  <CardDescription>
                    Schedule a 30-minute call with our team to get help with any questions or issues.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl overflow-hidden border border-border/30">
                    <iframe
                      src="https://calendly.com/care-assist-support/30min?hide_gdpr_banner=1"
                      width="100%"
                      height="500"
                      className="border-0"
                      title="Schedule a support call"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Send Us a Message</CardTitle>
                  <CardDescription>
                    Prefer to write? Send us a message and we'll respond within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contactSubmitted ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                      <p className="text-muted-foreground mb-6">
                        Thank you for reaching out. We'll get back to you soon.
                      </p>
                      <Button onClick={resetContactForm} variant="outline">
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contact-name">Name</Label>
                          <Input
                            id="contact-name"
                            placeholder="Your name"
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-email">Email</Label>
                          <Input
                            id="contact-email"
                            type="email"
                            placeholder="your@email.com"
                            value={contactForm.email}
                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-subject">Subject</Label>
                        <Input
                          id="contact-subject"
                          placeholder="What's this about?"
                          value={contactForm.subject}
                          onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-message">Message</Label>
                        <Textarea
                          id="contact-message"
                          placeholder="Tell us how we can help..."
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          rows={5}
                          required
                        />
                      </div>
                      <Button type="submit" disabled={isSubmitting} className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Sending...' : 'Send Message'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Find answers to common questions about using Scaled Bot.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqItems.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bug Report Tab */}
            <TabsContent value="bug" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report a Bug</CardTitle>
                  <CardDescription>
                    Found something that doesn't work right? Let us know and we'll fix it.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bugSubmitted ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Bug Report Submitted!</h3>
                      <p className="text-muted-foreground mb-6">
                        Thank you for helping us improve. Our team will investigate.
                      </p>
                      <Button onClick={resetBugForm} variant="outline">
                        Report Another Bug
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleBugSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bug-name">Name</Label>
                          <Input
                            id="bug-name"
                            placeholder="Your name"
                            value={bugForm.name}
                            onChange={(e) => setBugForm({ ...bugForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bug-email">Email</Label>
                          <Input
                            id="bug-email"
                            type="email"
                            placeholder="your@email.com"
                            value={bugForm.email}
                            onChange={(e) => setBugForm({ ...bugForm, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bug-severity">Severity</Label>
                          <Select
                            value={bugForm.severity}
                            onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                              setBugForm({ ...bugForm, severity: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low - Minor issue</SelectItem>
                              <SelectItem value="medium">Medium - Affects workflow</SelectItem>
                              <SelectItem value="high">High - Major feature broken</SelectItem>
                              <SelectItem value="critical">Critical - App unusable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bug-title">Bug Title</Label>
                          <Input
                            id="bug-title"
                            placeholder="Brief description of the issue"
                            value={bugForm.title}
                            onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bug-description">Description</Label>
                        <Textarea
                          id="bug-description"
                          placeholder="Describe the bug in detail. What did you expect to happen? What actually happened?"
                          value={bugForm.description}
                          onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                          rows={4}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bug-steps">Steps to Reproduce (Optional)</Label>
                        <Textarea
                          id="bug-steps"
                          placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                          value={bugForm.stepsToReproduce}
                          onChange={(e) => setBugForm({ ...bugForm, stepsToReproduce: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <Button type="submit" disabled={isSubmitting} className="w-full">
                        <Bug className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Support;
