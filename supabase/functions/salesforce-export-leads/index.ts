import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function decodeJwtPayload(jwt: string): { sub?: string; exp?: number } | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// --- Decryption helpers (AES-256-GCM, key derived from service role key) ---

async function deriveKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("salesforce-token-encryption-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}

async function decryptToken(encrypted: string): Promise<string> {
  // If not encrypted (legacy plaintext), return as-is
  if (!encrypted.startsWith("enc:")) {
    return encrypted;
  }
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");

  const ivB64 = parts[1];
  const ctB64 = parts[2];
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));

  const key = await deriveKey("decrypt");
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plainBuffer);
}

async function encryptToken(plaintext: string): Promise<string> {
  const key = await deriveKey("encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `enc:${ivB64}:${ctB64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { propertyId, visitorIds, _serviceRoleExport } = await req.json();

    if (!propertyId || !visitorIds || visitorIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Property ID and visitor IDs are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let exportType = "manual";
    let callerUserId: string | null = null;

    // If called with service role key (automated export from extract-visitor-info), skip user ownership check
    if (_serviceRoleExport && token === supabaseServiceKey) {
      exportType = "auto_insurance";
      console.log("Service-role auto-export for property", propertyId);
    } else {
      // Standard user auth — decode JWT locally (gateway verifies signature in prod)
      const jwtPayload = decodeJwtPayload(token);
      if (!jwtPayload?.sub || (jwtPayload.exp && jwtPayload.exp < Math.floor(Date.now() / 1000))) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      callerUserId = jwtPayload.sub;

      if (propertyId !== 'all') {
        // --- Authorization: Verify caller owns the property ---
        const { data: property, error: propError } = await supabase
          .from("properties")
          .select("user_id")
          .eq("id", propertyId)
          .single();

        if (propError || !property || property.user_id !== callerUserId) {
          console.error("Forbidden: caller does not own property", propertyId);
          return new Response(
            JSON.stringify({ error: "Forbidden: you do not own this property" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      // For 'all' properties, ownership is verified per-visitor below via RLS
    }

    // For 'all' properties mode, we handle settings per-visitor's property
    // For single property, fetch settings once
    let singleSettings: any = null;
    if (propertyId !== 'all') {
      const { data: settings, error: settingsError } = await supabase
        .from("salesforce_settings")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (settingsError || !settings) {
        return new Response(
          JSON.stringify({ error: "Salesforce settings not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let org: any = null;
      if ((settings as any).salesforce_org_id) {
        const { data: orgData } = await supabase
          .from("salesforce_orgs")
          .select("id, instance_url, access_token, refresh_token, token_expires_at, client_id, client_secret, login_url")
          .eq("id", (settings as any).salesforce_org_id)
          .single();
        org = orgData;
      }

      const effectiveInstanceUrl = org?.instance_url || settings.instance_url;
      const effectiveAccessToken = org?.access_token || settings.access_token;

      if (!effectiveInstanceUrl || !effectiveAccessToken) {
        return new Response(
          JSON.stringify({ error: "Salesforce not connected. Please connect your account first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Merge org tokens into settings so downstream code just uses settings/currentSettings
      singleSettings = { ...settings, instance_url: effectiveInstanceUrl, access_token: effectiveAccessToken, refresh_token: org?.refresh_token || settings.refresh_token, _org: org };
    }

    // Fetch visitors
    let visitorsQuery = supabase
      .from("visitors")
      .select("*")
      .in("id", visitorIds);
    
    // Only filter by property_id if not exporting across all properties
    if (propertyId !== 'all') {
      visitorsQuery = visitorsQuery.eq("property_id", propertyId);
    }

    const { data: visitors, error: visitorsError } = await visitorsQuery;

    if (visitorsError) {
      console.error("Error fetching visitors:", visitorsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch visitors", exported: 0, total: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!visitors || visitors.length === 0) {
      console.log("No visitors found for IDs:", visitorIds);
      return new Response(
        JSON.stringify({ exported: 0, total: 0, errors: ["No matching visitors found. They may have been deleted."] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get field mappings from single settings or will be fetched per visitor
    const fieldMappings = singleSettings ? (singleSettings.field_mappings || {}) : {};
    
    // Decrypt the access token if single settings
    let accessToken = singleSettings ? await decryptToken(singleSettings.access_token) : '';
    let currentSettings = singleSettings;
    let exported = 0;
    const errors: string[] = [];

    // Export each visitor as a Lead
    for (const visitor of visitors) {
      // For 'all' properties mode, fetch settings per visitor's property
      if (propertyId === 'all') {
        const { data: visitorSettings } = await supabase
          .from("salesforce_settings")
          .select("*")
          .eq("property_id", visitor.property_id)
          .maybeSingle();

        let vsOrg: any = null;
        if ((visitorSettings as any)?.salesforce_org_id) {
          const { data: orgData } = await supabase
            .from("salesforce_orgs")
            .select("id, instance_url, access_token, refresh_token, token_expires_at, client_id, client_secret, login_url")
            .eq("id", (visitorSettings as any).salesforce_org_id)
            .single();
          vsOrg = orgData;
        }

        const vsInstanceUrl = vsOrg?.instance_url || visitorSettings?.instance_url;
        const vsAccessToken = vsOrg?.access_token || visitorSettings?.access_token;

        if (!visitorSettings || !vsInstanceUrl || !vsAccessToken) {
          errors.push(`No Salesforce connection for ${visitor.name || visitor.email || visitor.id}`);
          continue;
        }
        currentSettings = { ...visitorSettings, instance_url: vsInstanceUrl, access_token: vsAccessToken, refresh_token: vsOrg?.refresh_token || visitorSettings.refresh_token, _org: vsOrg };
        accessToken = await decryptToken(vsAccessToken);
      }

      const currentFieldMappings = propertyId === 'all' 
        ? (currentSettings.field_mappings || {}) 
        : fieldMappings;

      const leadData: Record<string, string> = {};

      // Find the most recent conversation for this visitor (needed for transcript/summary)
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("visitor_id", visitor.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Map visitor fields to Salesforce Lead fields
      for (const [sfField, visitorField] of Object.entries(currentFieldMappings)) {
        // Handle special computed fields
        if (visitorField === 'conversation_transcript' || visitorField === 'conversation_summary') {
          let fieldValue = 'No conversation recorded';

          if (conversation) {
            // Fetch all messages for this conversation
            const { data: messages } = await supabase
              .from("messages")
              .select("content,sender_type,created_at")
              .eq("conversation_id", conversation.id)
              .order("sequence_number", { ascending: true });

            if (messages && messages.length > 0) {
              // Build raw transcript
              const transcript = messages
                .map((m: any) => {
                  const sender = m.sender_type === 'visitor' ? 'Visitor' : 'Agent';
                  return `${sender}: ${m.content}`;
                })
                .join('\n');

              if (visitorField === 'conversation_transcript') {
                fieldValue = transcript.substring(0, 32000);
              } else {
                // AI summary
                try {
                  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
                  if (!OPENAI_API_KEY) {
                    console.error("OPENAI_API_KEY not configured, falling back to transcript");
                    fieldValue = transcript.substring(0, 32000);
                  } else {
                    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                      method: "POST",
                      headers: {
                        "Authorization": `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                          {
                            role: "system",
                            content: "You are a lead summarization assistant. Given a chat transcript between a visitor and an agent, produce a concise summary in 40 words or fewer covering: key concerns, intent/interest level, and next steps. Be factual and professional."
                          },
                          {
                            role: "user",
                            content: `Summarize this conversation:\n\n${transcript.substring(0, 15000)}`
                          }
                        ],
                      }),
                    });

                    if (aiResponse.ok) {
                      const aiData = await aiResponse.json();
                      fieldValue = (aiData.choices?.[0]?.message?.content || transcript).substring(0, 32000);
                    } else {
                      console.error("AI summary failed, status:", aiResponse.status);
                      fieldValue = transcript.substring(0, 32000);
                    }
                  }
                } catch (aiErr) {
                  console.error("AI summarization error:", aiErr);
                  fieldValue = transcript.substring(0, 32000);
                }
              }
            }
          }

          leadData[sfField] = fieldValue;
          continue;
        }

        // Handle virtual first_name / last_name split from the name field
        if (visitorField === 'first_name') {
          const fullName = visitor.name || '';
          const parts = fullName.trim().split(/\s+/);
          // Only set first name if there are multiple parts (i.e. a real first + last)
          if (parts.length > 1) {
            leadData[sfField] = parts[0];
          }
          // Single name → leave FirstName empty, it goes to LastName
          continue;
        }
        if (visitorField === 'last_name') {
          const fullName = visitor.name || '';
          const parts = fullName.trim().split(/\s+/);
          if (parts.length > 1) {
            leadData[sfField] = parts.slice(1).join(' ');
          } else if (parts[0]) {
            // Single name goes entirely into LastName
            leadData[sfField] = parts[0];
          }
          continue;
        }

        const value = visitor[visitorField as keyof typeof visitor];
        if (value !== null && value !== undefined) {
          const strValue = String(value);
          // Convert MM/DD/YYYY dates to Salesforce-required YYYY-MM-DD format
          const mmddyyyy = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (mmddyyyy) {
            leadData[sfField] = `${mmddyyyy[3]}-${mmddyyyy[1].padStart(2, '0')}-${mmddyyyy[2].padStart(2, '0')}`;
          } else {
            leadData[sfField] = strValue;
          }
        }
      }

      // Ensure required fields have values
      if (!leadData.LastName) {
        leadData.LastName = visitor.name || visitor.email?.split('@')[0] || 'Unknown';
      }
      if (!leadData.Company) {
        leadData.Company = '[Not Provided]';
      }

      // Add lead source with property name
      const visitorPropertyId = propertyId === 'all' ? visitor.property_id : propertyId;
      const { data: propertyData } = await supabase
        .from("properties")
        .select("name")
        .eq("id", visitorPropertyId)
        .maybeSingle();
      leadData.LeadSource = propertyData?.name ? `Website Chat - ${propertyData.name}` : 'Website Chat';

      try {
        let response = await fetch(
          `${currentSettings.instance_url}/services/data/v59.0/sobjects/Lead`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(leadData),
          }
        );

        // Handle token refresh if needed
        if (response.status === 401 && (currentSettings._org?.refresh_token || currentSettings.refresh_token)) {
          const newToken = await refreshAccessToken(supabase, currentSettings, currentSettings._org);
          if (newToken) {
            accessToken = newToken;
            response = await fetch(
              `${currentSettings.instance_url}/services/data/v59.0/sobjects/Lead`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(leadData),
              }
            );
          }
        }

        if (response.ok) {
          const result = await response.json();
          const leadId = result.id;

          // --- Insurance card attachment ---
          if (currentSettings.include_insurance_card_attachment && visitor.insurance_card_url) {
            try {
              const imgResponse = await fetch(visitor.insurance_card_url);
              if (imgResponse.ok) {
                const imgBuffer = await imgResponse.arrayBuffer();
                const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
                const ext = visitor.insurance_card_url.split('.').pop()?.split('?')[0] || 'jpg';
                const fileName = `insurance_card.${ext}`;

                // Step 1: Create ContentVersion
                const cvResponse = await fetch(
                  `${currentSettings.instance_url}/services/data/v59.0/sobjects/ContentVersion`,
                  {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      Title: `Insurance Card - ${visitor.name || visitor.email || 'Visitor'}`,
                      PathOnClient: fileName,
                      VersionData: imgBase64,
                    }),
                  }
                );

                if (cvResponse.ok) {
                  const cvResult = await cvResponse.json();
                  // Step 2: Get ContentDocumentId from the created ContentVersion
                  const cvDetailRes = await fetch(
                    `${currentSettings.instance_url}/services/data/v59.0/sobjects/ContentVersion/${cvResult.id}?fields=ContentDocumentId`,
                    {
                      headers: { "Authorization": `Bearer ${accessToken}` },
                    }
                  );
                  if (cvDetailRes.ok) {
                    const cvDetail = await cvDetailRes.json();
                    // Step 3: Link to Lead
                    const linkRes = await fetch(
                      `${currentSettings.instance_url}/services/data/v59.0/sobjects/ContentDocumentLink`,
                      {
                        method: "POST",
                        headers: {
                          "Authorization": `Bearer ${accessToken}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          ContentDocumentId: cvDetail.ContentDocumentId,
                          LinkedEntityId: leadId,
                          ShareType: "V",
                          Visibility: "AllUsers",
                        }),
                      }
                    );
                    if (!linkRes.ok) {
                      const linkErr = await linkRes.json();
                      console.error("ContentDocumentLink error:", linkErr);
                    }
                  } else {
                    const detailErr = await cvDetailRes.text();
                    console.error("ContentVersion detail fetch error:", detailErr);
                  }
                } else {
                  const cvErr = await cvResponse.json();
                  console.error("ContentVersion creation error:", cvErr);
                }
              } else {
                console.error("Failed to fetch insurance card image, status:", imgResponse.status);
              }
            } catch (attachErr) {
              console.error("Insurance card attachment error:", attachErr);
            }
          }

          // --- Conditional Lead Status override ---
          // Check if ANY insurance-related info is present (card, company, member ID, DOB, or freeform)
          const hasInsuranceInfo = !!(
            visitor.insurance_card_url ||
            visitor.insurance_company ||
            visitor.member_id ||
            visitor.date_of_birth ||
            visitor.insurance_info
          );
          const statusToSet = hasInsuranceInfo
            ? currentSettings.insurance_card_lead_status
            : currentSettings.no_insurance_card_lead_status;

          if (statusToSet) {
            try {
              const patchRes = await fetch(
                `${currentSettings.instance_url}/services/data/v59.0/sobjects/Lead/${leadId}`,
                {
                  method: "PATCH",
                  headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ Status: statusToSet }),
                }
              );
              if (!patchRes.ok) {
                const patchErr = await patchRes.text();
                console.error("Lead status update error:", patchErr);
              }
            } catch (statusErr) {
              console.error("Lead status patch error:", statusErr);
            }
          }

          // Reuse conversation fetched earlier for transcript/summary
          if (conversation) {
            await supabase
              .from("salesforce_exports")
              .insert({
                conversation_id: conversation.id,
                salesforce_lead_id: leadId,
                export_type: exportType,
                exported_by: null,
              });

            // Log notification for the export
            await supabase
              .from("notification_logs")
              .insert({
                property_id: visitorPropertyId,
                conversation_id: conversation.id,
                notification_type: "salesforce_export",
                channel: "in_app",
                recipient: "system",
                recipient_type: "system",
                status: "sent",
                visitor_name: visitor.name || visitor.email || null,
              });
          }

          exported++;
        } else {
          const errorData = await response.json();
          console.error("Salesforce error:", errorData);
          errors.push(`Failed to export ${visitor.name || visitor.email || visitor.id}`);

          // Log failed export notification
          await supabase
            .from("notification_logs")
            .insert({
              property_id: visitorPropertyId,
              notification_type: "export_failed",
              channel: "in_app",
              recipient: "system",
              recipient_type: "system",
              status: "failed",
              visitor_name: visitor.name || visitor.email || null,
              error_message: JSON.stringify(errorData).substring(0, 500),
            });
        }
      } catch (err) {
        console.error("Export error:", err);
        errors.push(`Error exporting ${visitor.name || visitor.email || visitor.id}`);
      }
    }

    console.log(`Exported ${exported}/${visitors.length} leads by user ${callerUserId}`);

    return new Response(
      JSON.stringify({ 
        exported, 
        total: visitors.length,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refreshAccessToken(supabase: any, settings: any, org?: any): Promise<string | null> {
  try {
    const rawRefreshToken = org?.refresh_token || settings.refresh_token;
    const refreshToken = await decryptToken(rawRefreshToken);

    const clientId = org?.client_id || settings.client_id || Deno.env.get("SALESFORCE_CLIENT_ID");
    const clientSecret = org?.client_secret || settings.client_secret || Deno.env.get("SALESFORCE_CLIENT_SECRET");
    const loginUrl = org?.login_url || settings.login_url || "https://login.salesforce.com";

    if (!clientId || !clientSecret) {
      console.error("No Salesforce client credentials available for token refresh");
      return null;
    }

    const tokenUrl = `${loginUrl}/services/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error("Token refresh failed");
      return null;
    }

    const tokenData = await response.json();
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Update org-level token (primary)
    if (org?.id) {
      await supabase
        .from("salesforce_orgs")
        .update({ access_token: encryptedAccessToken, token_expires_at: newExpiry, updated_at: now })
        .eq("id", org.id);
    }

    // Keep salesforce_settings in sync for backward compatibility
    await supabase
      .from("salesforce_settings")
      .update({ access_token: encryptedAccessToken, token_expires_at: newExpiry, updated_at: now })
      .eq("id", settings.id);

    return tokenData.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}
