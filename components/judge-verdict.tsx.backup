"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface JudgeVerdictProps {
  pitches: {
    groq: string
    openai: string
    anthropic: string
  }
  onReset: () => void
}

export function JudgeVerdict({ pitches, onReset }: JudgeVerdictProps) {
  const [scores, setScores] = useState<{ groq: number; openai: number; anthropic: number } | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const [showVerdict, setShowVerdict] = useState(false)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Simulate judging process
    setTimeout(() => {
      const newScores = {
        groq: Math.floor(Math.random() * 3) + 8, // 8-10
        openai: Math.floor(Math.random() * 3) + 7, // 7-9
        anthropic: Math.floor(Math.random() * 3) + 7, // 7-9
      }

      setScores(newScores)

      // Determine winner
      const maxScore = Math.max(newScores.groq, newScores.openai, newScores.anthropic)
      const winnerKey = Object.entries(newScores).find(([_, score]) => score === maxScore)?.[0]
      setWinner(winnerKey || "groq")

      setTimeout(() => setShowVerdict(true), 1000)
    }, 2000)
  }, [])

  const getModelName = (key: string) => {
    switch (key) {
      case "groq":
        return "LLAMA 3.3"
      case "openai":
        return "GPT-4o"
      case "anthropic":
        return "SONNET 4"
      default:
        return key
    }
  }

  const getModelColor = (key: string) => {
    switch (key) {
      case "groq":
        return "cyan"
      case "openai":
        return "emerald"
      case "anthropic":
        return "orange"
      default:
        return "gray"
    }
  }

  return (
    <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 backdrop-blur-sm border-yellow-400/50 p-6 mx-auto max-w-4xl">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">⚖️</div>
        <h3 className="text-2xl font-bold text-yellow-400">OPUS 4.1 PRESIDING</h3>
        <p className="text-gray-300">Final Judgment</p>
      </div>

      {/* Scoring */}
      {scores && (
        <div className="space-y-4 mb-6">
          {Object.entries(scores).map(([key, score]) => (
            <div key={key} className="flex items-center gap-4">
              <div className={`w-32 text-${getModelColor(key)}-400 font-bold`}>{getModelName(key)}</div>
              <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full bg-${getModelColor(key)}-400 transition-all duration-1000 flex items-center justify-end pr-2 ${
                    winner === key ? "animate-pulse shadow-lg" : ""
                  }`}
                  style={{ width: `${(score / 10) * 100}%` }}
                >
                  <span className="text-black font-bold text-sm">{score}/10</span>
                </div>
              </div>
              {winner === key && <div className="text-yellow-400 font-bold animate-bounce">🏆 WINNER!</div>}
            </div>
          ))}
        </div>
      )}

      {/* Verdict */}
      {showVerdict && winner && (
        <div className="text-center space-y-4">
          <div className="text-xl text-gray-200">
            <span className="font-bold text-yellow-400">{getModelName(winner)}</span> wins with the most compelling
            pitch!
          </div>
          <div className="text-sm text-gray-400 max-w-2xl mx-auto">
            The winning pitch demonstrated superior market understanding, clear monetization strategy, and compelling
            value proposition for the target audience.
          </div>

          <Button
            onClick={onReset}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 font-bold rounded-full mt-6"
          >
            BATTLE AGAIN
          </Button>
        </div>
      )}

      {!showVerdict && (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" />
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce delay-100" />
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce delay-200" />
            </div>
            <span>Deliberating...</span>
          </div>
        </div>
      )}
    </Card>
  )
}
