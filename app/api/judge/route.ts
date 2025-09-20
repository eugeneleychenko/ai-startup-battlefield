import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { JudgeRequest, JudgeResponse, PitchContent, AIProvider } from '@/lib/types';
import { getJudgePrompt, validateJudgeResponse, normalizeScores } from '@/lib/prompt-templates';

interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  timestamp: string;
  retryable: boolean;
}

// Helper function to create error responses
function createErrorResponse(
  error: string,
  message: string,
  code: string = 'INTERNAL_ERROR',
  retryable: boolean = false,
  status: number = 500
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error,
      message,
      code,
      timestamp: new Date().toISOString(),
      retryable,
    },
    { 
      status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    }
  );
}

// Helper function to validate request
function validateRequest(body: any): { isValid: boolean; error?: string } {
  if (!body.concept || typeof body.concept !== 'string') {
    return { isValid: false, error: 'Missing or invalid concept field' };
  }
  
  if (!body.userGroup || typeof body.userGroup !== 'string') {
    return { isValid: false, error: 'Missing or invalid userGroup field' };
  }

  if (!body.pitches || typeof body.pitches !== 'object') {
    return { isValid: false, error: 'Missing or invalid pitches field' };
  }

  const requiredProviders: AIProvider[] = ['groq', 'openai', 'anthropic'];
  for (const provider of requiredProviders) {
    if (!body.pitches[provider] || typeof body.pitches[provider] !== 'string') {
      return { isValid: false, error: `Missing or invalid pitch for ${provider}` };
    }
    if (body.pitches[provider].trim().length === 0) {
      return { isValid: false, error: `Empty pitch content for ${provider}` };
    }
  }

  if (body.concept.trim().length === 0) {
    return { isValid: false, error: 'Concept cannot be empty' };
  }

  if (body.userGroup.trim().length === 0) {
    return { isValid: false, error: 'User group cannot be empty' };
  }

  return { isValid: true };
}

// Helper function to extract JSON from response
function extractJSON(text: string): any {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // If JSON parsing fails, try to clean it up
      const cleaned = jsonMatch[0]
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return JSON.parse(cleaned);
    }
  }
  throw new Error('No valid JSON found in response');
}

export async function POST(request: NextRequest): Promise<NextResponse<JudgeResponse | ErrorResponse>> {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return createErrorResponse(
        'Configuration error',
        'Anthropic API key not configured',
        'MISSING_API_KEY',
        false,
        500
      );
    }

    // Parse the request body
    let body: JudgeRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return createErrorResponse(
        'Invalid request',
        'Request body must be valid JSON',
        'INVALID_JSON',
        false,
        400
      );
    }
    
    // Validate required fields
    const validation = validateRequest(body);
    if (!validation.isValid) {
      return createErrorResponse(
        'Validation error',
        validation.error || 'Invalid request data',
        'VALIDATION_ERROR',
        false,
        400
      );
    }

    // Get the judge prompt
    const prompt = getJudgePrompt({
      concept: body.concept.trim(),
      userGroup: body.userGroup.trim(),
      pitches: {
        groq: body.pitches.groq.trim(),
        openai: body.pitches.openai.trim(),
        anthropic: body.pitches.anthropic.trim(),
      },
    });

    // Generate judgment using Anthropic Claude Opus
    const result = await generateText({
      model: anthropic('claude-3-opus-20240229'),
      prompt,
      temperature: 0.3,
      maxCompletionTokens: 1024,
      topP: 0.9,
    });

    // Parse the response
    let judgeResult;
    try {
      judgeResult = extractJSON(result.text);
    } catch (parseError) {
      console.error('Failed to parse judge response:', result.text);
      return createErrorResponse(
        'Judge response error',
        'Failed to parse judge evaluation',
        'PARSE_ERROR',
        true,
        500
      );
    }

    // Validate the judge response format
    if (!validateJudgeResponse(judgeResult)) {
      console.error('Invalid judge response format:', judgeResult);
      return createErrorResponse(
        'Judge response error',
        'Invalid judge response format',
        'INVALID_RESPONSE_FORMAT',
        true,
        500
      );
    }

    // Normalize scores to ensure they're within valid range
    const normalizedScores = normalizeScores(judgeResult.scores);

    // Create the final response
    const response: JudgeResponse = {
      id: `judge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scores: {
        groq: {
          provider: 'groq',
          score: normalizedScores.groq,
          breakdown: {
            marketViability: Math.round(normalizedScores.groq * 0.25),
            innovation: Math.round(normalizedScores.groq * 0.2),
            feasibility: Math.round(normalizedScores.groq * 0.2),
            presentation: Math.round(normalizedScores.groq * 0.2),
            monetization: Math.round(normalizedScores.groq * 0.15),
          },
          reasoning: judgeResult.reasoning || 'No specific reasoning provided for this pitch.',
        },
        openai: {
          provider: 'openai',
          score: normalizedScores.openai,
          breakdown: {
            marketViability: Math.round(normalizedScores.openai * 0.25),
            innovation: Math.round(normalizedScores.openai * 0.2),
            feasibility: Math.round(normalizedScores.openai * 0.2),
            presentation: Math.round(normalizedScores.openai * 0.2),
            monetization: Math.round(normalizedScores.openai * 0.15),
          },
          reasoning: judgeResult.reasoning || 'No specific reasoning provided for this pitch.',
        },
        anthropic: {
          provider: 'anthropic',
          score: normalizedScores.anthropic,
          breakdown: {
            marketViability: Math.round(normalizedScores.anthropic * 0.25),
            innovation: Math.round(normalizedScores.anthropic * 0.2),
            feasibility: Math.round(normalizedScores.anthropic * 0.2),
            presentation: Math.round(normalizedScores.anthropic * 0.2),
            monetization: Math.round(normalizedScores.anthropic * 0.15),
          },
          reasoning: judgeResult.reasoning || 'No specific reasoning provided for this pitch.',
        },
      },
      winner: judgeResult.winner as AIProvider,
      overallReasoning: judgeResult.reasoning || 'Judge evaluation completed successfully.',
      timestamp: new Date().toISOString(),
      metadata: {
        tokensUsed: result.usage?.totalTokens || 0,
        processingTime: Date.now(),
        confidence: 0.8, // Default confidence score
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Judge API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Rate limit errors
      if (error.message.includes('rate_limit') || error.message.includes('429')) {
        return createErrorResponse(
          'Rate limit exceeded',
          'Too many requests. Please try again later.',
          'RATE_LIMIT_ERROR',
          true,
          429
        );
      }
      
      // API key errors
      if (error.message.includes('401') || error.message.includes('unauthorized') || error.message.includes('authentication')) {
        return createErrorResponse(
          'Authentication error',
          'Invalid API key configuration',
          'AUTH_ERROR',
          false,
          401
        );
      }
      
      // Model errors
      if (error.message.includes('model') || error.message.includes('404')) {
        return createErrorResponse(
          'Model error',
          'The specified model is not available',
          'MODEL_ERROR',
          false,
          400
        );
      }
      
      // Content policy errors
      if (error.message.includes('content_policy') || error.message.includes('harmful')) {
        return createErrorResponse(
          'Content policy error',
          'Request violates content policy',
          'CONTENT_POLICY_ERROR',
          false,
          400
        );
      }
      
      // Network/timeout errors
      if (error.message.includes('timeout') || error.message.includes('network')) {
        return createErrorResponse(
          'Network error',
          'Request timed out. Please try again.',
          'TIMEOUT_ERROR',
          true,
          503
        );
      }
      
      // Token limit errors
      if (error.message.includes('max_tokens') || error.message.includes('context')) {
        return createErrorResponse(
          'Token limit error',
          'Request exceeds maximum token limit',
          'TOKEN_LIMIT_ERROR',
          false,
          400
        );
      }
      
      // Server overload errors
      if (error.message.includes('overloaded') || error.message.includes('503')) {
        return createErrorResponse(
          'Server overloaded',
          'Service temporarily overloaded. Please try again.',
          'SERVER_OVERLOAD_ERROR',
          true,
          503
        );
      }
    }
    
    // Generic error fallback
    return createErrorResponse(
      'Internal server error',
      'Failed to judge the pitches',
      'INTERNAL_ERROR',
      true,
      500
    );
  }
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(): Promise<NextResponse<ErrorResponse>> {
  return createErrorResponse(
    'Method not allowed',
    'GET method is not supported. Use POST to judge pitches.',
    'METHOD_NOT_ALLOWED',
    false,
    405
  );
}