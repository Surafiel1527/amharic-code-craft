import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const apiKey = authHeader.replace("Bearer ", "");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify API key
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API key" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(apiKey);
    const rateLimitHeaders = getRateLimitHeaders(apiKey);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    // Parse request body
    const { prompt, style, components } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Call Lovable AI to generate content
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const aiResponse = await fetch("https://api.lovable.app/v1/completion", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `Generate a ${style || "modern"} website based on this prompt: ${prompt}. 
                     Include these components: ${components?.join(", ") || "standard layout"}.
                     Return only HTML, CSS, and JavaScript code.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("Failed to generate content");
    }

    const aiData = await aiResponse.json();
    const generatedCode = aiData.choices?.[0]?.message?.content || "";

    // Update API key usage
    await supabase
      .from("api_keys")
      .update({
        usage_count: keyData.usage_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq("id", keyData.id);

    return new Response(
      JSON.stringify({
        success: true,
        code: generatedCode,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          ...rateLimitHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});