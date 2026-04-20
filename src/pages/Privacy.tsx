const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            When you use ScaledBot and connect third-party services like Slack, we collect:
          </p>
          <ul>
            <li>Account information (email, name) when you sign up</li>
            <li>Chat conversations between visitors and your widget</li>
            <li>Integration tokens to send notifications to connected services</li>
            <li>Usage analytics to improve our service</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul>
            <li>Provide and maintain our chat widget service</li>
            <li>Send notifications to your connected Slack workspace</li>
            <li>Improve and personalize your experience</li>
            <li>Communicate with you about service updates</li>
          </ul>

          <h2>3. Third-Party Services</h2>
          <p>
            When you connect Slack or other third-party services, we store authentication 
            tokens securely to enable notifications. We only access the permissions you 
            explicitly grant during the connection process.
          </p>

          <h2>4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data, 
            including encryption in transit and at rest. Access tokens are stored 
            securely and are never exposed to unauthorized parties.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. You can request 
            deletion of your data at any time by contacting us.
          </p>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Disconnect third-party integrations at any time</li>
          </ul>

          <h2>7. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us 
            through our support channels.
          </p>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <a href="/" className="underline hover:text-foreground">Back to Home</a>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
