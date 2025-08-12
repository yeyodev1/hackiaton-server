# Document Comparison Flow - Complete Guide

## Overview

This document explains how to handle document comparison in our API, providing two different approaches for uploading and comparing multiple documents.

## Method 1: Traditional Flow (Separate Upload & Compare)

### Step 1: Upload Documents Individually

**Endpoint:** `POST /api/v1/document/upload`

```bash
# Upload first document
curl -X POST \
  http://localhost:3000/api/v1/document/upload \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'document=@contract1.pdf' \
  -F 'workspaceId=WORKSPACE_ID'

# Response
{
  "message": "Document uploaded and analyzed successfully",
  "analysis": {
    "_id": "analysis_id_1",
    "documentName": "contract1.pdf",
    "documentType": "contrato",
    "aiAnalysis": "...",
    "status": "completed"
  }
}
```

```bash
# Upload second document
curl -X POST \
  http://localhost:3000/api/v1/document/upload \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'document=@contract2.pdf' \
  -F 'workspaceId=WORKSPACE_ID'

# Response
{
  "message": "Document uploaded and analyzed successfully",
  "analysis": {
    "_id": "analysis_id_2",
    "documentName": "contract2.pdf",
    "documentType": "contrato",
    "aiAnalysis": "...",
    "status": "completed"
  }
}
```

### Step 2: Compare Documents by IDs

**Endpoint:** `POST /api/v1/analysis/compare`

```bash
curl -X POST \
  http://localhost:3000/api/v1/analysis/compare \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "workspaceId": "WORKSPACE_ID",
    "documentIds": ["analysis_id_1", "analysis_id_2"]
  }'

# Response
{
  "message": "Documents compared successfully",
  "comparison": {
    "summary": "Comparative analysis between 2 documents",
    "documents": [
      {
        "id": "analysis_id_1",
        "name": "contract1.pdf",
        "type": "contrato",
        "score": 85
      },
      {
        "id": "analysis_id_2",
        "name": "contract2.pdf",
        "type": "contrato",
        "score": 78
      }
    ],
    "keyDifferences": [...],
    "recommendations": [...],
    "riskComparison": 7.5
  }
}
```

## Method 2: Integrated Flow (Upload & Compare in One Step)

### Single Endpoint for Upload and Compare

**Endpoint:** `POST /api/v1/analysis/upload-and-compare`

```bash
curl -X POST \
  http://localhost:3000/api/v1/analysis/upload-and-compare \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'documents=@contract1.pdf' \
  -F 'documents=@contract2.pdf' \
  -F 'workspaceId=WORKSPACE_ID'

# Response
{
  "message": "Documents uploaded and compared successfully",
  "analyses": [
    {
      "_id": "analysis_id_1",
      "documentName": "contract1.pdf",
      "documentType": "contrato",
      "aiAnalysis": "...",
      "status": "completed"
    },
    {
      "_id": "analysis_id_2",
      "documentName": "contract2.pdf",
      "documentType": "contrato",
      "aiAnalysis": "...",
      "status": "completed"
    }
  ],
  "comparison": {
    "summary": "Comparative analysis between 2 documents",
    "documents": [...],
    "keyDifferences": [...],
    "recommendations": [...],
    "riskComparison": 7.5
  }
}
```

## Frontend Integration Examples

### React/JavaScript Example for Method 1

```javascript
// Step 1: Upload documents individually
const uploadDocument = async (file, workspaceId) => {
  const formData = new FormData()
  formData.append('document', file)
  formData.append('workspaceId', workspaceId)
  
  const response = await fetch('/api/v1/document/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  
  return response.json()
}

// Step 2: Compare documents
const compareDocuments = async (workspaceId, documentIds) => {
  const response = await fetch('/api/v1/analysis/compare', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workspaceId,
      documentIds
    })
  })
  
  return response.json()
}

// Usage
const handleTraditionalComparison = async (files, workspaceId) => {
  try {
    // Upload all documents
    const uploadPromises = files.map(file => uploadDocument(file, workspaceId))
    const uploadResults = await Promise.all(uploadPromises)
    
    // Extract document IDs
    const documentIds = uploadResults.map(result => result.analysis._id)
    
    // Compare documents
    const comparison = await compareDocuments(workspaceId, documentIds)
    
    console.log('Comparison result:', comparison)
  } catch (error) {
    console.error('Error in traditional comparison:', error)
  }
}
```

### React/JavaScript Example for Method 2

```javascript
// Upload and compare in one step
const uploadAndCompare = async (files, workspaceId) => {
  const formData = new FormData()
  
  files.forEach(file => {
    formData.append('documents', file)
  })
  formData.append('workspaceId', workspaceId)
  
  const response = await fetch('/api/v1/analysis/upload-and-compare', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  
  return response.json()
}

// Usage
const handleIntegratedComparison = async (files, workspaceId) => {
  try {
    const result = await uploadAndCompare(files, workspaceId)
    
    console.log('Upload and comparison result:', result)
    console.log('Individual analyses:', result.analyses)
    console.log('Comparison:', result.comparison)
  } catch (error) {
    console.error('Error in integrated comparison:', error)
  }
}
```

## File Handling Requirements

### Supported File Types
- PDF documents (`.pdf`)
- Maximum file size: 100MB per file
- Maximum files per request: 5 files (for upload-and-compare)

### Document Type Detection
The system automatically detects document types based on:
1. **Filename patterns**: `pliego`, `propuesta`, `contrato`, etc.
2. **Content analysis**: Keywords and document structure
3. **Default fallback**: `propuesta` if type cannot be determined

## Error Handling

### Common Error Responses

```json
// Invalid workspace
{
  "error": "Workspace not found or access denied",
  "status": 404
}

// File processing error
{
  "error": "Failed to extract text from PDF",
  "status": 400
}

// Insufficient documents for comparison
{
  "error": "At least 2 documents are required for comparison",
  "status": 400
}

// Too many documents
{
  "error": "Maximum 5 documents allowed for comparison",
  "status": 400
}
```

## Performance Considerations

### Method 1 (Traditional)
- **Pros**: Better for large files, individual error handling, progressive upload
- **Cons**: Multiple API calls, more complex frontend logic
- **Best for**: Large documents, batch processing, when you need individual document analysis first

### Method 2 (Integrated)
- **Pros**: Single API call, simpler frontend logic, faster for small files
- **Cons**: All-or-nothing approach, larger request payload
- **Best for**: Small to medium documents, quick comparisons, simplified UX

## Security Notes

- All endpoints require authentication via Bearer token
- Workspace access is validated for each request
- File uploads are limited by size and type
- Temporary files are cleaned up after processing

## Next Steps

Choose the method that best fits your use case:
- Use **Method 1** for complex workflows with individual document management
- Use **Method 2** for simple, quick document comparisons

Both methods provide the same comparison functionality and AI-powered analysis results.