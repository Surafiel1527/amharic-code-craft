import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, userId } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // System prompt for generating complete HTML websites
    const systemPrompt = `You are an expert web developer. Generate a COMPLETE, SINGLE HTML file based on the user's description.

CRITICAL REQUIREMENTS:
1. Generate ONE complete HTML file with all CSS and JavaScript inline
2. Use modern, responsive design with Tailwind CSS (include via CDN)
3. Include all sections, components, and functionality described
4. Add smooth animations and transitions
5. Make it mobile-responsive and beautiful
6. Include placeholder images from picsum.photos or unsplash
7. Add interactive JavaScript where appropriate
8. Use semantic HTML5 elements
9. Include proper meta tags and favicon

STRUCTURE:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Page Title]</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Custom CSS here */
  </style>
</head>
<body>
  <!-- Complete website content -->
  <script>
    // Interactive JavaScript
  </script>
</body>
</html>

Return ONLY the complete HTML code, nothing else. No explanations, no markdown code blocks, just the raw HTML.`;

    console.log("Generating website for prompt:", prompt);

    // Call Lovable AI to generate the website
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add more credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let html = data.choices?.[0]?.message?.content || "";

    // Clean up the HTML if it's wrapped in markdown code blocks
    html = html.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();

    if (!html || html.length < 100) {
      throw new Error("Generated HTML is too short or empty");
    }

    console.log("Website generated successfully, length:", html.length);

    return new Response(
      JSON.stringify({ html, success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in generate-website:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
