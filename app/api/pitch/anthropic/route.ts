import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { PitchRequest, APIError } from '@/lib/types';
import { getAnthropicPitchPrompt } from '@/lib/prompt-templates';

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

  if (body.concept.trim().length === 0) {
    return { isValid: false, error: 'Concept cannot be empty' };
  }

  if (body.userGroup.trim().length === 0) {
    return { isValid: false, error: 'User group cannot be empty' };
  }

  return { isValid: true };
}

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
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
    let body: PitchRequest;
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

    // Get the appropriate prompt template
    const prompt = getAnthropicPitchPrompt({
      concept: body.concept.trim(),
      userGroup: body.userGroup.trim(),
    });

    // Create streaming response using Vercel AI SDK
    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt,
      temperature: 0.7,
      maxCompletionTokens: 2048,
      topP: 0.9,
    });

    // Return streaming response
    return result.toTextStreamResponse({
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Anthropic API error:', error);
    
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
      'Failed to generate pitch using Anthropic',
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
    'GET method is not supported. Use POST to generate a pitch.',
    'METHOD_NOT_ALLOWED',
    false,
    405
  );
}