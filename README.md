# Document Analysis Platform with AI Agent

🚀 **Advanced Document Analysis System for Government Contracts and Tenders**

A comprehensive platform that automates the analysis of legal documents (pliegos, proposals, contracts) with AI-powered insights, risk assessment, and intelligent comparison capabilities.

## 🌟 Key Features

### 📄 Document Analysis
- **Automated Document Processing**: Upload and analyze PDF documents
- **Multi-Type Support**: Pliegos, proposals, contracts, and custom documents
- **Country-Specific Analysis**: Tailored analysis for Ecuador, Peru, Colombia, Mexico
- **Section-Based Analysis**: Legal, technical, and economic sections
- **RUC Validation**: Automatic validation of tax identification numbers

### 🤖 AI-Powered Agent
- **Conversational Interface**: Natural language interaction with document insights
- **Dual AI Support**: OpenAI GPT-4 and Google Gemini with automatic failover
- **Context-Aware Responses**: Understands workspace and document context
- **Risk Assessment**: AI-powered risk scoring and identification
- **Comparative Analysis**: Multi-document comparison with strategic recommendations

### 🔍 Advanced Analytics
- **Risk Scoring**: Comprehensive risk assessment across multiple dimensions
- **Compliance Checking**: Automated verification against legal frameworks
- **Gap Analysis**: Identification of missing requirements and inconsistencies
- **Recommendation Engine**: Actionable insights for document improvement

### 👥 Workspace Management
- **Multi-User Workspaces**: Collaborative document analysis
- **Role-Based Access**: Owner and member permissions
- **Document Organization**: Centralized document and analysis management
- **Usage Tracking**: Monitor analysis usage and limits

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **AI Services**: OpenAI GPT-4, Google Gemini
- **Authentication**: JWT-based authentication
- **File Processing**: Multer for file uploads
- **Validation**: Custom validation middleware

### Project Structure
```
src/
├── controllers/     # Request handlers and business logic
├── models/         # MongoDB schemas and data models
├── routes/         # API route definitions
├── services/       # External service integrations (AI, email)
├── middleware/     # Custom middleware functions
├── enums/          # Type definitions and constants
├── utils/          # Utility functions and helpers
└── types/          # TypeScript type definitions
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- OpenAI API Key (optional)
- Google Gemini API Key (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hackiaton-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=8100
   NODE_ENV=development
   
   # Database
   MONGO_URI=mongodb://localhost:27017/hackathon-db
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   
   # AI Services (Optional)
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-4-turbo-preview
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-pro
   PREFERRED_LLM_PROVIDER=openai
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the API**
   - Server: `http://localhost:8100`
   - API Base: `http://localhost:8100/api`
   - Health Check: `http://localhost:8100/api/agent/health`

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Workspace Endpoints
- `GET /api/workspace/user` - Get user workspace
- `PUT /api/workspace/country` - Update workspace country
- `POST /api/workspace/upload` - Upload company documents
- `POST /api/workspace/complete-setup` - Complete workspace setup

### Analysis Endpoints
- `GET /api/analysis/workspace/:workspaceId` - Get workspace analyses
- `GET /api/analysis/:analysisId` - Get specific analysis
- `POST /api/analysis/document` - Analyze single document
- `POST /api/analysis/compare` - Compare multiple documents

### AI Agent Endpoints
- `POST /api/agent/chat` - Chat with AI agent
- `GET /api/agent/insights/document/:analysisId` - Get document insights
- `POST /api/agent/insights/comparison/:workspaceId` - Get comparison insights
- `GET /api/agent/health` - Check AI service health

## 🤖 AI Agent Usage

### Basic Chat Example
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
    analysisIds: ['analysis_1', 'analysis_2']
  })
})
```

### Document Insights Example
```javascript
const insights = await fetch('/api/agent/insights/document/analysis_123?question=What are the payment terms?', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
```

### Comparison Analysis Example
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

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run compile` - Watch TypeScript compilation
- `npm run format` - Format code with Prettier

### Code Style
- **TypeScript**: Strict typing enforced
- **Architecture**: Model-Route-Controller-Service pattern
- **Error Handling**: Comprehensive try-catch blocks
- **Validation**: Input validation on all endpoints
- **Security**: JWT authentication and authorization

## 🌍 Supported Countries

The platform provides country-specific legal document analysis for:

- **🇪🇨 Ecuador**: Constitution, Procurement Law, Regulations, Labor Code
- **🇵🇪 Peru**: Constitution, Procurement Law, Regulations, Labor Code
- **🇨🇴 Colombia**: Constitution, Procurement Law, Regulations, Labor Code
- **🇲🇽 Mexico**: Constitution, Procurement Law, Regulations, Labor Code
- **🌐 Others**: Custom document analysis for other countries

## 📊 Document Types

### Supported Document Types
- **Pliego de Condiciones**: Tender specifications and requirements
- **Propuesta**: Bid proposals and submissions
- **Contrato**: Contracts and agreements
- **Addendum**: Contract modifications and amendments
- **Resolución**: Administrative resolutions
- **Otros**: Custom document types

### Analysis Sections
- **Legal Section**: Compliance, regulations, legal requirements
- **Technical Section**: Technical specifications, requirements
- **Economic Section**: Financial terms, pricing, payment conditions

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Cross-origin request security
- **Rate Limiting**: API rate limiting for abuse prevention
- **File Upload Security**: Secure file handling and validation

## 📈 Performance Features

- **Async Processing**: Non-blocking document analysis
- **Database Indexing**: Optimized MongoDB queries
- **Caching**: Response caching for improved performance
- **Connection Pooling**: Efficient database connections
- **Error Recovery**: Graceful error handling and recovery

## 🧪 Testing

### Manual Testing
1. **Health Check**: `curl http://localhost:8100/api/agent/health`
2. **User Registration**: Test user registration flow
3. **Document Upload**: Test document upload and analysis
4. **AI Chat**: Test conversational AI interface

### API Testing with curl
```bash
# Health check
curl http://localhost:8100/api/agent/health

# Register user
curl -X POST http://localhost:8100/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:8100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=8100
MONGO_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
OPENAI_API_KEY=your-production-openai-key
GEMINI_API_KEY=your-production-gemini-key
```

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8100
CMD ["npm", "start"]
```

## 📖 Additional Documentation

- **[API Documentation](./API_DOCUMENTATION.md)**: Complete API reference
- **[AI Agent Guide](./AI_AGENT_README.md)**: Detailed AI agent documentation
- **[Project Specifications](./indicaciones.txt)**: Original project requirements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Review the [AI Agent Guide](./AI_AGENT_README.md)
- Create an issue in the repository

---

**Built with ❤️ for automated document analysis and AI-powered insights**