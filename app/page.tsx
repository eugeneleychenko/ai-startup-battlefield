"use client"

import { useState, useCallback } from "react"
import { SpinningWheels } from "@/components/spinning-wheels"
import { CombinationDisplay } from "@/components/combination-display"
import { BattleArena } from "@/components/battle-arena"
import { JudgeVerdict } from "@/components/judge-verdict"

type AppState =
  | { phase: "spinning" }
  | { phase: "revealing"; concept: string; userGroup: string }
  | { phase: "battling"; concept: string; userGroup: string }
  | {
      phase: "judging"
      concept: string
      userGroup: string
      pitches: { groq: string; openai: string; anthropic: string }
    }

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>({ phase: "spinning" })

  const handleSpinComplete = useCallback((concept: string, userGroup: string) => {
    setAppState({ phase: "revealing", concept, userGroup })
    setTimeout(() => {
      setAppState({ phase: "battling", concept, userGroup })
    }, 2000)
  }, [])

  const handlePitchesComplete = useCallback((pitches: { groq: string; openai: string; anthropic: string }) => {
    setAppState((prevState) => {
      if (prevState.phase === "battling") {
        return {
          phase: "judging",
          concept: prevState.concept,
          userGroup: prevState.userGroup,
          pitches,
        }
      }
      return prevState
    })
  }, [])

  const handleReset = useCallback(() => {
    setAppState({ phase: "spinning" })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="relative z-10 pb-8">
        {/* Header */}
        <header className="text-center py-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            AI STARTUP BATTLE
          </h1>
          <p className="text-xl text-gray-300 mt-2">Where Silicon Valley meets Vegas</p>
        </header>

        {/* Spinning Wheels Section */}
        {appState.phase === "spinning" && (
          <div className="min-h-[30vh] flex items-center justify-center">
            <SpinningWheels onSpinComplete={handleSpinComplete} />
          </div>
        )}

        {/* Combination Display */}
        {(appState.phase === "revealing" || appState.phase === "battling" || appState.phase === "judging") && (
          <div className="min-h-[15vh] flex items-center justify-center mb-8">
            <CombinationDisplay concept={appState.concept} userGroup={appState.userGroup} />
          </div>
        )}

        {/* Battle Arena */}
        {(appState.phase === "battling" || appState.phase === "judging") && (
          <div className="px-4 mb-8">
            <BattleArena
              key={`${appState.concept}-${appState.userGroup}`}
              concept={appState.concept}
              userGroup={appState.userGroup}
              onPitchesComplete={handlePitchesComplete}
              readonly={appState.phase === "judging"}
            />
          </div>
        )}

        {/* Judge's Verdict */}
        {appState.phase === "judging" && (
          <div className="px-4">
            <JudgeVerdict
              key={`${appState.concept}-${appState.userGroup}-verdict`}
              pitches={appState.pitches}
              onReset={handleReset}
            />
          </div>
        )}
      </div>
    </div>
  )
}
