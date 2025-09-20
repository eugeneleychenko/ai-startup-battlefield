import { NextRequest, NextResponse } from 'next/server'

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  apiKeys: {
    OPENAI_API_KEY: boolean
    ANTHROPIC_API_KEY: boolean
    GROQ_API_KEY: boolean
  }
  services: {
    openai: 'available' | 'unavailable' | 'no-key'
    anthropic: 'available' | 'unavailable' | 'no-key'
    groq: 'available' | 'unavailable' | 'no-key'
  }
  environment: {
    nodeEnv: string
    platform: string
  }
}

function checkAPIKey(envKey: string): boolean {
  const value = process.env[envKey]
  return !!(value && value !== `your_${envKey.toLowerCase().replace('_api_key', '')}_key_here`)
}

export async function GET(request: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
  const apiKeys = {
    OPENAI_API_KEY: checkAPIKey('OPENAI_API_KEY'),
    ANTHROPIC_API_KEY: checkAPIKey('ANTHROPIC_API_KEY'),
    GROQ_API_KEY: checkAPIKey('GROQ_API_KEY')
  }

  const services = {
    openai: apiKeys.OPENAI_API_KEY ? 'available' as const : 'no-key' as const,
    anthropic: apiKeys.ANTHROPIC_API_KEY ? 'available' as const : 'no-key' as const,
    groq: apiKeys.GROQ_API_KEY ? 'available' as const : 'no-key' as const
  }

  const availableServices = Object.values(services).filter(status => status === 'available').length
  const status = availableServices === 3 ? 'healthy' : 
                 availableServices > 0 ? 'degraded' : 'unhealthy'

  const response: HealthCheckResponse = {
    status,
    timestamp: new Date().toISOString(),
    apiKeys,
    services,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      platform: process.platform
    }
  }

  return NextResponse.json(response, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}