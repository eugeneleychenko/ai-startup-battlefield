/**
 * Optimized Prompt Templates for AI Startup Battle
 * 
 * These templates are specifically designed for:
 * - Groq Llama 3.3 (fast, direct, practical)
 * - OpenAI GPT-4o (creative, detailed, strategic)  
 * - Anthropic Sonnet 4 (analytical, structured, thoughtful)
 * - Anthropic Opus 4 (judge with consistent scoring)
 */

// Base interface for pitch generation parameters
export interface PitchParams {
  concept: string
  userGroup: string
}

// Interface for judge evaluation parameters
export interface JudgeParams extends PitchParams {
  pitches: {
    groq: string
    openai: string
    anthropic: string
  }
}

// Interface for judge response
export interface JudgeResponse {
  scores: {
    groq: number
    openai: number
    anthropic: number
  }
  winner: string
  reasoning: string
}

/**
 * GROQ LLAMA 3.3 PITCH TEMPLATE
 * 
 * Design rationale:
 * - Leverages Groq's speed and practical approach
 * - Direct, action-oriented language
 * - Focus on concrete metrics and implementation
 * - Minimal fluff, maximum impact
 */
export const getGroqPitchPrompt = ({ concept, userGroup }: PitchParams): string => {
  return `You are a Silicon Valley pitch expert known for fast, practical insights. Create a compelling startup pitch for "${concept} for ${userGroup}".

REQUIREMENTS:
- Under 280 words total
- Use this EXACT structure with emojis
- Be specific with numbers and metrics
- Focus on actionable strategies

STRUCTURE:
**[CONCEPT] FOR [USER_GROUP]**

🚀 **The Problem**
[2 sentences: What specific pain point does ${userGroup} face that current solutions don't address?]

💡 **Our Solution**  
[2-3 sentences: How does your ${concept}-inspired solution solve this uniquely?]

📈 **Go-to-Market**
[3 bullet points: Specific, actionable customer acquisition strategies]

💰 **Monetization**
[3 revenue streams with specific price points or percentages]

🌍 **Total Addressable Market**
[Specific market size with realistic methodology]

⚡ **Key Differentiators**
[3 unique features that competitors can't easily copy]

Be bold, specific, and focus on execution over theory. Use real market data when possible.`;
};

/**
 * OPENAI GPT-4O PITCH TEMPLATE
 * 
 * Design rationale:
 * - Leverages GPT-4o's creativity and strategic thinking
 * - Emphasizes innovation and market positioning
 * - More narrative-driven approach
 * - Focus on compelling storytelling within structure
 */
export const getOpenAIPitchPrompt = ({ concept, userGroup }: PitchParams): string => {
  return `You are a visionary startup strategist with a track record of identifying breakthrough opportunities. Create an innovative pitch for "${concept} for ${userGroup}".

MISSION: Transform how ${userGroup} operate by reimagining ${concept} for their unique needs.

FORMAT (under 300 words):
**[CONCEPT] FOR [USER_GROUP]**

🚀 **The Problem**
Identify the fundamental friction or inefficiency that ${userGroup} experience that others overlook.

💡 **Our Solution**
Describe your ${concept}-inspired platform that creates breakthrough value for ${userGroup}.

📈 **Go-to-Market**  
Three strategic approaches that leverage ${userGroup}'s existing networks and behaviors.

💰 **Monetization**
Multiple revenue streams that align with ${userGroup}'s spending patterns and value perception.

🌍 **Total Addressable Market**
Market opportunity with compelling growth trajectory and addressable segments.

⚡ **Key Differentiators**
Three innovation pillars that create sustainable competitive advantage.

TONE: Be visionary yet grounded. Think "Airbnb for X" level of paradigm shift. Emphasize network effects, platform dynamics, and scalable moats. Use compelling analogies and demonstrate deep market understanding.`;
};

/**
 * ANTHROPIC SONNET 4 PITCH TEMPLATE
 * 
 * Design rationale:
 * - Leverages Claude's analytical and structured thinking
 * - Emphasizes thorough market analysis
 * - Focus on logical reasoning and evidence-based claims
 * - Balanced approach considering risks and opportunities
 */
export const getAnthropicPitchPrompt = ({ concept, userGroup }: PitchParams): string => {
  return `You are a strategic business analyst creating a well-researched startup pitch for "${concept} for ${userGroup}". Apply rigorous thinking and evidence-based reasoning.

ANALYSIS FRAMEWORK:
Consider ${userGroup}'s current solutions, behaviors, constraints, and emerging needs. Evaluate how ${concept}'s core value propositions can be adapted for maximum relevance.

DELIVERABLE (under 300 words):
**[CONCEPT] FOR [USER_GROUP]**

🚀 **The Problem**
Articulate the core inefficiency or unmet need based on ${userGroup}'s specific workflows and constraints.

💡 **Our Solution**
Present a thoughtful adaptation of ${concept} that addresses root causes, not just symptoms.

📈 **Go-to-Market**
Three evidence-based customer acquisition strategies considering ${userGroup}'s decision-making processes.

💰 **Monetization**
Revenue model that reflects ${userGroup}'s budget cycles, purchasing authority, and value measurement.

🌍 **Total Addressable Market**
Market sizing with transparent methodology and realistic assumptions about penetration rates.

⚡ **Key Differentiators**
Three sustainable advantages based on deep understanding of ${userGroup}'s ecosystem.

APPROACH: Be thorough yet concise. Support claims with logical reasoning. Consider implementation challenges and how your solution addresses them. Balance optimism with realism.`;
};

/**
 * ANTHROPIC OPUS 4 JUDGE TEMPLATE
 * 
 * Design rationale:
 * - Leverages Opus's advanced reasoning capabilities
 * - Structured evaluation criteria for consistency
 * - JSON output requirement for system integration
 * - Balanced scoring methodology
 */
export const getJudgePrompt = ({ concept, userGroup, pitches }: JudgeParams): string => {
  return `You are a seasoned venture capital partner with 15+ years evaluating early-stage startups. Evaluate these three pitches for "${concept} for ${userGroup}" with professional rigor.

EVALUATION CRITERIA (each scored 1-10):
1. MARKET VIABILITY: How realistic is the target market and user need assessment?
2. INNOVATION: How creative and differentiated is the solution approach?
3. MONETIZATION CLARITY: How well-defined and realistic are the revenue streams?
4. TAM ACCURACY: How credible is the market sizing and methodology?
5. PITCH QUALITY: How compelling and professional is the overall presentation?

PITCHES TO EVALUATE:

**GROQ/LLAMA 3.3 PITCH:**
${pitches.groq}

**OPENAI/GPT-4O PITCH:**
${pitches.openai}

**ANTHROPIC/SONNET 4 PITCH:**
${pitches.anthropic}

SCORING GUIDELINES:
- 8-10: Exceptional (top 10% of pitches you've seen)
- 6-7: Good (fundable with refinement)
- 4-5: Average (significant concerns but potential)
- 1-3: Poor (major flaws or unrealistic assumptions)

REQUIRED OUTPUT FORMAT (valid JSON only):
{
  "scores": {
    "groq": 6,
    "openai": 8, 
    "anthropic": 7
  },
  "winner": "openai",
  "reasoning": "[Provide a comprehensive 1-paragraph analysis (4-6 sentences) that: 1) Briefly summarizes the key strengths and weaknesses of each pitch, 2) Explicitly contrasts their different approaches to market positioning, solution design, or go-to-market strategy, 3) Clearly explains why the winning pitch was superior - was it more realistic market analysis, better monetization strategy, stronger competitive advantage, or more compelling execution plan? 4) Mention specific elements from the pitches that influenced your decision.]"
}

CRITICAL: Each score MUST be a single integer from 1-10, NOT an array. Example: "groq": 6 (correct), NOT "groq": [6, 7, 8] (incorrect).

ANALYSIS REQUIREMENTS:
- Compare all three pitches directly against each other
- Identify what made the winner stand out from the other two
- Be specific about strengths/weaknesses rather than generic
- Focus on fundability from a VC perspective
- Evaluate objectively based on startup fundamentals, not model preferences`;
};

/**
 * UTILITY FUNCTIONS
 */

// Get the appropriate prompt based on model
export const getPitchPrompt = (model: 'groq' | 'openai' | 'anthropic', params: PitchParams): string => {
  switch (model) {
    case 'groq':
      return getGroqPitchPrompt(params);
    case 'openai':
      return getOpenAIPitchPrompt(params);
    case 'anthropic':
      return getAnthropicPitchPrompt(params);
    default:
      throw new Error(`Unknown model: ${model}`);
  }
};

// Validate judge response format
export const validateJudgeResponse = (response: any): response is JudgeResponse => {
  return (
    response &&
    typeof response === 'object' &&
    response.scores &&
    typeof response.scores.groq === 'number' &&
    typeof response.scores.openai === 'number' &&
    typeof response.scores.anthropic === 'number' &&
    typeof response.winner === 'string' &&
    ['groq', 'openai', 'anthropic'].includes(response.winner) &&
    typeof response.reasoning === 'string' &&
    response.reasoning.length > 0
  );
};

// Helper to ensure scores are within valid range
export const normalizeScores = (scores: { groq: number; openai: number; anthropic: number }) => {
  const clamp = (value: number) => Math.max(1, Math.min(10, Math.round(value)));
  return {
    groq: clamp(scores.groq),
    openai: clamp(scores.openai),
    anthropic: clamp(scores.anthropic),
  };
};