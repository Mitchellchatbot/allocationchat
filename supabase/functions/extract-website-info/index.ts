const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Extracting info from:', formattedUrl);

    // Use Firecrawl to scrape with branding and summary
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'branding'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      // Return a 200 with error info so the frontend can show a proper message
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error || `Firecrawl request failed (${response.status})`,
          data: {
            companyName: null,
            description: null,
            suggestedGreeting: 'Hi there! 👋 How can we help you today?',
            businessType: 'general',
            primaryColor: null,
            logo: null,
            sourceUrl: formattedUrl,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract useful information
    const scrapeData = data.data || data;
    const metadata = scrapeData.metadata || {};
    const branding = scrapeData.branding || {};
    const markdown = scrapeData.markdown || '';

    // Try to extract company name from title or branding
    let companyName = metadata.title || '';
    // Clean up common suffixes
    companyName = companyName
      .replace(/\s*[-|–—]\s*.*/g, '') // Remove everything after dash/pipe
      .replace(/\s*\|\s*.*/g, '')
      .replace(/Home\s*$/i, '')
      .replace(/Welcome to\s*/i, '')
      .trim();

    // Extract description
    const description = metadata.description || metadata.ogDescription || '';

    // Extract a suggested greeting based on the business
    let suggestedGreeting = '';
    if (description) {
      suggestedGreeting = `Hi there! 👋 Welcome to ${companyName || 'our website'}. How can we help you today?`;
    }

    // Extract primary color from branding
    const primaryColor = branding.colors?.primary || branding.colors?.accent || null;
    const logo = branding.logo || branding.images?.logo || null;

    // --- Business info extraction from markdown ---
    const fullContent = markdown + ' ' + description;

    // Extract phone numbers
    const phoneRegex = /(\+?1?\s*[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    const phoneMatches = fullContent.match(phoneRegex);
    const businessPhone = phoneMatches ? phoneMatches[0].trim() : null;

    // Extract email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = fullContent.match(emailRegex);
    // Filter out common non-business emails
    const filteredEmails = (emailMatches || []).filter(e => 
      !e.includes('example.com') && !e.includes('sentry') && !e.includes('webpack')
    );
    const businessEmail = filteredEmails.length > 0 ? filteredEmails[0] : null;

    // Extract address (look for patterns with street numbers, state abbreviations, zip codes)
    const addressRegex = /\d{1,5}\s+[\w\s.]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Suite|Ste)\.?(?:\s*#?\s*\d+)?\s*,?\s*[\w\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi;
    const addressMatches = fullContent.match(addressRegex);
    const businessAddress = addressMatches ? addressMatches[0].trim() : null;

    // Extract business hours (common patterns)
    const hoursRegex = /(?:hours|open|schedule)\s*:?\s*((?:mon|tue|wed|thu|fri|sat|sun|weekday|weekend|daily|m-f|m\s*-\s*f)[\s\S]{0,80}?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)))/i;
    const hoursMatch = fullContent.match(hoursRegex);
    const businessHours = hoursMatch ? hoursMatch[1].trim() : null;

    // Determine business type from content for better greeting suggestions
    const contentLower = fullContent.toLowerCase();
    let businessType = 'general';
    
    if (contentLower.includes('recovery') || contentLower.includes('treatment') || contentLower.includes('rehab') || contentLower.includes('addiction')) {
      businessType = 'recovery';
      suggestedGreeting = `You've taken a brave first step. We're here to help. How can we support you today?`;
    } else if (contentLower.includes('legal') || contentLower.includes('attorney') || contentLower.includes('law firm') || contentLower.includes('lawyer')) {
      businessType = 'legal';
      suggestedGreeting = `Welcome! We're here to help with your legal needs. What can we assist you with today?`;
    } else if (contentLower.includes('healthcare') || contentLower.includes('medical') || contentLower.includes('doctor') || contentLower.includes('clinic')) {
      businessType = 'healthcare';
      suggestedGreeting = `Welcome! We're here to help with your healthcare needs. How can we assist you today?`;
    } else if (contentLower.includes('real estate') || contentLower.includes('property') || contentLower.includes('homes for sale')) {
      businessType = 'realestate';
      suggestedGreeting = `Looking for your dream home? We're here to help! What kind of property are you interested in?`;
    } else if (contentLower.includes('restaurant') || contentLower.includes('menu') || contentLower.includes('dining')) {
      businessType = 'restaurant';
      suggestedGreeting = `Welcome! Would you like to make a reservation or ask about our menu?`;
    } else if (contentLower.includes('shop') || contentLower.includes('store') || contentLower.includes('buy') || contentLower.includes('cart')) {
      businessType = 'ecommerce';
      suggestedGreeting = `Welcome to our store! 🛍️ How can we help you find what you're looking for?`;
    }

    const result = {
      success: true,
      data: {
        companyName: companyName || null,
        description: description || null,
        suggestedGreeting,
        businessType,
        primaryColor,
        logo,
        sourceUrl: formattedUrl,
        businessPhone,
        businessEmail,
        businessAddress,
        businessHours,
      }
    };

    console.log('Extracted info:', result.data);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error extracting website info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to extract info';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
