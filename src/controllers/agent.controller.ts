import type { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { HttpStatusCode } from 'axios'
import models from '../models'
import LLMService from '../services/llm.service'
import type { IDocumentAnalysis } from '../models/analysis.model'

// Interface for chat message
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// Interface for agent request
interface AgentChatRequest {
  message: string
  workspaceId: string
  analysisIds?: string[]
  conversationId?: string
}

export async function chatWithAgentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message, workspaceId, analysisIds, conversationId }: AgentChatRequest = req.body

    if (!message || !workspaceId) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Message and workspace ID are required'
      })
      return
    }

    if (!Types.ObjectId.isValid(workspaceId)) {
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

      // Get relevant analyses if provided
      let analyses: IDocumentAnalysis[] = []
      if (analysisIds && analysisIds.length > 0) {
        const validAnalysisIds = analysisIds.filter(id => Types.ObjectId.isValid(id))
        if (validAnalysisIds.length > 0) {
          analyses = await models.DocumentAnalysis.find({
            _id: { $in: validAnalysisIds },
            workspaceId: workspaceId,
            status: 'completed'
          }).populate('createdBy', 'name email')
        }
      }

      // Initialize LLM service
      const llmService = new LLMService()
      
      // Check LLM service health
      const healthCheck = await llmService.healthCheck()
      if (healthCheck.status === 'unhealthy') {
        res.status(HttpStatusCode.ServiceUnavailable).send({
          success: false,
          message: 'AI service is currently unavailable. Please try again later.'
        })
        return
      }

      // Get workspace documents for context
      const workspaceDocuments = workspace.settings?.documents || []
      
      // Prepare context for the agent
      const context = {
        analyses: analyses,
        documents: workspaceDocuments,
        workspace: {
          name: workspace.name,
          country: workspace.settings?.country,
          legalDocuments: workspace.settings?.legalDocuments
        }
      }

      // Build conversation history (simplified for now)
      const messages = [
        {
          role: 'user' as const,
          content: message
        }
      ]

      // Get AI response
      const aiResponse = await llmService.chatWithAgent(messages, context)

      // Save conversation (optional - you might want to implement a conversation model)
      const conversationEntry = {
        userMessage: message,
        aiResponse: aiResponse,
        timestamp: new Date(),
        workspaceId: workspaceId,
        userId: req.user!.userId,
        analysisIds: analysisIds || [],
        conversationId: conversationId || new Types.ObjectId().toString()
      }

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Agent response generated successfully',
      response: {
        content: aiResponse,
        timestamp: new Date(),
        conversationId: conversationEntry.conversationId,
        context: {
          analysesCount: analyses.length,
          workspaceName: workspace.name,
          country: workspace.settings?.country?.name
        }
      },
      llmProvider: healthCheck.preferredProvider
    })
    return
  } catch (error: unknown) {
    console.error('Error in chatWithAgentController:', error)
    next(error)
  }
}

export async function getDocumentInsightsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { analysisId } = req.params
    const { question } = req.query

    if (!analysisId || !Types.ObjectId.isValid(analysisId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid analysis ID is required'
      })
      return
    }

    // Get the analysis
    const analysis = await models.DocumentAnalysis.findOne({
      _id: analysisId,
      status: 'completed'
    }).populate('workspaceId').populate('createdBy', 'name email')

    if (!analysis) {
      res.status(HttpStatusCode.NotFound).send({
        success: false,
        message: 'Analysis not found'
      })
      return
    }

    // Verify workspace access
    const workspace = await models.Workspace.findOne({
      _id: analysis.workspaceId,
      $or: [
        { ownerId: req.user!.userId },
        { 'members.userId': req.user!.userId }
      ],
      deletedAt: null
    })

      if (!workspace) {
        res.status(HttpStatusCode.Forbidden).send({
          success: false,
          message: 'Access denied to this analysis'
        })
        return
      }

      // Initialize LLM service
      const llmService = new LLMService()
      
      // Check LLM service health
      const healthCheck = await llmService.healthCheck()
      if (healthCheck.status === 'unhealthy') {
        res.status(HttpStatusCode.ServiceUnavailable).send({
          success: false,
          message: 'AI service is currently unavailable. Please try again later.'
        })
        return
      }

      // Generate insights
      const insights = await llmService.generateDocumentInsights(
        analysis.toObject(),
        question as string
      )

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Document insights generated successfully',
      insights,
      analysis: {
        id: analysis._id,
        documentName: analysis.documentName,
        documentType: analysis.documentType,
        analysisDate: analysis.analysisDate,
        overallRiskScore: analysis.overallRiskScore,
        overallComplianceScore: analysis.overallComplianceScore
      },
      llmProvider: healthCheck.preferredProvider
    })
    return
  } catch (error: unknown) {
    console.error('Error in getDocumentInsightsController:', error)
    next(error)
  }
}

export async function getComparisonInsightsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId } = req.params
    const { analysisIds, question } = req.body

    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid workspace ID is required'
      })
      return
    }

    if (!analysisIds || !Array.isArray(analysisIds) || analysisIds.length < 2) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'At least 2 analysis IDs are required for comparison'
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

      // Get the analyses
      const validAnalysisIds = analysisIds.filter(id => Types.ObjectId.isValid(id))
      const analyses = await models.DocumentAnalysis.find({
        _id: { $in: validAnalysisIds },
        workspaceId: workspaceId,
        status: 'completed'
      }).populate('createdBy', 'name email')

      if (analyses.length < 2) {
        res.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: 'At least 2 completed analyses are required for comparison'
        })
        return
      }

      // Initialize LLM service
      const llmService = new LLMService()
      
      // Check LLM service health
      const healthCheck = await llmService.healthCheck()
      if (healthCheck.status === 'unhealthy') {
        res.status(HttpStatusCode.ServiceUnavailable).send({
          success: false,
          message: 'AI service is currently unavailable. Please try again later.'
        })
        return
      }

      // Generate comparison insights
      const insights = await llmService.generateComparisonInsights(
        analyses.map(a => a.toObject()),
        question
      )

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Comparison insights generated successfully',
      insights,
      comparedAnalyses: analyses.map(analysis => ({
        id: analysis._id,
        documentName: analysis.documentName,
        documentType: analysis.documentType,
        analysisDate: analysis.analysisDate,
        overallRiskScore: analysis.overallRiskScore,
        overallComplianceScore: analysis.overallComplianceScore
      })),
      llmProvider: healthCheck.preferredProvider
    })
    return
  } catch (error: unknown) {
    console.error('Error in getComparisonInsightsController:', error)
    next(error)
  }
}

export async function getLLMHealthController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const llmService = new LLMService()
    const healthCheck = await llmService.healthCheck()

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'LLM service health check completed',
      health: healthCheck
    })
    return
  } catch (error: unknown) {
    console.error('Error in getLLMHealthController:', error)
    next(error)
  }
}