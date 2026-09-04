import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

interface AssistantMessage {
  userMessage: string;
  language: "en" | "hi" | "mr";
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

interface ContextData {
  products: any[];
  sales: any[];
  materials: any[];
  settings: any;
}

// Build context object for LLM
function buildContext(data: ContextData, selectedProduct: any) {
  if (!selectedProduct) {
    return {
      summary: "No products found in account",
      products: data.products,
    };
  }

  // Calculate demand estimate
  const sales = data.sales.filter((s) => s.product_id === selectedProduct.id);
  const monthlyDemand = sales.length > 0 
    ? Math.round(sales.reduce((sum, s) => sum + s.quantity_sold, 0) / Math.max(1, Math.ceil(sales.length / 30)))
    : 0;

  // Get raw material status
  const rawMaterial = data.materials.find((m) => 
    m.material_name.toLowerCase() === selectedProduct.raw_material_name.toLowerCase()
  );

  return {
    product: {
      name: selectedProduct.product_name,
      currentStock: selectedProduct.current_stock,
      capacity: selectedProduct.production_capacity,
      unit: selectedProduct.unit,
      shelfLife: selectedProduct.shelf_life,
    },
    demand: {
      estimate: monthlyDemand,
      monthsOfData: Math.ceil(sales.length / 30),
      hasHistory: sales.length >= 3,
    },
    rawMaterial: {
      name: selectedProduct.raw_material_name,
      available: rawMaterial?.current_quantity ?? 0,
      required: rawMaterial?.required_quantity ?? 0,
    },
    weather: "Unknown (not provided)",
    location: data.settings,
  };
}

// Generate system prompt based on language
function getSystemPrompt(language: "en" | "hi" | "mr"): string {
  const prompts = {
    en: `You are RuralPlan AI - a practical production planning advisor for rural entrepreneurs in Maharashtra, India.

Your job is to understand questions about production planning and provide actionable advice using the user's actual RuralPlan data.

Important guidelines:
- NEVER invent data (demand, sales, prices, customers, inventory)
- ALWAYS use the actual numbers provided from the user's account
- If critical data is missing, ask for it clearly
- Explain your reasoning in simple, clear language
- Keep responses concise but complete
- Suggest pilot batches when confidence is low
- Consider production capacity, inventory levels, and seasonality
- Use the user's product names exactly as entered

Response structure:
- Simple question (1-2 sentences): Direct answer
- Planning question (2-3 sentences): Recommendation + reasoning
- Complex question (3-4 sentences): Situation → Analysis → Recommendation → Next step

Keep responses practical and actionable, not theoretical.`,

    hi: `आप RuralPlan AI हैं - महाराष्ट्र के ग्रामीण उद्यमियों के लिए एक व्यावहारिक उत्पादन योजना सलाहकार।

आपका काम उत्पादन योजना के बारे में सवालों को समझना और उपयोगकर्ता के वास्तविक RuralPlan डेटा का उपयोग करके कार्रवाई योग्य सलाह प्रदान करना है।

महत्वपूर्ण दिशानिर्देश:
- कभी भी डेटा का आविष्कार न करें (मांग, बिक्री, कीमतें, ग्राहक, इन्वेंटरी)
- हमेशा उपयोगकर्ता के खाते से प्रदान की गई वास्तविक संख्याओं का उपयोग करें
- यदि महत्वपूर्ण डेटा गायब है, तो इसे स्पष्ट रूप से मांगें
- सरल, स्पष्ट भाषा में अपनी तर्क समझाएं
- उत्पादन क्षमता, इन्वेंटरी स्तर और मौसमिकता पर विचार करें
- उपयोगकर्ता के उत्पाद के नाम बिल्कुल वैसे ही रखें जैसे दर्ज किए गए हैं

सरल प्रश्न: सीधा उत्तर (1-2 वाक्य)
योजना प्रश्न: सिफारिश + कारण (2-3 वाक्य)
जटिल प्रश्न: स्थिति → विश्लेषण → सिफारिश → अगला कदम (3-4 वाक्य)`,

    mr: `आप RuralPlan AI आहात - महाराष्ट्रातील ग्रामीण उद्यमींसाठी एक व्यावहारिक उत्पादन नियोजन सलाहकार.

तुमचे काम उत्पादन नियोजनाबद्दल प्रश्नांना समझणे आणि वापरकर्त्याच्या वास्तविक RuralPlan डेटाचा वापर करून कार्यशील सल्ला देणे हे आहे.

महत्वाचे दिशानिर्देश:
- कधीही डेटा बनवू नका (मागणी, विक्रय, किंमती, ग्राहक, इन्व्हेंटरी)
- नेहमी वापरकर्त्याच्या खात्यावरून दिलेल्या वास्तविक संख्यांचा वापर करा
- महत्वाचा डेटा हरवल्यास स्पष्टपणे विचारा
- सोपी, स्पष्ट भाषेत तुमचे कारण समझा
- उत्पादन क्षमता, इन्व्हेंटरी स्तर आणि ऋतुनिष्ठता विचारात घ्या
- वापरकर्त्याचे उत्पाद नाव तंतोतंत तसेच ठेवा जसे प्रविष्ट केले गेले आहे

सोपा प्रश्न: सरळ उत्तर (1-2 वाक्य)
नियोजन प्रश्न: शिफारस + कारण (2-3 वाक्य)
क्लिष्ट प्रश्न: परिस्थिती → विश्लेषण → शिफारस → पुढील पाऊल (3-4 वाक्य)`,
  };

  return prompts[language];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request body
    const body: AssistantMessage = await req.json();
    const { userMessage, language, conversationHistory } = body;

    // Get authorization token
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No authorization token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Fetch user's RuralPlan data
    const [
      { data: products },
      { data: sales },
      { data: materials },
      { data: settings },
    ] = await Promise.all([
      supabase.from("products").select("*").eq("user_id", user.id),
      supabase.from("sales_history").select("*").eq("user_id", user.id),
      supabase.from("inventory").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

    // Get first product or find relevant one
    let selectedProduct = products?.[0];
    if (products && products.length > 1) {
      // Try to find product mentioned in message
      const messageLower = userMessage.toLowerCase();
      selectedProduct = products.find((p) =>
        messageLower.includes(p.product_name.toLowerCase())
      ) || products[0];
    }

    // Build context
    const context = buildContext(
      {
        products: products || [],
        sales: sales || [],
        materials: materials || [],
        settings: settings || {},
      },
      selectedProduct
    );

    // Build messages for OpenAI
    const messages: any[] = [];

    // Add conversation history (limited to last 4 messages for context window)
    const recentHistory = conversationHistory.slice(-4);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message with context
    messages.push({
      role: "user",
      content: `${userMessage}

Context from your RuralPlan account:
${JSON.stringify(context, null, 2)}

Please provide practical advice based on this data.`,
    });

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: getSystemPrompt(language),
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      return new Response(JSON.stringify({ error: error.error?.message || "OpenAI API error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0]?.message?.content || "I couldn't generate a response.";

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        tokens: openaiData.usage,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
