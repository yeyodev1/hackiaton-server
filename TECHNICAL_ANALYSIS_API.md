# Technical Analysis API Documentation

## Overview

This document describes the enhanced analysis endpoints that now properly integrate with the LLM service for comprehensive document analysis, comparison, and technical insights as required by the hackathon specifications.

## New Endpoints

### 1. Document Insights Endpoint

**GET** `/api/analysis/:analysisId/insights`

Generate focused insights for a specific document analysis.

#### Parameters
- `analysisId` (path): MongoDB ObjectId of the analysis
- `focus` (query, optional): Focus area for the analysis
  - `legal`: Legal aspects, compliance, contractual obligations
  - `technical`: Technical requirements, specifications, feasibility
  - `economic`: Budget, payment terms, financial risks
  - `risks`: Comprehensive risk assessment
  - Default: Comprehensive analysis

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/analysis/65f1234567890abcdef12345/insights?focus=technical" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Example Response
```json
{
  "success": true,
  "message": "Document insights generated successfully (technical focus)",
  "insights": {
    "id": "65f1234567890abcdef12345",
    "documentName": "Pliego_Tecnico_Infraestructura.pdf",
    "documentType": "pliego",
    "focus": "technical",
    "analysis": "# Technical Analysis\n\n## Technical Requirements\n...",
    "rucValidation": {
      "ruc": "1234567890001",
      "isValid": true,
      "businessName": "Tech Solutions S.A.",
      "status": "Active"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "workspace": {
      "id": "65f1234567890abcdef12340",
      "name": "Infrastructure Project",
      "country": {
        "name": "Ecuador",
        "code": "EC"
      }
    }
  }
}
```

### 2. Technical Analysis Endpoint

**GET** `/api/analysis/:analysisId/technical`

Generate comprehensive technical analysis for a document.

#### Parameters
- `analysisId` (path): MongoDB ObjectId of the analysis
- `question` (query, optional): Specific technical question to focus on

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/analysis/65f1234567890abcdef12345/technical?question=What are the main technical risks?" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Enhanced Document Comparison

**POST** `/api/analysis/compare`

Now uses the LLM service for intelligent document comparison.

#### Request Body
```json
{
  "workspaceId": "65f1234567890abcdef12340",
  "documentIds": [
    "65f1234567890abcdef12345",
    "65f1234567890abcdef12346"
  ]
}
```

#### Enhanced Response
The comparison now includes AI-generated insights with:
- Intelligent risk assessment
- Detailed strengths and weaknesses analysis
- Smart ranking based on multiple criteria
- Actionable recommendations

## LLM Service Integration

### Features
- **Dual Provider Support**: OpenAI GPT-4 and Google Gemini
- **Automatic Fallback**: If preferred provider fails, automatically switches to backup
- **Health Monitoring**: Real-time health checks for both providers
- **Country-Specific Analysis**: Legal context adapted to Ecuador's regulations
- **Markdown Output**: Structured, readable analysis format

### Configuration
Set these environment variables:
```bash
# Primary LLM Provider
PREFERRED_LLM_PROVIDER=openai  # or 'gemini'

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4-turbo-preview

# Gemini Configuration
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-pro
```

## Analysis Types by Document Type

### Pliegos (Tender Documents)
- **Legal Focus**: Compliance requirements, legal obligations
- **Technical Focus**: Technical specifications, standards, requirements
- **Economic Focus**: Budget constraints, payment terms
- **Risk Focus**: Regulatory risks, implementation challenges

### Propuestas (Proposals)
- **Legal Focus**: Contractual compliance, legal commitments
- **Technical Focus**: Solution feasibility, technical approach
- **Economic Focus**: Cost analysis, financial viability
- **Risk Focus**: Delivery risks, technical risks

### Contratos (Contracts)
- **Legal Focus**: Legal obligations, penalties, guarantees
- **Technical Focus**: Delivery specifications, quality standards
- **Economic Focus**: Payment schedules, cost structure
- **Risk Focus**: Performance risks, legal risks

## Error Handling

### LLM Service Unavailable
When the LLM service is unavailable, endpoints automatically fall back to:
- Existing analysis data
- Simulated comparison metrics
- Clear indication of fallback mode

### Example Error Response
```json
{
  "success": false,
  "message": "AI service is currently unavailable"
}
```

## Usage Tracking

All analysis endpoints update workspace usage counters:
- `usage.analysisCount`: Incremented for each analysis request
- Helps track API usage and billing

## Best Practices

1. **Use Focused Queries**: Specify the `focus` parameter for targeted insights
2. **Handle Fallbacks**: Always check for fallback mode indicators
3. **Cache Results**: Analysis results are computationally expensive
4. **Monitor Usage**: Track workspace usage for billing/limits
5. **Validate Access**: All endpoints verify workspace access permissions

## Integration with Frontend

### Dashboard Implementation
```javascript
// Get technical insights for dashboard
const getTechnicalInsights = async (analysisId) => {
  const response = await fetch(`/api/analysis/${analysisId}/insights?focus=technical`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return response.json()
}

// Compare multiple documents
const compareDocuments = async (workspaceId, documentIds) => {
  const response = await fetch('/api/analysis/compare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ workspaceId, documentIds })
  })
  return response.json()
}
```

## Compliance with Hackathon Requirements

These endpoints fulfill the hackathon requirements:

✅ **Automatic Document Reading**: PDF text extraction and analysis
✅ **Information Classification**: Legal, technical, economic sections
✅ **RUC Validation**: Integrated contractor validation
✅ **Gap Detection**: AI identifies inconsistencies and missing information
✅ **Multi-Document Comparison**: Intelligent comparison with ranking
✅ **Improvement Suggestions**: AI-generated recommendations
✅ **Technical Analysis**: Comprehensive technical feasibility assessment
✅ **Interactive Dashboard**: API endpoints for dashboard implementation