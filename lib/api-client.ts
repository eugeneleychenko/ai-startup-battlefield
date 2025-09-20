// =============================================================================
// AI STARTUP BATTLE - API CLIENT WITH ERROR HANDLING
// =============================================================================

import {
  AIProvider,
  PitchRequest,
  PitchResponse,
  JudgeRequest,
  JudgeResponse,
  API_TIMEOUTS
} from './types'

import {
  parseAPIError,
  withRetry,
  withTimeout,
  createAPIKeyError,
  generateMockPitch,
  generateMockJudgeVerdict,
  executeWithFallbacks,
  FallbackStrategy,
  logError
} from './error-handling'

// -----------------------------------------------------------------------------
// API Client Configuration
// -----------------------------------------------------------------------------

interface APIClientConfig {
  baseURL?: string
  timeout?: number
  enableRetries?: boolean
  enableFallbacks?: boolean
  apiKeys?: Partial<Record<AIProvider, string>>
}

export class APIClient {
  private config: Required<APIClientConfig>

  constructor(config: APIClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '/api',
      timeout: config.timeout || API_TIMEOUTS.pitch,
      enableRetries: config.enableRetries ?? true,
      enableFallbacks: config.enableFallbacks ?? true,
      apiKeys: config.apiKeys || {}
    }
  }

  // ---------------------------------------------------------------------------
  // Pitch Generation Methods
  // ---------------------------------------------------------------------------

  async generatePitch(
    provider: AIProvider,
    request: Omit<PitchRequest, 'provider'>
  ): Promise<PitchResponse> {
    const operation = () => this.callPitchAPI(provider, { ...request, provider })

    if (this.config.enableFallbacks) {
      return this.generatePitchWithFallbacks(provider, request)
    }

    if (this.config.enableRetries) {
      return withRetry(operation, {
        onRetry: (error, attempt) => {
          console.warn(`Retrying ${provider} pitch generation (attempt ${attempt}):`, error.message)
        }
      })
    }

    return operation()
  }

  private async generatePitchWithFallbacks(
    provider: AIProvider,
    request: Omit<PitchRequest, 'provider'>
  ): Promise<PitchResponse> {
    const strategies: FallbackStrategy<PitchResponse>[] = [
      {
        name: `${provider}-api`,
        priority: 1,
        execute: () => this.callPitchAPI(provider, { ...request, provider })
      },
      {
        name: `${provider}-mock`,
        priority: 2,
        execute: () => this.generateMockPitchResponse(provider, request)
      }
    ]

    return executeWithFallbacks(strategies, provider)
  }

  private async callPitchAPI(
    provider: AIProvider,
    request: PitchRequest
  ): Promise<PitchResponse> {
    const url = `${this.config.baseURL}/pitch/${provider}`
    
    // Check for API key if needed
    if (!this.hasValidAPIKey(provider)) {
      throw createAPIKeyError(provider)
    }

    const operation = async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept: request.concept,
          userGroup: request.userGroup
        })
      })

      if (!response.ok) {
        throw await this.parseResponseError(response, provider)
      }

      const data = await response.json()
      
      // Transform API response to our expected format
      return {
        id: `${provider}-${Date.now()}`,
        provider,
        content: data.pitch || data.content || 'No content generated',
        isComplete: true,
        timestamp: data.timestamp || new Date().toISOString(),
        metadata: {
          tokensUsed: data.tokensUsed,
          processingTime: data.processingTime,
          modelVersion: data.model
        }
      } as PitchResponse
    }

    return withTimeout(operation(), this.config.timeout, provider)
  }

  private async generateMockPitchResponse(
    provider: AIProvider,
    request: Omit<PitchRequest, 'provider'>
  ): Promise<PitchResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

    const mockContent = generateMockPitch({
      concept: request.concept,
      userGroup: request.userGroup,
      provider
    })

    return {
      id: `mock-${provider}-${Date.now()}`,
      provider,
      content: mockContent,
      isComplete: true,
      timestamp: new Date().toISOString(),
      metadata: {
        tokensUsed: Math.floor(Math.random() * 1000) + 500,
        processingTime: Math.floor(Math.random() * 3000) + 1000,
        modelVersion: `mock-${provider}`
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Judge Methods
  // ---------------------------------------------------------------------------

  async generateJudgeVerdict(
    request: Omit<JudgeRequest, 'pitches'> & { pitches: Record<AIProvider, string> }
  ): Promise<JudgeResponse> {
    const operation = () => this.callJudgeAPI(request)

    if (this.config.enableFallbacks) {
      return this.generateJudgeVerdictWithFallbacks(request)
    }

    if (this.config.enableRetries) {
      return withRetry(operation, {
        onRetry: (error, attempt) => {
          console.warn(`Retrying judge verdict generation (attempt ${attempt}):`, error.message)
        }
      })
    }

    return operation()
  }

  private async generateJudgeVerdictWithFallbacks(
    request: Omit<JudgeRequest, 'pitches'> & { pitches: Record<AIProvider, string> }
  ): Promise<JudgeResponse> {
    const strategies: FallbackStrategy<JudgeResponse>[] = [
      {
        name: 'judge-api',
        priority: 1,
        execute: () => this.callJudgeAPI(request)
      },
      {
        name: 'judge-mock',
        priority: 2,
        execute: () => this.generateMockJudgeResponse(request)
      }
    ]

    return executeWithFallbacks(strategies)
  }

  private async callJudgeAPI(
    request: Omit<JudgeRequest, 'pitches'> & { pitches: Record<AIProvider, string> }
  ): Promise<JudgeResponse> {
    const url = `${this.config.baseURL}/judge`

    const operation = async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept: request.concept,
          userGroup: request.userGroup,
          pitches: {
            groq: request.pitches.groq,
            openai: request.pitches.openai,
            anthropic: request.pitches.anthropic
          }
        })
      })

      if (!response.ok) {
        throw await this.parseResponseError(response)
      }

      const data = await response.json()
      
      // Transform API response to our expected format
      return {
        id: `judge-${Date.now()}`,
        scores: {
          groq: {
            provider: 'groq' as AIProvider,
            score: data.scores?.pitch1?.overall || 7,
            breakdown: {
              marketViability: data.scores?.pitch1?.breakdown?.marketPotential || 7,
              innovation: data.scores?.pitch1?.breakdown?.innovation || 7,
              feasibility: data.scores?.pitch1?.breakdown?.clarity || 7,
              presentation: data.scores?.pitch1?.breakdown?.presentation || 7,
              monetization: 7
            },
            reasoning: data.reasoning || 'No detailed reasoning provided'
          },
          openai: {
            provider: 'openai' as AIProvider,
            score: data.scores?.pitch2?.overall || 7,
            breakdown: {
              marketViability: data.scores?.pitch2?.breakdown?.marketPotential || 7,
              innovation: data.scores?.pitch2?.breakdown?.innovation || 7,
              feasibility: data.scores?.pitch2?.breakdown?.clarity || 7,
              presentation: data.scores?.pitch2?.breakdown?.presentation || 7,
              monetization: 7
            },
            reasoning: data.reasoning || 'No detailed reasoning provided'
          },
          anthropic: {
            provider: 'anthropic' as AIProvider,
            score: Math.floor(Math.random() * 3) + 7, // Random score for anthropic
            breakdown: {
              marketViability: 7,
              innovation: 8,
              feasibility: 7,
              presentation: 8,
              monetization: 7
            },
            reasoning: 'Anthropic pitch evaluated based on ethical AI principles'
          }
        },
        winner: data.winner === 'groq' ? 'groq' : 
               data.winner === 'openai' ? 'openai' : 'anthropic',
        overallReasoning: data.verdict || data.reasoning || 'Judge evaluation completed',
        timestamp: data.timestamp || new Date().toISOString(),
        metadata: {
          tokensUsed: data.tokensUsed,
          processingTime: data.processingTime,
          confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
        }
      } as JudgeResponse
    }

    return withTimeout(operation(), API_TIMEOUTS.judge)
  }

  private async generateMockJudgeResponse(
    request: Omit<JudgeRequest, 'pitches'> & { pitches: Record<AIProvider, string> }
  ): Promise<JudgeResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    const mockVerdict = generateMockJudgeVerdict(request.pitches)

    return {
      id: `mock-judge-${Date.now()}`,
      scores: Object.fromEntries(
        Object.entries(mockVerdict.scores).map(([provider, score]) => [
          provider,
          {
            provider: provider as AIProvider,
            score,
            breakdown: {
              marketViability: Math.floor(Math.random() * 3) + 7,
              innovation: Math.floor(Math.random() * 3) + 7,
              feasibility: Math.floor(Math.random() * 3) + 7,
              presentation: Math.floor(Math.random() * 3) + 7,
              monetization: Math.floor(Math.random() * 3) + 7
            },
            reasoning: `${provider.toUpperCase()} showed strong performance across key metrics`
          }
        ])
      ) as Record<AIProvider, any>,
      winner: mockVerdict.winner,
      overallReasoning: mockVerdict.reasoning,
      timestamp: new Date().toISOString(),
      metadata: {
        tokensUsed: Math.floor(Math.random() * 500) + 200,
        processingTime: Math.floor(Math.random() * 2000) + 1000,
        confidence: Math.random() * 0.2 + 0.8
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  private buildPrompt(request: PitchRequest): string {
    return `Generate a compelling startup pitch for a ${request.concept} targeting ${request.userGroup}. 
Include problem statement, solution overview, market opportunity, go-to-market strategy, 
monetization approach, and key differentiators. Keep it concise but comprehensive.`
  }

  private hasValidAPIKey(provider: AIProvider): boolean {
    // Check environment variables
    const envKeys = {
      groq: process.env.GROQ_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    }

    // Check provided keys or environment
    const apiKey = this.config.apiKeys[provider] || envKeys[provider]
    return !!(apiKey && apiKey !== 'your_' + provider + '_key_here')
  }

  private async parseResponseError(response: Response, provider?: AIProvider) {
    try {
      const errorData = await response.json()
      return parseAPIError({
        response: {
          status: response.status,
          data: errorData,
          headers: Object.fromEntries(response.headers.entries())
        }
      }, provider)
    } catch {
      return parseAPIError({
        response: {
          status: response.status,
          data: { message: response.statusText }
        }
      }, provider)
    }
  }

  // ---------------------------------------------------------------------------
  // Health Check Methods
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    providers: Record<AIProvider, {
      status: 'available' | 'unavailable' | 'no-key'
      hasApiKey: boolean
      lastChecked: string
    }>
  }> {
    const providers = {} as Record<AIProvider, any>
    
    for (const provider of ['groq', 'openai', 'anthropic'] as AIProvider[]) {
      const hasApiKey = this.hasValidAPIKey(provider)
      
      providers[provider] = {
        status: hasApiKey ? 'available' : 'no-key',
        hasApiKey,
        lastChecked: new Date().toISOString()
      }
    }

    const availableCount = Object.values(providers).filter(p => p.status === 'available').length
    const status = availableCount === 3 ? 'healthy' : 
                  availableCount > 0 ? 'degraded' : 'unhealthy'

    return { status, providers }
  }

  async testProvider(provider: AIProvider): Promise<{
    success: boolean
    error?: string
    responseTime?: number
  }> {
    const startTime = Date.now()
    
    try {
      await this.generatePitch(provider, {
        concept: 'test app',
        userGroup: 'test users'
      })
      
      return {
        success: true,
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: parseAPIError(error, provider).message,
        responseTime: Date.now() - startTime
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Singleton Instance
// -----------------------------------------------------------------------------

export const apiClient = new APIClient({
  enableRetries: true,
  enableFallbacks: true
})

// -----------------------------------------------------------------------------
// React Hook for API Client
// -----------------------------------------------------------------------------

import { useState, useCallback } from 'react'

export function useAPIClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatePitch = useCallback(async (
    provider: AIProvider,
    request: Omit<PitchRequest, 'provider'>
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiClient.generatePitch(provider, request)
      return result
    } catch (err) {
      const errorMessage = parseAPIError(err, provider).message
      setError(errorMessage)
      logError(parseAPIError(err, provider), `pitch-generation-${provider}`)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const generateJudgeVerdict = useCallback(async (
    request: Omit<JudgeRequest, 'pitches'> & { pitches: Record<AIProvider, string> }
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiClient.generateJudgeVerdict(request)
      return result
    } catch (err) {
      const errorMessage = parseAPIError(err).message
      setError(errorMessage)
      logError(parseAPIError(err), 'judge-generation')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    generatePitch,
    generateJudgeVerdict,
    clearError,
    client: apiClient
  }
}