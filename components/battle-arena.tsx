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
  const completionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
        const content = data.pitch || data.content || 'No content received from API'
        
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
            
            debouncedCheckAllComplete()
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
      let updateQueue = ""
      let isUpdating = false

      // Smooth micro-batching with requestAnimationFrame
      const scheduleUpdate = () => {
        if (!isUpdating && updateQueue) {
          isUpdating = true
          requestAnimationFrame(() => {
            accumulatedContent += updateQueue
            updateQueue = ""
            setPitches(prev => ({
              ...prev,
              [provider]: {
                ...prev[provider],
                content: accumulatedContent,
                isRetrying: false
              }
            }))
            isUpdating = false
          })
        }
      }

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
                const jsonStr = line.slice(6).trim()
                if (jsonStr && jsonStr !== '' && jsonStr !== '[DONE]') {
                  const data = JSON.parse(jsonStr)
                  if (data.type === 'text' && data.content) {
                    updateQueue += data.content
                  } else if (data.type === 'done') {
                    break
                  }
                }
              } catch (parseError) {
                // Skip invalid JSON lines
                console.warn('Failed to parse SSE chunk:', line.slice(6))
              }
            }
          }
        } else {
          // For OpenAI and Anthropic - direct text stream
          updateQueue += chunk
        }
        
        // Micro-batch updates for smooth streaming (small frequent updates)
        if (updateQueue.length >= 5) { // Update every 5 characters for smooth typing effect
          scheduleUpdate()
        }
      }

      // Final update to ensure all content is displayed
      if (updateQueue) {
        accumulatedContent += updateQueue
        setPitches(prev => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            content: accumulatedContent,
            isRetrying: false
          }
        }))
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

      // Check if all done with debouncing
      debouncedCheckAllComplete()

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
        // Mark as failed after max retries
        setPitches(prev => ({
          ...prev,
          [provider]: {
            content: '',
            isComplete: true,
            error: apiError
          }
        }))
        
        debouncedCheckAllComplete()
      }
    }
  }, [concept, userGroup])

  // Check if all pitches are complete using current state
  const checkAllComplete = useCallback(() => {
    if (readonly) return
    
    setPitches(currentPitches => {
      const allComplete = currentPitches.groq.isComplete && 
                         currentPitches.openai.isComplete && 
                         currentPitches.anthropic.isComplete
      
      // Simplified content validation - just check for reasonable content length
      const hasValidContent = (content: string) => {
        return content.trim().length > 50 // At least 50 characters of actual content
      }
      
      const allHaveContent = hasValidContent(currentPitches.groq.content) && 
                            hasValidContent(currentPitches.openai.content) && 
                            hasValidContent(currentPitches.anthropic.content)
      
      if (allComplete && allHaveContent) {
        const finalPitches = {
          groq: currentPitches.groq.content,
          openai: currentPitches.openai.content,
          anthropic: currentPitches.anthropic.content,
        }
        // Use setTimeout to avoid calling during render
        setTimeout(() => onPitchesComplete(finalPitches), 0)
      }
      
      // Return unchanged state
      return currentPitches
    })
  }, [onPitchesComplete, readonly])

  // Debounced completion check to prevent race conditions
  const debouncedCheckAllComplete = useCallback(() => {
    if (completionCheckTimeoutRef.current) {
      clearTimeout(completionCheckTimeoutRef.current)
    }
    completionCheckTimeoutRef.current = setTimeout(() => {
      checkAllComplete()
    }, 100)
  }, [checkAllComplete])

  // Manual retry function
  const retryPitch = useCallback((provider: AIProvider) => {
    streamPitch(provider, 0)
  }, [streamPitch])

  useEffect(() => {
    // Cleanup function
    return () => {
      abortControllersRef.current.forEach(controller => {
        controller.abort()
      })
      abortControllersRef.current.clear()
      
      // Clean up completion check timeout
      if (completionCheckTimeoutRef.current) {
        clearTimeout(completionCheckTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (readonly) {
      // In readonly mode, don't overwrite existing content if we have it
      setPitches(prev => {
        const hasContent = prev.groq.content || prev.openai.content || prev.anthropic.content
        if (hasContent) {
          // If we already have content, just mark everything as complete
          return {
            groq: { ...prev.groq, isComplete: true },
            openai: { ...prev.openai, isComplete: true },
            anthropic: { ...prev.anthropic, isComplete: true },
          }
        } else {
          // If no content exists, show loading state
          return {
            groq: { content: "Loading previous content...", isComplete: false },
            openai: { content: "Loading previous content...", isComplete: false },
            anthropic: { content: "Loading previous content...", isComplete: false },
          }
        }
      })
      return
    }

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
      
      // Clean up completion check timeout
      if (completionCheckTimeoutRef.current) {
        clearTimeout(completionCheckTimeoutRef.current)
      }
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
          <Card key={key} className={`bg-black/40 backdrop-blur-sm border-${color}-400/50 p-6 overflow-hidden flex flex-col`} style={{ minHeight: '500px' }}>
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
            <div 
              className="flex-1 text-sm text-gray-200 leading-relaxed overflow-y-auto p-2 border border-transparent" 
              style={{ 
                height: '320px', 
                minHeight: '320px',
                contain: 'layout style',
                willChange: 'contents',
                transform: 'translateZ(0)'
              }}
            >
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
                <div 
                  className="whitespace-pre-wrap break-words" 
                  style={{ 
                    wordBreak: 'break-word', 
                    overflowWrap: 'break-word',
                    lineHeight: '1.6',
                    fontVariantLigatures: 'none',
                    textRendering: 'optimizeSpeed'
                  }}
                >
                  {pitches[key].content}
                  {!pitches[key].isComplete && <span className="animate-pulse text-cyan-400 ml-1">|</span>}
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