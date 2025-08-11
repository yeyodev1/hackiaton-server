# Workspace Management API Documentation

## Overview

This API provides comprehensive workspace management functionality for users to configure their legal analysis workspace, select countries, and upload company documents.

## Authentication

All endpoints require Bearer token authentication:
```
Authorization: Bearer <your_jwt_token>
```

## Available Countries

The system supports the following countries with pre-configured legal documents:

- **Ecuador** (EC): Constitution of Ecuador, Organic Code of Ecuador
- **Peru** (PE): Constitution of Peru, Organic Code of Peru
- **Colombia** (CO): Constitution of Colombia, Organic Code of Colombia
- **Mexico** (MX): Constitution of Mexico, Organic Code of Mexico
- **Others** (OT): Custom documents (requires manual upload)

## Endpoints

### 1. Get User Workspace

**GET** `/api/workspace/my-workspace`

Retrieves the user's workspace information along with available countries.

#### Response
```json
{
  "success": true,
  "message": "Workspace retrieved successfully",
  "workspace": {
    "_id": "workspace_id",
    "name": "Company Name",
    "ownerId": "user_id",
    "status": "pending",
    "isFullyConfigured": false,
    "settings": {
      "country": {
        "name": "Ecuador",
        "code": "EC"
      },
      "legalDocuments": {
        "constitution": "Constitution of Ecuador",
        "organicCode": "Organic Code of Ecuador",
        "companyDocument": null
      }
    }
  },
  "availableCountries": [
    {
      "name": "Ecuador",
      "code": "EC",
      "legalDocuments": {
        "constitution": "Constitution of Ecuador",
        "organicCode": "Organic Code of Ecuador"
      }
    }
  ]
}
```

### 2. Update Workspace Country

**PUT** `/api/workspace/country`

Updates the workspace with the selected country configuration.

#### Request Body
```json
{
  "country": "ecuador" // Options: ecuador, peru, colombia, mexico, others
}
```

#### Response
```json
{
  "success": true,
  "message": "Workspace country updated successfully",
  "workspace": {
    // Updated workspace object
  }
}
```

### 3. Upload Company Document

**POST** `/api/workspace/upload-document`

Uploads a company-specific legal document (constitution, organic code, etc.) to Google Drive.

#### Request
- **Content-Type**: `multipart/form-data`
- **Field**: `document` (file)
- **Supported formats**: PDF, XLSX, XLS, CSV
- **Max file size**: 100MB

#### Response
```json
{
  "success": true,
  "message": "Company document uploaded successfully",
  "document": {
    "name": "company_constitution.pdf",
    "url": "https://drive.google.com/file/d/..."
  },
  "workspace": {
    // Updated workspace with document info
  }
}
```

### 4. Complete Workspace Setup

**PUT** `/api/workspace/complete-setup`

Marks the workspace as fully configured and activates it.

#### Response
```json
{
  "success": true,
  "message": "Workspace setup completed successfully",
  "workspace": {
    "isFullyConfigured": true,
    "status": "active"
    // ... other workspace fields
  }
}
```

## Workflow

### Recommended Setup Flow

1. **Get Workspace**: Call `GET /my-workspace` to retrieve current workspace and available countries
2. **Select Country**: Call `PUT /country` with the desired country
3. **Upload Documents** (Optional): If using "others" or have company-specific documents, call `POST /upload-document`
4. **Complete Setup**: Call `PUT /complete-setup` to activate the workspace

### Example Frontend Integration

```javascript
// 1. Get workspace and countries
const getWorkspace = async () => {
  const response = await fetch('/api/workspace/my-workspace', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return response.json()
}

// 2. Update country
const updateCountry = async (country) => {
  const response = await fetch('/api/workspace/country', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ country })
  })
  return response.json()
}

// 3. Upload document
const uploadDocument = async (file) => {
  const formData = new FormData()
  formData.append('document', file)
  
  const response = await fetch('/api/workspace/upload-document', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  return response.json()
}

// 4. Complete setup
const completeSetup = async () => {
  const response = await fetch('/api/workspace/complete-setup', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return response.json()
}
```

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required"
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Valid country selection required",
  "availableCountries": ["ecuador", "peru", "colombia", "mexico", "others"]
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Workspace not found"
}
```

## Google Drive Integration

### Setup Requirements

1. **Google Service Account**: Create a service account in Google Cloud Console
2. **Credentials File**: Place `google-credentials.json` in the project root
3. **Drive Folder**: Ensure the folder ID `1XMOlJCE74sqDdv8rh7chl4YMlKfoAWPB` is accessible
4. **Permissions**: Grant the service account access to the Drive folder

### File Organization

Uploaded documents are organized as follows:
```
Main Folder (1XMOlJCE74sqDdv8rh7chl4YMlKfoAWPB)
├── workspace_[workspace_id]/
│   ├── company_document_[timestamp]_[filename]
│   └── ...
└── ...
```

## Security Considerations

- All endpoints require valid JWT authentication
- File uploads are limited to specific MIME types
- Maximum file size is enforced (100MB)
- Uploaded files are stored with unique names to prevent conflicts
- Google Drive files are set to "reader" permissions for "anyone" with the link

## Environment Variables

Ensure these environment variables are set:

```env
JWT_SECRET=your_jwt_secret_key
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```