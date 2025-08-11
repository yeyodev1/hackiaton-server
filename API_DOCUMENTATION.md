# API Documentation - Document Analysis System

## Overview
This API provides comprehensive document analysis capabilities for procurement documents (pliegos), proposals (propuestas), and contracts (contratos). The system integrates with workspace configurations and country-specific legal frameworks.

## Base URL
```
http://localhost:8101/api
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Workspace Management

#### Get User Workspace
```http
GET /workspace/my-workspace
```
Returns the user's workspace with available countries and current configuration.

#### Update Workspace Country
```http
PUT /workspace/country
Content-Type: application/json

{
  "country": "ecuador" | "peru" | "colombia" | "mexico" | "others"
}
```
Updates workspace country and automatically configures legal document paths.

#### Upload Company Document
```http
POST /workspace/upload-document
Content-Type: multipart/form-data

Form Data:
- document: File (PDF, DOC, DOCX)
```
Uploads company-specific documents to Google Drive.

#### Complete Workspace Setup
```http
PUT /workspace/complete-setup
```
Marks workspace as fully configured and activates it.

### 2. Document Analysis

#### Analyze Single Document
```http
POST /analysis/document
Content-Type: multipart/form-data

Form Data:
- document: File (PDF, DOC, DOCX)
- documentType: "pliego" | "propuesta" | "contrato"
- workspaceId: string (ObjectId)
```

**Response:**
```json
{
  "success": true,
  "message": "Document analyzed successfully",
  "analysis": {
    "documentId": "string",
    "documentName": "string",
    "documentType": "pliego",
    "analysisDate": "2024-01-01T00:00:00.000Z",
    "sections": {
      "legal": {
        "guarantees": ["string"],
        "penalties": ["string"],
        "deadlines": ["string"],
        "risks": ["string"],
        "complianceScore": 0.75
      },
      "technical": {
        "requirements": ["string"],
        "materials": ["string"],
        "processes": ["string"],
        "timeline": ["string"],
        "completenessScore": 0.80
      },
      "economic": {
        "budget": "string",
        "paymentTerms": ["string"],
        "costs": ["string"],
        "financialRisks": ["string"],
        "economicScore": 0.85
      }
    },
    "rucValidation": {
      "ruc": "string",
      "companyName": "string",
      "isValid": true,
      "canPerformWork": true,
      "businessType": "string"
    },
    "gaps": ["string"],
    "inconsistencies": ["string"],
    "recommendations": ["string"],
    "overallRiskScore": 0.25,
    "overallComplianceScore": 0.80
  },
  "workspace": {
    "id": "string",
    "name": "string",
    "country": "ecuador"
  }
}
```

#### Get Workspace Analyses
```http
GET /analysis/workspace/{workspaceId}?page=1&limit=10&documentType=pliego&status=completed
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `documentType`: Filter by document type (optional)
- `status`: Filter by status - "processing" | "completed" | "failed" (optional)

**Response:**
```json
{
  "success": true,
  "message": "Workspace analyses retrieved successfully",
  "analyses": [
    {
      "_id": "string",
      "documentName": "string",
      "documentType": "pliego",
      "analysisDate": "2024-01-01T00:00:00.000Z",
      "overallRiskScore": 0.25,
      "overallComplianceScore": 0.80,
      "status": "completed",
      "createdBy": {
        "name": "string",
        "email": "string"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "workspace": {
    "id": "string",
    "name": "string",
    "country": "ecuador"
  }
}
```

#### Get Analysis by ID
```http
GET /analysis/{analysisId}
```

Returns complete analysis details including all sections, recommendations, and metadata.

#### Compare Documents
```http
POST /analysis/compare
Content-Type: application/json

{
  "workspaceId": "string",
  "analysisIds": ["string", "string"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Documents compared successfully",
  "comparison": {
    "comparisonId": "string",
    "comparisonDate": "2024-01-01T00:00:00.000Z",
    "documentsAnalyzed": 3,
    "ranking": [
      {
        "documentId": "string",
        "documentName": "string",
        "rank": 1,
        "overallScore": 0.85,
        "strengths": ["string"],
        "weaknesses": ["string"]
      }
    ],
    "bestInCategory": {
      "legal": {
        "documentId": "string",
        "documentName": "string",
        "score": 0.90
      },
      "technical": {
        "documentId": "string",
        "documentName": "string",
        "score": 0.85
      },
      "economic": {
        "documentId": "string",
        "documentName": "string",
        "score": 0.88
      }
    },
    "recommendations": ["string"],
    "criticalAlerts": ["string"]
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## File Upload Specifications

**Supported Formats:**
- PDF (.pdf)
- Microsoft Word (.doc, .docx)
- Maximum file size: 100MB
- Maximum files per request: 10

**Upload Directory:**
Files are temporarily stored in `/uploads` directory and processed asynchronously.

## Country-Specific Legal Documents

When a workspace country is selected, the system automatically configures paths to legal documents:

**Available Countries:**
- `ecuador`: Constitution, Procurement Law, Procurement Regulation
- `peru`: Constitution, Procurement Law, Procurement Regulation
- `colombia`: Constitution, Procurement Law, Procurement Regulation
- `mexico`: Constitution, Procurement Law, Procurement Regulation
- `others`: Generic legal framework

**Document Paths:**
```
src/utils/{country}/
├── constitucion.pdf
├── ley_contrataciones.pdf
└── reglamento_ley_contrataciones.pdf
```

## Analysis Features

### Legal Analysis
- Guarantee requirements validation
- Penalty clause analysis
- Deadline compliance checking
- Risk assessment
- Legal compliance scoring

### Technical Analysis
- Requirement completeness
- Material specifications
- Process validation
- Timeline feasibility
- Technical scoring

### Economic Analysis
- Budget validation
- Payment terms analysis
- Cost breakdown
- Financial risk assessment
- Economic viability scoring

### RUC Validation (Ecuador-specific)
- Company registration validation
- Business type verification
- Work capability assessment

## Integration Notes

1. **Google Drive Integration**: Company documents are uploaded to Google Drive with workspace-specific folders.
2. **JWT Authentication**: All endpoints require valid JWT tokens with user information.
3. **Mongoose Integration**: All data is stored in MongoDB with proper indexing and relationships.
4. **File Processing**: Documents are processed asynchronously with status tracking.
5. **Country Configuration**: Legal document paths are automatically configured based on workspace country selection.

## Development

**Environment Variables:**
```env
PORT=8101
JWT_SECRET=your-secret-key
MONGO_URI=mongodb://localhost:27017/your-database
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

**Start Development Server:**
```bash
npm run dev
```

**Build for Production:**
```bash
npm run build
npm start
```

## AI Agent Endpoints

### Chat with AI Agent
**POST** `/api/agent/chat`

Interact with the AI agent for document analysis insights and recommendations.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "message": "What are the main risks in these documents?",
  "workspaceId": "workspace_id",
  "analysisIds": ["analysis_id_1", "analysis_id_2"],
  "conversationId": "optional_conversation_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent response generated successfully",
  "response": {
    "content": "Based on the analysis of your documents, I've identified several key risks...",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "conversationId": "conv_12345",
    "context": {
      "analysesCount": 2,
      "workspaceName": "My Workspace",
      "country": "Ecuador"
    }
  },
  "llmProvider": "openai"
}
```

### Get Document Insights
**GET** `/api/agent/insights/document/:analysisId?question=your_question`

Get AI-powered insights for a specific document analysis.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `question` (optional): Specific question about the document

**Response:**
```json
{
  "success": true,
  "message": "Document insights generated successfully",
  "insights": {
    "summary": "This document shows high compliance but has several risk areas...",
    "keyFindings": [
      "Missing environmental compliance clauses",
      "Unclear payment terms in section 3.2"
    ],
    "recommendations": [
      "Add environmental impact assessment requirements",
      "Clarify payment schedule and penalties"
    ],
    "riskAssessment": {
      "level": "medium",
      "score": 6.5,
      "factors": ["regulatory", "financial"]
    }
  },
  "analysis": {
    "id": "analysis_id",
    "documentName": "Contract_v1.pdf",
    "documentType": "contract",
    "analysisDate": "2024-01-15T10:00:00.000Z",
    "overallRiskScore": 6.5,
    "overallComplianceScore": 8.2
  },
  "llmProvider": "openai"
}
```

### Get Comparison Insights
**POST** `/api/agent/insights/comparison/:workspaceId`

Get AI-powered insights comparing multiple document analyses.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "analysisIds": ["analysis_id_1", "analysis_id_2", "analysis_id_3"],
  "question": "Which document has the best terms for our company?"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comparison insights generated successfully",
  "insights": {
    "summary": "Comparing 3 documents, Document A offers the best overall terms...",
    "comparison": {
      "strengths": {
        "Document A": ["Clear payment terms", "Strong legal protections"],
        "Document B": ["Flexible timeline", "Lower penalties"],
        "Document C": ["Comprehensive scope", "Good risk distribution"]
      },
      "weaknesses": {
        "Document A": ["High penalties", "Rigid timeline"],
        "Document B": ["Unclear scope", "Weak legal protections"],
        "Document C": ["Complex payment structure", "High risk exposure"]
      }
    },
    "recommendation": {
      "preferred": "Document A",
      "reasoning": "Best balance of legal protection and clear terms",
      "improvements": ["Negotiate timeline flexibility", "Reduce penalty amounts"]
    },
    "riskMatrix": {
      "Document A": { "legal": 8, "financial": 6, "operational": 7 },
      "Document B": { "legal": 5, "financial": 8, "operational": 6 },
      "Document C": { "legal": 7, "financial": 5, "operational": 8 }
    }
  },
  "comparedAnalyses": [
    {
      "id": "analysis_id_1",
      "documentName": "Contract_A.pdf",
      "documentType": "contract",
      "analysisDate": "2024-01-15T10:00:00.000Z",
      "overallRiskScore": 6.5,
      "overallComplianceScore": 8.2
    }
  ],
  "llmProvider": "openai"
}
```

### Check AI Service Health
**GET** `/api/agent/health`

Check the health status of AI services.

**Response:**
```json
{
  "success": true,
  "message": "LLM service health check completed",
  "health": {
    "status": "healthy",
    "preferredProvider": "openai",
    "providers": {
      "openai": {
        "available": true,
        "model": "gpt-4-turbo-preview",
        "lastCheck": "2024-01-15T10:30:00.000Z"
      },
      "gemini": {
        "available": true,
        "model": "gemini-pro",
        "lastCheck": "2024-01-15T10:30:00.000Z"
      }
    }
  }
}
```

## AI Service Configuration

### Environment Variables
Add these variables to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Google Gemini Configuration
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-pro

# Preferred AI Provider
PREFERRED_LLM_PROVIDER=openai
```

### AI Agent Features

1. **Conversational Interface**: Natural language interaction with document insights
2. **Context-Aware Responses**: Understands workspace and document context
3. **Multi-Document Analysis**: Compare and analyze multiple documents simultaneously
4. **Risk Assessment**: AI-powered risk scoring and identification
5. **Compliance Checking**: Automated compliance verification against legal frameworks
6. **Recommendation Engine**: Actionable insights and improvement suggestions
7. **Fallback Support**: Automatic failover between OpenAI and Gemini
8. **Health Monitoring**: Real-time service availability checking

### Usage Examples

**Basic Chat:**
```javascript
const response = await fetch('/api/agent/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'What are the main compliance issues in my documents?',
    workspaceId: 'workspace_123',
    analysisIds: ['analysis_1', 'analysis_2']
  })
})
```

**Document Insights:**
```javascript
const insights = await fetch('/api/agent/insights/document/analysis_123?question=What are the payment terms?', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
```

**Comparison Analysis:**
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