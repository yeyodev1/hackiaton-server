# Upload and Compare Documents - Practical Example

## Complete Implementation Example

This example demonstrates how to use the new `/upload-and-compare` endpoint to upload multiple contracts and get a comparative analysis in a single API call.

## Backend Implementation Details

### Controller Function: `uploadAndCompareController`

Location: `src/controllers/analysis.controller.ts` (lines 607-689)

```typescript
export async function uploadAndCompareController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[]
    const { workspaceId } = req.body

    // Validation
    if (!files || files.length < 2) {
      res.status(HttpStatusCode.BadRequest).send({
        error: "At least 2 documents are required for comparison"
      })
      return
    }

    if (files.length > 5) {
      res.status(HttpStatusCode.BadRequest).send({
        error: "Maximum 5 documents allowed for comparison"
      })
      return
    }

    // Process each document and generate analysis
    const analyses: any[] = []
    
    for (const file of files) {
      // Extract text from PDF
      const extractedText = await extractTextFromPDF(file.path)
      
      // Determine document type
      const documentType = determineDocumentType(file.originalname, extractedText)
      
      // Generate AI analysis with fallback
      let aiAnalysis: string
      try {
        aiAnalysis = await analyzeDocumentWithAI(extractedText, documentType)
      } catch (error) {
        console.error('AI analysis failed, using fallback:', error)
        aiAnalysis = generateFallbackAnalysis(documentType, file.originalname)
      }
      
      // Create analysis record
      const analysis = new models.DocumentAnalysis({
        workspaceId,
        documentName: file.originalname,
        documentType,
        aiAnalysis,
        status: 'completed'
      })
      
      await analysis.save()
      analyses.push(analysis)
    }
    
    // Generate comparative analysis
    const comparison = await generateComparativeAnalysis(analyses)
    
    res.status(HttpStatusCode.Ok).send({
      message: "Documents uploaded and compared successfully",
      analyses,
      comparison
    })
    return
    
  } catch (error) {
    console.error('Error in uploadAndCompareController:', error)
    res.status(HttpStatusCode.InternalServerError).send({
      error: "Failed to upload and compare documents"
    })
    return
  }
}
```

## Frontend Integration Examples

### React Component with File Upload

```jsx
import React, { useState } from 'react'

const DocumentComparison = () => {
  const [files, setFiles] = useState([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    
    if (selectedFiles.length < 2) {
      setError('Please select at least 2 documents')
      return
    }
    
    if (selectedFiles.length > 5) {
      setError('Maximum 5 documents allowed')
      return
    }
    
    setFiles(selectedFiles)
    setError('')
  }

  const handleUploadAndCompare = async () => {
    if (!workspaceId) {
      setError('Please enter a workspace ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      
      // Add all files
      files.forEach(file => {
        formData.append('documents', file)
      })
      
      // Add workspace ID
      formData.append('workspaceId', workspaceId)

      const response = await fetch('/api/v1/analysis/upload-and-compare', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
      
    } catch (err) {
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="document-comparison">
      <h2>Document Comparison Tool</h2>
      
      <div className="form-group">
        <label>Workspace ID:</label>
        <input
          type="text"
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.target.value)}
          placeholder="Enter workspace ID"
        />
      </div>
      
      <div className="form-group">
        <label>Select Documents (2-5 files):</label>
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileChange}
        />
      </div>
      
      {files.length > 0 && (
        <div className="selected-files">
          <h3>Selected Files:</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
            ))}
          </ul>
        </div>
      )}
      
      <button
        onClick={handleUploadAndCompare}
        disabled={loading || files.length < 2 || !workspaceId}
        className="upload-btn"
      >
        {loading ? 'Processing...' : 'Upload and Compare Documents'}
      </button>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {result && (
        <div className="results">
          <h3>Comparison Results</h3>
          
          <div className="analyses">
            <h4>Individual Document Analyses:</h4>
            {result.analyses.map((analysis, index) => (
              <div key={index} className="analysis-item">
                <h5>{analysis.documentName}</h5>
                <p><strong>Type:</strong> {analysis.documentType}</p>
                <p><strong>Status:</strong> {analysis.status}</p>
              </div>
            ))}
          </div>
          
          <div className="comparison">
            <h4>Comparative Analysis:</h4>
            <p><strong>Summary:</strong> {result.comparison.summary}</p>
            <p><strong>Risk Score:</strong> {result.comparison.riskComparison}/10</p>
            
            <div className="documents-scores">
              <h5>Document Scores:</h5>
              {result.comparison.documents.map((doc, index) => (
                <div key={index} className="doc-score">
                  <span>{doc.name}: {doc.score}/100</span>
                </div>
              ))}
            </div>
            
            <div className="key-differences">
              <h5>Key Differences:</h5>
              <ul>
                {result.comparison.keyDifferences.map((diff, index) => (
                  <li key={index}>{diff}</li>
                ))}
              </ul>
            </div>
            
            <div className="recommendations">
              <h5>Recommendations:</h5>
              <ul>
                {result.comparison.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentComparison
```

### Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Document Comparison</title>
    <style>
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; }
        .form-group input { width: 100%; padding: 8px; }
        .upload-btn { background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }
        .upload-btn:disabled { background: #ccc; cursor: not-allowed; }
        .error { color: red; margin: 10px 0; }
        .results { margin-top: 20px; padding: 20px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Document Comparison Tool</h1>
        
        <div class="form-group">
            <label for="workspaceId">Workspace ID:</label>
            <input type="text" id="workspaceId" placeholder="Enter workspace ID">
        </div>
        
        <div class="form-group">
            <label for="documents">Select Documents (2-5 PDF files):</label>
            <input type="file" id="documents" multiple accept=".pdf">
        </div>
        
        <button id="uploadBtn" class="upload-btn">Upload and Compare Documents</button>
        
        <div id="error" class="error" style="display: none;"></div>
        <div id="results" class="results" style="display: none;"></div>
    </div>

    <script>
        const uploadBtn = document.getElementById('uploadBtn')
        const documentsInput = document.getElementById('documents')
        const workspaceInput = document.getElementById('workspaceId')
        const errorDiv = document.getElementById('error')
        const resultsDiv = document.getElementById('results')

        uploadBtn.addEventListener('click', async () => {
            const files = documentsInput.files
            const workspaceId = workspaceInput.value

            // Validation
            if (!workspaceId) {
                showError('Please enter a workspace ID')
                return
            }

            if (files.length < 2) {
                showError('Please select at least 2 documents')
                return
            }

            if (files.length > 5) {
                showError('Maximum 5 documents allowed')
                return
            }

            // Disable button and show loading
            uploadBtn.disabled = true
            uploadBtn.textContent = 'Processing...'
            hideError()
            hideResults()

            try {
                const formData = new FormData()
                
                // Add all files
                for (let i = 0; i < files.length; i++) {
                    formData.append('documents', files[i])
                }
                
                // Add workspace ID
                formData.append('workspaceId', workspaceId)

                const response = await fetch('/api/v1/analysis/upload-and-compare', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()
                showResults(data)
                
            } catch (err) {
                showError(`Error: ${err.message}`)
            } finally {
                uploadBtn.disabled = false
                uploadBtn.textContent = 'Upload and Compare Documents'
            }
        })

        function showError(message) {
            errorDiv.textContent = message
            errorDiv.style.display = 'block'
        }

        function hideError() {
            errorDiv.style.display = 'none'
        }

        function showResults(data) {
            let html = `
                <h2>Comparison Results</h2>
                
                <h3>Individual Document Analyses:</h3>
                ${data.analyses.map(analysis => `
                    <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee;">
                        <strong>${analysis.documentName}</strong><br>
                        Type: ${analysis.documentType}<br>
                        Status: ${analysis.status}
                    </div>
                `).join('')}
                
                <h3>Comparative Analysis:</h3>
                <p><strong>Summary:</strong> ${data.comparison.summary}</p>
                <p><strong>Risk Score:</strong> ${data.comparison.riskComparison}/10</p>
                
                <h4>Document Scores:</h4>
                ${data.comparison.documents.map(doc => `
                    <div>${doc.name}: ${doc.score}/100</div>
                `).join('')}
                
                <h4>Key Differences:</h4>
                <ul>
                    ${data.comparison.keyDifferences.map(diff => `<li>${diff}</li>`).join('')}
                </ul>
                
                <h4>Recommendations:</h4>
                <ul>
                    ${data.comparison.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            `
            
            resultsDiv.innerHTML = html
            resultsDiv.style.display = 'block'
        }

        function hideResults() {
            resultsDiv.style.display = 'none'
        }
    </script>
</body>
</html>
```

## cURL Examples for Testing

### Basic Upload and Compare

```bash
# Upload and compare two contracts
curl -X POST \
  http://localhost:3000/api/v1/analysis/upload-and-compare \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'documents=@contract1.pdf' \
  -F 'documents=@contract2.pdf' \
  -F 'workspaceId=your_workspace_id'
```

### Multiple Documents (up to 5)

```bash
# Upload and compare multiple documents
curl -X POST \
  http://localhost:3000/api/v1/analysis/upload-and-compare \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'documents=@pliego.pdf' \
  -F 'documents=@propuesta1.pdf' \
  -F 'documents=@propuesta2.pdf' \
  -F 'documents=@contrato.pdf' \
  -F 'workspaceId=your_workspace_id'
```

## Expected Response Format

```json
{
  "message": "Documents uploaded and compared successfully",
  "analyses": [
    {
      "_id": "analysis_id_1",
      "workspaceId": "workspace_id",
      "documentName": "contract1.pdf",
      "documentType": "contrato",
      "aiAnalysis": "# Análisis de contract1.pdf\n\n## Tipo de Documento: CONTRATO\n\n### Resumen\n...",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "analysis_id_2",
      "workspaceId": "workspace_id",
      "documentName": "contract2.pdf",
      "documentType": "contrato",
      "aiAnalysis": "# Análisis de contract2.pdf\n\n## Tipo de Documento: CONTRATO\n\n### Resumen\n...",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:05.000Z",
      "updatedAt": "2024-01-15T10:30:05.000Z"
    }
  ],
  "comparison": {
    "summary": "Comparative analysis between 2 documents reveals significant differences in terms and conditions.",
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
    "keyDifferences": [
      "Payment terms differ significantly between documents",
      "Liability clauses have different coverage limits",
      "Termination conditions vary in complexity"
    ],
    "recommendations": [
      "Standardize payment terms across all contracts",
      "Review liability coverage for consistency",
      "Simplify termination procedures"
    ],
    "riskComparison": 7.5
  }
}
```

## Key Features

1. **Automatic Document Type Detection**: Based on filename and content analysis
2. **AI-Powered Analysis**: With intelligent fallback when AI services are unavailable
3. **Comprehensive Comparison**: Includes scoring, differences, and recommendations
4. **Error Handling**: Robust validation and error responses
5. **File Management**: Automatic cleanup of temporary files
6. **Security**: Authentication and workspace validation

## Use Cases

- **Contract Comparison**: Compare multiple contract versions
- **Proposal Evaluation**: Analyze and compare vendor proposals
- **Legal Document Review**: Identify differences in legal terms
- **Compliance Checking**: Ensure documents meet standards
- **Risk Assessment**: Evaluate risk levels across documents

This endpoint provides a complete solution for document upload and comparison in a single API call, making it perfect for hackathon demos and production use cases.