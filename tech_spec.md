    # Technical Specification: "This for That" AI Startup Battle

## Project Overview
Integrate Vercel AI SDK with existing frontend to enable real-time AI model competition where Groq (Llama 3.3), OpenAI (GPT-4o), and Anthropic (Sonnet 4) generate startup pitches in parallel, with Anthropic (Opus 4.1) as judge.

## 1. Environment Setup

### Install Dependencies
```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic groq-sdk
```

### Create `.env.local` file
```env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
```

## 2. API Routes Implementation

### Create folder structure:
```
app/
  api/
    pitch/
      groq/
        route.ts
      openai/
        route.ts
      anthropic/
        route.ts
    judge/
      route.ts
```

### 2.1 `/app/api/pitch/groq/route.ts`
- Use Groq SDK with model `llama-3.3-70b-versatile`
- Stream response using Vercel AI SDK's `streamText` 
- Accept POST with `{ concept: string, userGroup: string }`
- Return streaming response with pitch content

### 2.2 `/app/api/pitch/openai/route.ts`
- Use OpenAI SDK with model `gpt-4o`
- Implement same streaming pattern
- Same request/response format

### 2.3 `/app/api/pitch/anthropic/route.ts`
- Use Anthropic SDK with model `claude-3-5-sonnet-20241022`
- Implement same streaming pattern
- Same request/response format

### 2.4 `/app/api/judge/route.ts`
- Use Anthropic SDK with model `claude-3-opus-20240229`
- Accept POST with all three pitches
- Return JSON with scores and verdict
- Structure: `{ scores: { groq: number, openai: number, anthropic: number }, winner: string, reasoning: string }`

## 3. Prompt Templates

### Pitch Generation Prompt
```typescript
const pitchPrompt = `
You are a Silicon Valley pitch expert. Create a compelling startup pitch for:
"${concept} for ${userGroup}"

Structure your pitch with:
1. Company Name & Tagline
2. Problem Statement (2-3 sentences)
3. Solution (2-3 sentences)
4. Go-to-Market Strategy (3 bullet points)
5. Monetization Model (2-3 strategies)
6. Total Addressable Market (specific number with reasoning)
7. Key Differentiators (3 unique features)

Be creative, specific, and compelling. Use emojis sparingly for emphasis.
Keep total length under 300 words.
`
```

### Judge Evaluation Prompt
```typescript
const judgePrompt = `
Evaluate these three startup pitches for "${concept} for ${userGroup}":

[Pitches will be inserted here]

Score each pitch from 1-10 on:
- Market viability
- Innovation
- Monetization clarity
- TAM accuracy
- Overall pitch quality

Return JSON:
{
  "scores": { "groq": X, "openai": Y, "anthropic": Z },
  "winner": "model_name",
  "reasoning": "Brief explanation"
}
`
```

## 4. Frontend Modifications

### 4.1 Update `battle-arena.tsx`

**Replace mock generation with real API calls:**
```typescript
// Add useChat hooks for each model
import { useChat } from 'ai/react'

// Initialize three separate chat instances
const groqChat = useChat({ 
  api: '/api/pitch/groq',
  id: 'groq-chat'
})

const openaiChat = useChat({ 
  api: '/api/pitch/openai',
  id: 'openai-chat'
})

const anthropicChat = useChat({ 
  api: '/api/pitch/anthropic',
  id: 'anthropic-chat'
})
```

**Trigger parallel generation:**
- On component mount, call all three APIs simultaneously
- Stream responses into respective UI panels
- Track completion states
- Call `onPitchesComplete` when all three finish

### 4.2 Update `judge-verdict.tsx`

**Add judge API call:**
```typescript
const response = await fetch('/api/judge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    pitches, 
    concept, 
    userGroup 
  })
})
```

## 5. Error Handling

### Add error states to components:
- Connection errors: "Failed to connect to [Model Name]"
- Timeout handling: 30-second timeout per model
- Retry mechanism: Allow manual retry on failure
- Fallback: If one model fails, continue with others

### Create error boundary component:
```typescript
components/error-boundary.tsx
```

## 6. Loading States

### Enhance existing loading indicators:
- Show actual streaming progress
- Display tokens/second for each model
- Add "thinking" animation before stream starts
- Show connection status

## 7. Testing Checklist

- [ ] All API keys configured correctly
- [ ] Each model generates unique content
- [ ] Streaming works smoothly for all models
- [ ] Groq noticeably faster than others
- [ ] Judge provides consistent scoring
- [ ] Error states handle API failures gracefully
- [ ] Mobile responsive layout maintained
- [ ] No CORS issues in production

## 8. Performance Optimizations

- Implement request debouncing for spin button
- Add caching for repeated concept/userGroup combinations
- Optimize bundle size with dynamic imports
- Add request queuing to prevent rate limits

## 9. Optional Enhancements

### Phase 2 Features:
- Save favorite pitches to localStorage
- Track win/loss statistics per model
- Add sound effects for spinning/completion
- Implement confetti animation for winner
- Add share functionality for results

## 10. Deployment Considerations

### Vercel Deployment:
- Set environment variables in Vercel dashboard
- Configure Edge Functions for API routes
- Set up rate limiting middleware
- Add analytics tracking

### Security:
- Implement API rate limiting
- Add request validation
- Sanitize user inputs
- Use environment variables for all keys

## Deliverables

1. **Working API routes** with proper streaming
2. **Updated components** using real API calls
3. **Error handling** for all edge cases
4. **Documentation** for API endpoints
5. **Test results** showing all models working

## Timeline Estimate
- API Routes Setup: 2-3 hours
- Frontend Integration: 2-3 hours  
- Testing & Debugging: 2 hours
- Polish & Optimization: 1-2 hours

**Total: 7-10 hours**

## Success Criteria
- All three models generate pitches simultaneously
- Visible speed difference between Groq and others
- Judge provides meaningful scoring
- No console errors or warnings
- Smooth user experience from spin to verdict