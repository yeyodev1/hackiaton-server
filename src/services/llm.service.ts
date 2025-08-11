import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Interfaces for LLM responses
interface DocumentInsights {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  riskAssessment: {
    level: 'low' | 'medium' | 'high'
    score: number
    factors: string[]
  }
}

interface ComparisonInsights {
  summary: string
  comparison: {
    strengths: Record<string, string[]>
    weaknesses: Record<string, string[]>
  }
  recommendation: {
    preferred: string
    reasoning: string
    improvements: string[]
  }
  riskMatrix: Record<string, Record<string, number>>
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  preferredProvider: 'openai' | 'gemini'
  providers: {
    openai: {
      available: boolean
      model: string
      lastCheck: Date
    }
    gemini: {
      available: boolean
      model: string
      lastCheck: Date
    }
  }
}

class LLMService {
  private openai: OpenAI | null = null
  private gemini: GoogleGenerativeAI | null = null
  private preferredProvider: 'openai' | 'gemini'
  private openaiModel: string
  private geminiModel: string

  constructor() {
    this.preferredProvider = (process.env.PREFERRED_LLM_PROVIDER as 'openai' | 'gemini') || 'openai'
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-pro'
    
    this.initializeProviders()
  }

  private initializeProviders(): void {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })
      } catch (error) {
        console.error('Failed to initialize OpenAI:', error)
      }
    }

    // Initialize Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      } catch (error) {
        console.error('Failed to initialize Gemini:', error)
      }
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const now = new Date()
    const health: HealthStatus = {
      status: 'unhealthy',
      preferredProvider: this.preferredProvider,
      providers: {
        openai: {
          available: false,
          model: this.openaiModel,
          lastCheck: now
        },
        gemini: {
          available: false,
          model: this.geminiModel,
          lastCheck: now
        }
      }
    }

    // Check OpenAI
    if (this.openai) {
      try {
        await this.openai.models.list()
        health.providers.openai.available = true
      } catch (error) {
        console.error('OpenAI health check failed:', error)
      }
    }

    // Check Gemini
    if (this.gemini) {
      try {
        const model = this.gemini.getGenerativeModel({ model: this.geminiModel })
        await model.generateContent('test')
        health.providers.gemini.available = true
      } catch (error) {
        console.error('Gemini health check failed:', error)
      }
    }

    // Determine overall health
    if (health.providers.openai.available || health.providers.gemini.available) {
      health.status = 'healthy'
    }

    return health
  }

  private async callOpenAI(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized')
    }

    const response = await this.openai.chat.completions.create({
      model: this.openaiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({ role: msg.role, content: msg.content }))
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    return response.choices[0]?.message?.content || 'No response generated'
  }

  private async callGemini(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    if (!this.gemini) {
      throw new Error('Gemini not initialized')
    }

    const model = this.gemini.getGenerativeModel({ model: this.geminiModel })
    
    // Combine system prompt with user messages for Gemini
    const fullPrompt = `${systemPrompt}\n\nUser: ${messages[messages.length - 1]?.content || ''}`
    
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    
    return response.text() || 'No response generated'
  }

  private async callLLM(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const health = await this.healthCheck()
    
    if (health.status === 'unhealthy') {
      throw new Error('No AI providers are available')
    }

    // Try preferred provider first
    if (this.preferredProvider === 'openai' && health.providers.openai.available) {
      try {
        return await this.callOpenAI(messages, systemPrompt)
      } catch (error) {
        console.error('OpenAI call failed, trying Gemini:', error)
        if (health.providers.gemini.available) {
          return await this.callGemini(messages, systemPrompt)
        }
        throw error
      }
    } else if (this.preferredProvider === 'gemini' && health.providers.gemini.available) {
      try {
        return await this.callGemini(messages, systemPrompt)
      } catch (error) {
        console.error('Gemini call failed, trying OpenAI:', error)
        if (health.providers.openai.available) {
          return await this.callOpenAI(messages, systemPrompt)
        }
        throw error
      }
    }

    // Fallback to any available provider
    if (health.providers.openai.available) {
      return await this.callOpenAI(messages, systemPrompt)
    } else if (health.providers.gemini.available) {
      return await this.callGemini(messages, systemPrompt)
    }

    throw new Error('No AI providers are available')
  }

  async generateDocumentInsights(analysis: any, question?: string): Promise<DocumentInsights> {
    const systemPrompt = `You are an expert legal and business analyst specializing in document review for government contracts and tenders. 

Your task is to analyze the provided document analysis and generate actionable insights.

Focus on:
1. Legal compliance and regulatory adherence
2. Financial and commercial risks
3. Technical requirements and feasibility
4. Operational considerations
5. Competitive advantages or disadvantages

Provide your response in JSON format with the following structure:
{
  "summary": "Brief overview of the document analysis",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "riskAssessment": {
    "level": "low|medium|high",
    "score": 1-10,
    "factors": ["factor1", "factor2"]
  }
}`

    const userMessage = question 
      ? `Please analyze this document with focus on: ${question}\n\nDocument Analysis: ${JSON.stringify(analysis, null, 2)}`
      : `Please provide comprehensive insights for this document analysis:\n\nDocument Analysis: ${JSON.stringify(analysis, null, 2)}`

    const messages: ChatMessage[] = [
      { role: 'user', content: userMessage }
    ]

    const response = await this.callLLM(messages, systemPrompt)
    
    try {
      return JSON.parse(response)
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        summary: response,
        keyFindings: ['Analysis completed - see summary for details'],
        recommendations: ['Review the detailed analysis provided'],
        riskAssessment: {
          level: 'medium',
          score: 5,
          factors: ['general']
        }
      }
    }
  }

  async generateComparisonInsights(analyses: any[], question?: string): Promise<ComparisonInsights> {
    const systemPrompt = `You are an expert legal and business analyst specializing in comparative analysis of government contracts and tender documents.

Your task is to compare multiple document analyses and provide strategic insights for decision-making.

Focus on:
1. Comparative risk assessment
2. Legal and regulatory compliance differences
3. Financial implications and cost-benefit analysis
4. Technical requirements comparison
5. Strategic recommendations for selection

Provide your response in JSON format with the following structure:
{
  "summary": "Executive summary of the comparison",
  "comparison": {
    "strengths": {
      "Document A": ["strength1", "strength2"],
      "Document B": ["strength1", "strength2"]
    },
    "weaknesses": {
      "Document A": ["weakness1", "weakness2"],
      "Document B": ["weakness1", "weakness2"]
    }
  },
  "recommendation": {
    "preferred": "Document name",
    "reasoning": "Detailed reasoning",
    "improvements": ["improvement1", "improvement2"]
  },
  "riskMatrix": {
    "Document A": { "legal": 1-10, "financial": 1-10, "operational": 1-10 },
    "Document B": { "legal": 1-10, "financial": 1-10, "operational": 1-10 }
  }
}`

    const userMessage = question 
      ? `Please compare these documents with focus on: ${question}\n\nDocuments to compare: ${JSON.stringify(analyses, null, 2)}`
      : `Please provide comprehensive comparison insights for these documents:\n\nDocuments to compare: ${JSON.stringify(analyses, null, 2)}`

    const messages: ChatMessage[] = [
      { role: 'user', content: userMessage }
    ]

    const response = await this.callLLM(messages, systemPrompt)
    
    try {
      return JSON.parse(response)
    } catch (error) {
      // Fallback if JSON parsing fails
      const docNames = analyses.map((a, i) => a.documentName || `Document ${i + 1}`)
      return {
        summary: response,
        comparison: {
          strengths: docNames.reduce((acc, name) => ({ ...acc, [name]: ['See detailed analysis'] }), {}),
          weaknesses: docNames.reduce((acc, name) => ({ ...acc, [name]: ['See detailed analysis'] }), {})
        },
        recommendation: {
          preferred: docNames[0] || 'First document',
          reasoning: 'Based on detailed analysis provided',
          improvements: ['Review the detailed comparison provided']
        },
        riskMatrix: docNames.reduce((acc, name) => ({ 
          ...acc, 
          [name]: { legal: 5, financial: 5, operational: 5 } 
        }), {})
      }
    }
  }

  async chatWithAgent(messages: ChatMessage[], context: any): Promise<string> {
    // Build document context
    let documentContext = ''
    if (context.documents && context.documents.length > 0) {
      documentContext = '\n\nAvailable Documents in Workspace:\n'
      context.documents.forEach((doc: any, index: number) => {
        documentContext += `\n${index + 1}. ${doc.name} (${doc.type})\n`
        documentContext += `   Description: ${doc.description || 'No description'}\n`
        if (doc.extractedText && doc.extractedText.length > 0) {
          // Include first 2000 characters of extracted text
          const textPreview = doc.extractedText.substring(0, 2000)
          documentContext += `   Content Preview: ${textPreview}${doc.extractedText.length > 2000 ? '...' : ''}\n`
        }
        documentContext += `   Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}\n`
      })
    }

    const systemPrompt = `You are an intelligent AI assistant specializing in legal document analysis for government contracts, tenders, and procurement processes.

You have access to the user's workspace, document analyses, and uploaded documents. Use this context to provide informed, actionable insights.

Your capabilities include:
1. Document analysis and interpretation
2. Risk assessment and compliance checking
3. Comparative analysis between documents
4. Legal and regulatory guidance
5. Strategic recommendations

Context Information:
- Workspace: ${context.workspace?.name || 'Unknown'}
- Country: ${context.workspace?.country?.name || 'Not specified'}
- Available analyses: ${context.analyses?.length || 0}
- Available documents: ${context.documents?.length || 0}${documentContext}

When analyzing documents, you can reference the content provided above. For detailed analysis, focus on:
- Legal compliance and risks
- Financial terms and implications
- Technical requirements
- Deadlines and obligations
- Recommendations for improvement

Provide helpful, accurate, and actionable responses. If you need more specific information, ask clarifying questions.

Always maintain a professional tone and focus on practical business value.`

    return await this.callLLM(messages, systemPrompt)
  }
}

export default LLMService