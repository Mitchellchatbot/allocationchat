import { useState, useEffect, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS, TooltipRenderProps } from 'react-joyride';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarState } from '@/hooks/useSidebarState';
import { Button } from '@/components/ui/button';
import { TourCelebration } from './TourCelebration';
import { ArrowRight, Sparkles, BarChart3, Code, Cloud, Bell, Users, Bot, Clock, AlertTriangle, MessageCircle, Settings, Palette, Wand2, Mail, Share2, Building2, Globe, Trash2, Plus } from 'lucide-react';

interface DashboardTourProps {
  onComplete?: () => void;
}

// ─── Quick Tour Steps (merged, high-level) ───────────────────────────
// Each phase gets 1 merged overview step + 1 transition step to next section

const quickDashboardSteps: Step[] = [
  {
    target: '[data-tour="sidebar-logo"]',
    content: "quick-welcome",
    title: "Welcome! 👋",
    placement: 'right',
    disableBeacon: true,
    data: { isQuickWelcome: true },
  },
  {
    target: '[data-tour="properties-sidebar"]',
    content: "properties-sidebar-special",
    title: "Properties",
    placement: 'right',
    data: { isPropertiesSidebar: true },
  },
];

const quickPropertiesSteps: Step[] = [
  {
    target: '[data-tour="properties-grid"]',
    content: "quick-properties-overview",
    title: "Your Properties",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
    data: { isQuickPropertiesOverview: true },
  },
  {
    target: '[data-tour="ai-support"]',
    content: "ai-settings-special",
    title: "AI Settings",
    placement: 'right',
    data: { isAISettings: true },
  },
];

const quickAISupportSteps: Step[] = [
  {
    target: '[data-tour="ai-personas"]',
    content: "quick-ai-overview",
    title: "AI Configuration",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
    data: { isQuickAIOverview: true },
  },
  {
    target: '[data-tour="analytics-sidebar"]',
    content: "analytics-sidebar-special",
    title: "Analytics",
    placement: 'right',
    data: { isAnalyticsSidebar: true },
  },
];

const quickAnalyticsSteps: Step[] = [
  {
    target: '[data-tour="analytics-stats"]',
    content: "quick-analytics-overview",
    title: "Performance Tracking",
    placement: 'bottom',
    disableBeacon: true,
    data: { isQuickAnalyticsOverview: true },
  },
  {
    target: '[data-tour="widget-code-sidebar"]',
    content: "widget-code-sidebar-special",
    title: "Widget Code",
    placement: 'right',
    data: { isWidgetCodeSidebar: true },
  },
];

const quickWidgetSteps: Step[] = [
  {
    target: '[data-tour="widget-preview"]',
    content: "quick-widget-overview",
    title: "Widget Customization",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
    data: { isQuickWidgetOverview: true },
  },
  {
    target: '[data-tour="salesforce"]',
    content: "salesforce-sidebar-special",
    title: "Salesforce Integration",
    placement: 'right',
    data: { isSalesforceSidebar: true },
  },
];

const quickSalesforceSteps: Step[] = [
  {
    target: '[data-tour="salesforce-visitor-leads"]',
    content: "quick-salesforce-overview",
    title: "Salesforce & Leads",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
    data: { isQuickSalesforceOverview: true },
  },
  {
    target: '[data-tour="notifications"]',
    content: "notifications-sidebar-special",
    title: "Notifications",
    placement: 'right',
    data: { isNotificationsSidebar: true },
  },
];

const quickNotificationsSteps: Step[] = [
  {
    target: '[data-tour="notifications-tabs"]',
    content: "quick-notifications-overview",
    title: "Stay Informed",
    placement: 'bottom',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
    data: { isQuickNotificationsOverview: true },
  },
  {
    target: '[data-tour="team-members"]',
    content: "team-sidebar-special",
    title: "Team Members",
    placement: 'right',
    data: { isTeamSidebar: true },
  },
];

const quickTeamSteps: Step[] = [
  {
    target: '[data-tour="team-table"]',
    content: "quick-team-overview",
    title: "Team Management",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
    data: { isQuickTeamOverview: true },
  },
  {
    target: '[data-tour="info-indicator"]',
    content: "See these little ℹ️ icons next to page titles? Click any of them to jump to the relevant docs. You can also click 'Tour this page' in any section header to get a detailed walkthrough!",
    title: "Quick Help & Deep Dives",
    placement: 'bottom',
  },
  {
    target: '[data-tour="get-help"]',
    content: "Have questions? Visit 'Get Help' anytime for support, FAQs, and direct assistance from our team.",
    title: "Get Help",
    placement: 'right',
  },
];

// ─── Deep Dive Steps (detailed, per-section) ─────────────────────────
// These are triggered from PageHeader "Tour this page" buttons

const deepDiveAISupport: Step[] = [
  {
    target: '[data-tour="ai-personas"]',
    content: "Create AI personas with unique personalities. Each persona can have different conversation styles and be assigned to specific properties.",
    title: "AI Personas",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
    data: { icon: 'bot' },
  },
  {
    target: '[data-tour="ai-timing"]',
    content: "Make your AI feel more human by adding response delays and typing indicators. Smart Typing Duration calculates realistic typing time based on message length and WPM, so longer replies take longer to 'type' — just like a real person.",
    title: "Response Timing",
    placement: 'left',
    floaterProps: { disableFlip: true },
    data: { icon: 'clock' },
  },
  {
    target: '[data-tour="ai-escalation"]',
    content: "Set rules for when AI should hand off to a human agent. Trigger escalation after a number of messages or when specific keywords are detected.",
    title: "Escalation Rules",
    placement: 'left',
    floaterProps: { disableFlip: true },
    data: { icon: 'alert' },
  },
  {
    target: '[data-tour="ai-engagement"]',
    content: "Control how you collect visitor information. With Natural Lead Capture ON, the AI conversationally asks for name, phone, and other details during the chat — no forms needed. When it's OFF, visitors see a traditional form they must fill out before chatting.",
    title: "Engagement & Lead Capture",
    placement: 'left',
    floaterProps: { disableFlip: true },
    data: { icon: 'message' },
  },
];

const deepDiveAnalytics: Step[] = [
  {
    target: '[data-tour="analytics-top-pages"]',
    content: "See which pages on your website generate the most conversations. The page address shows exactly where visitors are engaging with your chat widget.",
    title: "Top Performing Pages",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
  },
  {
    target: '[data-tour="analytics-stats"]',
    content: "\"Opens\" counts how many times visitors started a chat. \"Escalations\" tracks when AI handed off to a human agent — this helps you measure AI effectiveness and staffing needs.",
    title: "Opens & Escalations",
    placement: 'bottom',
    disableBeacon: true,
  },
];

const deepDiveWidget: Step[] = [
  {
    target: '[data-tour="widget-icon-card"]',
    content: "Choose an icon that matches your brand. This is the button visitors click to open your chat widget.",
    title: "Chat Launcher Icon",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
    data: { icon: 'icon' },
  },
  {
    target: '[data-tour="widget-color-card"]',
    content: "Pick a color that matches your website's branding. We automatically extract colors from your domain to get you started.",
    title: "Brand Color",
    placement: 'left',
    floaterProps: { disableFlip: true },
    data: { icon: 'palette' },
  },
  {
    target: '[data-tour="widget-welcome-message"]',
    content: "This is the first message visitors see when they open the chat. Make it warm and inviting to encourage engagement.",
    title: "Welcome Message",
    placement: 'left',
    floaterProps: { disableFlip: true },
    data: { icon: 'message' },
  },
  {
    target: '[data-tour="widget-effects-card"]',
    content: "Add eye-catching animations to your chat launcher button — like pulse, bounce, or wiggle — to grab visitor attention. You can control how often they play and how intense they are.",
    title: "Launcher Effects",
    placement: 'left',
    floaterProps: { disableFlip: true },
    data: { icon: 'wand' },
  },
  {
    target: '[data-tour="widget-embed-tab"]',
    content: "Click this tab to get the code snippet you'll add to your website.",
    title: "Embed Code Tab",
    placement: 'bottom',
    data: { isClickRequired: true, tabValue: 'code' },
  },
  {
    target: '[data-tour="widget-embed-code"]',
    content: "Copy this snippet and paste it just before the closing </body> tag on your website. That's it — your chat widget will be live!",
    title: "Your Embed Code",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
  {
    target: '[data-tour="widget-preview-toggle"]',
    content: "Toggle between desktop and mobile views to see how your widget looks on different devices.",
    title: "Preview Modes",
    placement: 'bottom',
  },
  {
    target: '[data-tour="widget-preview"]',
    content: "This live preview shows exactly how your widget will appear on your website. The chat button in the corner is fully interactive!",
    title: "Live Preview",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
];

const deepDiveSalesforce: Step[] = [
  {
    target: '[data-tour="salesforce-leads-tab"]',
    content: "The Visitor Leads tab shows all visitors who have chatted on your site. This is your lead pipeline ready to be exported to Salesforce.",
    title: "Visitor Leads Tab",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="salesforce-visitor-leads"]',
    content: "View all your visitor leads in one place. You can see their contact info, treatment interests, urgency level, and export status.",
    title: "Lead Dashboard",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
  {
    target: '[data-tour="salesforce-export-actions"]',
    content: "Select leads with checkboxes, then click 'Export Selected' to push them to Salesforce. Already exported leads show a green badge.",
    title: "Manual Export",
    placement: 'bottom',
  },
  {
    target: '[data-tour="salesforce-settings-tab"]',
    content: "Click the Settings tab to connect your Salesforce account and configure automatic exports.",
    title: "Settings Tab",
    placement: 'bottom',
    data: { isClickRequired: true, clickTarget: 'salesforce-settings-tab', tabValue: 'settings' },
  },
  {
    target: '[data-tour="salesforce-connection"]',
    content: "Enter your Salesforce Connected App credentials here. Once connected, you'll see your instance URL and can start exporting leads.",
    title: "Salesforce Connection",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
  {
    target: '[data-tour="salesforce-auto-export"]',
    content: "Enable automatic exports when conversations are escalated or closed. No more manual work — leads flow directly to your CRM.",
    title: "Auto Export",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
  {
    target: '[data-tour="salesforce-field-mappings"]',
    content: "Map visitor data to Salesforce Lead fields. GCLID mapping lets you track Google Ads conversions directly in Salesforce.",
    title: "Field Mappings",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
];

const deepDiveNotifications: Step[] = [
  {
    target: '[data-tour="notifications-tabs"]',
    content: "Switch between Slack and Email notification channels. Configure both to never miss an important conversation.",
    title: "Notification Channels",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="slack-connection"]',
    content: "Connect your Slack workspace with one click. Notifications will be sent to your chosen channel instantly.",
    title: "Slack Connection",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
  {
    target: '[data-tour="slack-triggers"]',
    content: "Choose when to receive Slack alerts — for new conversations, escalations, or both. Keep your team informed in real-time.",
    title: "Slack Triggers",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
  {
    target: '[data-tour="notifications-email-tab"]',
    content: "Click the Email tab to set up email notifications for your team.",
    title: "Email Notifications",
    placement: 'bottom',
    data: { isClickRequired: true, clickTarget: 'notifications-email-tab', tabValue: 'email' },
  },
  {
    target: '[data-tour="email-recipients"]',
    content: "Add multiple email addresses to receive notifications. Great for keeping your entire team in the loop.",
    title: "Email Recipients",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
  {
    target: '[data-tour="email-triggers"]',
    content: "Control which events trigger email notifications. Enable or disable alerts for new chats and escalations.",
    title: "Email Triggers",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
];

const deepDiveTeam: Step[] = [
  {
    target: '[data-tour="team-table"]',
    content: "This is your team hub. Here you'll see all your human agents, their status, and assigned properties.",
    title: "Team Overview",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
  },
  {
    target: '[data-tour="create-account-btn"]',
    content: "Use 'Create Account' to instantly set up an agent with a username and password. They can sign in right away — perfect for internal team members.",
    title: "Create Account",
    placement: 'bottom',
  },
  {
    target: '[data-tour="invite-agent-btn"]',
    content: "Use 'Invite Agent' to send an email invitation. They'll receive a link to set up their own credentials — ideal for external collaborators.",
    title: "Invite Agent",
    placement: 'bottom',
  },
  {
    target: '[data-tour="team-table"]',
    content: "Each agent has a 🤖 button in the Actions column. Click it to create an AI persona that mirrors their name and avatar — the AI will respond as them when they're offline.",
    title: "AI Persona Linking",
    placement: 'left',
    floaterProps: { disableFlip: true },
  },
];

const deepDiveProperties: Step[] = [
  {
    target: '[data-tour="properties-grid"]',
    content: "This is your property hub. Each card represents a website where your chat widget is deployed. You can see the domain, widget color, and manage each property.",
    title: "Property Overview",
    placement: 'left',
    disableBeacon: true,
    floaterProps: { disableFlip: true },
    data: { icon: 'building' },
  },
  {
    target: '[data-tour="properties-add-btn"]',
    content: "Click here to add a new website. Your first property is free — additional properties require a subscription upgrade.",
    title: "Add Property",
    placement: 'bottom',
    data: { icon: 'plus' },
  },
];

// Map section names to deep dive steps
export const deepDiveStepsMap: Record<string, Step[]> = {
  'properties': deepDiveProperties,
  'ai-support': deepDiveAISupport,
  'analytics': deepDiveAnalytics,
  'widget': deepDiveWidget,
  'salesforce': deepDiveSalesforce,
  'notifications': deepDiveNotifications,
  'team': deepDiveTeam,
};

// ─── Feature Item Component (for merged quick tour tooltips) ─────────

interface FeatureItemProps {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const FeatureItem = ({ icon, label, description }: FeatureItemProps) => (
  <div className="flex items-start gap-2.5">
    <div className="p-1.5 rounded-lg bg-primary/10 shrink-0 mt-0.5">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

// ─── Quick Tour Content Renderers ────────────────────────────────────

const QuickWelcomeContent = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Welcome to your command center! Here's a quick overview of everything you can do:</p>
    <div className="space-y-2.5">
      <FeatureItem icon={<MessageCircle className="h-3.5 w-3.5 text-primary" />} label="Inbox" description="All visitor conversations in one place with unread badges" />
      <FeatureItem icon={<Bot className="h-3.5 w-3.5 text-primary" />} label="AI Support" description="Configure AI personas, timing, and escalation rules" />
      <FeatureItem icon={<Code className="h-3.5 w-3.5 text-primary" />} label="Widget" description="Customize and embed your chat widget" />
    </div>
  </div>
);

const QuickAIOverviewContent = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">This is where you configure your AI assistant's behavior:</p>
    <div className="space-y-2.5">
      <FeatureItem icon={<Bot className="h-3.5 w-3.5 text-primary" />} label="Personas" description="Create AI agents with unique personalities and assign them to properties" />
      <FeatureItem icon={<Clock className="h-3.5 w-3.5 text-primary" />} label="Timing" description="Response delays and smart typing make AI feel human" />
      <FeatureItem icon={<AlertTriangle className="h-3.5 w-3.5 text-primary" />} label="Escalation" description="Set rules for when AI hands off to a human agent" />
      <FeatureItem icon={<Share2 className="h-3.5 w-3.5 text-primary" />} label="Lead Capture" description="Natural conversational capture or traditional form-based collection" />
    </div>
    <p className="text-xs text-muted-foreground italic">💡 Use "Tour this page" in the header for a detailed walkthrough</p>
  </div>
);

const QuickAnalyticsOverviewContent = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Track your widget's performance at a glance:</p>
    <div className="space-y-2.5">
      <FeatureItem icon={<BarChart3 className="h-3.5 w-3.5 text-primary" />} label="Top Pages" description="See which pages drive the most conversations" />
      <FeatureItem icon={<Sparkles className="h-3.5 w-3.5 text-primary" />} label="Opens & Escalations" description="Measure AI effectiveness and staffing needs" />
    </div>
  </div>
);

const QuickWidgetOverviewContent = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Customize your chat widget and go live:</p>
    <div className="space-y-2.5">
      <FeatureItem icon={<Palette className="h-3.5 w-3.5 text-primary" />} label="Appearance" description="Icon, color, welcome message, and launcher effects" />
      <FeatureItem icon={<Code className="h-3.5 w-3.5 text-primary" />} label="Embed Code" description="Copy one snippet to your site and you're live" />
      <FeatureItem icon={<MessageCircle className="h-3.5 w-3.5 text-primary" />} label="Live Preview" description="See exactly how your widget looks on desktop and mobile" />
    </div>
    <p className="text-xs text-muted-foreground italic">💡 Use "Tour this page" for a step-by-step customization walkthrough</p>
  </div>
);

const QuickSalesforceOverviewContent = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Your CRM integration hub:</p>
    <div className="space-y-2.5">
      <FeatureItem icon={<Users className="h-3.5 w-3.5 text-cyan-500" />} label="Visitor Leads" description="View all chat leads with contact info and export status" />
      <FeatureItem icon={<Cloud className="h-3.5 w-3.5 text-cyan-500" />} label="Salesforce Sync" description="Connect your account, map fields, and enable auto-export" />
    </div>
    <p className="text-xs text-muted-foreground italic">💡 Use "Tour this page" for detailed setup instructions</p>
  </div>
);

const QuickNotificationsOverviewContent = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Get alerted when it matters:</p>
    <div className="space-y-2.5">
      <FeatureItem icon={<Share2 className="h-3.5 w-3.5 text-amber-500" />} label="Slack" description="Connect your workspace and choose triggers for instant alerts" />
      <FeatureItem icon={<Mail className="h-3.5 w-3.5 text-amber-500" />} label="Email" description="Add team recipients and control which events trigger notifications" />
    </div>
    <p className="text-xs text-muted-foreground italic">💡 Use "Tour this page" for channel-by-channel setup</p>
  </div>
);

const QuickPropertiesOverviewContent = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Manage all the websites where your chat widget lives:</p>
    <div className="space-y-2.5">
      <FeatureItem icon={<Building2 className="h-3.5 w-3.5 text-primary" />} label="Property Cards" description="Each card shows a website with its domain and widget color" />
      <FeatureItem icon={<Globe className="h-3.5 w-3.5 text-primary" />} label="Multi-Site" description="Deploy chat widgets across multiple websites from one dashboard" />
      <FeatureItem icon={<Plus className="h-3.5 w-3.5 text-primary" />} label="Add Properties" description="Add new websites and configure them in seconds" />
    </div>
    <p className="text-xs text-muted-foreground italic">💡 Use "Tour this page" in the header for a detailed walkthrough</p>
  </div>
);

const QuickTeamOverviewContent = () => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Manage your human agents:</p>
    <div className="space-y-2.5">
      <FeatureItem icon={<Users className="h-3.5 w-3.5 text-blue-500" />} label="Team Hub" description="View agents, their status, and assigned properties" />
      <FeatureItem icon={<Settings className="h-3.5 w-3.5 text-blue-500" />} label="Onboard Agents" description="Create accounts instantly or send email invitations" />
      <FeatureItem icon={<Bot className="h-3.5 w-3.5 text-blue-500" />} label="AI Linking" description="Create AI personas that mirror agents for offline coverage" />
    </div>
  </div>
);

// ─── Custom Tooltip ──────────────────────────────────────────────────

const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  size,
  onNavigatePhase,
  tourPhase,
  tourMode,
}: TooltipRenderProps & {
  onNavigatePhase: (phase: string) => void;
  tourPhase: string;
  tourMode: string;
}) => {
  const isAISettings = step.data?.isAISettings;
  const isPropertiesSidebar = step.data?.isPropertiesSidebar;
  const isAnalyticsSidebar = step.data?.isAnalyticsSidebar;
  const isWidgetCodeSidebar = step.data?.isWidgetCodeSidebar;
  const isSalesforceSidebar = step.data?.isSalesforceSidebar;
  const isNotificationsSidebar = step.data?.isNotificationsSidebar;
  const isTeamSidebar = step.data?.isTeamSidebar;

  // Check for quick tour merged content types
  const isQuickWelcome = step.data?.isQuickWelcome;
  const isQuickPropertiesOverview = step.data?.isQuickPropertiesOverview;
  const isQuickAIOverview = step.data?.isQuickAIOverview;
  const isQuickAnalyticsOverview = step.data?.isQuickAnalyticsOverview;
  const isQuickWidgetOverview = step.data?.isQuickWidgetOverview;
  const isQuickSalesforceOverview = step.data?.isQuickSalesforceOverview;
  const isQuickNotificationsOverview = step.data?.isQuickNotificationsOverview;
  const isQuickTeamOverview = step.data?.isQuickTeamOverview;

  // Determine sidebar transition targets
  const isSidebarTransition = isPropertiesSidebar || isAISettings || isAnalyticsSidebar || isWidgetCodeSidebar || isSalesforceSidebar || isNotificationsSidebar || isTeamSidebar;

  const getTransitionPhase = () => {
    if (isPropertiesSidebar) return 'properties';
    if (isAISettings) return 'ai-support';
    if (isAnalyticsSidebar) return 'analytics';
    if (isWidgetCodeSidebar) return 'widget-code';
    if (isSalesforceSidebar) return 'salesforce';
    if (isNotificationsSidebar) return 'notifications';
    if (isTeamSidebar) return 'team';
    return '';
  };

  const getTransitionLabel = () => {
    if (isPropertiesSidebar) return 'Tour Properties';
    if (isAISettings) return 'Tour AI Settings';
    if (isAnalyticsSidebar) return 'View Analytics';
    if (isWidgetCodeSidebar) return 'Tour Widget';
    if (isSalesforceSidebar) return 'Tour Salesforce';
    if (isNotificationsSidebar) return 'Tour Notifications';
    if (isTeamSidebar) return 'Tour Team';
    return 'Next';
  };

  const getTransitionIcon = () => {
    if (isPropertiesSidebar) return <Building2 className="h-4 w-4 text-orange-500" />;
    if (isAISettings) return <Sparkles className="h-4 w-4 text-primary" />;
    if (isAnalyticsSidebar) return <BarChart3 className="h-4 w-4 text-primary" />;
    if (isWidgetCodeSidebar) return <Code className="h-4 w-4 text-green-500" />;
    if (isSalesforceSidebar) return <Cloud className="h-4 w-4 text-cyan-500" />;
    if (isNotificationsSidebar) return <Bell className="h-4 w-4 text-amber-500" />;
    if (isTeamSidebar) return <Users className="h-4 w-4 text-blue-500" />;
    return null;
  };

  const getTransitionDescription = () => {
    if (isPropertiesSidebar) return "View and manage all your websites in one place. Add new properties or remove existing ones.";
    if (isAISettings) return "Customize your AI's tone, style, and conversation approach to match your brand voice.";
    if (isAnalyticsSidebar) return "See which pages drive the most conversations and how often AI escalates to human agents.";
    if (isWidgetCodeSidebar) return "Customize your chat widget's appearance and get the embed code to add it to your website.";
    if (isSalesforceSidebar) return "Connect Salesforce to automatically export visitor leads and track Google Ads conversions.";
    if (isNotificationsSidebar) return "Get instant alerts via email or Slack when new conversations start or escalate.";
    if (isTeamSidebar) return "Manage human agents, create accounts or send invitations, and link AI personas to team members.";
    return '';
  };

  const renderContent = () => {
    // Quick tour merged content
    if (isQuickWelcome) return <QuickWelcomeContent />;
    if (isQuickPropertiesOverview) return <QuickPropertiesOverviewContent />;
    if (isQuickAIOverview) return <QuickAIOverviewContent />;
    if (isQuickAnalyticsOverview) return <QuickAnalyticsOverviewContent />;
    if (isQuickWidgetOverview) return <QuickWidgetOverviewContent />;
    if (isQuickSalesforceOverview) return <QuickSalesforceOverviewContent />;
    if (isQuickNotificationsOverview) return <QuickNotificationsOverviewContent />;
    if (isQuickTeamOverview) return <QuickTeamOverviewContent />;

    // Sidebar transition steps (used in both quick and deep dive)
    if (isSidebarTransition) {
      const icon = getTransitionIcon();
      const description = getTransitionDescription();
      const colorClass = isPropertiesSidebar ? 'orange-500' :
        isAISettings || isAnalyticsSidebar ? 'primary' : 
        isWidgetCodeSidebar ? 'green-500' : 
        isSalesforceSidebar ? 'cyan-500' : 
        isNotificationsSidebar ? 'amber-500' : 'blue-500';

      return (
        <div className="space-y-4">
          <div className={`flex items-start gap-3 p-3 rounded-lg bg-${colorClass}/5 border border-${colorClass}/10`}>
            <div className={`p-2 rounded-full bg-${colorClass}/10`}>
              {icon}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      );
    }

    // Default text content
    return <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>;
  };

  return (
    <div
      {...tooltipProps}
      className="bg-background rounded-2xl shadow-2xl max-w-sm overflow-hidden border border-border/50"
    >
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${((index + 1) / size) * 100}%` }}
        />
      </div>
      
      <div className="p-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {tourMode === 'deep' ? `Detail ${index + 1} of ${size}` : `Step ${index + 1} of ${size}`}
          </span>
          {tourMode === 'deep' && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Deep Dive
            </span>
          )}
        </div>
        
        {step.title && (
          <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
        )}
        
        {renderContent()}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
          <button
            {...skipProps}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {tourMode === 'deep' ? 'Close' : 'Skip Tour'}
          </button>
          <div className="flex items-center gap-3">
            {index > 0 && (
              <button
                {...backProps}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
              >
                Back
              </button>
            )}
            <Button
              {...primaryProps}
              size="sm"
              className="gap-1.5 px-4"
              onClick={isSidebarTransition && tourMode !== 'deep'
                ? () => onNavigatePhase(getTransitionPhase())
                : primaryProps.onClick
              }
            >
              {isSidebarTransition && tourMode !== 'deep'
                ? getTransitionLabel()
                : isLastStep
                  ? (tourMode === 'deep' ? 'Done' : 'Finish Tour!')
                  : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────

export const DashboardTour = ({ onComplete }: DashboardTourProps) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setCollapsed } = useSidebarState();

  const tourPhase = searchParams.get('tourPhase') || 'dashboard';
  const tourMode = searchParams.get('tourMode') || 'quick'; // 'quick' or 'deep'
  const deepSection = searchParams.get('deepSection') || '';

  // Build current steps based on mode and phase
  const currentSteps = useMemo(() => {
    if (tourMode === 'deep' && deepSection) {
      return deepDiveStepsMap[deepSection] || [];
    }

    // Quick tour steps by phase
    switch (tourPhase) {
      case 'properties': return quickPropertiesSteps;
      case 'ai-support': return quickAISupportSteps;
      case 'analytics': return quickAnalyticsSteps;
      case 'widget-code': return quickWidgetSteps;
      case 'salesforce': return quickSalesforceSteps;
      case 'notifications': return quickNotificationsSteps;
      case 'team': return quickTeamSteps;
      default: return quickDashboardSteps;
    }
  }, [tourPhase, tourMode, deepSection]);

  // Start tour when params are set
  useEffect(() => {
    const shouldStartTour = searchParams.get('tour') === '1';
    if (shouldStartTour) {
      setCollapsed(false);
      const timer = setTimeout(() => {
        setRun(true);
        setStepIndex(0);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [searchParams, location.pathname, setCollapsed]);

  // Phase navigation map for quick tour
  const phaseNavigationMap: Record<string, string> = {
    'properties': '/dashboard/properties?tour=1&tourPhase=properties',
    'ai-support': '/dashboard/ai-support?tour=1&tourPhase=ai-support',
    'analytics': '/dashboard/analytics?tour=1&tourPhase=analytics',
    'widget-code': '/dashboard/widget?tour=1&tourPhase=widget-code',
    'salesforce': '/dashboard/salesforce?tour=1&tourPhase=salesforce',
    'notifications': '/dashboard/notifications?tour=1&tourPhase=notifications',
    'team': '/dashboard/team?tour=1&tourPhase=team',
  };

  const handleNavigatePhase = (phase: string) => {
    setRun(false);
    const path = phaseNavigationMap[phase];
    if (path) {
      navigate(path);
    }
  };

  const endTour = async () => {
    setRun(false);
    searchParams.delete('tour');
    searchParams.delete('tourPhase');
    searchParams.delete('tourMode');
    searchParams.delete('deepSection');
    setSearchParams(searchParams, { replace: true });

    if (tourMode === 'quick' && user) {
      await supabase
        .from('profiles')
        .update({ dashboard_tour_complete: true })
        .eq('user_id', user.id);
    }
  };

  const scrollTargetIntoView = (stepTarget: string): Promise<void> => {
    return new Promise((resolve) => {
      const el = document.querySelector(stepTarget);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(resolve, 600);
      } else {
        resolve();
      }
    });
  };

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action, type, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);

      // Quick tour: check if we've completed the current phase
      if (tourMode !== 'deep' && nextIndex >= currentSteps.length && action !== ACTIONS.PREV) {
        const phaseOrder = ['dashboard', 'properties', 'ai-support', 'analytics', 'widget-code', 'salesforce', 'notifications', 'team'];
        const currentIdx = phaseOrder.indexOf(tourPhase);
        
        if (currentIdx >= 0 && currentIdx < phaseOrder.length - 1) {
          // Navigate to next phase
          const nextPhase = phaseOrder[currentIdx + 1];
          handleNavigatePhase(nextPhase);
          return;
        } else {
          // Final phase completed — show celebration
          await endTour();
          setShowCelebration(true);
          return;
        }
      }

      // Deep dive: completed all steps
      if (tourMode === 'deep' && nextIndex >= currentSteps.length && action !== ACTIONS.PREV) {
        await endTour();
        onComplete?.();
        return;
      }

      // Handle tab-click steps
      const currentStep = currentSteps[index];
      const nextStep = currentSteps[nextIndex];

      let tabStep = currentStep?.data?.isClickRequired ? currentStep : null;
      let targetNextStep = nextStep;
      let targetNextIndex = nextIndex;

      if (!tabStep && type === EVENTS.TARGET_NOT_FOUND) {
        const prevStep = currentSteps[index - 1];
        if (prevStep?.data?.isClickRequired) {
          tabStep = prevStep;
          targetNextStep = currentStep;
          targetNextIndex = index;
        }
      }

      if (tabStep && action !== ACTIONS.PREV) {
        const clickTarget = tabStep.data?.clickTarget || tabStep.target;
        const tabSelector = typeof clickTarget === 'string' && clickTarget.startsWith('[')
          ? clickTarget
          : `[data-tour="${clickTarget}"]`;
        const tabEl = document.querySelector(tabSelector) as HTMLButtonElement;
        if (tabEl) {
          const tabValue = tabStep.data?.tabValue || tabEl.getAttribute('value') || tabEl.getAttribute('data-value');
          if (tabValue) {
            window.dispatchEvent(new CustomEvent('tour-switch-tab', { detail: { tab: tabValue } }));
          }
          tabEl.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          if (targetNextStep?.target && typeof targetNextStep.target === 'string') {
            let attempts = 0;
            while (attempts < 15 && !document.querySelector(targetNextStep.target)) {
              await new Promise(resolve => setTimeout(resolve, 100));
              attempts++;
            }
          }
          setRun(false);
          setStepIndex(targetNextIndex);
          setTimeout(() => setRun(true), 200);
          return;
        }
      }

      // Scroll next target into view
      if (nextStep?.target && typeof nextStep.target === 'string') {
        setRun(false);
        await scrollTargetIntoView(nextStep.target);
        setStepIndex(nextIndex);
        setTimeout(() => setRun(true), 100);
      } else {
        setStepIndex(nextIndex);
      }
    }

    if (finishedStatuses.includes(status)) {
      if (tourMode === 'deep') {
        await endTour();
        onComplete?.();
        return;
      }

      if (tourPhase === 'team' && status === STATUS.FINISHED) {
        await endTour();
        setShowCelebration(true);
        return;
      }

      await endTour();
      onComplete?.();
    }
  };

  return (
    <>
      <Joyride
        steps={currentSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        hideCloseButton
        scrollToFirstStep
        scrollOffset={200}
        disableOverlayClose
        disableScrollParentFix={false}
        spotlightClicks
        callback={handleJoyrideCallback}
        tooltipComponent={(props) => (
          <CustomTooltip
            {...props}
            onNavigatePhase={handleNavigatePhase}
            tourPhase={tourPhase}
            tourMode={tourMode}
          />
        )}
        styles={{
          options: {
            primaryColor: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--background))',
            textColor: 'hsl(var(--foreground))',
            arrowColor: 'hsl(var(--background))',
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10000,
          },
          spotlight: {
            borderRadius: '12px',
          },
          beacon: {
            display: 'none',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: tourMode === 'deep' ? 'Done' : 'Finish Tour!',
          next: 'Next',
          skip: tourMode === 'deep' ? 'Close' : 'Skip Tour',
        }}
      />
      <TourCelebration
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
      />
    </>
  );
};
