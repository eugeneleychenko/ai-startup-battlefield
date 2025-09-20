"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

const CONCEPTS = [
  "Netflix",
  "Uber",
  "Airbnb",
  "TikTok",
  "Spotify",
  "Instagram",
  "LinkedIn",
  "Zoom",
  "Slack",
  "Discord",
  "Twitch",
  "OnlyFans",
]

const USER_GROUPS = [
  "Plumbers",
  "Lawyers",
  "Farmers",
  "Teachers",
  "Doctors",
  "Chefs",
  "Artists",
  "Musicians",
  "Athletes",
  "Gamers",
  "Parents",
  "Students",
]

interface SpinningWheelsProps {
  onSpinComplete: (concept: string, userGroup: string) => void
}

export function SpinningWheels({ onSpinComplete }: SpinningWheelsProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null)
  const [selectedUserGroup, setSelectedUserGroup] = useState<string | null>(null)

  const handleSpin = () => {
    setIsSpinning(true)
    setSelectedConcept(null)
    setSelectedUserGroup(null)

    // Simulate spinning duration
    setTimeout(() => {
      const concept = CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)]
      const userGroup = USER_GROUPS[Math.floor(Math.random() * USER_GROUPS.length)]

      setSelectedConcept(concept)
      setSelectedUserGroup(userGroup)
      setIsSpinning(false)

      onSpinComplete(concept, userGroup)
    }, 3000)
  }

  return (
    <div className="flex items-center justify-center gap-8">
      {/* Concepts Wheel */}
      <div className="relative">
        <div
          className={`w-64 h-64 rounded-full border-2 border-purple-400 bg-black/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
            isSpinning ? "animate-spin border-purple-300 shadow-lg shadow-purple-500/50" : ""
          }`}
        >
          <div className="text-center">
            <div className="text-sm text-purple-300 mb-2">CONCEPTS</div>
            <div className="text-2xl font-bold">{isSpinning ? "???" : selectedConcept || "READY"}</div>
          </div>
        </div>
        {/* Wheel segments visualization */}
        <div className="absolute inset-0 rounded-full overflow-hidden opacity-30">
          {CONCEPTS.map((concept, index) => (
            <div
              key={concept}
              className="absolute w-full h-full"
              style={{
                transform: `rotate(${(index * 360) / CONCEPTS.length}deg)`,
                transformOrigin: "center",
              }}
            >
              <div className="w-0.5 h-32 bg-purple-400/50 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Center Connector */}
      <div className="text-6xl font-bold text-purple-400 animate-pulse">×</div>

      {/* User Groups Wheel */}
      <div className="relative">
        <div
          className={`w-64 h-64 rounded-full border-2 border-cyan-400 bg-black/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
            isSpinning ? "animate-spin border-cyan-300 shadow-lg shadow-cyan-500/50" : ""
          }`}
        >
          <div className="text-center">
            <div className="text-sm text-cyan-300 mb-2">USER GROUPS</div>
            <div className="text-2xl font-bold">{isSpinning ? "???" : selectedUserGroup || "READY"}</div>
          </div>
        </div>
        {/* Wheel segments visualization */}
        <div className="absolute inset-0 rounded-full overflow-hidden opacity-30">
          {USER_GROUPS.map((group, index) => (
            <div
              key={group}
              className="absolute w-full h-full"
              style={{
                transform: `rotate(${(index * 360) / USER_GROUPS.length}deg)`,
                transformOrigin: "center",
              }}
            >
              <div className="w-0.5 h-32 bg-cyan-400/50 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Spin Button */}
      {!isSpinning && !selectedConcept && (
        <div className="absolute bottom-[-100px] left-1/2 transform -translate-x-1/2">
          <Button
            onClick={handleSpin}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-xl font-bold rounded-full shadow-lg shadow-purple-500/50 animate-pulse"
          >
            SPIN TO START
          </Button>
        </div>
      )}
    </div>
  )
}
