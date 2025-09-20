# AI Startup Battle - Implementation Tasklist

## Phase 1: Environment & Dependencies Setup
- [x] Install AI SDK packages: `ai @ai-sdk/openai @ai-sdk/anthropic groq-sdk`
- [x] Create `.env.local` template with API key placeholders
- [x] Set up TypeScript types for API responses

## Phase 2: API Routes Implementation
- [x] Create `/app/api/pitch/groq/route.ts` - Use `llama-3.3-70b-versatile` model
- [x] Create `/app/api/pitch/openai/route.ts` - Use `gpt-4o` model  
- [x] Create `/app/api/pitch/anthropic/route.ts` - Use `claude-sonnet-4-20250514` model
- [x] Create `/app/api/judge/route.ts` - Use `claude-opus-4-20250514` for judge
- [x] Implement proper prompt templates for pitch generation
- [x] Implement judge evaluation prompt with JSON response format
- [x] Add streaming responses using Vercel AI SDK's `streamText`

## Phase 3: Frontend Integration
- [x] Replace mock data in `battle-arena.tsx` with real API calls
- [x] Update component to use `useChat` or fetch for streaming
- [x] Update `judge-verdict.tsx` to call judge API endpoint
- [x] Add proper TypeScript interfaces for all API responses
- [x] Implement real-time streaming display

## Phase 4: Error Handling & Polish
- [x] Add error boundaries for failed API calls
- [x] Implement retry mechanisms for individual model failures
- [x] Add fallback strategies (continue with successful responses)
- [x] Add request validation and input sanitization
- [x] Implement rate limiting middleware
- [x] Add loading states and connection status indicators
- [x] Test with actual API keys and optimize performance

## Latest Model Names for AI SDK:
- **Groq**: `llama-3.3-70b-versatile`
- **OpenAI**: `gpt-4o` 
- **Anthropic Pitch Generator**: `claude-sonnet-4-20250514`
- **Anthropic Judge**: `claude-opus-4-20250514`
- **Alternative Anthropic Models**: 
  - `claude-3-7-sonnet-20250219`
  - `claude-3-5-sonnet-20240620`
  - `claude-3-5-haiku-20241022`

## Key Technical Decisions:
- Use server-side API routes to protect API keys
- Start with streaming implementation using Vercel AI SDK
- Progressive error handling (continue with partial results)
- Use Claude 4 Opus for judge (most capable) and Sonnet 4 for pitches
- Match UI branding: "SONNET 4" for pitches, "OPUS 4.1" for judge

**Estimated Total Time**: 6-8 hours