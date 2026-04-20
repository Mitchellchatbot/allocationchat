export interface DocTopic {
  id: string;
  title: string;
  description: string;
  whatItDoes: string;
  detailedSections?: { heading: string; body: string }[];
  howToUse: string[];
  tips: string[];
  relatedTopics?: { title: string; path: string }[];
}

export interface DocSection {
  id: string;
  title: string;
  description: string;
  topics: DocTopic[];
}

export const documentationSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of Scaled Bot',
    topics: [
      {
        id: 'overview',
        title: 'Overview',
        description: 'Welcome to Scaled Bot - your AI-powered customer support solution.',
        whatItDoes: 'Scaled Bot helps you provide instant, 24/7 customer support through an intelligent chat widget on your website. It combines AI automation with human agent support to ensure your visitors always get the help they need.',
        detailedSections: [
          {
            heading: 'Why Scaled Bot Exists',
            body: 'Most businesses lose potential customers simply because they cannot respond fast enough. Studies show that 79% of visitors who start a live chat expect a response within 60 seconds, and over half will abandon a website entirely if they cannot get answers quickly. Scaled Bot was built to solve this exact problem — providing instant, intelligent responses around the clock so you never miss a conversation, a lead, or a sale.\n\nTraditional live chat tools require a human agent to be online at all times. That is expensive, hard to scale, and unrealistic for small and mid-size businesses. Scaled Bot flips this model by letting AI handle the majority of conversations while seamlessly handing off to human agents when the situation calls for it. The result is a support experience that feels personal, responsive, and always available — without the overhead of a full-time support team.'
          },
          {
            heading: 'How It Works',
            body: 'At its core, Scaled Bot is a chat widget that you embed on your website. When a visitor opens the widget and starts typing, the AI reads their message, references the base prompt and business information you have configured, and generates a helpful response in real time. The AI can answer frequently asked questions, collect visitor contact information, provide directions, share business hours, and much more — all without any human involvement.\n\nBehind the scenes, every conversation is logged in your inbox. You can monitor active chats, review closed conversations, and jump in at any time to take over from the AI. If the AI encounters a question it cannot confidently answer, or if a visitor uses certain keywords like "speak to a person," the system automatically escalates the conversation and notifies your team via Slack, email, or both.\n\nScaled Bot also includes powerful analytics so you can track how many conversations the AI resolves on its own, which pages generate the most chats, and how quickly your team responds to escalations. Over time, you can use these insights to refine your AI prompts, optimize your website content, and improve your overall customer experience.'
          },
          {
            heading: 'Key Concepts',
            body: 'Before diving into the setup process, it helps to understand a few key concepts that you will encounter throughout the platform.\n\nProperties are the websites where you deploy the chat widget. Each property has its own settings, team assignments, and conversation history. If you run multiple websites, you can manage them all from one account.\n\nThe Base Prompt is the set of instructions you give to the AI. It tells the bot who you are, what your business does, how to answer common questions, and what tone to use. A well-written base prompt is the single most important factor in how well your chatbot performs.\n\nAgents are the human team members who can respond to conversations. You can invite agents, assign them to specific properties, and even create AI personas based on real team members.\n\nEscalation is the process of handing a conversation from the AI to a human agent. This can happen automatically based on keywords, message count thresholds, or crisis detection.\n\nThe Widget is the chat bubble that appears on your website. You can customize its color, icon, greeting message, visual effects, and more to match your brand identity.'
          },
          {
            heading: 'Who Is Scaled Bot For?',
            body: 'Scaled Bot was originally designed for healthcare and treatment center websites, where timely responses can literally save lives. However, the platform is flexible enough to serve any business that needs to engage website visitors in real time — from real estate agencies and law firms to e-commerce stores and SaaS companies.\n\nIf your business receives inquiries through your website and you want to respond faster, capture more leads, and provide better support without hiring a full-time chat team, Scaled Bot is built for you. The platform includes specialized features like HIPAA-compliant data handling, insurance card collection, and Salesforce lead export that make it especially powerful for healthcare providers, but these features are entirely optional and can be disabled for non-healthcare use cases.'
          }
        ],
        howToUse: [
          'Create your first property (website) from the dashboard',
          'Customize your chat widget appearance and behavior',
          'Add team members to handle conversations',
          'Configure AI personas for automated responses',
          'Embed the widget on your website',
          'Monitor your inbox for incoming conversations',
          'Review analytics to continuously improve performance'
        ],
        tips: [
          'Start with one property to learn the system before adding more',
          'Test your widget thoroughly before going live',
          'Monitor conversations regularly to improve AI responses',
          'Set up Slack or email notifications so you never miss an escalation',
          'Review your base prompt weekly and update it based on real conversations'
        ],
        relatedTopics: [
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' },
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Onboarding Flow', path: '/documentation/getting-started/onboarding' }
        ]
      },
      {
        id: 'properties',
        title: 'Creating Properties',
        description: 'Set up websites to manage with Scaled Bot.',
        whatItDoes: 'Properties represent the websites where you want to deploy chat support. Each property has its own widget settings, team assignments, and conversation history. You can create as many properties as your subscription allows, making it easy to manage multiple websites from a single account.',
        detailedSections: [
          {
            heading: 'Understanding Properties',
            body: 'In Scaled Bot, a "property" is the fundamental unit of organization. Each property corresponds to one website or web application where you want to deploy the chat widget. When you create a property, the system generates a unique identifier that links your widget configuration, AI settings, team assignments, conversation history, and analytics to that specific website.\n\nThis architecture means that every aspect of your chat experience is scoped to a single property. Your dental practice website can have a warm, empathetic AI tone with insurance-related lead capture, while your consulting firm website can have a professional, direct tone focused on scheduling calls — all managed from the same Scaled Bot account.'
          },
          {
            heading: 'When to Create Multiple Properties',
            body: 'You should create a separate property for each distinct website or business unit that needs its own chat experience. Common scenarios include managing multiple business locations that each have their own website, running different brands under the same parent company, separating your main website from a landing page or microsite, or providing white-label chat support for clients if you are an agency.\n\nHowever, if you have a single website with multiple pages, you do not need multiple properties. One property covers your entire domain, and the widget will appear on every page where the embed code is installed. You can use page analytics to see which pages generate the most conversations without needing separate properties for each page.'
          },
          {
            heading: 'Property Settings and Configuration',
            body: 'Once a property is created, you can configure a wide range of settings that control how the chat widget behaves on that specific website. These settings include the widget color, icon style, greeting message, and offline message that visitors see. You can also configure the AI base prompt, escalation rules, lead capture fields, proactive messaging, geo-filtering, and humanization features — all independently for each property.\n\nTeam assignments are also property-specific. When you invite an agent, you choose which properties they have access to. Agents only see conversations from their assigned properties, which helps you organize workloads across different websites or departments. This is especially useful if you have specialized teams for different business lines.\n\nAnalytics and conversation history are also separated by property, giving you clean, per-website metrics. You can compare performance across properties to understand which websites generate the most engagement, which AI prompts work best, and where your team spends the most time.'
          },
          {
            heading: 'Property Deletion and Data',
            body: 'If you no longer need a property, you can delete it from the properties management page. Deleting a property is a permanent action — it removes all associated conversations, visitor data, team assignments, and widget configurations. You will be asked to confirm this action before it proceeds. If you have compliance requirements such as HIPAA, make sure you have exported or archived any necessary data before deleting a property.\n\nIf you simply want to stop the widget from appearing on a website without losing your data, you can remove the embed code from your site instead of deleting the property. This preserves all your conversation history and settings in case you want to re-enable the widget later.'
          }
        ],
        howToUse: [
          'Click "Add Property" from any property selector or the properties management page',
          'Enter your property name — use something descriptive like "Main Website" or "NYC Office"',
          'Enter your domain (e.g., "example.com") — this is the website where the widget will appear',
          'Click "Create Property" to save and generate your property',
          'Configure widget settings, AI prompt, and team assignments for the new property',
          'Copy the embed code and install it on your website',
          'Test the widget by visiting your website and starting a conversation'
        ],
        tips: [
          'Use descriptive names to easily identify properties — especially if you manage several websites',
          'You can manage multiple websites from one account without switching logins',
          'Each property can have different widget colors, AI prompts, and team assignments',
          'The property selector in the sidebar lets you quickly switch between websites',
          'Delete a property only after exporting any data you need — the action is permanent'
        ],
        relatedTopics: [
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Team Assignments', path: '/documentation/team/property-assignments' },
          { title: 'Business Info', path: '/documentation/account/business-info' }
        ]
      },
      {
        id: 'onboarding',
        title: 'Onboarding Flow',
        description: 'The guided setup wizard for new accounts.',
        whatItDoes: 'When you first sign up, the onboarding flow walks you through setting up your account step by step. You\'ll choose an AI personality tone, create your first property, and configure basic settings so you\'re ready to go.',
        detailedSections: [
          {
            heading: 'The Onboarding Experience',
            body: 'The onboarding wizard is designed to get you from zero to a fully functional chatbot in under five minutes. Rather than dropping you into a complex dashboard and expecting you to figure things out, the wizard guides you through each essential step in a logical sequence. By the time you finish, you will have a configured AI persona, a property linked to your website, and a base prompt that is already tailored to your business.\n\nThe wizard begins by asking you to choose an AI tone preset. There are four options — Emily (warm and empathetic), Michael (professional and direct), Daniel (friendly and casual), and Sarah (knowledgeable and supportive). Each preset comes with a pre-written base prompt, an avatar, and tone-specific instructions that the AI follows when responding to visitors. You can always change or refine these later, but choosing a starting point helps you get up and running quickly.'
          },
          {
            heading: 'Website Extraction',
            body: 'One of the most powerful features of onboarding is automatic website extraction. After you enter your domain name, Scaled Bot visits your website and pulls key information — your business name, description, services offered, contact details, and even brand colors. This data is used to pre-fill your base prompt and widget color settings, saving you significant setup time.\n\nThe extraction is not perfect for every website, and you should always review the generated prompt and settings before going live. However, for most businesses, it provides an excellent starting point that captures 70-80% of the information the AI needs to respond accurately. You can then refine the prompt by adding specific details like pricing, FAQs, accepted insurance plans, or unique selling points.'
          },
          {
            heading: 'Completing vs Skipping Onboarding',
            body: 'While the onboarding wizard is the fastest way to get started, it is entirely optional. If you skip onboarding, you can set up every single feature manually from the dashboard. Properties can be created from the properties page, AI prompts can be written in AI Support settings, and widget colors can be configured in the widget customization section.\n\nHowever, we strongly recommend completing onboarding for your first property. The wizard handles several tasks simultaneously — creating the property, setting the AI persona, generating the base prompt, and configuring initial widget settings — that would otherwise require visiting multiple pages. Once you are familiar with the platform, subsequent properties can be added manually if you prefer more control over the setup process.\n\nAfter onboarding completes, you are taken directly to your dashboard where the interactive tour begins. The tour walks you through the key areas of the interface so you know where to find everything. Together, onboarding and the dashboard tour ensure you are fully oriented before your first real conversation arrives.'
          }
        ],
        howToUse: [
          'Sign up for a new account to start onboarding automatically',
          'Choose an AI tone preset (Emily, Michael, Daniel, or Sarah)',
          'Enter your business name and website domain',
          'Wait for the system to extract information from your website',
          'Review the suggested base prompt and customize it as needed',
          'Confirm your widget color and settings',
          'Complete the wizard to land on your dashboard'
        ],
        tips: [
          'You can always change your AI tone and settings later in AI Support',
          'The onboarding wizard extracts info from your website to pre-fill settings',
          'If you skip onboarding, you can still set everything up manually from settings',
          'Review the auto-generated base prompt carefully — add specific FAQs and service details',
          'The tone you choose during onboarding is just a starting point, not a permanent decision'
        ],
        relatedTopics: [
          { title: 'Overview', path: '/documentation/getting-started/overview' },
          { title: 'Dashboard Tour', path: '/documentation/getting-started/dashboard-tour' },
          { title: 'AI Tone Presets', path: '/documentation/ai-support/tone-presets' }
        ]
      },
      {
        id: 'dashboard-tour',
        title: 'Dashboard Tour',
        description: 'The interactive guided tour of your dashboard.',
        whatItDoes: 'After onboarding, an interactive guided tour highlights key areas of your dashboard. It walks you through the sidebar, inbox, AI settings, and other features with step-by-step tooltips so you know where everything is.',
        detailedSections: [
          {
            heading: 'How the Tour Works',
            body: 'The dashboard tour uses highlighted tooltips that point to specific interface elements and explain what they do. Each tooltip includes a brief description and a "Next" button that advances you to the next step. The tour is designed to follow the natural workflow of the platform — starting with the sidebar navigation, moving through the inbox, then covering AI settings, notifications, and other key areas.\n\nThe tour automatically navigates you between pages as needed. For example, when it highlights the inbox, it takes you to the inbox page. When it explains AI settings, it navigates to the AI Support page. This means you do not need to manually find each feature — the tour brings you there and explains what you are looking at.'
          },
          {
            heading: 'Quick Tour vs Deep Dive Tours',
            body: 'There are two types of tours in Scaled Bot. The Quick Tour is the initial walkthrough that covers the entire dashboard at a high level. It touches on the most important features — sidebar navigation, inbox, AI support, notifications, widget settings, and team management — in about 8-10 steps. This gives you a bird\'s-eye view of the platform.\n\nDeep Dive Tours are page-specific tours that go into more detail about individual features. For example, the AI Support page has its own deep dive tour that explains each setting — base prompt, humanization features, escalation rules, lead capture, and more — in granular detail. You can trigger deep dive tours by clicking the "Tour this page" button that appears on supported pages.\n\nBoth tour types remember your progress. Once you complete the Quick Tour, it will not show again automatically. However, you can always re-trigger it from the help menu if you want a refresher or if you are training a new team member.'
          },
          {
            heading: 'Celebration and Completion',
            body: 'When you complete the Quick Tour, a celebration moment is triggered — confetti fills the screen and a congratulatory message appears. This is a small but intentional design choice to mark the transition from setup to active use. After the celebration, you are fully oriented and ready to start receiving and managing conversations.\n\nIf you dismiss the tour before completing it, the system remembers where you left off. The next time you log in, the tour may prompt you to continue from the step you stopped at. If you prefer to skip the tour entirely, you can dismiss it and explore the platform on your own — every feature is always accessible from the sidebar navigation.'
          }
        ],
        howToUse: [
          'The tour starts automatically after completing onboarding',
          'Follow the highlighted tooltips as they point to each feature',
          'Click "Next" to advance through tour steps',
          'The tour navigates you between pages automatically',
          'Complete the tour to unlock a celebration confetti moment',
          'Use "Tour this page" buttons for deep-dive tours on specific pages',
          'You can revisit the tour from the help menu if needed'
        ],
        tips: [
          'Don\'t skip the tour on your first visit — it covers features you might miss',
          'Each page may have its own deep-dive mini-tour for detailed guidance',
          'The tour remembers your progress so you won\'t see it again once completed',
          'Use the tour to train new team members — it explains every feature clearly'
        ],
        relatedTopics: [
          { title: 'Onboarding Flow', path: '/documentation/getting-started/onboarding' },
          { title: 'Overview', path: '/documentation/getting-started/overview' }
        ]
      },
      {
        id: 'workspaces',
        title: 'Workspaces',
        description: 'Switch between and manage workspaces.',
        whatItDoes: 'Workspaces let you organize multiple businesses or client accounts under one login. Each workspace has its own properties, team members, and settings. You can switch between workspaces from the sidebar.',
        detailedSections: [
          {
            heading: 'What Workspaces Are For',
            body: 'Workspaces provide a layer of organization above properties. While properties represent individual websites, workspaces represent entire businesses, brands, or client accounts. If you are a single business owner with one or two websites, you may only ever need one workspace. But if you manage multiple businesses, operate an agency serving multiple clients, or want to keep different ventures completely separated, workspaces give you that flexibility.\n\nEach workspace is fully isolated. Properties, team members, conversations, analytics, and settings in one workspace are completely invisible to another. This means you can manage a healthcare client and a real estate client from the same Scaled Bot login without any data crossing over. Agents invited to one workspace do not automatically have access to another — you must invite them separately to each workspace they need to work in.'
          },
          {
            heading: 'Switching and Managing Workspaces',
            body: 'The workspace switcher is located at the top of the sidebar. Clicking it reveals a dropdown showing all workspaces you have access to, along with an option to create a new one. Switching between workspaces is instant — there is no logout or page reload required. When you switch, the sidebar, property selector, inbox, and all other views update immediately to reflect the selected workspace.\n\nYour personal profile settings — such as your name, avatar, and email — carry across all workspaces. This means you only need to set up your profile once, and it will appear consistently regardless of which workspace you are working in. However, workspace-specific settings like notification preferences and property configurations are scoped to each workspace individually.\n\nCreating a new workspace is straightforward. Click "Create Workspace" from the switcher, give it a name, and you are ready to start adding properties and inviting team members. There is no limit to the number of workspaces you can create, though each workspace\'s properties count toward your overall subscription limits.'
          }
        ],
        howToUse: [
          'Click the workspace switcher at the top of the sidebar',
          'Select an existing workspace to switch to it instantly',
          'Click "Create Workspace" to set up a new one',
          'Each workspace has its own properties, team, and settings',
          'Invite agents to specific workspaces as needed',
          'Your personal settings (profile, avatar) carry across all workspaces'
        ],
        tips: [
          'Use workspaces to separate different businesses or clients',
          'Agents can be invited to specific workspaces independently',
          'Switching workspaces is instant — no need to log out',
          'Workspace data is fully isolated — nothing crosses between workspaces',
          'Name your workspaces clearly to avoid confusion when switching'
        ],
        relatedTopics: [
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' },
          { title: 'Account Settings', path: '/documentation/account/account-settings' }
        ]
      }
    ]
  },
  {
    id: 'chatbot-manual',
    title: 'Chatbot User Manual',
    description: 'Step-by-step guide to setting up and optimizing your chatbot',
    topics: [
      {
        id: 'going-live',
        title: 'Getting Your Chatbot Live',
        description: 'End-to-end checklist from property creation to embedding the widget on your website.',
        whatItDoes: 'This guide walks you through every step needed to launch your chatbot — from creating a property in Scaled Bot, configuring basic settings, generating your embed code, and pasting it into your website. By the end, your visitors will see a fully functional chat widget on your site.',
        detailedSections: [
          {
            heading: 'Pre-Launch Preparation',
            body: 'Before you paste a single line of code on your website, there are a few things you should have ready. First, make sure you have completed the onboarding wizard or manually created at least one property. Your property should have a name that matches the website it represents and the correct domain entered.\n\nNext, take time to write a thorough base prompt. This is the instruction set that the AI uses to generate every response. A vague prompt like "help visitors" will produce generic, unhelpful answers. Instead, include specific information about your business — your services, pricing, hours, location, accepted insurance plans, FAQs, and any boundaries the AI should respect. The more specific your prompt, the fewer conversations will need to be escalated to a human agent.\n\nFinally, configure your notification channels. You need at least one way to know when conversations are happening — whether that is Slack, email, or both. Without notifications, you risk missing conversations entirely, especially escalated ones where the AI needs human backup.'
          },
          {
            heading: 'Widget Configuration Checklist',
            body: 'Once your property and base prompt are set, walk through the widget configuration settings. Start with the visual appearance: choose a widget color that matches your brand, select an icon style, and write a greeting message that visitors will see when they open the chat window. The greeting sets the tone for the conversation, so make it welcoming and relevant — something like "Hi! How can we help you today?" works well for most businesses.\n\nSet an offline message for when your team is not available. This message should let visitors know their inquiry was received and provide an alternative contact method, such as a phone number or email address. You can also configure proactive messaging to automatically reach out to visitors after they have been on your site for a specified number of seconds.\n\nDo not forget about lead capture settings. Decide whether to require visitors to provide their name, phone, or email before starting a chat, or whether you prefer natural lead capture where the AI asks for this information during the conversation. For most businesses, requiring a name and phone number upfront strikes the right balance between capturing leads and reducing friction.'
          },
          {
            heading: 'Installing the Embed Code',
            body: 'When you are ready to go live, navigate to the Widget Embed page from the sidebar. You will see a code snippet that looks similar to a standard JavaScript tag. Copy the entire snippet and paste it into your website\'s HTML, just before the closing body tag. This ensures the widget loads after your main content, preventing any impact on page load speed.\n\nIf you use a content management system like WordPress, Squarespace, or Wix, you can usually add the code through the custom code or footer injection settings. For WordPress, many themes have a "Header/Footer Scripts" option in the customizer. For Squarespace, go to Settings, then Advanced, then Code Injection, and paste the snippet in the Footer section.\n\nAfter adding the code, publish your website changes and visit your site in a new browser tab. You should see the chat widget icon in the bottom-right corner. Click it to open the chat window and send a test message. Verify that the AI responds appropriately and that the conversation appears in your Scaled Bot inbox. If everything looks good, you are live.'
          },
          {
            heading: 'Post-Launch Best Practices',
            body: 'Going live is just the beginning. During your first week, monitor conversations closely. Read through the AI responses and note any questions it struggles with or answers incorrectly. Add those answers to your base prompt. This iterative process is how you build a chatbot that truly understands your business.\n\nPay attention to your analytics dashboard. Track how many conversations the AI resolves on its own versus how many get escalated. A healthy AI resolution rate is between 60-80%. If your rate is significantly lower, your base prompt needs more detail. If it is above 80%, you might be able to reduce your human agent staffing during off-peak hours.\n\nAlso test the widget on mobile devices. More than half of website visitors browse on their phones, and the chat widget should look and function well on smaller screens. Check that the widget opens smoothly, text is readable, and visitors can type and send messages without issues.'
          }
        ],
        howToUse: [
          'Create a new property from the dashboard — enter your business name and website domain',
          'Configure your greeting message and offline message in AI Support settings',
          'Set your widget color and icon to match your brand under Widget Customization',
          'Write or review your AI base prompt so the bot knows how to respond',
          'Go to Widget Embed in the sidebar and copy the embed code snippet',
          'Paste the snippet into your website\'s HTML, just before the closing </body> tag',
          'Visit your website and test the widget — send a message to confirm it works',
          'Invite team members so someone is available for live handoff when needed'
        ],
        tips: [
          'Test the widget on both desktop and mobile before announcing it to visitors',
          'Start with a simple base prompt and refine it after reviewing real conversations',
          'Use the Widget Preview page to see exactly how the chat bubble and window look before going live',
          'Make sure you have notifications (Slack or email) set up so you never miss a lead',
          'Monitor your first 50 conversations closely and update your base prompt based on what you learn'
        ],
        relatedTopics: [
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' },
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Widget Embed Code', path: '/documentation/widget/embed-code' },
          { title: 'Writing Your AI Base Prompt', path: '/documentation/chatbot-manual/base-prompt' }
        ]
      },
      {
        id: 'base-prompt',
        title: 'Writing Your AI Base Prompt',
        description: 'How to craft effective AI instructions for accurate, on-brand responses.',
        whatItDoes: 'The base prompt is a set of instructions you give to the AI that shapes every response it generates. It tells the bot what your business does, how to answer common questions, what tone to use, and what boundaries to respect. A well-written prompt means the AI can handle most conversations without human intervention.',
        detailedSections: [
          {
            heading: 'Why the Base Prompt Matters',
            body: 'The base prompt is arguably the single most important configuration in your entire Scaled Bot setup. Every word the AI generates is influenced by the instructions in your base prompt. If the prompt is vague, the AI will give vague answers. If the prompt is detailed and specific, the AI will respond with accuracy and confidence.\n\nThink of the base prompt as a training manual for a new employee. You would not hand someone a blank piece of paper and say "help visitors." You would give them a document that explains what your business does, what services you offer, how to answer common questions, what your hours are, what insurance you accept, and how to handle difficult situations. The base prompt serves the same purpose for the AI.\n\nBusinesses that invest time in writing a thorough base prompt see dramatically higher AI resolution rates — often resolving 70-80% of conversations without any human involvement. Businesses with thin prompts typically see resolution rates below 40%, meaning human agents need to step in for the majority of conversations.'
          },
          {
            heading: 'Anatomy of a Great Base Prompt',
            body: 'A strong base prompt typically contains several key sections. First, establish the AI\'s identity: "You are [Name], a friendly admissions coordinator for [Business Name], located in [City, State]." This gives the AI context about who it is and who it represents.\n\nNext, describe your services in detail. Do not just list categories — include specifics. Instead of "We offer treatment programs," write "We offer residential inpatient treatment (30, 60, and 90-day programs), intensive outpatient (IOP) with evening sessions three nights per week, partial hospitalization (PHP) from 9am-3pm Monday through Friday, and medically assisted detox with 24/7 nursing care."\n\nInclude a frequently asked questions section with actual answers. What are your hours? What insurance do you accept? What should someone bring? How long does treatment last? Can family visit? Is the facility co-ed? What happens after treatment? The more questions you answer in the prompt, the fewer will require human intervention.\n\nSet tone guidelines: "Be warm, empathetic, and non-judgmental. Use simple, conversational language. Avoid clinical jargon unless the visitor uses it first. Show compassion and understanding — many visitors are reaching out during difficult moments."\n\nFinally, define boundaries. Tell the AI what it should never do: "Never diagnose medical or mental health conditions. Never guarantee treatment outcomes. Never provide specific medical advice. If someone expresses suicidal thoughts or immediate danger, provide the 988 Suicide & Crisis Lifeline number and encourage them to call immediately."'
          },
          {
            heading: 'Iterating and Improving Over Time',
            body: 'Your base prompt should be a living document that you update regularly. The best way to improve it is to review real conversations. Look for patterns — are there questions that keep getting escalated? If the AI consistently cannot answer questions about insurance verification, add a detailed insurance section to your prompt.\n\nSet a weekly reminder to review 10-15 conversations from your inbox. Focus on escalated conversations and ones where the AI\'s response was not quite right. Add the correct answers to your prompt, and within a few weeks, you will notice a significant improvement in AI performance.\n\nAvoid making your prompt excessively long. While detail is important, a prompt over 2,000 words can actually dilute the AI\'s focus. If you find your prompt growing very long, consider whether some sections can be condensed or whether less important information can be removed. The goal is a focused, comprehensive prompt — not an exhaustive encyclopedia.'
          }
        ],
        howToUse: [
          'Go to AI Support from the sidebar and select your property',
          'Find the "Base Prompt" text area — this is where you write your instructions',
          'Start with who you are: "You are a helpful admissions coordinator for [Center Name], a substance abuse treatment facility in [City, State]."',
          'List your services: inpatient, outpatient, detox, MAT, PHP, IOP, etc.',
          'Include accepted insurances: "We accept BlueCross BlueShield, Aetna, Cigna, and most major PPOs."',
          'Add FAQs: visiting hours, program length, what to bring, family involvement',
          'Set tone guidance: "Be warm, empathetic, and non-judgmental. Use simple language."',
          'Define boundaries: "Never diagnose conditions. Never guarantee outcomes. Always encourage calling for urgent needs."',
          'Save and test by chatting with the widget in preview mode'
        ],
        tips: [
          'The more specific your prompt, the fewer escalations you\'ll need — include actual answers, not just topics',
          'Review real conversations weekly and add answers for questions the AI struggled with',
          'Use the onboarding wizard\'s auto-generated prompt as a starting point, then customize',
          'Keep your prompt under 2,000 words — overly long prompts can dilute focus'
        ],
        relatedTopics: [
          { title: 'AI Personas', path: '/documentation/ai-support/personas' },
          { title: 'Tone Presets', path: '/documentation/ai-support/tone-presets' },
          { title: 'Escalation & Crisis Detection', path: '/documentation/chatbot-manual/escalation' }
        ]
      },
      {
        id: 'lead-capture',
        title: 'Configuring Lead Capture',
        description: 'Collect visitor contact details through forms or natural conversation.',
        whatItDoes: 'Lead capture collects visitor information — name, phone, email, and optionally insurance card photos — so your team can follow up. You can require these fields upfront before the chat begins, or enable natural lead capture where the AI asks for details conversationally during the chat.',
        detailedSections: [
          {
            heading: 'Upfront Forms vs Natural Capture',
            body: 'There are two fundamentally different approaches to collecting visitor information, and each has its trade-offs. Upfront forms display a short questionnaire before the chat window opens, requiring visitors to provide their name, phone number, email, or other details before they can send their first message. This guarantees you get contact information for every conversation, but it also creates friction that can cause some visitors to abandon the chat before it even starts.\n\nNatural lead capture takes the opposite approach. The chat opens immediately with no forms, and the AI collects contact information conversationally — for example, saying "That\'s a great question! Before I look into that for you, could I get your name and a good number to reach you?" This feels less intrusive and tends to produce higher overall engagement, but there is a risk that some visitors will end the conversation before providing their details.\n\nFor most businesses, we recommend starting with minimal upfront requirements (just a name) and enabling natural lead capture for phone and email. This gives you the best of both worlds: a low-friction entry point combined with conversational data collection. If your business requires phone numbers for follow-up, requiring phone upfront is a reasonable trade-off since the visitors who provide it are typically higher-intent leads.'
          },
          {
            heading: 'Insurance Card Collection',
            body: 'For healthcare and treatment center websites, Scaled Bot includes the ability to request insurance card photos directly in the chat. When enabled, the AI can ask visitors to upload a photo of the front and back of their insurance card. This is incredibly valuable for treatment centers that need to verify insurance coverage before admitting a patient.\n\nThe insurance card upload feature works on both desktop and mobile. On mobile devices, visitors can take a photo directly with their camera, making the process seamless. Uploaded images are stored securely and associated with the visitor\'s record, where your team can access them from the Visitor Info panel.\n\nIf you enable insurance card collection, be aware of HIPAA implications. Insurance cards contain protected health information (PHI), and you should ensure your data retention and access controls are configured appropriately. Review the HIPAA Settings documentation for guidance on setting up compliant data handling.'
          },
          {
            heading: 'Managing and Following Up on Leads',
            body: 'Captured lead data is accessible in multiple places. During a conversation, you can see all collected visitor information in the Visitor Info panel on the right side of the chat. After the conversation ends, leads are stored in the Visitor Leads table under Settings, where you can search, filter, and review all captured contacts.\n\nFor businesses using Salesforce, leads can be automatically exported to your CRM based on configurable triggers — such as when a phone number is detected, when the conversation escalates, or when the conversation ends. This ensures your sales or admissions team has immediate access to lead data in the tools they already use.\n\nEstablish a follow-up process for captured leads. The most effective approach is to contact new leads within 5 minutes of their conversation. Studies show that response time is the single biggest factor in lead conversion — contacting a lead within 5 minutes is 21 times more effective than waiting 30 minutes. Use Slack or email notifications to alert your team the moment a new lead comes in.'
          }
        ],
        howToUse: [
          'Go to AI Support settings for your property',
          'Under "Lead Capture," toggle which fields to require: Name, Phone, Email',
          'Optionally enable "Require Insurance Card Photo" for insurance verification',
          'Choose between upfront forms (fields appear before chat starts) or natural capture (AI asks during conversation)',
          'If using natural capture, the AI will ask for contact info at natural points in the conversation',
          'Collected data appears in the Visitor Info panel when viewing conversations',
          'Export leads to Salesforce or view them in the Visitor Leads table'
        ],
        tips: [
          'Requiring too many fields upfront creates friction — phone + name is often enough to start',
          'Natural lead capture feels less intrusive and typically results in higher engagement',
          'Insurance card uploads are especially valuable for treatment centers to verify coverage quickly',
          'Review your Visitor Leads table regularly to ensure no leads are falling through the cracks',
          'Follow up with new leads within 5 minutes for the highest conversion rates'
        ],
        relatedTopics: [
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' },
          { title: 'Visitor Leads', path: '/documentation/account/visitor-leads' },
          { title: 'Salesforce Integration', path: '/documentation/integrations/salesforce' }
        ]
      },
      {
        id: 'humanization',
        title: 'Humanizing AI Responses',
        description: 'Make your chatbot feel like a real person with typos, delays, and natural cadence.',
        whatItDoes: 'Humanization features make the AI\'s responses feel more natural and less robotic. This includes injecting occasional typos, dropping apostrophes, adding realistic response delays, showing typing indicators, and enabling quick-reply behavior after the first message. Together, these features make visitors believe they\'re chatting with a real human.',
        detailedSections: [
          {
            heading: 'Why Humanization Matters',
            body: 'Visitors who believe they are chatting with a real person engage more deeply, share more information, and are more likely to convert. Research on chatbot interactions consistently shows that perceived humanness is one of the strongest predictors of user satisfaction and trust. When a chatbot responds instantly with perfectly formatted text, visitors immediately suspect they are talking to a bot — and many disengage.\n\nScaled Bot\'s humanization features address this by introducing subtle imperfections and timing patterns that mirror how a real person communicates through text. The goal is not to deceive visitors, but to create a conversational experience that feels natural and comfortable. People are simply more open and responsive when they feel they are communicating with someone who is genuinely engaged, not a machine spitting out canned responses.\n\nThe combination of multiple humanization features creates a compounding effect. A typo alone might not be convincing, but a typo combined with a realistic typing delay, followed by a slightly faster second response, creates a pattern that closely matches human chat behavior.'
          },
          {
            heading: 'Individual Humanization Features',
            body: 'Human Typos introduces occasional, realistic typos into AI responses. The typos are carefully designed to look natural — common keystroke errors like "teh" instead of "the" or "becasue" instead of "because." They appear at a rate of roughly one every 2-3 messages, which matches the typical error rate of someone typing quickly in a chat conversation.\n\nDrop Apostrophes removes apostrophes from contractions, turning "don\'t" into "dont" and "I\'m" into "Im." This creates a casual, text-message-style tone that feels authentic for informal conversations. It works especially well when combined with dropped capitalization, which converts all AI responses to lowercase.\n\nSmart Typing Indicator shows typing dots in the chat window for a duration that corresponds to the length of the AI\'s response. A short response shows typing dots for 1-2 seconds, while a longer response shows them for 4-6 seconds. This prevents the jarring experience of a long, detailed response appearing instantly.\n\nResponse Delays add a configurable pause between when the visitor sends a message and when the AI begins "typing." This simulates the time a real person would take to read the message, think about their response, and start typing. Delays of 2-5 seconds feel most realistic for most conversations.\n\nQuick Reply After First makes the AI respond faster after its initial message in a conversation. The first response uses the full configured delay, but subsequent messages are delivered more quickly — mimicking how a real person types faster once they are actively engaged in a conversation.'
          },
          {
            heading: 'Choosing the Right Combination',
            body: 'Not every business should enable all humanization features. The right combination depends on your brand voice and audience. Healthcare and professional services may want typing indicators and response delays without typos or dropped apostrophes — maintaining professionalism while still feeling natural. Consumer brands targeting younger demographics might enable everything for a casual, text-message feel.\n\nStart by enabling smart typing indicators and response delays — these are the most universally effective features and rarely feel out of place. Then gradually add typos and apostrophe dropping based on how you want your brand to sound. Test each combination by having a few conversations in preview mode and reading the responses aloud. If something feels off, adjust or disable that feature.\n\nThe preview widget is your best tool for dialing in humanization. Spend 15-20 minutes having realistic conversations and pay attention to how the timing and text feel. Small adjustments to delay ranges and typing speed can make a significant difference in overall naturalness.'
          }
        ],
        howToUse: [
          'Go to AI Support settings for your property',
          'Toggle "Human Typos" to occasionally insert realistic typos in AI responses',
          'Toggle "Drop Apostrophes" to mimic casual texting style (e.g., "dont" instead of "don\'t")',
          'Toggle "Drop Capitalization" for all-lowercase responses that feel like texting',
          'Enable "Smart Typing Indicator" to show realistic typing dots based on message length',
          'Set response delay ranges (min/max milliseconds) to simulate human reading and typing time',
          'Enable "Quick Reply After First" so the AI responds faster after the initial message, mimicking someone already at their keyboard'
        ],
        tips: [
          'Typos are injected at a realistic rate — roughly one every 2-3 messages — so it feels natural, not sloppy',
          'Combining apostrophe dropping with lowercase creates a very casual, text-message feel — great for younger audiences',
          'Response delays of 2-5 seconds feel most realistic for short messages; longer messages should take proportionally longer',
          'The typing indicator adjusts its duration based on the response length, making it look like the agent is actually composing'
        ],
        relatedTopics: [
          { title: 'Tone Presets', path: '/documentation/ai-support/tone-presets' },
          { title: 'Writing Your AI Base Prompt', path: '/documentation/chatbot-manual/base-prompt' },
          { title: 'Proactive Engagement', path: '/documentation/chatbot-manual/proactive' }
        ]
      },
      {
        id: 'escalation',
        title: 'Escalation & Crisis Detection',
        description: 'Automatic handoff triggers and crisis keyword alerts.',
        whatItDoes: 'Escalation settings control when the AI stops responding and hands the conversation to a human agent. This can happen based on keyword triggers (e.g., "speak to someone"), after a set number of AI messages, or automatically when crisis-related language is detected (suicidal ideation, self-harm). Crisis keywords trigger immediate notifications to your team.',
        detailedSections: [
          {
            heading: 'Understanding Escalation Triggers',
            body: 'Escalation is the mechanism by which a conversation transitions from AI-handled to human-handled. There are three types of escalation triggers in Scaled Bot, and they work together to ensure that the right conversations get human attention at the right time.\n\nKeyword-based escalation triggers when a visitor uses specific words or phrases like "talk to a person," "speak to someone," "real human," or "manager." You can customize this keyword list to match the language your visitors typically use. When a keyword match is detected, the AI immediately stops responding and your team is notified.\n\nMessage-count escalation triggers after the AI has sent a configurable number of messages without resolving the conversation. If a visitor and the AI go back and forth 10 times without reaching a resolution, it is likely that the AI cannot fully address the visitor\'s needs. Setting a reasonable message limit ensures these conversations get escalated before the visitor becomes frustrated.\n\nCrisis detection is a special, always-on escalation trigger that cannot be disabled. It monitors conversations for language related to suicidal ideation, self-harm, overdose, or other life-threatening situations. When crisis language is detected, the conversation is immediately escalated with a high-priority notification to your team. This feature is critical for healthcare and treatment center websites where visitors may be in acute distress.'
          },
          {
            heading: 'Configuring Escalation Settings',
            body: 'Finding the right escalation settings requires balancing two competing priorities: you want the AI to handle as many conversations as possible to reduce your team\'s workload, but you also want to ensure that complex or sensitive issues get human attention before the visitor gives up.\n\nFor the message count threshold, start with 8-12 messages. This gives the AI enough runway to address most questions while catching conversations that are going in circles. If your AI resolution rate is high and most escalations seem unnecessary, you can increase the threshold. If visitors frequently complain about not getting helpful answers, lower it.\n\nFor keyword triggers, include common phrases visitors use when they want human help. In addition to the obvious ones ("talk to a person," "speak to someone"), consider industry-specific phrases. For treatment centers, phrases like "I need help now," "is someone there," or "can I call you" often indicate a visitor who needs immediate human contact.\n\nWhen an escalation triggers, two things happen simultaneously: the AI stops generating responses for that conversation, and your team is notified through all configured channels (Slack, email, or both). The notification includes the visitor\'s name (if captured), the conversation context, and the reason for escalation. Agents can then open the conversation from the inbox and take over immediately.'
          },
          {
            heading: 'Using Escalation Data to Improve',
            body: 'Escalated conversations are one of your most valuable sources of information for improving your chatbot. Every escalation represents a gap — either in your base prompt\'s coverage, the AI\'s understanding, or the visitor\'s expectations. By reviewing escalated conversations regularly, you can identify patterns and fill those gaps.\n\nLook for recurring themes in escalated conversations. If five different visitors this week asked about insurance verification and the AI could not give a confident answer, that is a clear signal to add detailed insurance information to your base prompt. If visitors frequently escalate because they want to schedule an appointment, add a Calendly link and instructions for the AI to share it.\n\nTrack your escalation rate over time using the Analytics dashboard. A decreasing escalation rate means your base prompt improvements are working. If the rate suddenly increases, it might indicate a new marketing campaign bringing in visitors with questions your AI is not prepared for, or a change in your services that has not been reflected in the prompt yet.'
          }
        ],
        howToUse: [
          'Go to AI Support settings for your property',
          'Under "Escalation," toggle "Auto Escalation" on',
          'Set the maximum number of AI messages before automatic escalation (e.g., 10)',
          'Add custom escalation keywords like "talk to a person," "real human," "manager"',
          'Crisis keywords (suicidal, overdose, self-harm) are built in and always active',
          'When escalation triggers, the AI pauses and your team is notified via Slack and/or email',
          'Agents can take over the conversation from the inbox immediately'
        ],
        tips: [
          'Keep escalation message limits reasonable — too low and you waste agent time, too high and visitors feel unheard',
          'Crisis detection is always enabled regardless of other settings — this is a safety feature that cannot be turned off',
          'Make sure you have notification channels (Slack, email) configured so escalations aren\'t missed',
          'Review escalated conversations to find gaps in your base prompt — if the AI keeps escalating on the same topic, add that answer to your prompt'
        ],
        relatedTopics: [
          { title: 'Connecting Notifications', path: '/documentation/chatbot-manual/notifications' },
          { title: 'Writing Your AI Base Prompt', path: '/documentation/chatbot-manual/base-prompt' },
          { title: 'Managing Conversations', path: '/documentation/chatbot-manual/conversations' }
        ]
      },
      {
        id: 'proactive',
        title: 'Proactive Engagement',
        description: 'Automatically reach out to visitors before they start chatting.',
        whatItDoes: 'Proactive messages let your chatbot initiate the conversation by sending a message after a visitor has been on your site for a set amount of time. Combined with geo-filtering, you can target only visitors from specific states or regions, ensuring your proactive outreach is relevant and compliant with your service area.',
        detailedSections: [
          {
            heading: 'The Impact of Proactive Messaging',
            body: 'Most website visitors never start a chat conversation, even when they have questions. They browse, hesitate, and leave. Proactive messaging changes this dynamic by having the chatbot reach out first. Instead of waiting for the visitor to click the chat icon, a friendly message bubble appears after a set delay, inviting the visitor to engage.\n\nThe impact can be significant. Websites with proactive messaging enabled typically see 30-50% more chat conversations than those that rely solely on visitor-initiated contact. These additional conversations represent leads that would have otherwise been lost — visitors who had questions but were not motivated enough to start a chat on their own.\n\nThe key to effective proactive messaging is timing and tone. A message that appears too quickly feels aggressive and interrupts the visitor\'s browsing. A message that appears too late misses visitors who have already left. And a message that sounds too salesy will be dismissed. The ideal proactive message is warm, helpful, and appears at just the right moment.'
          },
          {
            heading: 'Timing and Geo-Filtering',
            body: 'The delay setting controls how many seconds a visitor must be on your site before the proactive message appears. For most websites, 15-20 seconds is the sweet spot. At this point, the visitor has had enough time to start reading your content and forming questions, but has not yet made a decision to leave.\n\nFor high-intent pages like pricing or contact pages, a shorter delay of 8-12 seconds can work well because visitors on these pages are already further along in their decision-making process. For blog posts or informational pages, a longer delay of 25-30 seconds gives visitors time to engage with the content first.\n\nGeo-filtering adds another layer of targeting by restricting proactive messages to visitors from specific geographic locations. This is especially important for businesses with regional service areas, such as treatment centers that are only licensed in certain states. You can set the filter to "Specific States" and select only the states you serve, ensuring you do not engage visitors you cannot help.\n\nThe blocked message for visitors outside your service area can be customized. Instead of simply hiding the widget, you can display a helpful message like "We currently serve patients in California, Arizona, and Nevada. For assistance in your state, please visit [resource link]." This provides value even to visitors you cannot directly serve.'
          }
        ],
        howToUse: [
          'Go to AI Support settings for your property',
          'Toggle "Proactive Message" on',
          'Write your proactive message (e.g., "Hi there! Have questions about our treatment programs? I\'m here to help.")',
          'Set the delay in seconds — how long to wait before showing the message (15-30 seconds works well)',
          'Optionally configure geo-filtering to only show proactive messages to visitors from states you serve',
          'Choose your filter mode: allow-list (only these states) or block-list (everywhere except these states)',
          'The message appears as a chat bubble above the widget icon, drawing attention without being intrusive'
        ],
        tips: [
          'Keep proactive messages short and inviting — one sentence is ideal',
          'A 15-20 second delay works best: long enough that visitors have settled in, short enough they haven\'t left',
          'Geo-filtering is especially important for treatment centers with state-specific licensing',
          'Test your proactive message on a private/incognito browser to see the visitor experience',
          'Try different messages and delays to find what drives the most engagement'
        ],
        relatedTopics: [
          { title: 'Geo-Filtering', path: '/documentation/ai-support/geo-filtering' },
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Getting Your Chatbot Live', path: '/documentation/chatbot-manual/going-live' }
        ]
      },
      {
        id: 'conversations',
        title: 'Managing Conversations',
        description: 'Inbox workflow, agent handoff, and conversation lifecycle.',
        whatItDoes: 'Once your chatbot is live, conversations flow into your inbox in real time. This guide covers the daily workflow: monitoring active chats, using shortcuts for quick replies, viewing visitor details, taking over from the AI, closing resolved conversations, and using the Closed tab for reference.',
        detailedSections: [
          {
            heading: 'Daily Inbox Workflow',
            body: 'The inbox is the central hub for all conversations happening across your websites. When a visitor starts a chat, the conversation appears in the Active tab of your inbox in real time. Each conversation shows a preview of the latest message, the visitor\'s name (if captured), and the property it belongs to.\n\nYour daily workflow should start with opening the inbox and reviewing any active conversations. During business hours, aim to check the inbox at least every few minutes. Faster response times lead to higher visitor satisfaction and conversion rates. If you have Slack or email notifications configured, you will be alerted the moment a new conversation starts, so you do not need to constantly watch the inbox.\n\nWhen you click on a conversation, the chat panel opens showing the full message history. On the right side, the Visitor Info panel displays any captured information — name, phone, email, location, insurance details, and the page the visitor is currently browsing. Use this context to personalize your responses and provide more relevant help.'
          },
          {
            heading: 'Taking Over from AI',
            body: 'When the AI is handling a conversation, you can take over at any time simply by typing a message in the chat panel. The moment you send a human response, the AI automatically pauses for that conversation and your team takes control. This seamless handoff means visitors experience a natural transition without any awkward "you are now being connected to a human agent" messages.\n\nYou should take over from the AI when you notice it providing incorrect information, when the conversation involves a sensitive topic that requires human empathy, or when the visitor explicitly asks to speak with a person. The chat panel clearly labels which messages were sent by the AI and which were sent by human agents, so you can always see what the visitor has been told.\n\nAfter you take over, you can use chat shortcuts to speed up your responses. Type "/" in the message field to see a list of pre-written responses for common situations — things like business hours, directions, insurance verification requests, or scheduling links. These shortcuts save significant time during high-volume periods.'
          },
          {
            heading: 'Closing and Reviewing Conversations',
            body: 'When a conversation is resolved, click the "Close" button to move it to the Closed tab. This keeps your active inbox clean and focused on conversations that still need attention. Stale conversations — where neither the visitor nor the agent has sent a message for approximately 45 seconds — are automatically closed to prevent clutter.\n\nClosed conversations are not deleted. They remain fully searchable and accessible in the Closed tab, where you can review them at any time. This archive is valuable for several purposes: training new team members, identifying gaps in your AI base prompt, reviewing what the AI handled well, and tracking visitor needs over time.\n\nIf a visitor sends a new message on a previously closed conversation, it automatically reopens and moves back to the Active tab. This ensures continuity — the visitor does not need to start a new conversation or repeat their previous questions.'
          }
        ],
        howToUse: [
          'Open the Inbox from the sidebar — active conversations appear on the left',
          'Click a conversation to open the chat panel and see the full message history',
          'Review the Visitor Info panel on the right for context (name, phone, location, insurance)',
          'Type "/" in the message field to use shortcuts for common replies',
          'To take over from AI, simply start typing — the AI will pause automatically',
          'Click "Close" when a conversation is resolved; it moves to the Closed tab',
          'Stale conversations auto-close after inactivity to keep your inbox clean'
        ],
        tips: [
          'Check the inbox at least every few minutes during business hours for the fastest response times',
          'Use the property selector at the top to filter conversations by website',
          'Closed conversations remain searchable — use them to review what the AI handled well or poorly',
          'Set up Slack notifications so you get pinged immediately when a new conversation starts'
        ],
        relatedTopics: [
          { title: 'Conversation Shortcuts', path: '/documentation/inbox/shortcuts' },
          { title: 'Real-time Updates', path: '/documentation/inbox/realtime' },
          { title: 'Escalation & Crisis Detection', path: '/documentation/chatbot-manual/escalation' }
        ]
      },
      {
        id: 'notifications',
        title: 'Connecting Notifications',
        description: 'Set up Slack, email, and Salesforce so your team never misses a lead.',
        whatItDoes: 'Notifications ensure your team is alerted the moment something important happens — a new conversation starts, a visitor shares their phone number, or the AI escalates. You can receive alerts via Slack, email, or both. Salesforce integration can also auto-export leads based on triggers like escalation or insurance detection.',
        detailedSections: [
          {
            heading: 'Why Notifications Are Critical',
            body: 'Without notifications, your team has to manually check the inbox to discover new conversations. In practice, this means conversations get missed — especially escalated ones where the AI has already reached its limits and a visitor is waiting for a human response. Every minute a visitor waits increases the likelihood they will leave your website and not return.\n\nNotifications solve this by pushing alerts directly to the tools your team already uses. Slack notifications deliver instant messages to a channel where your team is active. Email notifications reach team members who may not be in front of their computer. Together, they create multiple layers of coverage that ensure no conversation falls through the cracks.\n\nThe most critical notifications to enable are escalation alerts and phone submission alerts. Escalated conversations represent high-intent visitors who need human help. Phone submissions indicate visitors who have shared their direct contact number — these are typically your most valuable leads and should be followed up on immediately.'
          },
          {
            heading: 'Setting Up Multiple Channels',
            body: 'We recommend configuring both Slack and email notifications for maximum coverage. Slack is ideal for real-time alerts during business hours when your team is active in their Slack workspace. Email provides a backup for off-hours or for team members who are away from Slack.\n\nFor Slack, connect your workspace through the OAuth flow and choose a dedicated channel for notifications — something like #leads or #admissions-alerts. Avoid posting to a general channel where notifications might get buried among other messages. For email, add the email addresses of everyone on your team who handles incoming leads or conversations.\n\nConfigure notification triggers thoughtfully. Start with all three event types enabled — new conversations, phone submissions, and escalations — then adjust based on volume. If you receive dozens of conversations per day, you might want to limit Slack notifications to escalations and phone submissions only, while keeping all event types enabled for email to maintain a complete record.\n\nThe Notification Log in Settings shows a history of every notification sent, including delivery status and any error messages. Check this log periodically to ensure notifications are being delivered successfully. If you see failures, the error messages usually indicate the cause — such as an expired Slack token or an invalid email address.'
          }
        ],
        howToUse: [
          'Go to Settings from the sidebar and select your property',
          'Under "Slack," click "Connect to Slack" and authorize the integration',
          'Choose which events trigger Slack notifications: new conversations, phone submissions, escalations',
          'Under "Email Notifications," add email addresses and select which events to be notified about',
          'Under "Salesforce," connect your Salesforce account via OAuth',
          'Configure auto-export triggers: on escalation, on phone detected, on insurance detected, on conversation end',
          'Set up field mappings to control how visitor data maps to Salesforce Lead fields'
        ],
        tips: [
          'Enable all three notification types (new conversation, phone, escalation) to start — you can always dial back later',
          'Use a shared Slack channel like #leads or #admissions so the whole team sees alerts',
          'Salesforce auto-export on escalation is especially useful — it creates a lead the moment the AI can\'t handle something',
          'Check the Notification Log in Settings to verify notifications are being delivered successfully'
        ],
        relatedTopics: [
          { title: 'Slack Integration', path: '/documentation/integrations/slack' },
          { title: 'Email Notifications', path: '/documentation/integrations/email-notifications' },
          { title: 'Salesforce Integration', path: '/documentation/integrations/salesforce' }
        ]
      },
      {
        id: 'performance',
        title: 'Measuring Performance',
        description: 'Use analytics to track chatbot effectiveness and continuously improve.',
        whatItDoes: 'The Analytics dashboard gives you insight into how your chatbot is performing. Track total conversations, AI resolution rates (conversations handled without human intervention), average response times, page-level engagement, and visitor trends. Use this data to refine your base prompt, adjust escalation thresholds, and optimize your proactive messaging.',
        detailedSections: [
          {
            heading: 'Key Metrics to Track',
            body: 'Understanding your chatbot\'s performance starts with knowing which metrics matter most. The four most important metrics are: total conversation count, AI resolution rate, average response time, and escalation rate.\n\nTotal conversation count tells you how many visitors are engaging with your chatbot. A rising count indicates growing awareness and engagement. If the count is flat or declining, consider whether your widget is visible enough, whether your proactive message is effective, or whether there are technical issues preventing the widget from loading.\n\nAI resolution rate is the percentage of conversations that the AI handles completely without human intervention. This is your primary indicator of base prompt quality. A rate of 60-80% is considered healthy. Below 50% means your base prompt needs significant improvement. Above 80% is excellent and means the AI is handling the vast majority of inquiries on its own.\n\nAverage response time measures how quickly visitors get answers. For AI responses, this is typically 2-5 seconds (depending on your humanization delay settings). For human responses, aim for under 2 minutes during business hours. Longer response times correlate directly with visitor abandonment.\n\nEscalation rate tracks how often conversations get handed off to humans. A high escalation rate is not inherently bad — it may indicate that your escalation keywords are working correctly. But if the rate is climbing, it usually means visitors are asking questions the AI cannot answer, which is a signal to update your base prompt.'
          },
          {
            heading: 'Using Data to Improve',
            body: 'Analytics are only valuable if you act on them. Establish a weekly review routine where you spend 15-20 minutes looking at your dashboard and recent conversations. Start with the overview metrics to spot any unusual trends, then drill into specific conversations — especially escalated ones — to understand what is happening.\n\nPage analytics show which pages on your website generate the most conversations. Use this data to optimize your proactive message strategy. If your pricing page generates the most chats, make sure your base prompt has comprehensive pricing information. If your insurance page drives conversations, ensure the AI can confidently answer insurance-related questions.\n\nCompare performance across different time periods to measure the impact of changes you have made. After updating your base prompt, check whether the AI resolution rate improved the following week. After adjusting your proactive message, see if conversation volume increased. This data-driven approach ensures you are continuously improving rather than guessing.\n\nIf you manage multiple properties, compare performance across websites to identify best practices. A base prompt that works exceptionally well for one website might contain strategies you can adapt for others. Similarly, if one property has significantly lower engagement, investigate whether it has different widget settings, proactive message configuration, or traffic patterns.'
          }
        ],
        howToUse: [
          'Go to Analytics from the sidebar',
          'Review the overview cards: total conversations, AI-resolved %, average response time',
          'Check the conversations chart to see volume trends over time',
          'Look at page analytics to see which pages generate the most chats',
          'Compare performance across properties if you manage multiple sites',
          'Use date filters to analyze specific time periods',
          'Cross-reference high-escalation periods with your base prompt to find improvement areas'
        ],
        tips: [
          'A healthy AI resolution rate is 60-80% — if it\'s below 50%, your base prompt likely needs more answers',
          'Track which pages generate the most chats to optimize your proactive message placement',
          'Review analytics weekly and update your base prompt monthly based on what you learn',
          'If response times are high, consider adding more team members or adjusting AI escalation limits'
        ],
        relatedTopics: [
          { title: 'Writing Your AI Base Prompt', path: '/documentation/chatbot-manual/base-prompt' },
          { title: 'Proactive Engagement', path: '/documentation/chatbot-manual/proactive' },
          { title: 'Escalation & Crisis Detection', path: '/documentation/chatbot-manual/escalation' }
        ]
      }
    ]
  },
  {
    id: 'inbox',
    title: 'Inbox',
    description: 'Manage customer conversations',
    topics: [
      {
        id: 'conversations',
        title: 'Managing Conversations',
        description: 'View and respond to customer chats.',
        whatItDoes: 'The inbox shows all conversations from your websites. You can view active chats, respond to visitors, and close resolved conversations. Conversations are organized by status and property.',
        detailedSections: [
          {
            heading: 'Inbox Layout and Navigation',
            body: 'The inbox is divided into three main areas. On the left, you see the conversation list — a scrollable list of all conversations for your currently selected property. Each conversation card shows a preview of the latest message, the visitor\'s name (if available), and a timestamp. Conversations are sorted by most recent activity, so the most active chats always appear at the top.\n\nIn the center, the chat panel displays the full message history for the selected conversation. Messages from visitors appear on one side, and messages from the AI or human agents appear on the other. Each message includes a timestamp and a label indicating whether it was sent by the AI or a human agent, giving you full transparency into what has been communicated.\n\nOn the right, the visitor info panel provides context about who you are chatting with. This panel displays any information that has been collected during the conversation — name, phone number, email, location, insurance details, the page the visitor is currently browsing, and more. This context helps you provide personalized, relevant responses without asking the visitor to repeat information they have already shared.'
          },
          {
            heading: 'Conversation Workflow',
            body: 'When a new conversation arrives, it appears in the Active tab with a visual indicator showing it is unread. Click on the conversation to open the chat panel and review the message history. If the AI has been handling the conversation, you can read through the entire exchange to understand the context before deciding whether to intervene.\n\nIf the AI is doing a good job, you can simply monitor the conversation without taking action. If you want to take over, start typing in the message field — the AI will automatically pause for this conversation the moment you send a message. There is no need to explicitly "claim" or "transfer" the conversation; the handoff is seamless.\n\nWhen a conversation is resolved, click the Close button to move it to the Closed tab. This keeps your Active tab focused on ongoing conversations that still need attention. If you are unsure whether a conversation is truly resolved, you can leave it active — stale conversations will auto-close after a period of inactivity.\n\nThe property selector at the top of the inbox lets you filter conversations by website. If you manage multiple properties, use this selector to focus on one website at a time. You can also select "All Properties" to see conversations from all your websites in a single view.'
          }
        ],
        howToUse: [
          'Click on a conversation to open it in the chat panel',
          'Type your response in the message field',
          'Press Enter or click Send to deliver your message',
          'Use the close button to mark conversations as resolved',
          'Filter by property using the selector at the top',
          'Check the Closed tab to review past conversations'
        ],
        tips: [
          'Respond quickly - visitors may leave if they wait too long',
          'Use the visitor info panel to personalize your responses',
          'Closed conversations can be found in the Closed tab',
          'Use "/" shortcuts for faster replies to common questions'
        ],
        relatedTopics: [
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' },
          { title: 'Chat Panel', path: '/documentation/inbox/chat-panel' },
          { title: 'Conversation Status', path: '/documentation/inbox/conversation-status' }
        ]
      },
      {
        id: 'chat-panel',
        title: 'Chat Panel',
        description: 'The interface for messaging visitors.',
        whatItDoes: 'The chat panel displays the full conversation history with a visitor. You can see all messages, send replies, and view visitor details. The panel updates in real-time as new messages arrive.',
        detailedSections: [
          {
            heading: 'Chat Panel Features',
            body: 'The chat panel is designed to give you everything you need to have effective conversations with visitors. At the top, you see the visitor\'s name (if known) and the conversation status. The main area shows the full message history in chronological order, with clear visual distinction between visitor messages, AI responses, and human agent responses.\n\nAt the bottom, the message input field is where you type your responses. Press Enter to send a message, or Shift+Enter to add a new line without sending. As you type, the visitor sees a typing indicator on their end, letting them know a response is being composed. This creates a more natural, conversational experience compared to messages that appear without any preview of activity.\n\nThe chat panel supports several keyboard shortcuts and features designed to speed up your workflow. Typing "/" opens the shortcut menu, where you can select pre-written responses for common questions. This is especially useful during high-volume periods when you need to respond quickly to multiple conversations. You can also scroll up through the conversation history to review earlier messages and understand the full context before responding.'
          },
          {
            heading: 'Message Labels and Context',
            body: 'Every message in the chat panel includes metadata that helps you understand the conversation flow. AI-generated messages are clearly labeled so you know exactly what the bot told the visitor. This is critical for maintaining consistency — if the AI made a claim or shared specific information, you can see it and either confirm or correct it in your response.\n\nThe timestamp on each message helps you understand the pace of the conversation. If there was a long gap between messages, the visitor may have been doing research or stepped away. If messages are rapid-fire, the visitor is actively engaged and expecting quick responses.\n\nThe visitor info panel on the right side of the chat panel updates in real time as new information is collected during the conversation. If the AI asks for and receives the visitor\'s phone number mid-conversation, it immediately appears in the visitor info panel. This means you always have the most up-to-date information available as you compose your responses.'
          }
        ],
        howToUse: [
          'Select a conversation from the list to open it',
          'Scroll up to view previous messages',
          'Type in the message field at the bottom',
          'Press Enter to send, or Shift+Enter for a new line',
          'Type "/" to access conversation shortcuts',
          'Review visitor info in the right panel for context'
        ],
        tips: [
          'Messages from AI are labeled so you know what was automated',
          'You can see when visitors are typing',
          'The visitor info sidebar shows helpful context',
          'Use shortcuts for faster responses to common questions'
        ],
        relatedTopics: [
          { title: 'Managing Conversations', path: '/documentation/inbox/conversations' },
          { title: 'Conversation Shortcuts', path: '/documentation/inbox/shortcuts' },
          { title: 'Real-time Updates', path: '/documentation/inbox/realtime' }
        ]
      },
      {
        id: 'visitor-info',
        title: 'Visitor Information',
        description: 'Understanding your visitors.',
        whatItDoes: 'The visitor info panel shows details about who you\'re chatting with. This includes their name, email, phone, location, insurance info, current page, and any other information collected during the conversation.',
        detailedSections: [
          {
            heading: 'What Information Is Collected',
            body: 'Scaled Bot collects visitor information from multiple sources, giving you a comprehensive picture of who you are chatting with. Some information is collected automatically — such as the visitor\'s approximate location (detected via IP address), the page they are currently browsing, and their browser type. Other information is collected through lead capture — either through upfront forms or natural conversation.\n\nThe fields available in the visitor info panel include: name, email address, phone number, geographic location (city, state), current page URL, insurance information, drug of choice (for treatment centers), treatment interest, urgency level, age, occupation, and addiction history. Not all fields will be populated for every visitor — it depends on what information was collected during the conversation and what lead capture settings you have configured.\n\nInsurance card photos, if collected, are also accessible from the visitor info panel. Clicking on the insurance section reveals any uploaded images, which your team can use for verification purposes. This is especially valuable for treatment centers that need to confirm insurance coverage before proceeding with an intake.'
          },
          {
            heading: 'Using Visitor Info Effectively',
            body: 'The visitor info panel is most powerful when used to personalize your responses. Instead of asking a visitor to repeat their name or phone number, reference the information already collected. This makes the conversation feel more natural and shows the visitor that their time is valued.\n\nLocation data can help you provide relevant information. If a visitor is chatting from a different state, you can proactively address questions about travel, virtual appointments, or referrals to local providers. If they are local, you can give specific directions or mention nearby landmarks.\n\nThe current page field shows you exactly where the visitor is on your website at this moment. This is incredibly useful for understanding context. If someone is on your pricing page and asks "how much does it cost?", you know they have already been looking at pricing information. If they are on your "About Us" page, they might be evaluating your credibility. Use this context to tailor your responses and anticipate their needs.\n\nAll visitor information is stored persistently, so if a visitor returns for a second conversation, their previous data is still available. This enables continuity across sessions — you can reference previous interactions and avoid asking for information the visitor has already provided.'
          }
        ],
        howToUse: [
          'Open a conversation to see visitor details in the sidebar',
          'Click on expandable sections to see more info',
          'Use this context to personalize your responses',
          'Check the current page to understand what the visitor is looking at',
          'View insurance card uploads if available'
        ],
        tips: [
          'Visitors provide more info when asked naturally in conversation',
          'Enable lead capture to collect contact details automatically',
          'Location is detected automatically based on IP address',
          'Use current page data to anticipate visitor questions'
        ],
        relatedTopics: [
          { title: 'Lead Capture', path: '/documentation/ai-support/lead-capture' },
          { title: 'Visitor Leads', path: '/documentation/account/visitor-leads' }
        ]
      },
      {
        id: 'shortcuts',
        title: 'Conversation Shortcuts',
        description: 'Quick replies and chat shortcuts.',
        whatItDoes: 'Chat shortcuts let you quickly insert pre-written responses into conversations. Type a shortcut keyword (like "/hours" or "/thanks") and select from the matching suggestions to instantly send a common reply without typing it out every time.',
        detailedSections: [
          {
            heading: 'How Shortcuts Work',
            body: 'Shortcuts are triggered by typing "/" in the message input field. When you type the forward slash, a dropdown menu appears showing all available shortcuts. Continue typing after the slash to filter the list — for example, typing "/hours" would narrow the list to shortcuts related to business hours.\n\nEach shortcut has a keyword and a pre-written message. When you select a shortcut from the dropdown, the message text is inserted into the input field. You can then edit the text before sending if you want to customize it for the specific conversation. This gives you the speed of canned responses with the flexibility to personalize each one.\n\nShortcuts are particularly valuable during high-volume periods when you are managing multiple conversations simultaneously. Instead of typing the same response to common questions like "What are your hours?" or "Where are you located?", you can insert a shortcut in seconds and move on to the next conversation. This dramatically reduces response times and allows a single agent to handle more conversations effectively.\n\nThe shortcut system also ensures consistency across your team. When all agents use the same shortcuts, visitors receive consistent, accurate information regardless of which team member is responding. This is especially important for details like pricing, policies, or procedures where inconsistent answers could cause confusion.'
          }
        ],
        howToUse: [
          'Open a conversation in the chat panel',
          'Type "/" in the message field to see all available shortcuts',
          'Continue typing to filter shortcuts by keyword',
          'Click a shortcut or press Enter to insert it',
          'Edit the inserted text if needed before sending'
        ],
        tips: [
          'Shortcuts save time on frequently asked questions',
          'You can customize your shortcuts to match your brand voice',
          'Combine shortcuts with personal touches for the best results',
          'Create shortcuts for your most common responses to maximize efficiency'
        ],
        relatedTopics: [
          { title: 'Chat Panel', path: '/documentation/inbox/chat-panel' },
          { title: 'Managing Conversations', path: '/documentation/inbox/conversations' }
        ]
      },
      {
        id: 'realtime',
        title: 'Real-time Updates',
        description: 'Live conversation updates and indicators.',
        whatItDoes: 'Conversations update in real-time without needing to refresh. You\'ll see new messages appear instantly, typing indicators when someone is composing a message, and live status changes as conversations open or close.',
        detailedSections: [
          {
            heading: 'How Real-time Works',
            body: 'Scaled Bot uses a real-time subscription system that pushes updates to your browser the moment they happen. When a visitor sends a message, it appears in your chat panel within milliseconds. When a new conversation starts, it immediately shows up in your conversation list. When a conversation is closed (either manually or by auto-close), the status updates instantly across all tabs and team members.\n\nThis real-time architecture means you never need to refresh the page to see the latest information. The inbox is always up to date. If you have the inbox open in multiple browser tabs, all tabs stay synchronized. If a colleague closes a conversation in one tab, you will see that change reflected in your own view immediately.\n\nTyping indicators are a key part of the real-time experience. When a visitor starts typing a message, you see animated dots in the chat panel, letting you know a response is incoming. This helps you decide whether to wait for their message or continue composing your own response. Similarly, when you type in the message field, the visitor sees a typing indicator on their end, creating a more natural conversational flow.\n\nNotification bells in the sidebar also update in real time. Unread message counts change as new messages arrive and as you read them. This gives you a quick at-a-glance indicator of pending conversations without needing to navigate to the inbox.'
          }
        ],
        howToUse: [
          'Open the inbox — conversations update automatically',
          'Watch for typing indicators showing a visitor is writing',
          'New messages appear instantly in the chat panel',
          'The conversation list re-sorts as new messages arrive',
          'Notification bells update in real-time for unread counts'
        ],
        tips: [
          'Keep the inbox open during business hours for fastest response',
          'Typing indicators help you know when to wait vs. respond',
          'Real-time updates work across all your open tabs',
          'No page refresh needed — everything updates automatically'
        ],
        relatedTopics: [
          { title: 'Chat Panel', path: '/documentation/inbox/chat-panel' },
          { title: 'Conversation Status', path: '/documentation/inbox/conversation-status' }
        ]
      },
      {
        id: 'conversation-status',
        title: 'Conversation Status',
        description: 'Active, closed, and auto-close behavior.',
        whatItDoes: 'Conversations have three states: active (ongoing chat), closed (resolved), and pending. Stale conversations are automatically closed after a period of inactivity to keep your inbox clean. Closed conversations can be reopened if a visitor sends a new message.',
        detailedSections: [
          {
            heading: 'Understanding Conversation States',
            body: 'Every conversation in Scaled Bot goes through a lifecycle defined by its status. Understanding these states helps you manage your inbox effectively and ensures no conversation falls through the cracks.\n\nActive conversations are ongoing chats where the visitor or AI is still exchanging messages. These appear in the Active tab of your inbox and represent conversations that may need your attention. Some active conversations are being handled entirely by the AI, while others may have been escalated or taken over by a human agent.\n\nClosed conversations are chats that have been marked as resolved. They move to the Closed tab and no longer appear in your active inbox. Closing a conversation is a deliberate action that signals "this visitor\'s question has been addressed." Closed conversations are fully preserved — you can review the entire message history at any time.\n\nThe auto-close feature automatically closes conversations that have been inactive for approximately 45 seconds. This prevents your inbox from filling up with stale conversations where the visitor has left the website or stopped responding. Auto-close is a housekeeping feature that keeps your active inbox focused on conversations that are actually happening.\n\nIf a visitor sends a new message on a closed conversation, it automatically reopens and moves back to the Active tab. This ensures continuity — the visitor picks up where they left off, and the full conversation history is preserved. Your team is notified of the reopened conversation through the normal notification channels.'
          }
        ],
        howToUse: [
          'View active conversations in the "Active" tab of the inbox',
          'Click "Close" on a conversation to mark it resolved',
          'Stale conversations auto-close after ~45 seconds of inactivity',
          'Visitors reopening a closed chat automatically sets it back to active',
          'Use the "Closed" tab to review past conversations'
        ],
        tips: [
          'Auto-close keeps your inbox tidy without manual cleanup',
          'Visitors can always restart a closed conversation',
          'Closed conversations are still searchable in your history',
          'Reopened conversations include the full previous message history'
        ],
        relatedTopics: [
          { title: 'Managing Conversations', path: '/documentation/inbox/conversations' },
          { title: 'Real-time Updates', path: '/documentation/inbox/realtime' }
        ]
      }
    ]
  },
  {
    id: 'team',
    title: 'Team',
    description: 'Manage your support team',
    topics: [
      {
        id: 'inviting-agents',
        title: 'Inviting Agents',
        description: 'Add team members to handle conversations.',
        whatItDoes: 'Agents are team members who can respond to customer conversations. When you invite an agent, they receive an email with instructions to join your team and access the conversation dashboard.',
        howToUse: [
          'Go to Team Members from the sidebar',
          'Click the "Invite Agent" button',
          'Enter the agent\'s name and email address',
          'Select which properties they should have access to',
          'Click "Send Invitation" to invite them'
        ],
        tips: [
          'Agents receive an email invitation to join',
          'You can resend invitations if needed',
          'Assign agents to specific properties to organize workload'
        ],
        relatedTopics: [
          { title: 'Property Assignments', path: '/documentation/team/property-assignments' },
          { title: 'AI Personas', path: '/documentation/team/ai-personas' }
        ]
      },
      {
        id: 'property-assignments',
        title: 'Property Assignments',
        description: 'Control which websites agents can access.',
        whatItDoes: 'Property assignments determine which websites an agent can handle conversations for. This helps you organize your team when you have multiple websites or different specializations.',
        howToUse: [
          'Go to Team Members from the sidebar',
          'Find the agent you want to configure',
          'Click the properties dropdown in their row',
          'Check or uncheck properties to assign/unassign',
          'Changes save automatically'
        ],
        tips: [
          'Agents only see conversations from their assigned properties',
          'You can assign multiple agents to the same property',
          'Use this to create specialized teams for different websites'
        ],
        relatedTopics: [
          { title: 'Inviting Agents', path: '/documentation/team/inviting-agents' },
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' }
        ]
      },
      {
        id: 'agent-avatars',
        title: 'Agent Avatars',
        description: 'Personalize agent profiles with photos.',
        whatItDoes: 'Avatars help visitors identify who they\'re chatting with. When an agent responds, their avatar appears next to their messages in the chat widget.',
        howToUse: [
          'Go to Team Members from the sidebar',
          'Click on an agent\'s avatar placeholder',
          'Select an image file from your computer',
          'The avatar uploads and saves automatically'
        ],
        tips: [
          'Use professional headshots for best results',
          'Square images work best (they\'ll be cropped to a circle)',
          'Keep file sizes reasonable for fast loading'
        ],
        relatedTopics: [
          { title: 'Inviting Agents', path: '/documentation/team/inviting-agents' },
          { title: 'AI Personas', path: '/documentation/team/ai-personas' }
        ]
      },
      {
        id: 'ai-personas',
        title: 'AI Personas',
        description: 'Create AI agents based on team members.',
        whatItDoes: 'AI personas are automated agents that can respond to conversations using AI. You can create them from scratch or base them on existing team members to maintain a consistent personality.',
        howToUse: [
          'Go to Team Members and find an agent',
          'Click the menu button and select "Create AI Persona"',
          'The AI persona is created with the agent\'s name and avatar',
          'Configure the persona in AI Support settings'
        ],
        tips: [
          'AI personas can handle conversations 24/7',
          'Link them to real agents for a seamless handoff experience',
          'Customize personality prompts in AI Support'
        ],
        relatedTopics: [
          { title: 'AI Personas Settings', path: '/documentation/ai-support/personas' },
          { title: 'Agent Avatars', path: '/documentation/team/agent-avatars' }
        ]
      }
    ]
  },
  {
    id: 'ai-support',
    title: 'AI Support',
    description: 'Configure automated AI responses',
    topics: [
      {
        id: 'personas',
        title: 'AI Personas',
        description: 'Create and manage AI agents.',
        whatItDoes: 'AI personas are automated agents that can greet visitors and respond to common questions. Each persona can have its own name, avatar, and personality to match your brand.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Click "Add AI Persona" to create a new one',
          'Enter a name and upload an avatar',
          'Add a personality prompt to define how it should respond',
          'Assign it to properties where it should be active'
        ],
        tips: [
          'Keep personality prompts specific and detailed',
          'Test your AI persona before going live',
          'You can have multiple personas for different purposes'
        ],
        relatedTopics: [
          { title: 'Base Prompt', path: '/documentation/ai-support/base-prompt' },
          { title: 'AI Tone Presets', path: '/documentation/ai-support/tone-presets' }
        ]
      },
      {
        id: 'behavior-settings',
        title: 'Behavior Settings',
        description: 'Control how AI responds to visitors.',
        whatItDoes: 'Behavior settings let you fine-tune how AI interacts with visitors. You can control response delays, typing indicator timing, words-per-minute speed, and other details to make conversations feel natural and human-like.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Select a property to configure',
          'Scroll to the Behavior Settings section',
          'Adjust response delay, typing speed, and indicator timing',
          'Click Save to apply changes'
        ],
        tips: [
          'Slower response times can feel more natural',
          'Enable smart typing for realistic typing indicators',
          'Test different settings to find what works best'
        ],
        relatedTopics: [
          { title: 'Typo Injection', path: '/documentation/ai-support/typo-injection' },
          { title: 'Quick Reply After First', path: '/documentation/ai-support/quick-reply' },
          { title: 'Escalation Rules', path: '/documentation/ai-support/escalation' }
        ]
      },
      {
        id: 'escalation',
        title: 'Escalation Rules',
        description: 'When AI should hand off to humans.',
        whatItDoes: 'Escalation rules determine when AI should stop responding and notify a human agent. This ensures complex or sensitive issues get proper attention from your team.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find the Escalation section',
          'Toggle on Auto Escalation',
          'Set the maximum AI messages before escalation',
          'Add keywords that should trigger immediate escalation'
        ],
        tips: [
          'Add keywords for urgent issues like "emergency" or "cancel"',
          'Lower message limits mean faster human handoff',
          'Monitor escalated conversations to improve AI responses'
        ],
        relatedTopics: [
          { title: 'Behavior Settings', path: '/documentation/ai-support/behavior-settings' },
          { title: 'Managing Conversations', path: '/documentation/inbox/conversations' }
        ]
      },
      {
        id: 'lead-capture',
        title: 'Lead Capture',
        description: 'Collect visitor contact information.',
        whatItDoes: 'Lead capture settings determine what contact information to collect from visitors. You can require name, email, phone, or insurance card info before chatting, or use natural lead capture to ask during conversation.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find the Lead Capture section',
          'Toggle on the fields you want to require (name, email, phone, insurance card)',
          'Choose between upfront forms or natural capture',
          'Click Save to apply changes'
        ],
        tips: [
          'Requiring too much info may discourage visitors',
          'Email is the most valuable field to capture',
          'Natural capture feels less intrusive to visitors'
        ],
        relatedTopics: [
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' },
          { title: 'Visitor Leads', path: '/documentation/account/visitor-leads' },
          { title: 'Proactive Messages', path: '/documentation/ai-support/proactive-messages' }
        ]
      },
      {
        id: 'proactive-messages',
        title: 'Proactive Messages',
        description: 'Automatically engage visitors.',
        whatItDoes: 'Proactive messages automatically reach out to visitors after they\'ve been on your site for a set time. This can increase engagement and start more conversations.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find the Proactive Messages section',
          'Toggle on proactive messaging',
          'Set the delay (seconds before sending)',
          'Write your proactive message',
          'Click Save to apply changes'
        ],
        tips: [
          'Keep messages friendly and helpful, not pushy',
          'Test different delays to find optimal timing',
          'Use questions to encourage responses'
        ],
        relatedTopics: [
          { title: 'Lead Capture', path: '/documentation/ai-support/lead-capture' },
          { title: 'Base Prompt', path: '/documentation/ai-support/base-prompt' }
        ]
      },
      {
        id: 'base-prompt',
        title: 'Base Prompt',
        description: 'Define core AI instructions.',
        whatItDoes: 'The base prompt is the foundation for all AI responses. It tells the AI who it is, what your business does, and how it should communicate with visitors.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Click "Edit Base Prompt" in the header',
          'Write instructions for your AI agent',
          'Include info about your business and services',
          'Click Save to apply changes'
        ],
        tips: [
          'Be specific about your products/services',
          'Include common FAQs and their answers',
          'Define the tone (friendly, professional, casual)',
          'Update regularly as your business changes'
        ],
        relatedTopics: [
          { title: 'AI Personas', path: '/documentation/ai-support/personas' },
          { title: 'AI Tone Presets', path: '/documentation/ai-support/tone-presets' }
        ]
      },
      {
        id: 'geo-filtering',
        title: 'Service Area / Geo-Filtering',
        description: 'Restrict AI support by geographic location.',
        whatItDoes: 'Geo-filtering lets you control which visitors can chat based on their location. You can set the mode to Global (everyone), US Only, or Specific States. Visitors outside your service area see a configurable blocked message instead of the chat.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find the Service Area / Geo-Filtering section',
          'Choose a filter mode: Global, US Only, or Specific States',
          'If using Specific States, select the states you serve',
          'Customize the blocked visitor message',
          'Click Save to apply changes'
        ],
        tips: [
          'Use "US Only" if you only serve domestic customers',
          'The blocked message should be helpful — suggest alternatives or a phone number',
          'Visitor location is detected automatically via IP address'
        ],
        relatedTopics: [
          { title: 'Behavior Settings', path: '/documentation/ai-support/behavior-settings' },
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' }
        ]
      },
      {
        id: 'typo-injection',
        title: 'Typo Injection',
        description: 'Humanize AI responses with natural typos.',
        whatItDoes: 'Typo injection adds occasional, natural-looking typos to AI responses to make them feel more human. This prevents the "too-perfect" robotic feel that can make visitors suspect they\'re talking to a bot.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find the Humanization section under Behavior Settings',
          'Toggle on "Human Typos"',
          'The AI will automatically introduce subtle, realistic typos',
          'Click Save to apply changes'
        ],
        tips: [
          'Typos are subtle — they won\'t make messages unreadable',
          'Combine with response delays and smart typing for maximum realism',
          'Test a few conversations to see the effect before going live'
        ],
        relatedTopics: [
          { title: 'Drop Apostrophes', path: '/documentation/ai-support/drop-apostrophes' },
          { title: 'Behavior Settings', path: '/documentation/ai-support/behavior-settings' }
        ]
      },
      {
        id: 'quick-reply',
        title: 'Quick Reply After First',
        description: 'Fast reply mode after the first AI message.',
        whatItDoes: 'When enabled, the AI sends its first response with the normal delay to feel natural, but subsequent messages in the same conversation are sent much faster. This mimics how a real person types faster once they\'re engaged in a conversation.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find "Quick Reply After First" in Behavior Settings',
          'Toggle it on',
          'The first message uses your configured delay; follow-ups are faster',
          'Click Save to apply changes'
        ],
        tips: [
          'This creates a natural conversation rhythm',
          'Works well with smart typing indicators',
          'Great for high-volume conversations where speed matters'
        ],
        relatedTopics: [
          { title: 'Behavior Settings', path: '/documentation/ai-support/behavior-settings' },
          { title: 'Typo Injection', path: '/documentation/ai-support/typo-injection' }
        ]
      },
      {
        id: 'drop-apostrophes',
        title: 'Drop Apostrophes',
        description: 'Casual tone by removing apostrophes.',
        whatItDoes: 'When enabled, the AI drops apostrophes from contractions (e.g., "don\'t" becomes "dont", "I\'m" becomes "Im"). This creates a more casual, texting-style tone that feels natural for informal conversations.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find "Drop Apostrophes" in the Humanization section',
          'Toggle it on to enable the casual tone',
          'AI responses will automatically drop apostrophes',
          'Click Save to apply changes'
        ],
        tips: [
          'Best for brands with a casual, friendly voice',
          'Combine with typo injection for maximum informality',
          'Not recommended for formal or medical contexts — use your judgment'
        ],
        relatedTopics: [
          { title: 'Typo Injection', path: '/documentation/ai-support/typo-injection' },
          { title: 'Base Prompt', path: '/documentation/ai-support/base-prompt' }
        ]
      },
      {
        id: 'tone-presets',
        title: 'AI Tone Presets',
        description: 'Pre-built personality styles for your AI.',
        whatItDoes: 'AI tone presets give you ready-made personalities to choose from during onboarding. Each preset — Emily (warm & empathetic), Michael (professional & direct), Daniel (friendly & casual), Sarah (knowledgeable & supportive) — comes with a tailored base prompt and avatar.',
        howToUse: [
          'During onboarding, you\'ll see the four tone presets',
          'Click a preset to preview its personality and avatar',
          'Select the one that best matches your brand voice',
          'The chosen tone sets your initial base prompt and AI persona',
          'You can change or customize the tone anytime in AI Support settings'
        ],
        tips: [
          'Emily works great for healthcare and counseling businesses',
          'Michael suits professional services and B2B',
          'Daniel is ideal for casual consumer brands',
          'Sarah fits education and consulting contexts'
        ],
        relatedTopics: [
          { title: 'Base Prompt', path: '/documentation/ai-support/base-prompt' },
          { title: 'AI Personas', path: '/documentation/ai-support/personas' },
          { title: 'Onboarding Flow', path: '/documentation/getting-started/onboarding' }
        ]
      }
    ]
  },
  {
    id: 'widget',
    title: 'Widget',
    description: 'Customize and embed your chat widget',
    topics: [
      {
        id: 'customization',
        title: 'Widget Customization',
        description: 'Make the widget match your brand.',
        whatItDoes: 'Customize how your chat widget looks on your website. You can change colors, icon style, greeting message, and offline message to match your brand identity.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Select the property to customize',
          'Choose a widget icon style and primary color',
          'Set your greeting and offline messages',
          'Preview changes in real-time'
        ],
        tips: [
          'Use your brand colors for consistency',
          'Test on both mobile and desktop views',
          'Keep the widget visible but not intrusive'
        ],
        relatedTopics: [
          { title: 'Colors & Branding', path: '/documentation/widget/colors-branding' },
          { title: 'Widget Effects', path: '/documentation/widget/effects' },
          { title: 'Embed Code', path: '/documentation/widget/embed-code' }
        ]
      },
      {
        id: 'colors-branding',
        title: 'Colors & Branding',
        description: 'Match widget colors to your brand.',
        whatItDoes: 'Set custom colors for your chat widget. You can auto-extract colors from your website or manually set them to match your brand guidelines.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Click "Auto-extract from website" to pull brand colors',
          'Or manually set primary, text, and border colors',
          'Use the color pickers to fine-tune',
          'Preview changes before saving'
        ],
        tips: [
          'Ensure good contrast for readability',
          'Test colors on different backgrounds',
          'Consider both light and dark themes'
        ],
        relatedTopics: [
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Style Presets', path: '/documentation/widget/style-presets' }
        ]
      },
      {
        id: 'style-presets',
        title: 'Style Presets',
        description: 'Quick-start with pre-made styles.',
        whatItDoes: 'Style presets are pre-configured widget designs that you can apply instantly. Choose from modern, classic, minimal, bold, or soft styles.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Click on a style preset card',
          'The widget preview updates immediately',
          'Customize further if needed',
          'Save when you\'re happy with the look'
        ],
        tips: [
          'Presets are a great starting point',
          'You can customize any preset further',
          'Match the style to your website design'
        ],
        relatedTopics: [
          { title: 'Colors & Branding', path: '/documentation/widget/colors-branding' },
          { title: 'Widget Customization', path: '/documentation/widget/customization' }
        ]
      },
      {
        id: 'embed-code',
        title: 'Embed Code',
        description: 'Add the widget to your website.',
        whatItDoes: 'The embed code is a small snippet of JavaScript that you add to your website to display the chat widget. Once added, the widget appears automatically on all pages.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Switch to the "Embed Code" tab',
          'Copy the code snippet',
          'Paste it before the closing </body> tag on your website',
          'Save and publish your website changes'
        ],
        tips: [
          'Add the code to your website template for all pages',
          'Test on a staging site before going live',
          'The widget loads asynchronously and won\'t slow your site'
        ],
        relatedTopics: [
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' }
        ]
      },
      {
        id: 'effects',
        title: 'Widget Effects',
        description: 'Add visual animations to attract attention.',
        whatItDoes: 'Widget effects add eye-catching animations to your chat button — like a bounce, pulse, glow, or shake — to draw visitor attention. You can control the effect type, intensity, and how often it triggers.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Find the Widget Effects section',
          'Choose an effect type (bounce, pulse, glow, shake, etc.)',
          'Set the intensity (subtle, medium, strong)',
          'Set the interval (how often the effect plays in seconds)',
          'Click Save to apply'
        ],
        tips: [
          'Subtle effects are less annoying and still effective',
          'Use a longer interval so the animation isn\'t constant',
          'Test effects on your actual website to see how they look in context'
        ],
        relatedTopics: [
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Widget Preview', path: '/documentation/widget/preview' }
        ]
      },
      {
        id: 'preview',
        title: 'Widget Preview',
        description: 'Test your widget before going live.',
        whatItDoes: 'The widget preview page shows you exactly how your chat widget will look and behave on a real page. You can interact with it, test conversations, and see how it renders on different backgrounds — all without deploying to your website.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Click "Preview Widget" or navigate to the preview page',
          'Interact with the widget to test its behavior',
          'Check how it looks with your current color and effect settings',
          'Make adjustments in the widget settings and refresh to see changes'
        ],
        tips: [
          'Use preview to test conversations end-to-end before embedding',
          'Check both mobile and desktop views',
          'Preview is great for demoing the widget to stakeholders'
        ],
        relatedTopics: [
          { title: 'Widget Effects', path: '/documentation/widget/effects' },
          { title: 'Embed Code', path: '/documentation/widget/embed-code' }
        ]
      }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect with other tools',
    topics: [
      {
        id: 'salesforce',
        title: 'Salesforce',
        description: 'Export leads to Salesforce CRM.',
        whatItDoes: 'Connect Scaled Bot to your Salesforce account via OAuth to automatically export visitor information as leads. Map conversation data to Salesforce fields and configure auto-export triggers for escalations, phone submissions, or conversation endings.',
        howToUse: [
          'Go to Salesforce from the sidebar',
          'Click "Connect to Salesforce" to start the OAuth flow',
          'Authorize Scaled Bot in the Salesforce login window',
          'Once connected, configure field mappings (name, email, phone, etc.)',
          'Enable auto-export triggers: on escalation, phone detected, conversation end',
          'Test with a manual export before relying on auto-export'
        ],
        tips: [
          'You\'ll need a Salesforce Connected App with OAuth enabled',
          'Map all relevant fields for complete lead data',
          'Use auto-export on escalation to capture high-intent leads immediately',
          'Check the Salesforce settings page to see your connection status'
        ],
        relatedTopics: [
          { title: 'Lead Capture', path: '/documentation/ai-support/lead-capture' },
          { title: 'Visitor Leads', path: '/documentation/account/visitor-leads' }
        ]
      },
      {
        id: 'slack',
        title: 'Slack',
        description: 'Get notifications in Slack.',
        whatItDoes: 'Connect Slack via OAuth to receive real-time notifications about new conversations, escalations, and phone submissions. Notifications are posted to your chosen Slack channel with visitor details and conversation context.',
        howToUse: [
          'Go to Notifications from the sidebar',
          'Click "Add to Slack" to start the OAuth flow',
          'Authorize Scaled Bot in the Slack consent screen',
          'A default channel is selected automatically',
          'Toggle which events trigger Slack notifications (new chats, escalations, phone submissions)',
          'Click Save to apply changes'
        ],
        tips: [
          'Use a dedicated channel like #customer-chats for notifications',
          'Enable escalation alerts so urgent issues aren\'t missed',
          'You can disconnect and reconnect anytime from the settings page',
          'Test the connection with a test conversation after connecting'
        ],
        relatedTopics: [
          { title: 'Email Notifications', path: '/documentation/integrations/email' },
          { title: 'Escalation Rules', path: '/documentation/ai-support/escalation' }
        ]
      },
      {
        id: 'email',
        title: 'Email Notifications',
        description: 'Get alerts and track delivery.',
        whatItDoes: 'Configure email notifications to alert team members about new conversations, escalations, or phone submissions. You can add multiple recipient email addresses and view a notification log showing delivery status and any errors.',
        howToUse: [
          'Go to Notifications from the sidebar',
          'Switch to the Email tab',
          'Toggle email notifications on',
          'Add email addresses to the recipient list',
          'Choose which events trigger notifications',
          'View the Notification Log to track delivery status',
          'Click Save to apply'
        ],
        tips: [
          'Add backup email addresses for coverage',
          'Check the notification log if emails aren\'t arriving',
          'Failed deliveries show error messages in the log',
          'Don\'t over-notify — focus on escalation and phone submissions'
        ],
        relatedTopics: [
          { title: 'Slack Notifications', path: '/documentation/integrations/slack' },
          { title: 'Escalation Rules', path: '/documentation/ai-support/escalation' }
        ]
      }
    ]
  },
  {
    id: 'compliance',
    title: 'Compliance',
    description: 'HIPAA, data retention, and audit logging',
    topics: [
      {
        id: 'hipaa-settings',
        title: 'HIPAA Settings',
        description: 'Configure data protection and compliance.',
        whatItDoes: 'HIPAA settings let you configure data retention policies, session timeouts, and audit logging to meet healthcare compliance requirements. You can set how long visitor data and conversations are kept before automatic purging, and enforce session timeouts for inactive users.',
        howToUse: [
          'Go to HIPAA Compliance from the sidebar',
          'Select the property to configure',
          'Set the data retention period (in days)',
          'Toggle auto-purge on to automatically delete expired data',
          'Configure session timeout duration in Account Settings',
          'Review audit logs to track data access'
        ],
        tips: [
          'Consult your compliance officer before setting retention periods',
          'Shorter retention periods reduce risk but limit historical data',
          'Session timeouts add an extra layer of security for shared workstations',
          'A Business Associate Agreement (BAA) may be required for full HIPAA compliance'
        ],
        relatedTopics: [
          { title: 'Data Purging', path: '/documentation/compliance/data-purging' },
          { title: 'Audit Log', path: '/documentation/compliance/audit-log' },
          { title: 'Account Settings', path: '/documentation/account/account-settings' }
        ]
      },
      {
        id: 'data-purging',
        title: 'Data Purging',
        description: 'Automatic deletion of expired data.',
        whatItDoes: 'When auto-purge is enabled, the system automatically deletes conversations, messages, and visitor data that are older than your configured retention period. This runs on a schedule so you don\'t need to manually clean up old data.',
        howToUse: [
          'Go to HIPAA Compliance from the sidebar',
          'Set your desired retention period (e.g., 90 days)',
          'Toggle "Auto Purge" on',
          'The system will automatically delete data older than the retention period',
          'Check "Last Purge" timestamp to verify it\'s running'
        ],
        tips: [
          'Export any important data before enabling auto-purge',
          'The purge runs automatically — you don\'t need to trigger it',
          'Deleted data cannot be recovered, so choose retention periods carefully',
          'You can disable auto-purge at any time without losing current data'
        ],
        relatedTopics: [
          { title: 'HIPAA Settings', path: '/documentation/compliance/hipaa-settings' },
          { title: 'Visitor Leads', path: '/documentation/account/visitor-leads' }
        ]
      },
      {
        id: 'audit-log',
        title: 'Audit Log',
        description: 'Track who accessed what and when.',
        whatItDoes: 'The audit log records every time a team member views, updates, exports, or deletes visitor data or conversations. It captures who performed the action, what was accessed, which PHI fields were involved, and when it happened — essential for compliance audits.',
        howToUse: [
          'Audit logging happens automatically when users access visitor data',
          'View, update, export, and delete actions on visitors, conversations, and messages are logged',
          'Each log entry includes user ID, email, action type, resource, and timestamp',
          'PHI fields accessed (name, email, phone, insurance) are tracked specifically',
          'Logs can be reviewed by administrators for compliance reporting'
        ],
        tips: [
          'Audit logs are created automatically — no setup needed',
          'Review logs periodically to ensure data access follows your policies',
          'Logs include IP address and user agent for additional context',
          'Audit data is retained independently from conversation data retention settings'
        ],
        relatedTopics: [
          { title: 'HIPAA Settings', path: '/documentation/compliance/hipaa-settings' },
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' }
        ]
      }
    ]
  },
  {
    id: 'account',
    title: 'Account',
    description: 'Manage your account and billing',
    topics: [
      {
        id: 'subscription',
        title: 'Subscription & Billing',
        description: 'Manage your plan and payments.',
        whatItDoes: 'The subscription page shows your current plan, usage, and billing details. You can upgrade, downgrade, or manage your subscription from here.',
        howToUse: [
          'Go to Subscription from the sidebar',
          'View your current plan and features',
          'Click "Upgrade" or "Change Plan" to switch plans',
          'Review usage metrics to see if you need more capacity',
          'Manage payment methods and billing history'
        ],
        tips: [
          'Check your usage before upgrading to make sure you need more capacity',
          'Annual plans offer significant savings over monthly billing',
          'Downgrading takes effect at the end of your current billing cycle'
        ],
        relatedTopics: [
          { title: 'Account Settings', path: '/documentation/account/account-settings' },
          { title: 'Business Info', path: '/documentation/account/business-info' }
        ]
      },
      {
        id: 'account-settings',
        title: 'Account Settings',
        description: 'Profile, email, password, and session management.',
        whatItDoes: 'Account settings let you update your personal profile (name, avatar, email), change your password, and configure session timeout duration. Session timeouts automatically log you out after a period of inactivity for security.',
        howToUse: [
          'Go to Account Settings from the sidebar',
          'Update your name, email, or avatar',
          'Change your password from the security section',
          'Set session timeout duration (in minutes)',
          'Click Save to apply changes'
        ],
        tips: [
          'Use a professional avatar — it appears in conversations and team views',
          'Shorter session timeouts are more secure, especially on shared computers',
          'Email changes may require verification',
          'Your profile carries across all workspaces'
        ],
        relatedTopics: [
          { title: 'Subscription & Billing', path: '/documentation/account/subscription' },
          { title: 'Workspaces', path: '/documentation/getting-started/workspaces' },
          { title: 'HIPAA Settings', path: '/documentation/compliance/hipaa-settings' }
        ]
      },
      {
        id: 'business-info',
        title: 'Business Info / Properties',
        description: 'Manage property details and website info.',
        whatItDoes: 'Business info settings let you add and update details about each property — business name, description, address, phone, email, hours, logo, and Calendly link. You can also auto-extract business info from your website domain to pre-fill these fields.',
        howToUse: [
          'Go to Settings from the sidebar and select "Business Info"',
          'Select the property to configure',
          'Fill in business details (name, phone, email, address, hours)',
          'Click "Extract from Website" to auto-fill from your domain',
          'Upload a business logo',
          'Add a Calendly URL for appointment scheduling',
          'Click Save to apply changes'
        ],
        tips: [
          'Complete business info helps the AI give more accurate answers',
          'The website extraction feature pulls info from your homepage automatically',
          'Keep business hours up to date for accurate offline messages',
          'Your Calendly link can be shared by the AI during conversations'
        ],
        relatedTopics: [
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' },
          { title: 'Base Prompt', path: '/documentation/ai-support/base-prompt' }
        ]
      },
      {
        id: 'visitor-leads',
        title: 'Visitor Leads',
        description: 'View and manage captured visitor data.',
        whatItDoes: 'The visitor leads table shows all visitors who have chatted with your widget, along with their captured contact info (name, email, phone, insurance, location). You can search, filter, and export this data for follow-up or CRM import.',
        howToUse: [
          'Go to Settings and select "Visitor Leads"',
          'Select a property to view its visitors',
          'Browse the table of captured leads with contact details',
          'Use search to find specific visitors',
          'Export leads for use in external tools or CRM'
        ],
        tips: [
          'Leads are captured automatically during conversations',
          'Enable natural lead capture in AI Support for the best results',
          'Export to Salesforce directly using the Salesforce integration',
          'Check leads regularly to follow up on high-intent visitors'
        ],
        relatedTopics: [
          { title: 'Lead Capture', path: '/documentation/ai-support/lead-capture' },
          { title: 'Salesforce', path: '/documentation/integrations/salesforce' },
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' }
        ]
      }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Track performance and insights',
    topics: [
      {
        id: 'overview',
        title: 'Analytics Overview',
        description: 'Understanding your chat performance.',
        whatItDoes: 'Analytics show you how your chat widget is performing. Track conversation counts, visitor engagement, AI vs human response rates, and resolution times to understand how well your support is working.',
        howToUse: [
          'Go to Analytics from the sidebar',
          'Select a property to view its data',
          'Review charts and metrics',
          'Use date ranges to compare periods',
          'Export data if needed'
        ],
        tips: [
          'Check analytics regularly to spot trends',
          'Compare weekday vs weekend performance',
          'Use insights to improve AI responses'
        ],
        relatedTopics: [
          { title: 'Page Analytics', path: '/documentation/analytics/page-analytics' },
          { title: 'Blog Analytics', path: '/documentation/analytics/blog-analytics' },
          { title: 'Conversation Metrics', path: '/documentation/analytics/conversation-metrics' }
        ]
      },
      {
        id: 'page-analytics',
        title: 'Page Analytics',
        description: 'Per-page visitor tracking and engagement.',
        whatItDoes: 'Page analytics track which pages on your website get the most visitors and engagement. See page views, unique visitors, and which pages drive the most chat conversations — helping you understand where visitors need the most help.',
        howToUse: [
          'Go to Analytics from the sidebar',
          'Select the "Page Analytics" tab or section',
          'View per-page metrics including views and engagement',
          'Sort by most visited or most conversations started',
          'Use this data to optimize widget placement and content'
        ],
        tips: [
          'Pages with high traffic but low engagement may need better content',
          'Consider adding proactive messages on high-intent pages',
          'Page analytics require the widget embed code on each page'
        ],
        relatedTopics: [
          { title: 'Analytics Overview', path: '/documentation/analytics/overview' },
          { title: 'Blog Analytics', path: '/documentation/analytics/blog-analytics' }
        ]
      },
      {
        id: 'blog-analytics',
        title: 'Blog Analytics',
        description: 'Track blog and content performance.',
        whatItDoes: 'Blog analytics give you insights into how your blog content performs in driving visitor engagement and chat conversations. Track which blog posts get the most views and which ones lead to the most support interactions.',
        howToUse: [
          'Go to Analytics from the sidebar',
          'Select the "Blog Analytics" tab or section',
          'View performance metrics for your blog content',
          'Identify top-performing posts by engagement',
          'Use insights to guide your content strategy'
        ],
        tips: [
          'High-engagement blog posts are great candidates for proactive chat messages',
          'Track which topics generate the most support questions',
          'Use blog analytics to improve your FAQ and base prompt content'
        ],
        relatedTopics: [
          { title: 'Page Analytics', path: '/documentation/analytics/page-analytics' },
          { title: 'Analytics Overview', path: '/documentation/analytics/overview' }
        ]
      },
      {
        id: 'conversation-metrics',
        title: 'Conversation Metrics',
        description: 'AI vs human response rates and resolution.',
        whatItDoes: 'Conversation metrics break down how your conversations are handled — what percentage are fully resolved by AI vs escalated to humans, average response times, and resolution rates. This helps you measure AI effectiveness and team workload.',
        howToUse: [
          'Go to Analytics from the sidebar',
          'View the conversation metrics section',
          'Review AI resolution rate vs human escalation rate',
          'Check average response times for AI and human agents',
          'Monitor trends over time to measure improvements'
        ],
        tips: [
          'A high AI resolution rate means your base prompt and FAQs are working well',
          'If escalation rate is high, review and improve your AI base prompt',
          'Compare response times to set realistic expectations for visitors',
          'Use these metrics in team reviews and planning'
        ],
        relatedTopics: [
          { title: 'Analytics Overview', path: '/documentation/analytics/overview' },
          { title: 'Escalation Rules', path: '/documentation/ai-support/escalation' },
          { title: 'Behavior Settings', path: '/documentation/ai-support/behavior-settings' }
        ]
      }
    ]
  }
];

export function getSection(sectionId: string): DocSection | undefined {
  return documentationSections.find(s => s.id === sectionId);
}

export function getTopic(sectionId: string, topicId: string): DocTopic | undefined {
  const section = getSection(sectionId);
  return section?.topics.find(t => t.id === topicId);
}

export function getAllTopics(): { section: DocSection; topic: DocTopic }[] {
  const all: { section: DocSection; topic: DocTopic }[] = [];
  for (const section of documentationSections) {
    for (const topic of section.topics) {
      all.push({ section, topic });
    }
  }
  return all;
}
