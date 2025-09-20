"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { AIProvider, MODEL_CONFIGS, APIError } from "@/lib/types"

interface BattleArenaProps {
  concept: string
  userGroup: string
  onPitchesComplete: (pitches: { groq: string; openai: string; anthropic: string }) => void
  readonly?: boolean
}

interface PitchState {
  groq: { content: string; isComplete: boolean; error?: APIError; isRetrying?: boolean }
  openai: { content: string; isComplete: boolean; error?: APIError; isRetrying?: boolean }
  anthropic: { content: string; isComplete: boolean; error?: APIError; isRetrying?: boolean }
}

export function BattleArena({ concept, userGroup, onPitchesComplete, readonly = false }: BattleArenaProps) {
  const [pitches, setPitches] = useState<PitchState>({
    groq: { content: "", isComplete: false },
    openai: { content: "", isComplete: false },
    anthropic: { content: "", isComplete: false },
  })
  
  const abortControllersRef = useRef<Map<AIProvider, AbortController>>(new Map())
  const completedCountRef = useRef(0)

  // Fallback pitch template for readonly mode or errors
  const generateFallbackPitch = (aiModel: string) => {
    const pitchTemplate = `**${concept.toUpperCase()} FOR ${userGroup.toUpperCase()}**

🚀 **The Problem**
Current solutions in the market lack the specialized features and user experience that ${userGroup} specifically need to achieve their goals efficiently.

💡 **Our Solution**
${concept} for ${userGroup} - a purpose-built platform that addresses the unique workflows and challenges faced by ${userGroup} in their daily operations.

📈 **Go-to-Market**
• Direct partnerships with ${userGroup} communities and organizations
• Content marketing through industry publications and events
• Freemium model with premium enterprise features

💰 **Monetization**
• SaaS subscription tiers based on team size and features
• Usage-based pricing for high-volume customers
• Professional services and training programs

🌍 **Total Addressable Market**
Growing market segment with strong demand for specialized tools that enhance productivity and user experience for ${userGroup}.

⚡ **Key Differentiators**
• Built specifically for ${userGroup} workflows
• AI-enhanced features for improved efficiency
• Intuitive interface designed for rapid adoption
• Comprehensive support and onboarding`

    return pitchTemplate
  }

  // Stream content from API
  const streamPitch = useCallback(async (provider: AIProvider, retryCount = 0) => {
    const maxRetries = 3
    const baseDelay = 1000
    
    try {
      // Create abort controller for this request
      const abortController = new AbortController()
      abortControllersRef.current.set(provider, abortController)
      
      // Reset state for this provider
      setPitches(prev => ({
        ...prev,
        [provider]: {
          content: "",
          isComplete: false,
          error: undefined,
          isRetrying: retryCount > 0
        }
      }))

      const response = await fetch(`/api/pitch/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept,
          userGroup
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Check if response is streaming
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        // Non-streaming response
        const data = await response.json()
        const content = data.pitch || data.content || generateFallbackPitch(provider)
        
        // Simulate streaming for consistent UX
        const words = content.split(" ")
        let currentIndex = 0
        
        const streamInterval = setInterval(() => {
          if (currentIndex < words.length) {
            setPitches(prev => ({
              ...prev,
              [provider]: {
                ...prev[provider],
                content: words.slice(0, currentIndex + 1).join(" "),
                isRetrying: false
              }
            }))
            currentIndex++
          } else {
            clearInterval(streamInterval)
            setPitches(prev => ({
              ...prev,
              [provider]: {
                ...prev[provider],
                isComplete: true,
                error: undefined
              }
            }))
            
            completedCountRef.current += 1
            checkAllComplete()
          }
        }, provider === "groq" ? 50 : provider === "openai" ? 80 : 100)
        
        return
      }

      // Streaming response
      if (!response.body) {
        throw new Error('No response body received')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        
        // Handle Server-Sent Events format for Groq
        if (provider === "groq" && chunk.includes('data: ')) {
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim() // Remove 'data: ' prefix and trim
                if (jsonStr && jsonStr !== '') {
                  const data = JSON.parse(jsonStr)
                  if (data.type === 'text' && data.content) {
                    accumulatedContent += data.content
                  } else if (data.type === 'done') {
                    // Stream completed, exit the read loop
                    return
                  } else if (data.type === 'error') {
                    throw new Error(data.error || 'Streaming error')
                  }
                }
              } catch (parseError) {
                // If JSON parsing fails, treat as raw text (fallback)
                console.warn('Failed to parse SSE chunk, treating as raw text:', line.slice(6))
                const rawContent = line.slice(6).trim()
                if (rawContent && !rawContent.startsWith('{')) {
                  accumulatedContent += rawContent
                }
              }
            }
          }
        } else {
          // For OpenAI and Anthropic - treat as raw text stream
          accumulatedContent += chunk
        }
        
        // Update state with accumulated content
        setPitches(prev => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            content: accumulatedContent,
            isRetrying: false
          }
        }))
        
        // Add realistic delay based on provider speed
        const delay = provider === "groq" ? 50 : provider === "openai" ? 80 : 100
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Mark as complete
      setPitches(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          isComplete: true,
          error: undefined
        }
      }))

      // Increment completed count and check if all done
      completedCountRef.current += 1
      checkAllComplete()

    } catch (error: any) {
      console.error(`Error generating pitch for ${provider}:`, error)
      
      // Don't retry if aborted
      if (error.name === 'AbortError') {
        return
      }
      
      const apiError: APIError = {
        code: error.code || 'STREAM_ERROR',
        message: error.message || `Failed to generate pitch for ${provider}`,
        provider,
        timestamp: new Date().toISOString(),
        retryable: retryCount < maxRetries
      }

      setPitches(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          error: apiError,
          isRetrying: false
        }
      }))

      // Retry logic
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount)
        setTimeout(() => {
          streamPitch(provider, retryCount + 1)
        }, delay)
      } else {
        // Use fallback content after max retries
        setPitches(prev => ({
          ...prev,
          [provider]: {
            content: generateFallbackPitch(provider),
            isComplete: true,
            error: apiError
          }
        }))
        
        completedCountRef.current += 1
        checkAllComplete()
      }
    }
  }, [concept, userGroup])

  // Check if all pitches are complete
  const checkAllComplete = useCallback(() => {
    if (completedCountRef.current === 3) {
      setTimeout(() => {
        const currentPitches = pitches
        const finalPitches = {
          groq: currentPitches.groq.content || generateFallbackPitch("groq"),
          openai: currentPitches.openai.content || generateFallbackPitch("openai"),
          anthropic: currentPitches.anthropic.content || generateFallbackPitch("anthropic"),
        }
        onPitchesComplete(finalPitches)
      }, 500)
    }
  }, [pitches, onPitchesComplete])

  // Manual retry function
  const retryPitch = useCallback((provider: AIProvider) => {
    // Reset completed count if retrying
    if (pitches[provider].isComplete) {
      completedCountRef.current -= 1
    }
    streamPitch(provider, 0)
  }, [streamPitch, pitches])

  useEffect(() => {
    // Cleanup function
    return () => {
      abortControllersRef.current.forEach(controller => {
        controller.abort()
      })
      abortControllersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (readonly) {
      const finalPitches = {
        groq: { content: generateFallbackPitch("groq"), isComplete: true },
        openai: { content: generateFallbackPitch("openai"), isComplete: true },
        anthropic: { content: generateFallbackPitch("anthropic"), isComplete: true },
      }
      setPitches(finalPitches)
      return
    }

    // Reset completed count
    completedCountRef.current = 0
    
    // Start streaming for all providers with staggered delays
    const models: AIProvider[] = ["groq", "openai", "anthropic"]
    
    models.forEach((provider, index) => {
      setTimeout(() => {
        streamPitch(provider)
      }, index * 500) // Stagger the start times
    })

    // Cleanup on unmount or dependency change
    return () => {
      abortControllersRef.current.forEach(controller => {
        controller.abort()
      })
      abortControllersRef.current.clear()
    }
  }, [readonly, concept, userGroup, streamPitch])

  const aiModels = [
    { key: "groq" as AIProvider, name: MODEL_CONFIGS.groq.displayName, color: MODEL_CONFIGS.groq.color, icon: MODEL_CONFIGS.groq.icon },
    { key: "openai" as AIProvider, name: MODEL_CONFIGS.openai.displayName, color: MODEL_CONFIGS.openai.color, icon: MODEL_CONFIGS.openai.icon },
    { key: "anthropic" as AIProvider, name: MODEL_CONFIGS.anthropic.displayName, color: MODEL_CONFIGS.anthropic.color, icon: MODEL_CONFIGS.anthropic.icon },
  ] as const

  return (
    <div className="space-y-4">
      {readonly && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-purple-400 mb-2">📋 PITCH REVIEW</h2>
          <p className="text-gray-300">Review the AI-generated startup pitches below</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {aiModels.map(({ key, name, color, icon }) => (
          <Card key={key} className={`bg-black/40 backdrop-blur-sm border-${color}-400/50 p-6 overflow-hidden`}>
            {/* Header */}
            <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-${color}-400/30`}>
              <span className="text-2xl">{icon}</span>
              <div className="flex-1">
                <h3 className={`text-${color}-400 font-bold text-lg`}>{name}</h3>
                <div className="text-xs text-gray-400">
                  {pitches[key].error && !pitches[key].isRetrying
                    ? "ERROR - CLICK TO RETRY"
                    : pitches[key].isRetrying
                    ? "RETRYING..."
                    : pitches[key].isComplete
                    ? "PITCH COMPLETE"
                    : "GENERATING..."}
                </div>
              </div>
              {pitches[key].error && !pitches[key].isRetrying && (
                <button
                  onClick={() => retryPitch(key)}
                  className={`text-${color}-400 hover:text-${color}-300 text-sm font-medium transition-colors`}
                >
                  RETRY
                </button>
              )}
            </div>

            {/* Content */}
            <div className="text-sm text-gray-200 leading-relaxed overflow-y-auto max-h-80">
              {pitches[key].error && !pitches[key].content ? (
                <div className="text-red-400 text-center py-4">
                  <div className="mb-2">⚠️ Generation Failed</div>
                  <div className="text-xs text-gray-400 mb-3">
                    {pitches[key].error?.message}
                  </div>
                  <button
                    onClick={() => retryPitch(key)}
                    className={`text-${color}-400 hover:text-${color}-300 text-sm font-medium transition-colors`}
                  >
                    Click to retry
                  </button>
                </div>
              ) : pitches[key].content ? (
                <div className="whitespace-pre-line">
                  {pitches[key].content}
                  {!pitches[key].isComplete && <span className="animate-pulse">|</span>}
                  {pitches[key].error && pitches[key].content && (
                    <div className="mt-2 text-xs text-yellow-400">
                      ⚠️ Using fallback content due to API error
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                  <span>{pitches[key].isRetrying ? "Retrying..." : "Thinking..."}</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className={`mt-4 h-1 bg-gray-700 rounded-full overflow-hidden`}>
              <div
                className={`h-full transition-all duration-300 ${
                  pitches[key].error && !pitches[key].content
                    ? `bg-red-400 w-full`
                    : pitches[key].isComplete
                    ? `bg-${color}-400 w-full`
                    : `bg-${color}-400 w-3/4 animate-pulse`
                }`}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}