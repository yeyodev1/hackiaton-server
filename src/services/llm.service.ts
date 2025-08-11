import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Interfaces for LLM responses
// DocumentInsights is now returned as a markdown string

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

  async generateDocumentInsights(analysis: any, question?: string): Promise<string> {
    const { country = 'Ecuador' } = analysis
    
    // Get legal context for the country
    const legalContext = await this.getLegalContext(country)
    
    const systemPrompt = `Eres un analista legal y empresarial experto especializado en revisión de documentos para contratos gubernamentales y licitaciones en ${country}.

Tu tarea es analizar el documento proporcionado y generar un análisis exhaustivo en formato markdown.

Contexto Legal de ${country}:
${legalContext}

Enfócate en:
1. Cumplimiento legal y adherencia regulatoria específica de ${country}
2. Riesgos financieros y comerciales
3. Requisitos técnicos y factibilidad
4. Consideraciones operacionales
5. Ventajas o desventajas competitivas
6. Comparación con las normativas legales del país

Proporciona tu respuesta en formato markdown bien estructurado con:
- Resumen ejecutivo
- Hallazgos clave
- Análisis de riesgos
- Recomendaciones
- Conclusiones

Utiliza encabezados, listas, y formato markdown para una presentación clara.

IMPORTANTE: Toda tu respuesta debe estar completamente en español y en formato markdown.`

    const userMessage = question 
      ? `Por favor analiza este documento con enfoque en: ${question}\n\nDocumento: ${analysis.fileName}\nTipo: ${analysis.documentType}\nPaís: ${country}\n\nContenido extraído:\n${analysis.extractedText}`
      : `Por favor proporciona un análisis exhaustivo para este documento:\n\nDocumento: ${analysis.fileName}\nTipo: ${analysis.documentType}\nPaís: ${country}\n\nContenido extraído:\n${analysis.extractedText}`

    const messages: ChatMessage[] = [
      { role: 'user', content: userMessage }
    ]

    const response = await this.callLLM(messages, systemPrompt)
    return response
  }

  private async getLegalContext(country: string): Promise<string> {
    if (country.toLowerCase() === 'ecuador') {
      return `
Marco Legal de Ecuador para Contratación Pública:

1. **Constitución de la República del Ecuador**: Establece los principios fundamentales de transparencia, eficiencia y responsabilidad en la gestión pública.

2. **Ley Orgánica del Sistema Nacional de Contratación Pública (LOSNCP)**: Regula los procedimientos de contratación pública, incluyendo:
   - Procedimientos de selección
   - Requisitos de participación
   - Garantías exigidas
   - Causales de terminación
   - Régimen de multas y sanciones

3. **Reglamento General de la Ley Orgánica del Sistema Nacional de Contratación Pública**: Detalla los procedimientos específicos, formatos, y requisitos técnicos.

Principios Clave:
- Legalidad
- Trato justo
- Igualdad
- Calidad
- Vigencia tecnológica
- Oportunidad
- Concurrencia
- Transparencia
- Publicidad
- Participación nacional

Nota: Para un análisis completo, se debe verificar el cumplimiento con estas normativas específicas.`
    }
    
    return `Marco legal general para contratación pública en ${country}. Se recomienda consultar la legislación local específica.`
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

    // Build full analysis context
    let analysisContext = ''
    if (context.fullAnalyses && context.fullAnalyses.length > 0) {
      analysisContext = '\n\nAnálisis Completos Disponibles:\n'
      context.fullAnalyses.forEach((analysis: any, index: number) => {
        analysisContext += `\n=== ANÁLISIS ${index + 1}: ${analysis.documentName} ===\n`
        analysisContext += `Fecha: ${new Date(analysis.createdAt).toLocaleDateString()}\n`
        analysisContext += `Analista: ${analysis.createdBy?.name || 'Sistema'}\n\n`
        
        if (analysis.aiAnalysis) {
          analysisContext += `ANÁLISIS COMPLETO:\n${analysis.aiAnalysis}\n\n`
        }
        
        if (analysis.rucValidation) {
          analysisContext += `VALIDACIÓN RUC:\n`
          analysisContext += `- RUC: ${analysis.rucValidation.ruc || 'No encontrado'}\n`
          analysisContext += `- Válido: ${analysis.rucValidation.isValid ? 'Sí' : 'No'}\n`
          analysisContext += `- Razón Social: ${analysis.rucValidation.businessName || 'No disponible'}\n`
          analysisContext += `- Estado: ${analysis.rucValidation.status || 'No disponible'}\n\n`
        }
        
        analysisContext += `${'='.repeat(50)}\n`
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
- Documentos disponibles: ${context.documents?.length || 0}${documentContext}${analysisContext}

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

  async chatWithDocument(messages: ChatMessage[], context: any): Promise<string> {
    // Build focused document context
    let documentContext = ''
    if (context.focusedAnalysis) {
      const analysis = context.focusedAnalysis
      documentContext = `\n\n=== DOCUMENTO ENFOCADO ===\n`
      documentContext += `Nombre: ${analysis.documentName}\n`
      documentContext += `Fecha de Análisis: ${new Date(analysis.createdAt).toLocaleDateString()}\n`
      documentContext += `Analista: ${analysis.createdBy?.name || 'Sistema'}\n\n`
      
      if (analysis.aiAnalysis) {
        documentContext += `ANÁLISIS COMPLETO DEL DOCUMENTO:\n${analysis.aiAnalysis}\n\n`
      }
      
      if (analysis.rucValidation) {
        documentContext += `VALIDACIÓN RUC:\n`
        documentContext += `- RUC: ${analysis.rucValidation.ruc || 'No encontrado'}\n`
        documentContext += `- Válido: ${analysis.rucValidation.isValid ? 'Sí' : 'No'}\n`
        documentContext += `- Razón Social: ${analysis.rucValidation.businessName || 'No disponible'}\n`
        documentContext += `- Estado: ${analysis.rucValidation.status || 'No disponible'}\n\n`
      }
      
      documentContext += `${'='.repeat(50)}\n`
    }

    const systemPrompt = `Eres un asistente de IA especializado en análisis de documentos legales para contratos gubernamentales, licitaciones y procesos de adquisiciones.

Estás enfocado en responder preguntas específicas sobre UN DOCUMENTO en particular que ha sido previamente analizado.

Tus capacidades incluyen:
1. Responder preguntas específicas sobre el contenido del documento
2. Explicar términos y cláusulas del contrato
3. Identificar riesgos y oportunidades específicas
4. Proporcionar recomendaciones basadas en el análisis
5. Comparar aspectos específicos con mejores prácticas

Información de Contexto:
- Espacio de trabajo: ${context.workspace?.name || 'Desconocido'}
- País: ${context.workspace?.country?.name || 'No especificado'}${documentContext}

Cuando respondas:
- Basa tus respuestas EXCLUSIVAMENTE en el análisis del documento proporcionado
- Si la pregunta no puede responderse con la información disponible, indícalo claramente
- Proporciona citas específicas del análisis cuando sea relevante
- Mantén un enfoque práctico y orientado a la acción
- Si detectas inconsistencias o áreas de riesgo, resáltalas

Siempre mantén un tono profesional y enfócate en el valor práctico del negocio.

IMPORTANTE: Todas tus respuestas deben estar completamente en español.`

    return await this.callLLM(messages, systemPrompt)
  }
}

export default LLMService