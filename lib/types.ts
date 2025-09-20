// =============================================================================
// AI STARTUP BATTLE - TYPE DEFINITIONS
// =============================================================================

// -----------------------------------------------------------------------------
// Model Configuration Types
// -----------------------------------------------------------------------------

export type AIProvider = 'groq' | 'openai' | 'anthropic'

export interface ModelConfig {
  provider: AIProvider
  modelName: string
  displayName: string
  icon: string
  color: 'cyan' | 'emerald' | 'orange'
  temperature?: number
  maxTokens?: number
  topP?: number
}

export const MODEL_CONFIGS: Record<AIProvider, ModelConfig> = {
  groq: {
    provider: 'groq',
    modelName: 'llama-3.3-70b-versatile',
    displayName: 'LLAMA 3.3',
    icon: '⚡',
    color: 'cyan',
    temperature: 0.7,
    maxTokens: 2048,
  },
  openai: {
    provider: 'openai',
    modelName: 'gpt-4o',
    displayName: 'GPT-4o',
    icon: '⬢',
    color: 'emerald',
    temperature: 0.7,
    maxTokens: 2048,
  },
  anthropic: {
    provider: 'anthropic',
    modelName: 'claude-sonnet-4-20250514',
    displayName: 'SONNET 4',
    icon: '▲',
    color: 'orange',
    temperature: 0.7,
    maxTokens: 2048,
  },
} as const

export const JUDGE_MODEL_CONFIG: ModelConfig = {
  provider: 'anthropic',
  modelName: 'claude-opus-4-20250514',
  displayName: 'OPUS 4.1',
  icon: '⚖️',
  color: 'orange',
  temperature: 0.3,
  maxTokens: 1024,
} as const

// -----------------------------------------------------------------------------
// Pitch Request/Response Interfaces
// -----------------------------------------------------------------------------

export interface PitchRequest {
  concept: string
  userGroup: string
  provider: AIProvider
  modelConfig?: Partial<ModelConfig>
}

export interface PitchResponse {
  id: string
  provider: AIProvider
  content: string
  isComplete: boolean
  timestamp: string
  metadata?: {
    tokensUsed?: number
    processingTime?: number
    modelVersion?: string
  }
}

export interface PitchState {
  groq: PitchResponse
  openai: PitchResponse
  anthropic: PitchResponse
}

export interface PitchContent {
  groq: string
  openai: string
  anthropic: string
}

// -----------------------------------------------------------------------------
// Judge Request/Response Interfaces
// -----------------------------------------------------------------------------

export interface JudgeRequest {
  concept: string
  userGroup: string
  pitches: PitchContent
  criteria?: JudgingCriteria
}

export interface JudgingCriteria {
  marketViability: number // Weight 0-1
  innovation: number // Weight 0-1
  feasibility: number // Weight 0-1
  presentation: number // Weight 0-1
  monetization: number // Weight 0-1
}

export interface JudgeScore {
  provider: AIProvider
  score: number // 1-10
  breakdown: {
    marketViability: number
    innovation: number
    feasibility: number
    presentation: number
    monetization: number
  }
  reasoning: string
}

export interface JudgeResponse {
  id: string
  scores: Record<AIProvider, JudgeScore>
  winner: AIProvider
  overallReasoning: string
  timestamp: string
  metadata?: {
    tokensUsed?: number
    processingTime?: number
    confidence?: number
  }
}

export interface JudgeState {
  scores: Record<AIProvider, number> | null
  winner: AIProvider | null
  isComplete: boolean
  reasoning?: string
}

// -----------------------------------------------------------------------------
// Streaming Response Types
// -----------------------------------------------------------------------------

export interface StreamingChunk {
  id: string
  provider: AIProvider
  content: string
  isComplete: boolean
  timestamp: string
}

export interface StreamingResponse {
  status: 'pending' | 'streaming' | 'complete' | 'error'
  chunks: StreamingChunk[]
  totalChunks?: number
  error?: APIError
}

export type StreamingState = {
  [K in AIProvider]: {
    content: string
    isComplete: boolean
    isStreaming: boolean
    error?: APIError
  }
}

// -----------------------------------------------------------------------------
// Error Response Types
// -----------------------------------------------------------------------------

export interface APIError {
  code: string
  message: string
  details?: Record<string, any>
  provider?: AIProvider
  timestamp: string
  retryable: boolean
}

export interface ValidationError extends APIError {
  field: string
  value: any
  constraints: string[]
}

export interface RateLimitError extends APIError {
  retryAfter: number // seconds
  remainingRequests: number
  resetTime: string
}

export interface ModelError extends APIError {
  modelName: string
  modelProvider: AIProvider
  fallbackAvailable: boolean
}

// -----------------------------------------------------------------------------
// Application State Types
// -----------------------------------------------------------------------------

export type AppPhase = 'spinning' | 'revealing' | 'battling' | 'judging'

export type AppState =
  | { phase: 'spinning' }
  | { phase: 'revealing'; concept: string; userGroup: string }
  | { phase: 'battling'; concept: string; userGroup: string }
  | {
      phase: 'judging'
      concept: string
      userGroup: string
      pitches: PitchContent
    }

// -----------------------------------------------------------------------------
// Component Prop Types
// -----------------------------------------------------------------------------

export interface BattleArenaProps {
  concept: string
  userGroup: string
  onPitchesComplete: (pitches: PitchContent) => void
  readonly?: boolean
  enableRealAPI?: boolean
}

export interface JudgeVerdictProps {
  pitches: PitchContent
  onReset: () => void
  enableRealAPI?: boolean
}

export interface SpinningWheelsProps {
  onSpinComplete: (concept: string, userGroup: string) => void
}

export interface CombinationDisplayProps {
  concept: string
  userGroup: string
}

// -----------------------------------------------------------------------------
// API Configuration Types
// -----------------------------------------------------------------------------

export interface APIConfig {
  baseURL: string
  timeout: number
  retries: number
  retryDelay: number
}

export interface ProviderAPIConfig {
  groq: {
    apiKey: string
    baseURL: string
  }
  openai: {
    apiKey: string
    baseURL: string
    organization?: string
  }
  anthropic: {
    apiKey: string
    baseURL: string
  }
}

// -----------------------------------------------------------------------------
// Utility Types
// -----------------------------------------------------------------------------

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// -----------------------------------------------------------------------------
// Event Types
// -----------------------------------------------------------------------------

export interface PitchGeneratedEvent {
  type: 'pitch-generated'
  provider: AIProvider
  pitch: PitchResponse
}

export interface PitchStreamEvent {
  type: 'pitch-stream'
  provider: AIProvider
  chunk: StreamingChunk
}

export interface PitchErrorEvent {
  type: 'pitch-error'
  provider: AIProvider
  error: APIError
}

export interface JudgeCompleteEvent {
  type: 'judge-complete'
  result: JudgeResponse
}

export type BattleEvent = 
  | PitchGeneratedEvent 
  | PitchStreamEvent 
  | PitchErrorEvent 
  | JudgeCompleteEvent

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const DEFAULT_JUDGING_CRITERIA: JudgingCriteria = {
  marketViability: 0.25,
  innovation: 0.2,
  feasibility: 0.2,
  presentation: 0.2,
  monetization: 0.15,
} as const

export const API_TIMEOUTS = {
  pitch: 30000, // 30 seconds
  judge: 15000, // 15 seconds
  stream: 60000, // 60 seconds
} as const

export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
} as const

// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------

export function isAIProvider(value: string): value is AIProvider {
  return ['groq', 'openai', 'anthropic'].includes(value)
}

export function isAPIError(error: any): error is APIError {
  return (
    error &&
    typeof error === 'object' &&
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    typeof error.timestamp === 'string' &&
    typeof error.retryable === 'boolean'
  )
}

export function isValidationError(error: any): error is ValidationError {
  return (
    isAPIError(error) &&
    typeof error.field === 'string' &&
    Array.isArray(error.constraints)
  )
}

export function isRateLimitError(error: any): error is RateLimitError {
  return (
    isAPIError(error) &&
    typeof error.retryAfter === 'number' &&
    typeof error.remainingRequests === 'number'
  )
}

export function isModelError(error: any): error is ModelError {
  return (
    isAPIError(error) &&
    typeof error.modelName === 'string' &&
    isAIProvider(error.modelProvider) &&
    typeof error.fallbackAvailable === 'boolean'
  )
}

export function isPitchResponse(value: any): value is PitchResponse {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    isAIProvider(value.provider) &&
    typeof value.content === 'string' &&
    typeof value.isComplete === 'boolean' &&
    typeof value.timestamp === 'string'
  )
}

export function isJudgeResponse(value: any): value is JudgeResponse {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.scores === 'object' &&
    isAIProvider(value.winner) &&
    typeof value.overallReasoning === 'string' &&
    typeof value.timestamp === 'string'
  )
}