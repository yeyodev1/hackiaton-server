# AI Agent for Document Analysis

This document describes the AI-powered agent system integrated into the document analysis platform. The agent provides intelligent insights, recommendations, and conversational interaction with your document analyses.

## Features

### 🤖 Conversational AI Interface
- Natural language interaction with document insights
- Context-aware responses based on workspace and analyses
- Multi-turn conversations with memory
- Support for specific questions about documents

### 📊 Document Insights
- AI-powered analysis of individual documents
- Risk assessment and scoring
- Compliance checking against legal frameworks
- Actionable recommendations for improvement

### 🔍 Comparative Analysis
- Multi-document comparison capabilities
- Strengths and weaknesses identification
- Strategic recommendations for document selection
- Risk matrix generation across multiple documents

### 🔄 Dual AI Provider Support
- **OpenAI GPT-4**: Primary provider for advanced reasoning
- **Google Gemini**: Fallback provider for redundancy
- Automatic failover between providers
- Health monitoring and status checking

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Google Gemini Configuration
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-pro

# Preferred AI Provider (openai or gemini)
PREFERRED_LLM_PROVIDER=openai
```

### Getting API Keys

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

#### Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

## API Endpoints

### 1. Chat with AI Agent
**POST** `/api/agent/chat`

Engage in conversational interaction with the AI agent.

```javascript
const response = await fetch('/api/agent/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'What are the main compliance risks in my documents?',
    workspaceId: 'workspace_123',
    analysisIds: ['analysis_1', 'analysis_2'],
    conversationId: 'optional_conversation_id'
  })
})
```

### 2. Get Document Insights
**GET** `/api/agent/insights/document/:analysisId`

Get AI-powered insights for a specific document analysis.

```javascript
const insights = await fetch('/api/agent/insights/document/analysis_123?question=What are the payment terms?', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
```

### 3. Get Comparison Insights
**POST** `/api/agent/insights/comparison/:workspaceId`

Compare multiple documents and get strategic recommendations.

```javascript
const comparison = await fetch('/api/agent/insights/comparison/workspace_123', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    analysisIds: ['analysis_1', 'analysis_2', 'analysis_3'],
    question: 'Which contract offers the best risk-reward ratio?'
  })
})
```

### 4. Check AI Service Health
**GET** `/api/agent/health`

Monitor the health status of AI services.

```javascript
const health = await fetch('/api/agent/health')
```

## Usage Examples

### Basic Chat Interaction

```javascript
// Ask general questions about your documents
const chatResponse = await fetch('/api/agent/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + userToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Can you summarize the key risks across all my analyzed documents?',
    workspaceId: userWorkspaceId,
    analysisIds: allAnalysisIds
  })
})

const result = await chatResponse.json()
console.log(result.response.content)
```

### Document-Specific Analysis

```javascript
// Get detailed insights for a specific document
const insightsResponse = await fetch(`/api/agent/insights/document/${analysisId}?question=What are the main legal compliance issues?`, {
  headers: {
    'Authorization': 'Bearer ' + userToken
  }
})

const insights = await insightsResponse.json()
console.log('Key Findings:', insights.insights.keyFindings)
console.log('Recommendations:', insights.insights.recommendations)
console.log('Risk Level:', insights.insights.riskAssessment.level)
```

### Multi-Document Comparison

```javascript
// Compare multiple documents for strategic decision-making
const comparisonResponse = await fetch(`/api/agent/insights/comparison/${workspaceId}`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + userToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    analysisIds: [doc1Id, doc2Id, doc3Id],
    question: 'Which document provides the best terms for our company?'
  })
})

const comparison = await comparisonResponse.json()
console.log('Preferred Document:', comparison.insights.recommendation.preferred)
console.log('Reasoning:', comparison.insights.recommendation.reasoning)
console.log('Risk Matrix:', comparison.insights.riskMatrix)
```

## Response Formats

### Chat Response
```json
{
  "success": true,
  "message": "Agent response generated successfully",
  "response": {
    "content": "Based on your document analysis...",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "conversationId": "conv_12345",
    "context": {
      "analysesCount": 3,
      "workspaceName": "My Project",
      "country": "Ecuador"
    }
  },
  "llmProvider": "openai"
}
```

### Document Insights Response
```json
{
  "success": true,
  "insights": {
    "summary": "Document analysis summary...",
    "keyFindings": [
      "Missing environmental compliance clauses",
      "Unclear payment terms in section 3.2"
    ],
    "recommendations": [
      "Add environmental impact assessment",
      "Clarify payment schedule"
    ],
    "riskAssessment": {
      "level": "medium",
      "score": 6.5,
      "factors": ["regulatory", "financial"]
    }
  }
}
```

### Comparison Insights Response
```json
{
  "success": true,
  "insights": {
    "summary": "Comparison summary...",
    "comparison": {
      "strengths": {
        "Document A": ["Clear terms", "Strong protections"],
        "Document B": ["Flexible timeline", "Lower penalties"]
      },
      "weaknesses": {
        "Document A": ["High penalties"],
        "Document B": ["Unclear scope"]
      }
    },
    "recommendation": {
      "preferred": "Document A",
      "reasoning": "Best balance of protection and clarity",
      "improvements": ["Negotiate timeline flexibility"]
    },
    "riskMatrix": {
      "Document A": { "legal": 8, "financial": 6, "operational": 7 },
      "Document B": { "legal": 5, "financial": 8, "operational": 6 }
    }
  }
}
```

## Error Handling

### Common Error Responses

```json
// Unauthorized access
{
  "success": false,
  "message": "Access token required"
}

// AI service unavailable
{
  "success": false,
  "message": "AI service is currently unavailable. Please try again later."
}

// Invalid workspace access
{
  "success": false,
  "message": "Workspace not found or access denied"
}
```

### Handling AI Service Failures

The system automatically handles AI service failures through:

1. **Provider Fallback**: If OpenAI fails, automatically tries Gemini
2. **Health Monitoring**: Regular health checks ensure service availability
3. **Graceful Degradation**: Returns structured error messages when all services fail

## Best Practices

### 1. Authentication
Always include the Bearer token in your requests:
```javascript
headers: {
  'Authorization': 'Bearer ' + userToken
}
```

### 2. Error Handling
Implement proper error handling for AI service failures:
```javascript
try {
  const response = await fetch('/api/agent/chat', options)
  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.message)
  }
  
  return result
} catch (error) {
  console.error('AI Agent Error:', error.message)
  // Implement fallback behavior
}
```

### 3. Context Management
Provide relevant context for better AI responses:
```javascript
{
  message: 'Specific question about the document',
  workspaceId: 'current_workspace',
  analysisIds: ['relevant_analysis_ids'],
  conversationId: 'maintain_conversation_context'
}
```

### 4. Rate Limiting
Be mindful of API rate limits and implement appropriate delays between requests.

## Troubleshooting

### AI Service Not Available
1. Check your API keys in the `.env` file
2. Verify your API key permissions and quotas
3. Test the health endpoint: `GET /api/agent/health`

### Poor AI Responses
1. Provide more specific questions
2. Include relevant analysis IDs for context
3. Ensure your documents have been properly analyzed

### Authentication Issues
1. Verify your JWT token is valid and not expired
2. Check workspace access permissions
3. Ensure the user has access to the specified analyses

## Integration Examples

### React Frontend Integration

```jsx
import React, { useState } from 'react'

const AIChat = ({ workspaceId, analysisIds, userToken }) => {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          workspaceId,
          analysisIds
        })
      })
      
      const result = await res.json()
      if (result.success) {
        setResponse(result.response.content)
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <textarea 
        value={message} 
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about your documents..."
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Thinking...' : 'Send'}
      </button>
      {response && (
        <div className="ai-response">
          <h3>AI Response:</h3>
          <p>{response}</p>
        </div>
      )}
    </div>
  )
}

export default AIChat
```

### Node.js Backend Integration

```javascript
const express = require('express')
const app = express()

// Middleware to get document insights
app.get('/documents/:id/insights', async (req, res) => {
  try {
    const { id } = req.params
    const { question } = req.query
    const token = req.headers.authorization
    
    const response = await fetch(`http://localhost:8100/api/agent/insights/document/${id}?question=${question}`, {
      headers: { 'Authorization': token }
    })
    
    const insights = await response.json()
    res.json(insights)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

## Security Considerations

1. **API Key Protection**: Never expose API keys in client-side code
2. **Token Validation**: Always validate JWT tokens before processing requests
3. **Workspace Access**: Verify user permissions for workspace and analysis access
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Input Sanitization**: Sanitize user inputs before sending to AI services

## Performance Optimization

1. **Caching**: Consider caching AI responses for frequently asked questions
2. **Async Processing**: Use async/await for non-blocking AI calls
3. **Batch Processing**: Group multiple requests when possible
4. **Connection Pooling**: Reuse HTTP connections for AI service calls

---

**Note**: This AI agent system requires valid API keys for OpenAI and/or Google Gemini. Ensure you have proper API quotas and billing set up for production use.