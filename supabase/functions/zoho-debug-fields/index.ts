// One-off diagnostic: lists the actual API names + picklist values of fields
// on the Zoho Leads module for a given property's connection. Use this when
// a field write is silently dropped by Zoho (mismatched API name or invalid
// picklist value) so we can fix the export payload without guessing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function deriveKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("zoho-token-encryption-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

async function decryptToken(encrypted: string): Promise<string> {
  if (!encrypted.startsWith("enc:")) return encrypted;
  const parts = encrypted.split(":");
  const iv = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
  const key = await deriveKey("decrypt");
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuffer);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const propertyId = url.searchParams.get("propertyId") || "bfb299de-1589-4e71-a2a7-e1504e0d785a";
  const filter = url.searchParams.get("filter")?.toLowerCase();

  const { data: connection } = await supabase
    .from("zoho_connections")
    .select("*")
    .eq("property_id", propertyId)
    .single();

  if (!connection) {
    return new Response(JSON.stringify({ error: "No Zoho connection for property" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = await decryptToken(connection.access_token_enc);

  const res = await fetch(`${connection.api_domain}/crm/v2/settings/fields?module=Leads`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  const data = await res.json();
  if (!res.ok || !data.fields) {
    return new Response(JSON.stringify({ zohoStatus: res.status, zohoResponse: data }, null, 2), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const fields = (data.fields || []).map((f: Record<string, unknown>) => ({
    label: f.field_label,
    api_name: f.api_name,
    data_type: f.data_type,
    pick_list_values: (f.pick_list_values as Array<{ display_value: string; actual_value: string }> | undefined)
      ?.map(v => v.actual_value),
  }));

  const filtered = filter
    ? fields.filter((f: { label: string; api_name: string }) =>
        f.label?.toLowerCase().includes(filter) || f.api_name?.toLowerCase().includes(filter))
    : fields;

  return new Response(JSON.stringify({ count: filtered.length, fields: filtered }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
