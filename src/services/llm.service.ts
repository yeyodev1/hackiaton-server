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
    const systemPrompt = `Eres un analista legal y empresarial experto especializado en revisión de documentos para contratos gubernamentales y licitaciones.

Tu tarea es analizar el análisis de documento proporcionado y generar insights accionables.

Enfócate en:
1. Cumplimiento legal y adherencia regulatoria
2. Riesgos financieros y comerciales
3. Requisitos técnicos y factibilidad
4. Consideraciones operacionales
5. Ventajas o desventajas competitivas

Proporciona tu respuesta en formato JSON con la siguiente estructura:
{
  "summary": "Resumen breve del análisis del documento",
  "keyFindings": ["Hallazgo 1", "Hallazgo 2", "Hallazgo 3"],
  "recommendations": ["Recomendación 1", "Recomendación 2", "Recomendación 3"],
  "riskAssessment": {
    "level": "low|medium|high",
    "score": 1-10,
    "factors": ["factor1", "factor2"]
  }
}

IMPORTANTE: Toda tu respuesta debe estar completamente en español.`

    const userMessage = question 
      ? `Por favor analiza este documento con enfoque en: ${question}\n\nAnálisis del Documento: ${JSON.stringify(analysis, null, 2)}`
      : `Por favor proporciona insights exhaustivos para este análisis de documento:\n\nAnálisis del Documento: ${JSON.stringify(analysis, null, 2)}`

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
        keyFindings: ['Análisis completado - ver resumen para detalles'],
        recommendations: ['Revisar el análisis detallado proporcionado'],
        riskAssessment: {
          level: 'medium',
          score: 5,
          factors: ['general']
        }
      }
    }
  }

  async generateComparisonInsights(analyses: any[], question?: string): Promise<ComparisonInsights> {
    const systemPrompt = `Eres un analista legal y empresarial experto especializado en análisis comparativo de contratos gubernamentales y documentos de licitación.

Tu tarea es comparar múltiples análisis de documentos y proporcionar insights estratégicos para la toma de decisiones.

Enfócate en:
1. Evaluación comparativa de riesgos
2. Diferencias en cumplimiento legal y regulatorio
3. Implicaciones financieras y análisis costo-beneficio
4. Comparación de requisitos técnicos
5. Recomendaciones estratégicas para la selección

Proporciona tu respuesta en formato JSON con la siguiente estructura:
{
  "summary": "Resumen ejecutivo de la comparación",
  "comparison": {
    "strengths": {
      "Documento A": ["fortaleza1", "fortaleza2"],
      "Documento B": ["fortaleza1", "fortaleza2"]
    },
    "weaknesses": {
      "Documento A": ["debilidad1", "debilidad2"],
      "Documento B": ["debilidad1", "debilidad2"]
    }
  },
  "recommendation": {
    "preferred": "Nombre del documento",
    "reasoning": "Razonamiento detallado",
    "improvements": ["mejora1", "mejora2"]
  },
  "riskMatrix": {
    "Documento A": { "legal": 1-10, "financial": 1-10, "operational": 1-10 },
    "Documento B": { "legal": 1-10, "financial": 1-10, "operational": 1-10 }
  }
}

IMPORTANTE: Toda tu respuesta debe estar completamente en español.`

    const userMessage = question 
      ? `Por favor compara estos documentos con enfoque en: ${question}\n\nDocumentos a comparar: ${JSON.stringify(analyses, null, 2)}`
      : `Por favor proporciona insights de comparación exhaustivos para estos documentos:\n\nDocumentos a comparar: ${JSON.stringify(analyses, null, 2)}`

    const messages: ChatMessage[] = [
      { role: 'user', content: userMessage }
    ]

    const response = await this.callLLM(messages, systemPrompt)
    
    try {
      return JSON.parse(response)
    } catch (error) {
      // Fallback if JSON parsing fails
      const docNames = analyses.map((a, i) => a.documentName || `Documento ${i + 1}`)
      return {
        summary: response,
        comparison: {
          strengths: docNames.reduce((acc, name) => ({ ...acc, [name]: ['Ver análisis detallado'] }), {}),
          weaknesses: docNames.reduce((acc, name) => ({ ...acc, [name]: ['Ver análisis detallado'] }), {})
        },
        recommendation: {
          preferred: docNames[0] || 'Primer documento',
          reasoning: 'Basado en el análisis detallado proporcionado',
          improvements: ['Revisar la comparación detallada proporcionada']
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
      documentContext = '\n\nDocumentos Disponibles en el Espacio de Trabajo:\n'
      context.documents.forEach((doc: any, index: number) => {
        documentContext += `\n${index + 1}. ${doc.name} (${doc.type})\n`
        documentContext += `   Descripción: ${doc.description || 'Sin descripción'}\n`
        if (doc.extractedText && doc.extractedText.length > 0) {
          // Include first 2000 characters of extracted text
          const textPreview = doc.extractedText.substring(0, 2000)
          documentContext += `   Vista Previa del Contenido: ${textPreview}${doc.extractedText.length > 2000 ? '...' : ''}\n`
        }
        documentContext += `   Subido: ${new Date(doc.uploadedAt).toLocaleDateString()}\n`
      })
    }

    const systemPrompt = `Eres un asistente de IA inteligente especializado en análisis de documentos legales para contratos gubernamentales, licitaciones y procesos de adquisiciones.

Tienes acceso al espacio de trabajo del usuario, análisis de documentos y documentos subidos. Usa este contexto para proporcionar insights informados y accionables.

Tus capacidades incluyen:
1. Análisis e interpretación de documentos
2. Evaluación de riesgos y verificación de cumplimiento
3. Análisis comparativo entre documentos
4. Orientación legal y regulatoria
5. Recomendaciones estratégicas

Información de Contexto:
- Espacio de trabajo: ${context.workspace?.name || 'Desconocido'}
- País: ${context.workspace?.country?.name || 'No especificado'}
- Análisis disponibles: ${context.analyses?.length || 0}
- Documentos disponibles: ${context.documents?.length || 0}${documentContext}

Cuando analices documentos, puedes referenciar el contenido proporcionado arriba. Para análisis detallado, enfócate en:
- Cumplimiento legal y riesgos
- Términos financieros e implicaciones
- Requisitos técnicos
- Plazos y obligaciones
- Recomendaciones para mejora

Proporciona respuestas útiles, precisas y accionables. Si necesitas información más específica, haz preguntas aclaratorias.

Siempre mantén un tono profesional y enfócate en el valor práctico del negocio.

IMPORTANTE: Todas tus respuestas deben estar completamente en español.`

    return await this.callLLM(messages, systemPrompt)
  }
}

export default LLMService