import type { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { HttpStatusCode } from 'axios'
import models from '../models'
import path from 'path'
import fs from 'fs/promises'

// Interface for document analysis result
interface DocumentAnalysisResult {
  documentId: string
  documentName: string
  documentType: 'pliego' | 'propuesta' | 'contrato'
  analysisDate: Date
  sections: {
    legal: {
      guarantees: string[]
      penalties: string[]
      deadlines: string[]
      risks: string[]
      complianceScore: number
    }
    technical: {
      requirements: string[]
      materials: string[]
      processes: string[]
      timeline: string[]
      completenessScore: number
    }
    economic: {
      budget: string
      paymentTerms: string[]
      costs: string[]
      financialRisks: string[]
      economicScore: number
    }
  }
  rucValidation?: {
    ruc: string
    companyName: string
    isValid: boolean
    canPerformWork: boolean
    businessType: string
  }
  gaps: string[]
  inconsistencies: string[]
  recommendations: string[]
  overallRiskScore: number
  overallComplianceScore: number
}

// Interface for comparative analysis
interface ComparativeAnalysis {
  comparisonId: string
  documents: DocumentAnalysisResult[]
  comparison: {
    legal: {
      bestCompliance: string
      riskComparison: Record<string, number>
      recommendations: string[]
    }
    technical: {
      mostComplete: string
      requirementsFulfillment: Record<string, number>
      technicalRisks: string[]
    }
    economic: {
      mostEconomical: string
      budgetComparison: Record<string, number>
      paymentTermsComparison: Record<string, string[]>
    }
  }
  ranking: {
    documentId: string
    documentName: string
    totalScore: number
    position: number
    strengths: string[]
    weaknesses: string[]
  }[]
  finalRecommendation: {
    recommendedDocument: string
    reasons: string[]
    criticalAlerts: string[]
  }
}

export async function analyzeDocumentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId, documentType } = req.body

    if (!req.file) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Document file is required'
      })
      return
    }

    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid workspace ID is required'
      })
      return
    }

    if (!documentType || !['pliego', 'propuesta', 'contrato'].includes(documentType)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid document type is required (pliego, propuesta, contrato)'
      })
      return
    }
      
    // Verify workspace access
    const workspace = await models.Workspace.findOne({
      _id: workspaceId,
      $or: [
        { ownerId: req.user!.userId },
        { 'members.userId': req.user!.userId }
      ],
      deletedAt: null
    })

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Workspace not found or access denied'
        })
        return
      }

      // Create analysis record in database
      const startTime = Date.now()
      
      // Simulate AI document analysis (in real implementation, this would call AI services)
      const analysisResult: DocumentAnalysisResult = await simulateDocumentAnalysis(
        req.file,
        documentType as 'pliego' | 'propuesta' | 'contrato',
        workspace.settings
      )
      
      const processingTime = Date.now() - startTime

      // Save analysis to database
      const savedAnalysis = await models.DocumentAnalysis.create({
        workspaceId: workspaceId,
        documentName: req.file.originalname,
        documentType: documentType,
        analysisDate: new Date(),
        sections: analysisResult.sections,
        rucValidation: analysisResult.rucValidation,
        gaps: analysisResult.gaps,
        inconsistencies: analysisResult.inconsistencies,
        recommendations: analysisResult.recommendations,
        overallRiskScore: analysisResult.overallRiskScore,
        overallComplianceScore: analysisResult.overallComplianceScore,
        status: 'completed',
        processingTime: processingTime,
        createdBy: req.user!.userId
      })

      // Update workspace usage
      await models.Workspace.findByIdAndUpdate(workspaceId, {
        $inc: {
          'usage.documentCount': 1,
          'usage.analysisCount': 1
        },
        updatedAt: new Date()
      })

      // Update analysis result with database ID
      analysisResult.documentId = (savedAnalysis._id as Types.ObjectId).toString()

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Document analyzed successfully',
      analysis: analysisResult,
      workspace: {
        id: workspace._id,
        name: workspace.name,
        country: workspace.settings.country
      }
    })
    return
  } catch (error: unknown) {
    console.error('Error in analyzeDocumentController:', error)
    next(error)
  }
}

export async function getAnalysisByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { analysisId } = req.params

    if (!analysisId || !Types.ObjectId.isValid(analysisId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid analysis ID is required'
      })
      return
    }
      
      // Get analysis and verify workspace access
      const analysis = await models.DocumentAnalysis.findById(analysisId)
        .populate('createdBy', 'name email')
        .populate('workspaceId', 'name settings.country ownerId members')
        .lean()

      if (!analysis) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Analysis not found'
        })
        return
      }

    // Verify workspace access
    const workspace = analysis.workspaceId as any
    const hasAccess = workspace.ownerId.toString() === req.user!.userId ||
                     workspace.members.some((member: any) => member.userId.toString() === req.user!.userId)

      if (!hasAccess) {
        res.status(HttpStatusCode.Forbidden).send({
          success: false,
          message: 'Access denied to this analysis'
        })
        return
      }

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Analysis retrieved successfully',
      analysis
    })
    return
  } catch (error: unknown) {
    console.error('Error in getAnalysisByIdController:', error)
    next(error)
  }
}

export async function getWorkspaceAnalysesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params
    const { page = 1, limit = 10, documentType, status } = req.query

    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid workspace ID is required'
      })
      return
    }
      
    // Verify workspace access
    const workspace = await models.Workspace.findOne({
      _id: workspaceId,
      $or: [
        { ownerId: req.user!.userId },
        { 'members.userId': req.user!.userId }
      ],
      deletedAt: null
    })

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Workspace not found or access denied'
        })
        return
      }

      // Build query filters
      const filters: any = { workspaceId }
      if (documentType && ['pliego', 'propuesta', 'contrato'].includes(documentType as string)) {
        filters.documentType = documentType
      }
      if (status && ['processing', 'completed', 'failed'].includes(status as string)) {
        filters.status = status
      }

      // Calculate pagination
      const pageNum = Math.max(1, parseInt(page as string) || 1)
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10))
      const skip = (pageNum - 1) * limitNum

      // Get analyses with pagination
      const [analyses, totalCount] = await Promise.all([
        models.DocumentAnalysis.find(filters)
          .sort({ analysisDate: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('createdBy', 'name email')
          .lean(),
        models.DocumentAnalysis.countDocuments(filters)
      ])

      const totalPages = Math.ceil(totalCount / limitNum)

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Workspace analyses retrieved successfully',
      analyses,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      workspace: {
        id: workspace._id,
        name: workspace.name,
        country: workspace.settings.country
      }
    })
    return
  } catch (error: unknown) {
    console.error('Error in getWorkspaceAnalysesController:', error)
    next(error)
  }
}

export async function compareDocumentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId, documentIds } = req.body

    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid workspace ID is required'
      })
      return
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'At least 2 document IDs are required for comparison'
      })
      return
    }
      
    // Verify workspace access
    const workspace = await models.Workspace.findOne({
      _id: workspaceId,
      $or: [
        { ownerId: req.user!.userId },
        { 'members.userId': req.user!.userId }
      ],
      deletedAt: null
    })

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Workspace not found or access denied'
        })
        return
      }

      // Retrieve analyses from database
      const analyses = await models.DocumentAnalysis.find({
        _id: { $in: documentIds },
        workspaceId: workspaceId,
        status: 'completed'
      }).sort({ analysisDate: -1 })

      if (analyses.length < 2) {
        res.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: 'At least 2 completed analyses are required for comparison'
        })
        return
      }

      // Generate comparative analysis from real data
      const comparativeAnalysis: ComparativeAnalysis = await generateComparativeAnalysis(
        analyses,
        workspace.settings
      )

      // Update workspace usage
      await models.Workspace.findByIdAndUpdate(workspaceId, {
        $inc: {
          'usage.analysisCount': 1
        },
        updatedAt: new Date()
      })

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Documents compared successfully',
      comparison: comparativeAnalysis,
      workspace: {
        id: workspace._id,
        name: workspace.name,
        country: workspace.settings.country
      }
    })
    return
  } catch (error: unknown) {
    console.error('Error in compareDocumentsController:', error)
    next(error)
  }
}

// Enhanced AI Analysis Simulation (replace with real AI implementation)
async function simulateDocumentAnalysis(
  file: Express.Multer.File,
  documentType: 'pliego' | 'propuesta' | 'contrato',
  workspaceSettings: any
): Promise<DocumentAnalysisResult> {
  // Simulate realistic processing delay
  await new Promise(resolve => setTimeout(resolve, 3000))

  const documentId = new Types.ObjectId().toString()
  const analysisDate = new Date()
  const country = workspaceSettings.country?.name || 'Ecuador'

  // Generate analysis based on document type and country context
  let baseAnalysis: DocumentAnalysisResult

  if (documentType === 'pliego') {
    baseAnalysis = generatePliegoAnalysis(file, documentId, analysisDate, country)
  } else if (documentType === 'propuesta') {
    baseAnalysis = generatePropuestaAnalysis(file, documentId, analysisDate, country)
  } else {
    baseAnalysis = generateContratoAnalysis(file, documentId, analysisDate, country)
  }

  return baseAnalysis
}

// Generate specific analysis for Pliego documents
function generatePliegoAnalysis(
  file: Express.Multer.File,
  documentId: string,
  analysisDate: Date,
  country: string
): DocumentAnalysisResult {
  return {
    documentId,
    documentName: file.originalname,
    documentType: 'pliego',
    analysisDate,
    sections: {
      legal: {
        guarantees: [
          'Garantía de seriedad de oferta: 2% del valor del presupuesto referencial',
          'Garantía de fiel cumplimiento: 5% del valor del contrato',
          'Garantía de buen uso del anticipo: 100% del valor del anticipo',
          'Garantía técnica: 5% del valor del contrato por 24 meses'
        ],
        penalties: [
          'Multa por retraso: 1 por mil del valor del contrato por cada día de retraso',
          'Multa por incumplimiento parcial: 5% del valor de la obligación incumplida',
          'Multa por incumplimiento total: 10% del valor total del contrato'
        ],
        deadlines: [
          'Plazo de ejecución: 240 días calendario',
          'Entrega de cronograma: 15 días después de la firma',
          'Inicio de trabajos: 30 días después de la firma',
          'Entrega final: 240 días calendario'
        ],
        risks: [
          'Cláusula de fuerza mayor no especifica procedimientos',
          'Método de cálculo de multas puede generar interpretaciones ambiguas',
          'Falta especificación de mecanismo de resolución de controversias',
          'Garantías no especifican entidad emisora válida'
        ],
        complianceScore: 0.78
      },
      technical: {
        requirements: [
          'Certificación ISO 9001:2015 vigente',
          'Experiencia mínima de 5 años en proyectos similares',
          'Equipo técnico con calificaciones específicas',
          'Registro único de contratistas (RUC) activo',
          'Capacidad técnica instalada demostrable'
        ],
        materials: [
          'Materiales de construcción certificados',
          'Equipos con especificaciones técnicas detalladas',
          'Herramientas especializadas requeridas',
          'Insumos de calidad garantizada'
        ],
        processes: [
          'Metodología de ejecución claramente definida',
          'Cronograma de actividades detallado',
          'Procedimientos de control de calidad',
          'Plan de gestión de riesgos técnicos'
        ],
        timeline: [
          'Fase de planificación: 30 días',
          'Fase de ejecución: 180 días',
          'Fase de entrega y cierre: 30 días',
          'Período de garantía: 24 meses'
        ],
        completenessScore: 0.82
      },
      economic: {
        budget: 'Presupuesto referencial: $450,000.00 USD',
        paymentTerms: [
          'Anticipo: 30% a la firma del contrato',
          'Pago por avance de obra: 60% según cronograma',
          'Pago final: 10% contra entrega definitiva'
        ],
        costs: [
          'Costos directos: 75% del presupuesto total',
          'Costos indirectos: 15% del presupuesto total',
          'Utilidad: 10% del presupuesto total'
        ],
        financialRisks: [
          'Variación de precios de materiales',
          'Fluctuación del tipo de cambio',
          'Retrasos en pagos por parte de la entidad contratante'
        ],
        economicScore: 0.85
      }
    },
    gaps: [
      'Falta especificación de procedimiento para modificaciones contractuales',
      'No se define claramente el proceso de recepción provisional',
      'Ausencia de cláusula de actualización de precios'
    ],
    inconsistencies: [
      'Discrepancia entre plazo de ejecución y cronograma detallado',
      'Contradicción en porcentajes de garantías'
    ],
    recommendations: [
      'Incluir cláusula de fuerza mayor más específica',
      'Definir procedimiento claro para resolución de controversias',
      'Especificar entidades emisoras válidas para garantías',
      'Añadir mecanismo de actualización de precios'
    ],
    overallRiskScore: 0.28,
    overallComplianceScore: 0.82
  }
}

// Generate specific analysis for Propuesta documents
function generatePropuestaAnalysis(
  file: Express.Multer.File,
  documentId: string,
  analysisDate: Date,
  country: string
): DocumentAnalysisResult {
  return {
    documentId,
    documentName: file.originalname,
    documentType: 'propuesta',
    analysisDate,
    sections: {
      legal: {
        guarantees: [
          'Garantía de seriedad de oferta presentada: 2% del valor ofertado',
          'Compromiso de constitución de garantías contractuales',
          'Póliza de responsabilidad civil profesional'
        ],
        penalties: [
          'Aceptación de multas por retraso según pliego',
          'Compromiso de cumplimiento de penalidades establecidas'
        ],
        deadlines: [
          'Plazo de ejecución propuesto: 220 días calendario',
          'Cronograma de hitos principales incluido',
          'Fechas de entregables específicos definidas'
        ],
        risks: [
          'Propuesta de plazo menor al referencial puede indicar subestimación',
          'Falta de detalle en algunos aspectos legales'
        ],
        complianceScore: 0.88
      },
      technical: {
        requirements: [
          'Cumple con certificación ISO 9001:2015',
          'Experiencia demostrada: 8 años en proyectos similares',
          'Equipo técnico calificado presentado',
          'RUC activo y habilitado para la actividad'
        ],
        materials: [
          'Especificaciones técnicas de materiales detalladas',
          'Proveedores certificados identificados',
          'Plan de suministro y logística incluido'
        ],
        processes: [
          'Metodología de trabajo claramente definida',
          'Procedimientos de control de calidad específicos',
          'Plan de gestión de riesgos técnicos detallado'
        ],
        timeline: [
          'Cronograma detallado por actividades',
          'Ruta crítica identificada',
          'Hitos de control establecidos'
        ],
        completenessScore: 0.91
      },
      economic: {
        budget: 'Oferta económica: $425,000.00 USD (5.5% bajo presupuesto referencial)',
        paymentTerms: [
          'Acepta términos de pago del pliego',
          'Solicita anticipo del 30%',
          'Propone cronograma de pagos por avance'
        ],
        costs: [
          'Análisis de precios unitarios detallado',
          'Desglose de costos directos e indirectos',
          'Margen de utilidad: 8%'
        ],
        financialRisks: [
          'Oferta económica agresiva puede afectar calidad',
          'Margen de utilidad bajo puede generar problemas financieros'
        ],
        economicScore: 0.79
      }
    },
    rucValidation: {
      ruc: '1792146739001',
      companyName: 'CONSTRUCTORA EJEMPLO S.A.',
      isValid: true,
      canPerformWork: true,
      businessType: 'Sociedad Anónima - Construcción'
    },
    gaps: [
      'Falta detalle en plan de contingencias',
      'No especifica procedimiento para cambios de alcance'
    ],
    inconsistencies: [
      'Discrepancia menor entre cronograma general y detallado'
    ],
    recommendations: [
      'Revisar sostenibilidad financiera de la oferta económica',
      'Solicitar mayor detalle en plan de contingencias',
      'Verificar capacidad financiera del oferente'
    ],
    overallRiskScore: 0.35,
    overallComplianceScore: 0.86
  }
}

// Generate specific analysis for Contrato documents
function generateContratoAnalysis(
  file: Express.Multer.File,
  documentId: string,
  analysisDate: Date,
  country: string
): DocumentAnalysisResult {
  return {
    documentId,
    documentName: file.originalname,
    documentType: 'contrato',
    analysisDate,
    sections: {
      legal: {
        guarantees: [
          'Garantía de fiel cumplimiento constituida: 5% del valor contractual',
          'Garantía de buen uso del anticipo: $127,500.00',
          'Garantía técnica: 5% por 24 meses post-entrega'
        ],
        penalties: [
          'Multa por retraso: 1‰ diario del valor contractual',
          'Multa por incumplimiento: hasta 10% del valor contractual',
          'Procedimiento de aplicación de multas definido'
        ],
        deadlines: [
          'Plazo contractual: 220 días calendario',
          'Fecha de inicio: definida en orden de proceder',
          'Hitos contractuales establecidos'
        ],
        risks: [
          'Cláusula de terminación unilateral muy amplia',
          'Mecanismo de resolución de controversias podría ser más específico'
        ],
        complianceScore: 0.92
      },
      technical: {
        requirements: [
          'Especificaciones técnicas incorporadas del pliego',
          'Obligaciones técnicas del contratista definidas',
          'Estándares de calidad establecidos'
        ],
        materials: [
          'Lista de materiales aprobados incluida',
          'Procedimiento de aprobación de materiales definido'
        ],
        processes: [
          'Metodología de ejecución aprobada',
          'Procedimientos de supervisión establecidos',
          'Protocolos de control de calidad definidos'
        ],
        timeline: [
          'Cronograma contractual aprobado',
          'Hitos de control establecidos',
          'Procedimiento para modificaciones de cronograma'
        ],
        completenessScore: 0.89
      },
      economic: {
        budget: 'Valor contractual: $425,000.00 USD',
        paymentTerms: [
          'Anticipo: 30% ($127,500.00) contra garantía',
          'Pagos por avance: según cronograma aprobado',
          'Pago final: 10% contra acta de entrega-recepción definitiva'
        ],
        costs: [
          'Precios unitarios contractuales fijos',
          'Fórmula de reajuste de precios incluida',
          'Procedimiento para costos adicionales definido'
        ],
        financialRisks: [
          'Riesgo de variación de precios mitigado con fórmula de reajuste',
          'Riesgo de liquidez por pagos diferidos'
        ],
        economicScore: 0.87
      }
    },
    gaps: [
      'Falta especificación de procedimiento para extensiones de plazo',
      'No define claramente responsabilidades en caso de fuerza mayor'
    ],
    inconsistencies: [],
    recommendations: [
      'Incluir procedimiento más detallado para extensiones de plazo',
      'Definir mejor las responsabilidades en casos de fuerza mayor',
      'Considerar incluir cláusula de mediación previa al arbitraje'
    ],
    overallRiskScore: 0.22,
    overallComplianceScore: 0.89
  }
}

async function generateComparativeAnalysis(
  analyses: any[],
  workspaceSettings: any
): Promise<ComparativeAnalysis> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  const comparisonId = new Types.ObjectId().toString()
  
  // Convert database analyses to DocumentAnalysisResult format
  const documents: DocumentAnalysisResult[] = analyses.map(analysis => ({
    documentId: analysis._id.toString(),
    documentName: analysis.documentName,
    documentType: analysis.documentType,
    analysisDate: analysis.analysisDate,
    sections: analysis.sections,
    rucValidation: analysis.rucValidation,
    gaps: analysis.gaps,
    inconsistencies: analysis.inconsistencies,
    recommendations: analysis.recommendations,
    overallRiskScore: analysis.overallRiskScore,
    overallComplianceScore: analysis.overallComplianceScore
  }))

  // Calculate ranking based on weighted scores
  const weights = workspaceSettings.analysisConfig?.scoringWeights || {
    compliance: 0.4,
    risk: 0.3,
    completeness: 0.3
  }

  const ranking = documents
    .map(doc => {
      const totalScore = (
        doc.sections.legal.complianceScore * weights.compliance +
        (1 - doc.overallRiskScore) * weights.risk + // Invert risk score (lower risk = higher score)
        doc.sections.technical.completenessScore * weights.completeness
      )
      
      return {
        documentId: doc.documentId,
        documentName: doc.documentName,
        totalScore,
        position: 0, // Will be set after sorting
        strengths: generateStrengths(doc),
        weaknesses: generateWeaknesses(doc)
      }
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, index) => ({ ...item, position: index + 1 }))

  // Find best performers in each category
  const bestLegalCompliance = documents.reduce((best, current) => 
    current.sections.legal.complianceScore > best.sections.legal.complianceScore ? current : best
  )
  
  const bestTechnicalCompleteness = documents.reduce((best, current) => 
    current.sections.technical.completenessScore > best.sections.technical.completenessScore ? current : best
  )
  
  const mostEconomical = documents.reduce((best, current) => {
    const currentBudget = parseFloat(current.sections.economic.budget.replace(/[$,USD\s]/g, '') || '0')
    const bestBudget = parseFloat(best.sections.economic.budget.replace(/[$,USD\s]/g, '') || '0')
    return currentBudget < bestBudget ? current : best
  })

  return {
    comparisonId,
    documents,
    comparison: {
      legal: {
        bestCompliance: bestLegalCompliance.documentName,
        riskComparison: documents.reduce((acc, doc) => {
          acc[doc.documentName] = doc.overallRiskScore
          return acc
        }, {} as Record<string, number>),
        recommendations: generateLegalRecommendations(documents)
      },
      technical: {
        mostComplete: bestTechnicalCompleteness.documentName,
        requirementsFulfillment: documents.reduce((acc, doc) => {
          acc[doc.documentName] = doc.sections.technical.completenessScore
          return acc
        }, {} as Record<string, number>),
        technicalRisks: generateTechnicalRisks(documents)
      },
      economic: {
        mostEconomical: mostEconomical.documentName,
        budgetComparison: documents.reduce((acc, doc) => {
          const budget = parseFloat(doc.sections.economic.budget.replace(/[$,USD\s]/g, '') || '0')
          acc[doc.documentName] = budget
          return acc
        }, {} as Record<string, number>),
        paymentTermsComparison: documents.reduce((acc, doc) => {
          acc[doc.documentName] = doc.sections.economic.paymentTerms
          return acc
        }, {} as Record<string, string[]>)
      }
    },
    ranking,
    finalRecommendation: {
      recommendedDocument: ranking[0].documentName,
      reasons: generateRecommendationReasons(ranking[0], documents),
      criticalAlerts: generateCriticalAlerts(documents)
    }
  }
}

// Helper functions for generating analysis insights
function generateStrengths(doc: DocumentAnalysisResult): string[] {
  const strengths: string[] = []
  
  if (doc.sections.legal.complianceScore > 0.8) {
    strengths.push('Excellent legal compliance')
  }
  if (doc.sections.technical.completenessScore > 0.8) {
    strengths.push('Comprehensive technical documentation')
  }
  if (doc.sections.economic.economicScore > 0.8) {
    strengths.push('Strong economic proposal')
  }
  if (doc.overallRiskScore < 0.3) {
    strengths.push('Low risk profile')
  }
  if (doc.rucValidation?.isValid) {
    strengths.push('Valid company registration')
  }
  
  return strengths.length > 0 ? strengths : ['Standard compliance levels']
}

function generateWeaknesses(doc: DocumentAnalysisResult): string[] {
  const weaknesses: string[] = []
  
  if (doc.sections.legal.complianceScore < 0.6) {
    weaknesses.push('Legal compliance concerns')
  }
  if (doc.sections.technical.completenessScore < 0.6) {
    weaknesses.push('Incomplete technical specifications')
  }
  if (doc.sections.economic.economicScore < 0.6) {
    weaknesses.push('Economic proposal needs improvement')
  }
  if (doc.overallRiskScore > 0.7) {
    weaknesses.push('High risk factors identified')
  }
  if (doc.gaps.length > 3) {
    weaknesses.push('Multiple documentation gaps')
  }
  if (doc.inconsistencies.length > 2) {
    weaknesses.push('Internal inconsistencies found')
  }
  
  return weaknesses.length > 0 ? weaknesses : ['Minor areas for improvement']
}

function generateLegalRecommendations(documents: DocumentAnalysisResult[]): string[] {
  const recommendations: string[] = []
  const avgCompliance = documents.reduce((sum, doc) => sum + doc.sections.legal.complianceScore, 0) / documents.length
  
  if (avgCompliance < 0.7) {
    recommendations.push('Overall legal compliance needs improvement across all proposals')
  }
  
  const commonRisks = documents.flatMap(doc => doc.sections.legal.risks)
  const riskCounts = commonRisks.reduce((acc, risk) => {
    acc[risk] = (acc[risk] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  Object.entries(riskCounts)
    .filter(([_, count]) => count > 1)
    .forEach(([risk, _]) => {
      recommendations.push(`Address common risk: ${risk}`)
    })
  
  return recommendations.length > 0 ? recommendations : ['Legal compliance is generally satisfactory']
}

function generateTechnicalRisks(documents: DocumentAnalysisResult[]): string[] {
  const risks: string[] = []
  const avgCompleteness = documents.reduce((sum, doc) => sum + doc.sections.technical.completenessScore, 0) / documents.length
  
  if (avgCompleteness < 0.7) {
    risks.push('Technical documentation completeness below recommended threshold')
  }
  
  const timelineVariations = documents.map(doc => doc.sections.technical.timeline.length)
  const maxTimeline = Math.max(...timelineVariations)
  const minTimeline = Math.min(...timelineVariations)
  
  if (maxTimeline - minTimeline > 2) {
    risks.push('Significant timeline variations between proposals')
  }
  
  return risks.length > 0 ? risks : ['Technical specifications are generally consistent']
}

function generateRecommendationReasons(topRanked: any, documents: DocumentAnalysisResult[]): string[] {
  const reasons: string[] = []
  const topDoc = documents.find(doc => doc.documentId === topRanked.documentId)
  
  if (!topDoc) return ['Highest overall score']
  
  if (topDoc.sections.legal.complianceScore > 0.8) {
    reasons.push('Excellent legal compliance score')
  }
  if (topDoc.sections.technical.completenessScore > 0.8) {
    reasons.push('Comprehensive technical documentation')
  }
  if (topDoc.overallRiskScore < 0.4) {
    reasons.push('Low risk profile')
  }
  if (topDoc.gaps.length < 3) {
    reasons.push('Minimal documentation gaps')
  }
  
  return reasons.length > 0 ? reasons : ['Best overall performance across all criteria']
}

function generateCriticalAlerts(documents: DocumentAnalysisResult[]): string[] {
  const alerts: string[] = []
  
  const highRiskDocs = documents.filter(doc => doc.overallRiskScore > 0.8)
  if (highRiskDocs.length > 0) {
    alerts.push(`${highRiskDocs.length} proposal(s) have high risk scores requiring immediate attention`)
  }
  
  const invalidRucs = documents.filter(doc => doc.rucValidation && !doc.rucValidation.isValid)
  if (invalidRucs.length > 0) {
    alerts.push(`${invalidRucs.length} proposal(s) have invalid company registration`)
  }
  
  const lowCompliance = documents.filter(doc => doc.sections.legal.complianceScore < 0.5)
  if (lowCompliance.length > 0) {
    alerts.push(`${lowCompliance.length} proposal(s) have critically low legal compliance scores`)
  }
  
  return alerts.length > 0 ? alerts : ['No critical issues identified']
}

async function simulateComparativeAnalysis(
  documentIds: string[],
  workspaceSettings: any
): Promise<ComparativeAnalysis> {
  // This function is kept for backward compatibility but should not be used
  // when real data is available
  return generateComparativeAnalysis([], workspaceSettings)
}