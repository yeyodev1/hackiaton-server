import { Router } from 'express'
import {
  createConversationController,
  chatWithConversationController,
  getConversationHistoryController,
  getUserConversationsController,
  updateConversationController,
  deleteConversationController
} from '../controllers/conversation.controller'
import { authenticateToken } from '../middlewares/auth.middleware'

const router = Router()

// Create new conversation
router.post('/create', authenticateToken, createConversationController)

// Chat with existing conversation
router.post('/chat/:conversationId', authenticateToken, chatWithConversationController)

// Get conversation history
router.get('/:conversationId', authenticateToken, getConversationHistoryController)

// Get user conversations (with optional filters)
router.get('/', authenticateToken, getUserConversationsController)

// Update conversation (title)
router.put('/:conversationId', authenticateToken, updateConversationController)

// Delete conversation (soft delete)
router.delete('/:conversationId', authenticateToken, deleteConversationController)

export default router