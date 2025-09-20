#!/usr/bin/env node

/**
 * AI Startup Battle - API Integration Test Script
 * 
 * This script tests all API routes to ensure they work correctly
 * and provide appropriate fallbacks when API keys are missing.
 */

const path = require('path');
const fs = require('fs');

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  testData: {
    concept: 'AI-powered productivity app',
    userGroup: 'remote workers'
  }
};

// API endpoints to test
const ENDPOINTS = [
  {
    name: 'OpenAI Pitch Generation',
    url: '/api/pitch/openai',
    method: 'POST',
    provider: 'openai',
    envKey: 'OPENAI_API_KEY'
  },
  {
    name: 'Anthropic Pitch Generation',
    url: '/api/pitch/anthropic',
    method: 'POST',
    provider: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY'
  },
  {
    name: 'Groq Pitch Generation',
    url: '/api/pitch/groq',
    method: 'POST',
    provider: 'groq',
    envKey: 'GROQ_API_KEY'
  },
  {
    name: 'Judge Evaluation',
    url: '/api/judge',
    method: 'POST',
    provider: 'judge',
    envKey: 'ANTHROPIC_API_KEY' // Judge uses Anthropic
  }
];

// Test results tracker
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  results: []
};

// Utility functions
function log(message, color = 'white') {
  console.log(colors[color] + message + colors.reset);
}

function logHeader(message) {
  console.log('\\n' + colors.bright + colors.blue + '='.repeat(60) + colors.reset);
  console.log(colors.bright + colors.blue + message + colors.reset);
  console.log(colors.bright + colors.blue + '='.repeat(60) + colors.reset);
}

function logSuccess(message) {
  log('✅ ' + message, 'green');
}

function logError(message) {
  log('❌ ' + message, 'red');
}

function logWarning(message) {
  log('⚠️  ' + message, 'yellow');
}

function logInfo(message) {
  log('ℹ️  ' + message, 'cyan');
}

function checkAPIKey(envKey) {
  const value = process.env[envKey];
  return value && value !== `your_${envKey.toLowerCase().replace('_api_key', '')}_key_here`;
}

function getAPIKeyStatus() {
  const keys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GROQ_API_KEY'];
  return keys.map(key => ({
    key,
    configured: checkAPIKey(key),
    value: process.env[key] ? (process.env[key].substring(0, 10) + '...') : 'Not set'
  }));
}

async function makeRequest(endpoint, testData) {
  const url = TEST_CONFIG.baseURL + endpoint.url;
  
  let body;
  if (endpoint.provider === 'judge') {
    body = {
      concept: testData.concept,
      userGroup: testData.userGroup,
      pitches: {
        groq: `Introducing WorkflowAI Pro - The revolutionary AI-powered productivity platform designed specifically for remote workers. Our Solution: WorkflowAI Pro integrates advanced machine learning with intuitive workflow automation to eliminate productivity bottlenecks. Features include intelligent task prioritization, automated meeting summaries, smart calendar optimization, and real-time collaboration insights. Market Opportunity: The global remote work productivity market is valued at $45B and growing 25% annually. Target Market: 50M+ remote knowledge workers seeking better productivity tools. Revenue Model: SaaS subscription starting at $29/month per user with enterprise plans at $99/month. Competitive Advantage: Our proprietary AI learns individual work patterns and provides personalized productivity recommendations. Go-to-Market: Launch with 100 beta users, targeting 10K paid users in Year 1. Financial Projections: $500K ARR by end of Year 1, $5M ARR by Year 2. Team: Experienced founders with backgrounds in AI and productivity software.`,
        openai: `Presenting TeamSync AI - The next-generation AI assistant for seamless remote team collaboration. Our Innovation: TeamSync AI uses advanced natural language processing to automate team communications, project management, and knowledge sharing. Key Features: Intelligent meeting orchestration, automated project updates, smart document collaboration, and predictive team performance analytics. Market Analysis: Remote collaboration tools market worth $31B with 40% of workforce now remote. Customer Base: Mid-size companies (100-1000 employees) struggling with remote team coordination. Business Model: Freemium with premium plans at $19/user/month and enterprise solutions at $49/user/month. Differentiation: Our AI understands team dynamics and proactively suggests optimizations. Strategy: Partner with existing productivity platforms, target HR departments. Revenue Forecast: $300K ARR Year 1, $3M ARR Year 2 with 60% gross margins. Leadership: Former executives from Slack and Microsoft with proven track records.`,
        anthropic: `Unveiling ProductiveMind - The comprehensive AI platform for enhanced remote productivity and wellbeing. Our Vision: ProductiveMind combines productivity optimization with employee wellbeing using advanced AI to create the ultimate remote work experience. Core Capabilities: AI-powered focus time optimization, stress level monitoring, personalized productivity coaching, automated workflow suggestions, and mental health insights. Market Size: $28B remote employee wellbeing market growing at 30% CAGR. Target Audience: Fortune 500 companies and progressive mid-market firms prioritizing employee experience. Monetization: Enterprise licensing model with base price of $15/employee/month plus premium analytics at $25/employee/month. Unique Value: First platform to combine productivity AI with wellbeing monitoring for holistic remote work optimization. Distribution: Direct enterprise sales with partnerships through HR consulting firms. Financial Model: $1M ARR by Year 1, $8M ARR by Year 2 with 70% recurring revenue. Foundation: Founded by former Google and Headspace executives with deep expertise in AI and workplace wellness.`
      }
    };
  } else {
    body = {
      concept: testData.concept,
      userGroup: testData.userGroup
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEST_CONFIG.timeout);

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    let responseData;

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      isStreaming: contentType && contentType.includes('text/plain')
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

async function testEndpoint(endpoint) {
  testResults.total++;
  
  logInfo(`Testing ${endpoint.name}...`);
  
  const hasApiKey = checkAPIKey(endpoint.envKey);
  if (!hasApiKey) {
    logWarning(`  No API key configured for ${endpoint.envKey}`);
    logInfo(`  Testing fallback behavior...`);
  }

  try {
    const result = await makeRequest(endpoint, TEST_CONFIG.testData);
    
    // Analyze the response
    const analysis = {
      status: result.status,
      hasError: result.status >= 400,
      isStreaming: result.isStreaming,
      hasContent: false,
      isMockData: false,
      errorCode: null,
      errorMessage: null
    };

    if (result.data) {
      if (typeof result.data === 'object') {
        analysis.hasContent = !!(result.data.pitch || result.data.content || result.data.winner);
        analysis.isMockData = !!(result.data.model && result.data.model.includes('mock'));
        analysis.errorCode = result.data.code;
        analysis.errorMessage = result.data.message;
      } else if (typeof result.data === 'string') {
        analysis.hasContent = result.data.length > 0;
        analysis.isStreaming = true;
      }
    }

    // Determine if test passed
    let passed = false;
    let message = '';

    if (analysis.hasError) {
      if (!hasApiKey && analysis.errorCode === 'MISSING_API_KEY') {
        passed = true;
        message = `Expected error for missing API key (${analysis.errorCode})`;
      } else {
        passed = false;
        message = `API error: ${analysis.errorMessage || result.statusText} (${analysis.errorCode || result.status})`;
      }
    } else {
      if (analysis.hasContent) {
        passed = true;
        if (analysis.isMockData) {
          message = 'Successfully returned mock data (fallback working)';
        } else if (analysis.isStreaming) {
          message = 'Successfully streaming real API response';
        } else {
          message = 'Successfully returned API response';
        }
      } else {
        passed = false;
        message = 'No content in response';
      }
    }

    // Record result
    const testResult = {
      endpoint: endpoint.name,
      passed,
      message,
      hasApiKey,
      status: result.status,
      ...analysis
    };

    testResults.results.push(testResult);

    if (passed) {
      testResults.passed++;
      logSuccess(`  ${message}`);
    } else {
      testResults.failed++;
      logError(`  ${message}`);
    }

    // Additional details
    if (hasApiKey) {
      logInfo(`  ✓ API key configured`);
    } else {
      logWarning(`  ! API key missing - testing fallback`);
    }

    if (analysis.isStreaming) {
      logInfo(`  ✓ Streaming response detected`);
    }

    return testResult;

  } catch (error) {
    testResults.failed++;
    const errorMessage = `Request failed: ${error.message}`;
    logError(`  ${errorMessage}`);
    
    const testResult = {
      endpoint: endpoint.name,
      passed: false,
      message: errorMessage,
      hasApiKey,
      error: error.message
    };
    
    testResults.results.push(testResult);
    return testResult;
  }
}

async function testMethodNotAllowed() {
  logInfo('Testing method not allowed (GET requests)...');
  
  for (const endpoint of ENDPOINTS) {
    try {
      const url = TEST_CONFIG.baseURL + endpoint.url;
      const response = await fetch(url, { method: 'GET' });
      
      if (response.status === 405) {
        logSuccess(`  ✓ ${endpoint.name}: Correctly rejects GET requests`);
      } else {
        logWarning(`  ! ${endpoint.name}: Unexpected status ${response.status} for GET request`);
      }
    } catch (error) {
      logError(`  ❌ ${endpoint.name}: Error testing GET request - ${error.message}`);
    }
  }
}

async function testValidation() {
  logInfo('Testing input validation...');
  
  const invalidData = [
    { test: 'Empty concept', data: { concept: '', userGroup: 'users' } },
    { test: 'Empty userGroup', data: { concept: 'app', userGroup: '' } },
    { test: 'Missing concept', data: { userGroup: 'users' } },
    { test: 'Missing userGroup', data: { concept: 'app' } },
    { test: 'Invalid JSON', data: 'invalid json', raw: true }
  ];

  for (const endpoint of ENDPOINTS.slice(0, 3)) { // Only test pitch endpoints
    logInfo(`  Testing ${endpoint.name} validation...`);
    
    for (const testCase of invalidData) {
      try {
        const url = TEST_CONFIG.baseURL + endpoint.url;
        const body = testCase.raw ? testCase.data : JSON.stringify(testCase.data);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: testCase.raw ? {} : { 'Content-Type': 'application/json' },
          body
        });

        if (response.status === 400) {
          logSuccess(`    ✓ ${testCase.test}: Correctly rejected`);
        } else {
          logWarning(`    ! ${testCase.test}: Unexpected status ${response.status}`);
        }
      } catch (error) {
        logError(`    ❌ ${testCase.test}: Error - ${error.message}`);
      }
    }
  }
}

function generateReport() {
  logHeader('🏁 TEST REPORT');
  
  // Summary
  console.log(`\\n${colors.bright}📊 Test Summary:${colors.reset}`);
  console.log(`   Total tests: ${testResults.total}`);
  console.log(`   ${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`   ${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
  console.log(`   ${colors.yellow}⏭️  Skipped: ${testResults.skipped}${colors.reset}`);
  
  const successRate = testResults.total > 0 ? (testResults.passed / testResults.total * 100).toFixed(1) : 0;
  console.log(`   ${colors.bright}📈 Success Rate: ${successRate}%${colors.reset}`);

  // API Key Status
  console.log(`\\n${colors.bright}🔑 API Key Status:${colors.reset}`);
  const apiKeys = getAPIKeyStatus();
  apiKeys.forEach(key => {
    const status = key.configured ? '✅ Configured' : '❌ Missing';
    const color = key.configured ? 'green' : 'red';
    log(`   ${key.key}: ${status} (${key.value})`, color);
  });

  // Detailed Results
  console.log(`\\n${colors.bright}📋 Detailed Results:${colors.reset}`);
  testResults.results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    console.log(`\\n   ${status} ${result.endpoint}`);
    log(`      Status: ${result.message}`, color);
    log(`      API Key: ${result.hasApiKey ? 'Configured' : 'Missing'}`, result.hasApiKey ? 'green' : 'yellow');
    if (result.status) {
      log(`      HTTP Status: ${result.status}`, 'cyan');
    }
  });

  // Recommendations
  console.log(`\\n${colors.bright}💡 Recommendations:${colors.reset}`);
  
  const missingKeys = apiKeys.filter(key => !key.configured);
  if (missingKeys.length > 0) {
    logWarning('   Missing API Keys:');
    missingKeys.forEach(key => {
      const provider = key.key.replace('_API_KEY', '').toLowerCase();
      logWarning(`     - Configure ${key.key} to enable ${provider} functionality`);
    });
    logInfo('   ℹ️  The app will use mock data when API keys are missing');
  } else {
    logSuccess('   ✅ All API keys are configured');
  }

  if (testResults.failed > 0) {
    logWarning('   Some tests failed. Check the detailed results above.');
    logInfo('   ℹ️  Ensure the development server is running on http://localhost:3000');
  } else {
    logSuccess('   ✅ All tests passed! The API is working correctly.');
  }
}

async function main() {
  logHeader('🧪 AI STARTUP BATTLE - API INTEGRATION TESTS');
  
  logInfo('Starting comprehensive API testing...');
  logInfo(`Base URL: ${TEST_CONFIG.baseURL}`);
  logInfo(`Timeout: ${TEST_CONFIG.timeout}ms`);
  logInfo(`Test data: ${JSON.stringify(TEST_CONFIG.testData)}`);

  // Check if server is running
  try {
    const healthCheck = await fetch(TEST_CONFIG.baseURL);
    logSuccess('✅ Development server is reachable');
  } catch (error) {
    logError('❌ Cannot reach development server at ' + TEST_CONFIG.baseURL);
    logError('   Please ensure you have run: npm run dev');
    process.exit(1);
  }

  console.log('\\n');

  // Test each endpoint
  logHeader('🔍 TESTING API ENDPOINTS');
  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint);
    console.log(''); // Add spacing between tests
  }

  // Additional tests
  logHeader('🧾 ADDITIONAL TESTS');
  await testMethodNotAllowed();
  console.log('');
  await testValidation();

  // Generate report
  generateReport();

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
if (require.main === module) {
  main().catch(error => {
    logError('Test runner failed: ' + error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { testEndpoint, generateReport, TEST_CONFIG };