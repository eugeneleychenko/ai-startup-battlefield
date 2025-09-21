"use client";

import { useCompletion } from '@ai-sdk/react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIProvider, MODEL_CONFIGS } from "@/lib/types";
import React, { useEffect } from 'react';

const LLMStream = ({ provider, concept, userGroup }: { provider: AIProvider, concept: string, userGroup: string }) => {
  const { completion, complete, isLoading } = useCompletion({
    api: `/api/pitch/${provider}`,
    body: { concept, userGroup },
  });

  // Trigger the completion when the component mounts
  useEffect(() => {
    complete('');
  }, []);

  const { displayName, color, icon } = MODEL_CONFIGS[provider];

  return (
    <Card className={`bg-black/40 backdrop-blur-sm border-${color}-400/50 p-6 overflow-hidden flex flex-col`} style={{ minHeight: '400px' }}>
      <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-${color}-400/30`}>
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h3 className={`text-${color}-400 font-bold text-lg`}>{displayName}</h3>
          <div className="text-xs text-gray-400">
            {isLoading ? 'GENERATING...' : 'PITCH COMPLETE'}
          </div>
        </div>
      </div>
      <div className="flex-1 text-sm text-gray-200 leading-relaxed overflow-y-auto p-2">
        <div className="whitespace-pre-wrap break-words">
          {completion}
          {isLoading && <span className="animate-pulse text-cyan-400 ml-1">|</span>}
        </div>
      </div>
    </Card>
  );
};

export default function StreamingDemoPage() {
  const [showStreams, setShowStreams] = React.useState(false);
  const concept = "A social network for dogs";
  const userGroup = "Dog owners";

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold">LLM Streaming Demonstration</h1>
        <p className="text-lg text-gray-400">
          A clean implementation of streaming using the Vercel AI SDK's <code>useCompletion</code> hook.
        </p>
      </header>

      {!showStreams ? (
        <div className="text-center">
          <Button onClick={() => setShowStreams(true)} size="lg" className="bg-purple-600 hover:bg-purple-700">
            Start Streaming
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LLMStream provider="openai" concept={concept} userGroup={userGroup} />
          <LLMStream provider="anthropic" concept={concept} userGroup={userGroup} />
          <LLMStream provider="groq" concept={concept} userGroup={userGroup} />
        </div>
      )}
    </div>
  );
}
