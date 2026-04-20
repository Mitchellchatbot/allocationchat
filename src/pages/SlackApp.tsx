import { MessageSquare, Bell, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SlackApp = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">ScaledBot for Slack</h1>
          <p className="text-xl text-muted-foreground">
            Get real-time notifications from your chat widget directly in Slack
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Instant Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Receive alerts when new conversations start or customers need help
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Escalation Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Get notified immediately when conversations are escalated to agents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Team Collaboration</h3>
              <p className="text-sm text-muted-foreground">
                Keep your entire team informed with shared Slack channel notifications
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <h2>How It Works</h2>
          <ol>
            <li>Connect your Slack workspace from the ScaledBot settings</li>
            <li>Choose which notifications you want to receive</li>
            <li>Select the Slack channel for notifications</li>
            <li>Start receiving real-time updates!</li>
          </ol>

          <h2>Features</h2>
          <ul>
            <li><strong>New Conversation Alerts</strong> - Know when visitors start chatting</li>
            <li><strong>Escalation Notifications</strong> - Never miss when a customer needs human support</li>
            <li><strong>Customizable Triggers</strong> - Choose exactly what notifications matter to you</li>
          </ul>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
            {" · "}
            <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SlackApp;
