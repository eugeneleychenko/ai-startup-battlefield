// =============================================================================
// AI STARTUP BATTLE - ERROR HANDLING UTILITIES
// =============================================================================

import { 
  APIError, 
  ValidationError, 
  RateLimitError, 
  ModelError, 
  AIProvider,
  isAPIError,
  isValidationError,
  isRateLimitError,
  isModelError,
  RETRY_CONFIG,
  API_TIMEOUTS
} from './types'

// -----------------------------------------------------------------------------
// Error Creation Utilities
// -----------------------------------------------------------------------------

export function createAPIError(
  code: string,
  message: string,
  options: {
    details?: Record<string, any>
    provider?: AIProvider
    retryable?: boolean
  } = {}
): APIError {
  return {
    code,
    message,
    details: options.details,
    provider: options.provider,
    timestamp: new Date().toISOString(),
    retryable: options.retryable ?? false
  }
}

export function createValidationError(
  field: string,
  value: any,
  constraints: string[],
  provider?: AIProvider
): ValidationError {
  return {
    ...createAPIError('VALIDATION_ERROR', `Validation failed for field: ${field}`, { provider }),
    field,
    value,
    constraints
  }
}

export function createRateLimitError(
  retryAfter: number,
  remainingRequests: number,
  provider?: AIProvider
): RateLimitError {
  return {
    ...createAPIError('RATE_LIMIT_ERROR', 'Rate limit exceeded', { provider, retryable: true }),
    retryAfter,
    remainingRequests,
    resetTime: new Date(Date.now() + retryAfter * 1000).toISOString()
  }
}

export function createModelError(
  modelName: string,
  modelProvider: AIProvider,
  message: string,
  fallbackAvailable: boolean = false
): ModelError {
  return {
    ...createAPIError('MODEL_ERROR', message, { provider: modelProvider, retryable: fallbackAvailable }),
    modelName,
    modelProvider,
    fallbackAvailable
  }
}

export function createNetworkError(provider?: AIProvider): APIError {
  return createAPIError('NETWORK_ERROR', 'Network connection failed', { 
    provider, 
    retryable: true 
  })
}

export function createTimeoutError(provider?: AIProvider): APIError {
  return createAPIError('TIMEOUT_ERROR', 'Request timed out', { 
    provider, 
    retryable: true 
  })
}

export function createAPIKeyError(provider: AIProvider): APIError {
  return createAPIError('API_KEY_ERROR', `Missing or invalid API key for ${provider}`, { 
    provider, 
    retryable: false 
  })
}

// -----------------------------------------------------------------------------
// Error Parsing and Normalization
// -----------------------------------------------------------------------------

export function parseAPIError(error: any, provider?: AIProvider): APIError {
  // If it's already an APIError, return it
  if (isAPIError(error)) {
    return error
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createNetworkError(provider)
  }

  // Handle timeout errors
  if (error?.name === 'AbortError' || error?.code === 'TIMEOUT') {
    return createTimeoutError(provider)
  }

  // Handle provider-specific errors
  if (error?.response) {
    return parseHTTPError(error.response, provider)
  }

  // Handle JavaScript errors
  if (error instanceof Error) {
    return createAPIError(
      'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      { provider, details: { stack: error.stack } }
    )
  }

  // Handle string errors
  if (typeof error === 'string') {
    return createAPIError('UNKNOWN_ERROR', error, { provider })
  }

  // Default error
  return createAPIError('UNKNOWN_ERROR', 'An unknown error occurred', { provider })
}

function parseHTTPError(response: any, provider?: AIProvider): APIError {
  const status = response.status || response.statusCode
  const data = response.data || response.body || {}

  switch (status) {
    case 400:
      return createAPIError('BAD_REQUEST', data.message || 'Bad request', { provider, details: data })
    
    case 401:
      return createAPIKeyError(provider!)
    
    case 403:
      return createAPIError('FORBIDDEN', 'Access forbidden', { provider, details: data })
    
    case 404:
      return createAPIError('NOT_FOUND', 'Resource not found', { provider, details: data })
    
    case 429:
      const retryAfter = parseInt(response.headers?.['retry-after'] || '60')
      const remaining = parseInt(response.headers?.['x-ratelimit-remaining'] || '0')
      return createRateLimitError(retryAfter, remaining, provider)
    
    case 500:
      return createAPIError('INTERNAL_SERVER_ERROR', 'Internal server error', { 
        provider, 
        retryable: true, 
        details: data 
      })
    
    case 502:
    case 503:
    case 504:
      return createAPIError('SERVICE_UNAVAILABLE', 'Service temporarily unavailable', { 
        provider, 
        retryable: true, 
        details: data 
      })
    
    default:
      return createAPIError('HTTP_ERROR', `HTTP ${status}: ${data.message || 'Unknown error'}`, { 
        provider, 
        retryable: status >= 500,
        details: data 
      })
  }
}

// -----------------------------------------------------------------------------
// Retry Logic
// -----------------------------------------------------------------------------

export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  backoffMultiplier?: number
  retryCondition?: (error: APIError) => boolean
  onRetry?: (error: APIError, attempt: number) => void
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    retryDelay = RETRY_CONFIG.retryDelay,
    backoffMultiplier = RETRY_CONFIG.backoffMultiplier,
    retryCondition = (error: APIError) => error.retryable,
    onRetry
  } = options

  let lastError: APIError
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = parseAPIError(error)
      
      // Don't retry on last attempt or if error is not retryable
      if (attempt === maxRetries || !retryCondition(lastError)) {
        throw lastError
      }

      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(backoffMultiplier, attempt)
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt + 1)
      }

      console.warn(`Retrying operation after error (attempt ${attempt + 1}/${maxRetries}):`, lastError.message)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// -----------------------------------------------------------------------------
// Timeout Utilities
// -----------------------------------------------------------------------------

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider?: AIProvider
): Promise<T> {
  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createTimeoutError(provider))
    }, timeoutMs)
  })

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ])
}

// -----------------------------------------------------------------------------
// Circuit Breaker Pattern
// -----------------------------------------------------------------------------

interface CircuitBreakerOptions {
  failureThreshold: number
  resetTimeout: number
  onStateChange?: (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') => void
}

export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.state = 'HALF_OPEN'
        this.options.onStateChange?.('HALF_OPEN')
      } else {
        throw createAPIError('CIRCUIT_BREAKER_OPEN', 'Circuit breaker is open', { retryable: false })
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failureCount = 0
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED'
      this.options.onStateChange?.('CLOSED')
    }
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN'
      this.options.onStateChange?.('OPEN')
    }
  }

  getState() {
    return this.state
  }
}

// -----------------------------------------------------------------------------
// Mock Data Fallback
// -----------------------------------------------------------------------------

export interface MockDataOptions {
  concept: string
  userGroup: string
  provider: AIProvider
}

export function generateMockPitch({ concept, userGroup, provider }: MockDataOptions): string {
  const templates = {
    groq: `🚀 **${concept.toUpperCase()} FOR ${userGroup.toUpperCase()}** (Powered by LLAMA 3.3)

**The Vision**
${userGroup} deserve a ${concept} that's built for speed, efficiency, and results. Our platform leverages cutting-edge AI to deliver instant, personalized solutions.

**Key Features**
• Lightning-fast processing with sub-second response times
• Advanced AI algorithms optimized for ${userGroup}
• Seamless integration with existing workflows
• Real-time analytics and insights

**Market Opportunity**
The ${userGroup} market is underserved and ready for disruption. With our AI-first approach, we can capture significant market share quickly.

**Competitive Advantage**
• 10x faster than traditional solutions
• AI-powered personalization engine
• Proven scalability with enterprise clients

💰 **Revenue Model**: Freemium with premium AI features
📈 **Traction**: Growing 40% month-over-month`,

    openai: `🎯 **${concept.toUpperCase()} FOR ${userGroup.toUpperCase()}** (Powered by GPT-4o)

**Problem Statement**
${userGroup} face significant challenges with current solutions that are outdated, expensive, and don't scale with their needs.

**Our Solution**
We're building an intelligent ${concept} platform that uses advanced AI to understand ${userGroup} requirements and deliver personalized experiences.

**Technical Innovation**
• GPT-4o integration for natural language processing
• Machine learning models trained on ${userGroup} data
• Automated workflow optimization
• Predictive analytics and forecasting

**Business Model**
• SaaS subscription: $29-$299/month
• Usage-based pricing for enterprise
• Professional services and consulting

**Go-to-Market Strategy**
1. Direct sales to ${userGroup} organizations
2. Partnership with industry leaders
3. Content marketing and thought leadership
4. Product-led growth through freemium model

🎯 **Target**: $10M ARR by year 2`,

    anthropic: `💡 **${concept.toUpperCase()} FOR ${userGroup.toUpperCase()}** (Powered by Claude Sonnet 4)

**Executive Summary**
We're revolutionizing how ${userGroup} interact with ${concept} through ethical AI that prioritizes safety, accuracy, and user empowerment.

**Core Philosophy**
• Human-centric design principles
• Transparent AI decision-making
• Privacy-first architecture
• Sustainable business practices

**Product Features**
• Constitutional AI for safe, helpful responses
• Multi-modal understanding (text, images, data)
• Collaborative AI workspaces
• Comprehensive audit trails

**Market Analysis**
${userGroup} represent a $5B+ market with 70% reporting dissatisfaction with current solutions. Our research shows 85% would switch for better AI integration.

**Ethical AI Framework**
• Bias detection and mitigation
• Explainable AI outputs
• User data sovereignty
• Regular ethics audits

**Financial Projections**
Year 1: $2M ARR (1,000 customers)
Year 2: $8M ARR (3,500 customers)  
Year 3: $20M ARR (7,000 customers)

🌟 **Mission**: Democratizing AI for ${userGroup} worldwide`
  }

  return templates[provider]
}

export function generateMockJudgeVerdict(pitches: Record<AIProvider, string>): {
  winner: AIProvider
  scores: Record<AIProvider, number>
  reasoning: string
} {
  const scores = {
    groq: Math.floor(Math.random() * 3) + 7, // 7-9
    openai: Math.floor(Math.random() * 3) + 7, // 7-9
    anthropic: Math.floor(Math.random() * 3) + 7 // 7-9
  }

  const winner = Object.entries(scores).reduce((a, b) => 
    scores[a[0] as AIProvider] > scores[b[0] as AIProvider] ? a : b
  )[0] as AIProvider

  const reasoning = `After careful analysis of all three pitches, ${winner.toUpperCase()} emerges as the winner with a score of ${scores[winner]}/10.

**Evaluation Criteria:**
• **Market Viability**: How realistic and addressable is the market opportunity?
• **Innovation**: How novel and differentiated is the solution?
• **Execution**: How well thought-out is the go-to-market strategy?
• **Presentation**: How clear and compelling is the pitch delivery?

**${winner.toUpperCase()} excelled in:**
${winner === 'groq' ? '• Speed and efficiency focus\n• Clear technical advantages\n• Strong traction metrics' : 
  winner === 'openai' ? '• Comprehensive market analysis\n• Technical innovation depth\n• Solid financial projections' :
  '• Ethical AI framework\n• Human-centric approach\n• Sustainable business model'}

**Areas for improvement across all pitches:**
• More specific customer validation data
• Detailed competitive analysis
• Risk mitigation strategies

This was a close competition with all models delivering strong, viable startup concepts!`

  return { winner, scores, reasoning }
}

// -----------------------------------------------------------------------------
// Error Recovery Strategies
// -----------------------------------------------------------------------------

export interface FallbackStrategy<T> {
  name: string
  execute: () => Promise<T>
  priority: number
}

export async function executeWithFallbacks<T>(
  strategies: FallbackStrategy<T>[],
  provider?: AIProvider
): Promise<T> {
  const sortedStrategies = [...strategies].sort((a, b) => a.priority - b.priority)
  let lastError: APIError

  for (const strategy of sortedStrategies) {
    try {
      console.log(`Attempting fallback strategy: ${strategy.name}`)
      return await strategy.execute()
    } catch (error) {
      lastError = parseAPIError(error, provider)
      console.warn(`Fallback strategy '${strategy.name}' failed:`, lastError.message)
    }
  }

  throw lastError!
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

export function getErrorMessage(error: any): string {
  if (isAPIError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

export function shouldRetry(error: APIError): boolean {
  return error.retryable && !['API_KEY_ERROR', 'VALIDATION_ERROR'].includes(error.code)
}

export function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000) // Max 30 seconds
}

export function logError(error: APIError, context?: string) {
  const logData = {
    timestamp: new Date().toISOString(),
    context,
    code: error.code,
    message: error.message,
    provider: error.provider,
    retryable: error.retryable,
    details: error.details
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', logData)
  } else {
    // In production, you might want to send this to your logging service
    console.error(`[${error.code}] ${error.message}`)
  }
}