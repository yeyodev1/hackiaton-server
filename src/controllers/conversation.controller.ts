import type { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { HttpStatusCode } from 'axios'
import models from '../models'
import LLMService from '../services/llm.service'
import type { IDocumentAnalysis } from '../models/analysis.model'
import type { IChatMessage } from '../models/conversation.model'

// Interface for chat request with conversation
interface ConversationChatRequest {
  message: string
  conversationId?: string
}

// Interface for creating new conversation
interface CreateConversationRequest {
  analysisId: string
  title?: string
  initialMessage?: string
}

export async function createConversationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { analysisId, title, initialMessage }: CreateConversationRequest = req.body

    if (!analysisId || !Types.ObjectId.isValid(analysisId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid analysis ID is required'
      })
      return
    }

    // Get the specific analysis
    const analysis = await models.DocumentAnalysis.findOne({
      _id: analysisId,
      status: 'completed'
    })

    if (!analysis) {
      res.status(HttpStatusCode.NotFound).send({
        success: false,
        message: 'Analysis not found or not completed'
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
      res.status(HttpStatusCode.NotFound).send({
        success: false,
        message: 'Workspace not found or access denied'
      })
      return
    }

    // Generate title if not provided
    const conversationTitle = title || `Chat about ${analysis.documentName}`

    // Create conversation
    const conversation = await models.Conversation.create({
      workspaceId: analysis.workspaceId,
      analysisId: analysisId,
      userId: req.user!.userId,
      title: conversationTitle,
      messages: [],
      lastMessageAt: new Date()
    })

    // If initial message provided, process it
    if (initialMessage) {
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

      // Prepare context for the specific document
      const context = {
        workspace: {
          name: workspace.name,
          country: workspace.settings?.country,
          legalDocuments: workspace.settings?.legalDocuments
        },
        focusedAnalysis: {
          id: (analysis._id as any).toString(),
          documentName: analysis.documentName,
          aiAnalysis: analysis.aiAnalysis,
          rucValidation: analysis.rucValidation,
          createdAt: analysis.createdAt,
          createdBy: analysis.createdBy
        }
      }

      // Build conversation messages
      const messages = [
        {
          role: 'user' as const,
          content: initialMessage
        }
      ]

      // Get AI response
      const aiResponse = await llmService.chatWithDocument(messages, context)

      // Add messages to conversation
      const userMessage: IChatMessage = {
        role: 'user',
        content: initialMessage,
        timestamp: new Date()
      }

      const assistantMessage: IChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }

      conversation.messages.push(userMessage, assistantMessage)
      conversation.lastMessageAt = new Date()
      await conversation.save()
    }

    res.status(HttpStatusCode.Created).send({
      success: true,
      message: 'Conversation created successfully',
      conversation: {
        id: conversation._id,
        title: conversation.title,
        analysisId: conversation.analysisId,
        workspaceId: conversation.workspaceId,
        messages: conversation.messages,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt
      }
    })
    return
  } catch (error: unknown) {
    console.error('Error in createConversationController:', error)
    next(error)
  }
}

export async function chatWithConversationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { conversationId } = req.params
    const { message }: ConversationChatRequest = req.body

    if (!message) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Message is required'
      })
      return
    }

    if (!Types.ObjectId.isValid(conversationId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid conversation ID is required'
      })
      return
    }

    // Get conversation with analysis
    const conversation = await models.Conversation.findOne({
      _id: conversationId,
      userId: req.user!.userId,
      isActive: true
    }).populate('analysisId')

    if (!conversation) {
      res.status(HttpStatusCode.NotFound).send({
        success: false,
        message: 'Conversation not found or access denied'
      })
      return
    }

    const analysis = conversation.analysisId as any as IDocumentAnalysis

    if (!analysis || analysis.status !== 'completed') {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Associated analysis not found or not completed'
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
      res.status(HttpStatusCode.NotFound).send({
        success: false,
        message: 'Workspace not found or access denied'
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

    // Prepare context with conversation history
    const context = {
      workspace: {
        name: workspace.name,
        country: workspace.settings?.country,
        legalDocuments: workspace.settings?.legalDocuments
      },
      focusedAnalysis: {
        id: (analysis._id as any).toString(),
        documentName: analysis.documentName,
        aiAnalysis: analysis.aiAnalysis,
        rucValidation: analysis.rucValidation,
        createdAt: analysis.createdAt,
        createdBy: analysis.createdBy
      },
      conversationHistory: conversation.messages
    }

    // Build messages including conversation history
    const messages = [
      ...conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Get AI response with full context
    const aiResponse = await llmService.chatWithDocument(messages, context)

    // Add new messages to conversation
    const userMessage: IChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    const assistantMessage: IChatMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    }

    conversation.messages.push(userMessage, assistantMessage)
    conversation.lastMessageAt = new Date()
    await conversation.save()

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Message sent successfully',
      response: {
        content: aiResponse,
        timestamp: assistantMessage.timestamp,
        conversationId: conversation._id
      },
      conversation: {
        id: conversation._id,
        title: conversation.title,
        messages: conversation.messages,
        lastMessageAt: conversation.lastMessageAt
      }
    })
    return
  } catch (error: unknown) {
    console.error('Error in chatWithConversationController:', error)
    next(error)
  }
}

export async function getConversationHistoryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { conversationId } = req.params

    if (!Types.ObjectId.isValid(conversationId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid conversation ID is required'
      })
      return
    }

    // Get conversation
    const conversation = await models.Conversation.findOne({
      _id: conversationId,
      userId: req.user!.userId,
      isActive: true
    }).populate('analysisId', 'documentName documentType')

    if (!conversation) {
      res.status(HttpStatusCode.NotFound).send({
        success: false,
        message: 'Conversation not found or access denied'
      })
      return
    }

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Conversation history retrieved successfully',
      conversation: {
        id: conversation._id,
        title: conversation.title,
        analysisId: conversation.analysisId,
        messages: conversation.messages,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt
      }
    })
    return
  } catch (error: unknown) {
    console.error('Error in getConversationHistoryController:', error)
    next(error)
  }
}

export async function getUserConversationsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workspaceId, analysisId } = req.query
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    // Build filter
    const filter: any = {
      userId: req.user!.userId,
      isActive: true
    }

    if (workspaceId && Types.ObjectId.isValid(workspaceId as string)) {
      filter.workspaceId = workspaceId
    }

    if (analysisId && Types.ObjectId.isValid(analysisId as string)) {
      filter.analysisId = analysisId
    }

    // Get conversations with pagination
    const [conversations, total] = await Promise.all([
      models.Conversation.find(filter)
        .populate('analysisId', 'documentName documentType')
        .populate('workspaceId', 'name')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit),
      models.Conversation.countDocuments(filter)
    ])

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Conversations retrieved successfully',
      conversations: conversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        analysisId: conv.analysisId,
        workspaceId: conv.workspaceId,
        messageCount: conv.messages.length,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    return
  } catch (error: unknown) {
    console.error('Error in getUserConversationsController:', error)
    next(error)
  }
}

export async function updateConversationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { conversationId } = req.params
    const { title } = req.body

    if (!Types.ObjectId.isValid(conversationId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid conversation ID is required'
      })
      return
    }

    if (!title || title.trim().length === 0) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Title is required'
      })
      return
    }

    // Update conversation
    const conversation = await models.Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        userId: req.user!.userId,
        isActive: true
      },
      {
        title: title.trim(),
        updatedAt: new Date()
      },
      { new: true }
    )

    if (!conversation) {
      res.status(HttpStatusCode.NotFound).send({
        success: false,
        message: 'Conversation not found or access denied'
      })
      return
    }

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Conversation updated successfully',
      conversation: {
        id: conversation._id,
        title: conversation.title,
        updatedAt: conversation.updatedAt
      }
    })
    return
  } catch (error: unknown) {
    console.error('Error in updateConversationController:', error)
    next(error)
  }
}

export async function deleteConversationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { conversationId } = req.params

    if (!Types.ObjectId.isValid(conversationId)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid conversation ID is required'
      })
      return
    }

    // Soft delete conversation
    const conversation = await models.Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        userId: req.user!.userId,
        isActive: true
      },
      {
        isActive: false,
        updatedAt: new Date()
      },
      { new: true }
    )

    if (!conversation) {
      res.status(HttpStatusCode.NotFound).send({
        success: false,
        message: 'Conversation not found or access denied'
      })
      return
    }

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Conversation deleted successfully'
    })
    return
  } catch (error: unknown) {
    console.error('Error in deleteConversationController:', error)
    next(error)
  }
}