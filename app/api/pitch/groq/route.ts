import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { PitchRequest, APIError } from '@/lib/types';
import { getGroqPitchPrompt } from '@/lib/prompt-templates';

// Initialize Groq SDK
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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
    if (!process.env.GROQ_API_KEY) {
      return createErrorResponse(
        'Configuration error',
        'Groq API key not configured',
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
    const prompt = getGroqPitchPrompt({
      concept: body.concept.trim(),
      userGroup: body.userGroup.trim(),
    });

    // Create streaming response using Groq SDK
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
      stream: true,
    });

    // Create a ReadableStream for streaming response
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // Send chunk in SSE format
              const data = `data: ${JSON.stringify({
                type: 'text',
                content: content,
              })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          
          // Send completion signal
          const data = `data: ${JSON.stringify({
            type: 'done',
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            error: 'Streaming failed',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    // Return streaming response
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Groq API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Rate limit errors
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return createErrorResponse(
          'Rate limit exceeded',
          'Too many requests. Please try again later.',
          'RATE_LIMIT_ERROR',
          true,
          429
        );
      }
      
      // API key errors
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
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
    }
    
    // Generic error fallback
    return createErrorResponse(
      'Internal server error',
      'Failed to generate pitch using Groq',
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