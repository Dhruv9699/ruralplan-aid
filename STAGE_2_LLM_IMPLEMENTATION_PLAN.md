# STAGE 2: FULL LLM ASSISTANT INTEGRATION — IMPLEMENTATION PLAN

**Date:** September 4, 2026  
**Status:** In Progress  
**Objective:** Replace rule-based assistant with LLM-powered responses while maintaining security, performance, and data integrity

---

## ARCHITECTURE DECISION

### Recommended Approach: Supabase Edge Functions + OpenAI API

**Why this approach:**
1. **Security:** API keys stay server-side, never exposed to client
2. **Cost Control:** Edge functions can implement rate limiting and cost controls
3. **Integration:** Supabase already in use; minimal infrastructure changes
4. **Scalability:** Edge functions scale automatically
5. **Maintenance:** Single point of control for LLM logic

### Technology Stack
- **LLM Provider:** OpenAI GPT-4 (or GPT-3.5-turbo for cost optimization)
- **Backend:** Supabase Edge Functions (TypeScript/Deno)
- **Client:** React hook that calls edge function
- **Security:** API key in Supabase env variables only
- **Rate Limiting:** Implemented in edge function

---

## IMPLEMENTATION STEPS

### Step 1: Create Supabase Edge Function
- Location: `supabase/functions/assistant`
- Handler: Receives user message + context
- Calls: OpenAI API with system prompt
- Returns: AI response (streamed or complete)
- Security: Validates user_id, respects RLS

### Step 2: Build Assistant Context Builder
- Collect relevant RuralPlan data
- Build compact context object
- Include: products, sales, inventory, demand, weather
- Exclude: unnecessary/sensitive data
- Track conversation history (limited to last N messages)

### Step 3: Implement LLM-Powered Response
- Replace hardcoded templates
- Use system prompt defining assistant personality
- Dynamic response length based on question complexity
- Multilingual support (detect/use selected language)
- Cost optimization (token usage monitoring)

### Step 4: Client-Side Integration
- Create new hook: `useAssistantLLM()`
- Handle loading/error states
- Stream responses or show typing indicator
- Maintain conversation history
- Handle API failures gracefully

### Step 5: Test & Iterate
- Test all languages (English, Hindi, Marathi)
- Test edge cases and error handling
- Verify RLS still works
- Monitor costs
- Optimize prompt for better responses

---

## LLM PROVIDER ANALYSIS

### OpenAI GPT-4
- **Cost:** ~$0.03/1K input tokens, ~$0.06/1K output tokens
- **Quality:** Excellent, understands context well
- **Speed:** ~1-3 seconds per response
- **Multilingual:** Excellent (but responses in target language)
- **Recommendation:** Best for production if budget allows

### OpenAI GPT-3.5-turbo
- **Cost:** ~$0.0005/1K input, ~$0.0015/1K output (90% cheaper)
- **Quality:** Good, sufficient for most queries
- **Speed:** ~500ms-1s per response
- **Multilingual:** Good
- **Recommendation:** Best for cost optimization

### Claude (Anthropic)
- **Cost:** Similar to GPT-4
- **Quality:** Excellent, very thorough
- **Limitation:** Requires separate API key/setup

### Recommendation for RuralPlan
**Use GPT-3.5-turbo for now** (cost-effective, good quality)
- ~$0.002 per message (input + output average)
- 500 messages/month = ~$1
- 5000 messages/month = ~$10

---

## SYSTEM PROMPT DESIGN

The assistant will use this system prompt:

```
You are RuralPlan AI — a practical production planning advisor for rural entrepreneurs in Maharashtra, India.

Your role:
- Understand production planning questions
- Use the user's actual RuralPlan data to provide recommendations
- Explain reasoning in simple, clear language
- Recommend experiments when confidence is low
- Consider inventory, capacity, seasonality, and weather

Response style:
- Simple question → 1-3 sentences
- Planning question → Recommendation + reasoning
- Complex question → Situation, analysis, recommendation, next step

Important rules:
- NEVER invent data (demand, sales, prices, customers)
- ALWAYS use actual numbers from the user's data
- If data is missing, say what's needed
- Explain uncertainty when it exists
- Consider seasonal patterns and production capacity
- Suggest pilot batches for new ideas
- Use user's selected language (English, हिंदी, मराठी)
- Keep product names and user-entered values unchanged

Example:
Q: "Should I produce more mango pickle?"
A: "Based on your current data, I wouldn't produce a large batch yet. Your estimated monthly demand is 60 units, and you already have 35 units in stock. Since this product has limited sales history, I'd start with a smaller pilot of 20-25 units. Use the next few weeks to confirm demand before committing to full production."
```

---

## CONTEXT OBJECT STRUCTURE

Built per-message to send to LLM:

```typescript
interface AssistantContext {
  // Product information
  product: {
    id: string;
    name: string;
    currentStock: number;
    productionCapacity: number;
    shelfLife: number;
    unit: string;
  };
  
  // Demand information
  demand: {
    estimate: number;
    confidence: "high" | "medium" | "low";
    trend: "increasing" | "stable" | "decreasing";
    monthsOfData: number;
    method: "historical" | "cold_start";
  };
  
  // Inventory
  inventory: {
    currentStock: number;
    minimumStock: number;
    safetyStock: number;
  };
  
  // Raw materials
  rawMaterial: {
    name: string;
    currentQty: number;
    requiredQty: number;
    unit: string;
    status: "green" | "yellow" | "red";
  };
  
  // Weather
  weather: {
    today: string; // "Sunny", "Rainy", etc.
    forecastNote: string;
  };
  
  // Production capacity
  capacity: {
    dailyCapacity: number;
    workers: number;
    unit: string;
  };
  
  // Recent sales (last 5 entries)
  recentSales: Array<{
    date: string;
    quantity: number;
    location: string;
  }>;
  
  // Alerts (if any)
  alerts: string[];
  
  // Cold Start info (if available)
  coldStart?: {
    demandMode: "normal" | "cold_start";
    estimatedCustomers?: number;
    conversionRate?: number;
    isSeasonal: boolean;
  };
  
  // User location (for context)
  location: {
    village: string;
    district: string;
  };
  
  // Conversation history (last 3 exchanges)
  conversationHistory: Array<{
    role: "user" | "assistant";
    message: string;
  }>;
}
```

---

## COST ESTIMATION

**Monthly Usage Projection:**

| Scenario | Messages/Month | Cost (GPT-3.5) | Cost (GPT-4) |
|----------|---|---|---|
| Low (casual use) | 100 | $0.20 | $2.00 |
| Medium (regular) | 500 | $1.00 | $10.00 |
| High (power user) | 2000 | $4.00 | $40.00 |

**Recommendation:** Start with GPT-3.5, monitor usage, upgrade to GPT-4 if needed

---

## SECURITY CHECKLIST

- [ ] API key stored in Supabase environment variables only
- [ ] NO API key in frontend code (client-side)
- [ ] NO API key in .env file committed to git
- [ ] Edge function validates user_id from auth context
- [ ] RLS rules still apply (user can only see their data)
- [ ] Conversation history NOT stored permanently (session only)
- [ ] Context object sanitized (no sensitive data)
- [ ] Rate limiting implemented (prevent abuse)
- [ ] Error messages don't leak sensitive info
- [ ] API responses validated before sending to client

---

## MULTILINGUAL IMPLEMENTATION

### Approach: Single LLM Call with Language Instruction

System prompt includes:
```
Respond in the user's selected language:
- English: Clear, professional English
- हिंदी: Simple Hindi suitable for rural entrepreneurs
- मराठी: Simple Marathi suitable for rural entrepreneurs
```

### Language Detection
- Use `useTranslation()` hook to get current language
- Pass language to backend in API call
- Backend includes language in system prompt

### Translation Quality
- GPT-3.5 is good for Hindi/Marathi
- But responses might not be perfectly natural
- Acceptable for MVP; can improve in future

---

## TESTING STRATEGY

### Unit Tests
- [ ] Context builder creates valid object
- [ ] System prompt is valid
- [ ] Error handling works

### Integration Tests
- [ ] User message → Edge function → OpenAI → Response
- [ ] RLS enforced (user sees only their data)
- [ ] Multilingual responses work

### End-to-End Tests
- [ ] English questions answered correctly
- [ ] Hindi questions answered in हिंदी
- [ ] Marathi questions answered in मराठी
- [ ] No data invented
- [ ] Uses actual user numbers
- [ ] Handles missing data gracefully
- [ ] API failures don't crash app
- [ ] Slow responses show loading state

### Edge Cases
- [ ] No products in account
- [ ] No sales data
- [ ] New user (Cold Start mode)
- [ ] Seasonal product query
- [ ] Question outside scope
- [ ] Very long conversation history

---

## ROLLOUT PLAN

1. **Phase 1:** Deploy edge function + test with internal team
2. **Phase 2:** Enable for 10% of users, monitor costs
3. **Phase 3:** Full rollout, monitor quality/usage
4. **Phase 4:** Optimize based on user feedback

---

## NEXT ACTIONS

1. Set up OpenAI API account and get API key
2. Store API key in Supabase environment variables
3. Create edge function handler
4. Build context builder
5. Implement client hook
6. Test across languages
7. Deploy and monitor

---

**Ready to proceed with implementation.**
