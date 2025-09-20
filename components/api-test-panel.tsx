"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Play, 
  RefreshCw,
  Clock,
  Key,
  Server,
  TestTube
} from 'lucide-react'

interface APITestResult {
  endpoint: string
  provider: string
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout'
  httpStatus?: number
  responseTime?: number
  message?: string
  hasApiKey: boolean
  isMockData?: boolean
  error?: string
}

interface APIKeyStatus {
  OPENAI_API_KEY: boolean
  ANTHROPIC_API_KEY: boolean
  GROQ_API_KEY: boolean
}

const TEST_ENDPOINTS = [
  { name: 'OpenAI Pitch', provider: 'openai', url: '/api/pitch/openai', key: 'OPENAI_API_KEY' },
  { name: 'Anthropic Pitch', provider: 'anthropic', url: '/api/pitch/anthropic', key: 'ANTHROPIC_API_KEY' },
  { name: 'Groq Pitch', provider: 'groq', url: '/api/pitch/groq', key: 'GROQ_API_KEY' },
  { name: 'Judge API', provider: 'judge', url: '/api/judge', key: 'ANTHROPIC_API_KEY' }
]

export function APITestPanel() {
  const [testResults, setTestResults] = useState<APITestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<APIKeyStatus>({
    OPENAI_API_KEY: false,
    ANTHROPIC_API_KEY: false,
    GROQ_API_KEY: false
  })
  const [currentTest, setCurrentTest] = useState(0)
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})

  // Check API key status on component mount
  useEffect(() => {
    checkApiKeyStatus()
  }, [])

  const checkApiKeyStatus = async () => {
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        const data = await response.json()
        setApiKeyStatus(data.apiKeys || {
          OPENAI_API_KEY: false,
          ANTHROPIC_API_KEY: false,
          GROQ_API_KEY: false
        })
      }
    } catch (error) {
      console.warn('Could not check API key status:', error)
    }
  }

  const testEndpoint = async (endpoint: typeof TEST_ENDPOINTS[0]): Promise<APITestResult> => {
    const startTime = Date.now()
    
    let body
    if (endpoint.provider === 'judge') {
      body = {
        concept: 'Test App',
        userGroup: 'Test Users',
        pitches: {
          groq: 'Test pitch 1',
          openai: 'Test pitch 2',
          anthropic: 'Test pitch 3'
        }
      }
    } else {
      body = {
        concept: 'AI-powered test app',
        userGroup: 'developers'
      }
    }

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const responseTime = Date.now() - startTime
      const contentType = response.headers.get('content-type')
      
      let responseData
      let hasContent = false
      let isMockData = false

      if (contentType?.includes('application/json')) {
        responseData = await response.json()
        hasContent = !!(responseData.pitch || responseData.content || responseData.winner)
        isMockData = responseData.model?.includes('mock') || 
                    responseData.pitch?.includes('Mock') ||
                    responseData.content?.includes('Mock')
      } else if (contentType?.includes('text/plain')) {
        // Streaming response
        hasContent = true
        responseData = 'Streaming response detected'
      }

      const result: APITestResult = {
        endpoint: endpoint.name,
        provider: endpoint.provider,
        status: response.ok ? 'success' : 'error',
        httpStatus: response.status,
        responseTime,
        hasApiKey: apiKeyStatus[endpoint.key as keyof APIKeyStatus],
        isMockData,
        message: response.ok 
          ? (isMockData ? 'Mock data returned (fallback working)' : hasContent ? 'Real API response' : 'No content')
          : responseData?.message || `HTTP ${response.status}`
      }

      return result
    } catch (error) {
      return {
        endpoint: endpoint.name,
        provider: endpoint.provider,
        status: 'error',
        responseTime: Date.now() - startTime,
        hasApiKey: apiKeyStatus[endpoint.key as keyof APIKeyStatus],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])
    setCurrentTest(0)

    // Initialize test results
    const initialResults: APITestResult[] = TEST_ENDPOINTS.map(endpoint => ({
      endpoint: endpoint.name,
      provider: endpoint.provider,
      status: 'pending',
      hasApiKey: apiKeyStatus[endpoint.key as keyof APIKeyStatus]
    }))
    setTestResults(initialResults)

    // Run tests sequentially
    for (let i = 0; i < TEST_ENDPOINTS.length; i++) {
      setCurrentTest(i)
      
      // Update status to running
      setTestResults(prev => prev.map((result, index) => 
        index === i ? { ...result, status: 'running' } : result
      ))

      const result = await testEndpoint(TEST_ENDPOINTS[i])
      
      // Update with actual result
      setTestResults(prev => prev.map((result, index) => 
        index === i ? { ...prev[index], ...result } : result
      ))

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: APITestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'timeout':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-400" />
    }
  }

  const getStatusColor = (status: APITestResult['status']) => {
    switch (status) {
      case 'success': return 'success'
      case 'error': return 'destructive'
      case 'running': return 'default'
      default: return 'secondary'
    }
  }

  const successCount = testResults.filter(r => r.status === 'success').length
  const totalTests = testResults.length
  const progress = totalTests > 0 ? (successCount / totalTests) * 100 : 0

  const toggleDetails = (endpoint: string) => {
    setShowDetails(prev => ({
      ...prev,
      [endpoint]: !prev[endpoint]
    }))
  }

  return (
    <Card className="w-full max-w-4xl mx-auto p-6 bg-black/40 backdrop-blur-sm border-purple-400/50">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TestTube className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-purple-400">API Integration Tests</h2>
          </div>
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Tests
              </>
            )}
          </Button>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-400 text-center">
              Testing {TEST_ENDPOINTS[currentTest]?.name}... ({currentTest + 1}/{TEST_ENDPOINTS.length})
            </p>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="details">Test Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-green-900/20 border-green-400/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Passed</span>
                </div>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {testResults.filter(r => r.status === 'success').length}
                </p>
              </Card>
              
              <Card className="p-4 bg-red-900/20 border-red-400/50">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {testResults.filter(r => r.status === 'error').length}
                </p>
              </Card>
              
              <Card className="p-4 bg-blue-900/20 border-blue-400/50">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-400 font-medium">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-400 mt-1">{totalTests}</p>
              </Card>
            </div>

            {/* Test Results */}
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <Card key={result.endpoint} className="p-4 bg-gray-900/50 border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <span className="font-medium text-white">{result.endpoint}</span>
                      <Badge variant={getStatusColor(result.status) as any} className="text-xs">
                        {result.status}
                      </Badge>
                      {result.hasApiKey ? (
                        <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                          <Key className="w-3 h-3 mr-1" />
                          API Key
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          No Key
                        </Badge>
                      )}
                      {result.isMockData && (
                        <Badge variant="outline" className="text-xs text-orange-400 border-orange-400">
                          Mock Data
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      {result.responseTime && (
                        <span className="text-sm text-gray-400">{result.responseTime}ms</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDetails(result.endpoint)}
                        className="ml-2"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                  
                  {showDetails[result.endpoint] && (
                    <div className="mt-3 pt-3 border-t border-gray-700 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <span className="ml-2 text-white">{result.message || result.status}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">HTTP Status:</span>
                          <span className="ml-2 text-white">{result.httpStatus || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Provider:</span>
                          <span className="ml-2 text-white">{result.provider}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Response Time:</span>
                          <span className="ml-2 text-white">{result.responseTime || 'N/A'}ms</span>
                        </div>
                      </div>
                      {result.error && (
                        <div className="mt-2">
                          <span className="text-gray-400">Error:</span>
                          <span className="ml-2 text-red-400">{result.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertTitle>API Key Configuration</AlertTitle>
              <AlertDescription>
                Configure your API keys in the .env.local file to enable real AI functionality.
                Without keys, the app will use mock data.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {Object.entries(apiKeyStatus).map(([key, configured]) => (
                <Card key={key} className="p-4 bg-gray-900/50 border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {configured ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium text-white">{key}</span>
                    </div>
                    <Badge variant={configured ? 'default' : 'destructive'}>
                      {configured ? 'Configured' : 'Missing'}
                    </Badge>
                  </div>
                  {!configured && (
                    <p className="text-sm text-gray-400 mt-2">
                      Add {key}=your_key_here to your .env.local file
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Alert>
              <TestTube className="h-4 w-4" />
              <AlertTitle>Test Details</AlertTitle>
              <AlertDescription>
                These tests verify that each API endpoint responds correctly and handles
                missing API keys gracefully by falling back to mock data.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEST_ENDPOINTS.map((endpoint) => (
                <Card key={endpoint.provider} className="p-4 bg-gray-900/50 border-gray-700">
                  <h3 className="font-medium text-white mb-2">{endpoint.name}</h3>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-400">Endpoint:</span>
                      <span className="ml-2 text-blue-400">{endpoint.url}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Provider:</span>
                      <span className="ml-2 text-white">{endpoint.provider}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Required Key:</span>
                      <span className="ml-2 text-orange-400">{endpoint.key}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  )
}

export default APITestPanel