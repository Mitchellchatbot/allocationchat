const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using ScaledBot, you agree to be bound by these Terms of 
            Service. If you do not agree to these terms, please do not use our service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            ScaledBot provides a chat widget solution that allows businesses to 
            communicate with their website visitors. Our service includes:
          </p>
          <ul>
            <li>Customizable chat widget for your website</li>
            <li>AI-powered automated responses</li>
            <li>Integration with third-party services like Slack</li>
            <li>Conversation management and analytics</li>
          </ul>

          <h2>3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul>
            <li>Provide accurate account information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Use the service in compliance with applicable laws</li>
            <li>Not misuse or attempt to exploit the service</li>
          </ul>

          <h2>4. Third-Party Integrations</h2>
          <p>
            When connecting third-party services like Slack, you authorize us to 
            send notifications on your behalf. You are responsible for ensuring 
            you have the necessary permissions within those third-party services.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            All content, features, and functionality of ScaledBot are owned by us 
            and are protected by intellectual property laws. You retain ownership 
            of your data and content.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            ScaledBot is provided "as is" without warranties of any kind. We are 
            not liable for any indirect, incidental, or consequential damages 
            arising from your use of the service.
          </p>

          <h2>7. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the service 
            at any time for violation of these terms. You may also terminate your 
            account at any time.
          </p>

          <h2>8. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the 
            service after changes constitutes acceptance of the new terms.
          </p>

          <h2>9. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us through 
            our support channels.
          </p>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <a href="/" className="underline hover:text-foreground">Back to Home</a>
        </div>
      </div>
    </div>
  );
};

export default Terms;
