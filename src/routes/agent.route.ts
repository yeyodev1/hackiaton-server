import { Router } from 'express'
import {
  chatWithAgentController,
  getDocumentInsightsController,
  getComparisonInsightsController,
  getLLMHealthController
} from '../controllers/agent.controller'
import { authenticateToken } from '../middlewares/auth.middleware'

const router = Router()

// Chat with AI agent
router.post('/chat', authenticateToken, chatWithAgentController)

// Get insights for a specific document analysis
router.get('/insights/document/:analysisId', authenticateToken, getDocumentInsightsController)

// Get comparison insights for multiple analyses
router.post('/insights/comparison/:workspaceId', authenticateToken, getComparisonInsightsController)

// Check LLM service health
router.get('/health', getLLMHealthController)

export default router