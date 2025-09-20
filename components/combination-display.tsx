"use client"

import { useEffect, useState } from "react"

interface CombinationDisplayProps {
  concept: string
  userGroup: string
}

export function CombinationDisplay({ concept, userGroup }: CombinationDisplayProps) {
  const [displayText, setDisplayText] = useState("")
  const [showSubtitle, setShowSubtitle] = useState(false)

  useEffect(() => {
    const fullText = `${concept} for ${userGroup}`
    let currentIndex = 0

    const typeWriter = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typeWriter)
        setTimeout(() => setShowSubtitle(true), 500)
      }
    }, 100)

    return () => clearInterval(typeWriter)
  }, [concept, userGroup])

  return (
    <div className="text-center">
      {/* Spotlight effect */}
      <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10">
        <h2 className="text-5xl font-bold text-white mb-4 text-balance">
          {displayText}
          <span className="animate-pulse">|</span>
        </h2>

        {showSubtitle && <p className="text-xl text-purple-300 italic animate-fade-in">Let the pitching begin!</p>}
      </div>
    </div>
  )
}
