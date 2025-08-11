# AI Integration Flow - Document Analysis

## Overview

This document explains how the AI integration works in the document analysis system, from file upload to AI-powered analysis.

## Complete Flow

### 1. Document Upload & Analysis Request

**Endpoint**: `POST /analysis/document`

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body**:
```
workspaceId: "689a47400a8ba56e72de0314"
documentType: "pliego" | "propuesta" | "contrato"
file: <PDF_FILE>
```

### 2. Controller Processing (`analyzeDocumentController`)

Location: `src/controllers/analysis.controller.ts:87-190`

**Steps**:
1. **Validation**: Validates file, workspaceId, and documentType
2. **Access Control**: Verifies user has access to the workspace
3. **AI Analysis**: Calls `analyzeDocumentWithAI()` function
4. **Database Storage**: Saves analysis results to MongoDB
5. **Response**: Returns complete analysis to client

### 3. AI Analysis Process (`analyzeDocumentWithAI`)

Location: `src/controllers/analysis.controller.ts:413-468`

**Steps**:

#### 3.1 Text Extraction
```typescript
// TODO: Currently simulated, will use pdf-parse when installed
const extractedText = `Document: ${file.originalname}
This is a ${documentType} document from ${country}.
Content analysis will be performed by AI based on document type and context.`
```

#### 3.2 LLM Service Initialization
```typescript
const llmService = new LLMService()
const healthStatus = await llmService.healthCheck()
```

#### 3.3 AI Analysis Call
```typescript
const aiResponse = await llmService.generateDocumentInsights({
  documentType,
  extractedText,
  country,
  fileName: file.originalname
})
```

#### 3.4 Response Transformation
```typescript
const analysisResult = transformAIResponseToAnalysis(
  aiResponse,
  documentId,
  file.originalname,
  documentType,
  analysisDate,
  country
)
```

### 4. LLM Service (`src/services/llm.service.ts`)

**Key Methods**:

#### 4.1 Health Check
```typescript
async healthCheck(): Promise<HealthStatus>
```
- Checks availability of OpenAI and Gemini
- Returns preferred provider status

#### 4.2 Document Analysis
```typescript
async generateDocumentInsights(analysis: any, question?: string): Promise<DocumentInsights>
```
- Sends document content to AI
- Uses specialized prompts for legal/business analysis
- Returns structured insights

#### 4.3 Provider Fallback
- Tries preferred provider first (OpenAI or Gemini)
- Falls back to alternative if primary fails
- Throws error if both unavailable

### 5. AI Response Processing

**Input to AI**:
```typescript
{
  documentType: "pliego",
  extractedText: "Document content...",
  country: "Ecuador",
  fileName: "contract.pdf"
}
```

**AI Response Structure**:
```typescript
{
  summary: string,
  keyFindings: string[],
  recommendations: string[],
  riskAssessment: {
    level: 'low' | 'medium' | 'high',
    score: number,
    factors: string[]
  }
}
```

**Transformed Output**:
```typescript
{
  documentId: string,
  documentName: string,
  documentType: string,
  analysisDate: Date,
  sections: {
    legal: { guarantees, penalties, deadlines, risks, complianceScore },
    technical: { requirements, materials, processes, timeline, completenessScore },
    economic: { budget, paymentTerms, costs, financialRisks, economicScore }
  },
  gaps: string[],
  inconsistencies: string[],
  recommendations: string[],
  overallRiskScore: number,
  overallComplianceScore: number
}
```

## Environment Configuration

**Required Variables** (`.env`):
```env
# AI Services
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-pro
PREFERRED_LLM_PROVIDER=openai
```

## Error Handling & Fallbacks

### 1. AI Service Unavailable
- Falls back to `simulateDocumentAnalysis()`
- Generates realistic mock data
- Logs error for monitoring

### 2. PDF Processing Error
- Currently uses filename simulation
- TODO: Implement proper PDF text extraction

### 3. Provider Fallback
- OpenAI → Gemini (or vice versa)
- Graceful degradation

## Next Steps for Full Implementation

### 1. Install PDF Processing
```bash
npm install pdf-parse @types/pdf-parse
```

### 2. Update Text Extraction
```typescript
const fileBuffer = await fs.readFile(file.path)
const pdfData = await pdfParse(fileBuffer)
const extractedText = pdfData.text
```

### 3. Enhanced AI Prompts
- Country-specific legal requirements
- Document type specialized analysis
- Multi-language support

### 4. Monitoring & Analytics
- AI response quality metrics
- Processing time tracking
- Error rate monitoring

## Testing the Integration

### 1. Upload Document
```bash
curl -X POST http://localhost:8100/analysis/document \
  -H "Authorization: Bearer <token>" \
  -F "workspaceId=689a47400a8ba56e72de0314" \
  -F "documentType=pliego" \
  -F "file=@document.pdf"
```

### 2. Check Analysis Results
```bash
curl -X GET http://localhost:8100/analysis/workspace/689a47400a8ba56e72de0314 \
  -H "Authorization: Bearer <token>"
```

### 3. Chat with Agent
```bash
curl -X POST http://localhost:8100/agent/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "689a47400a8ba56e72de0314",
    "message": "What are the main risks in this contract?"
  }'
```

## Architecture Benefits

1. **Separation of Concerns**: Analysis logic separated from AI service
2. **Provider Flexibility**: Easy to switch between OpenAI/Gemini
3. **Graceful Degradation**: Fallback to simulation if AI fails
4. **Extensible**: Easy to add new document types or analysis features
5. **Testable**: Each component can be tested independently

This integration provides a robust, scalable foundation for AI-powered document analysis while maintaining reliability through proper error handling and fallback mechanisms.