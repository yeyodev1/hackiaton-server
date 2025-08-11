import { Router } from 'express'
import {
  chatWithAgentController,
  getDocumentInsightsController,
  getComparisonInsightsController,
  getLLMHealthController
} from '../controllers/agent.controller'

const router = Router()

// Chat with AI agent
router.post('/chat', chatWithAgentController)

// Get insights for a specific document analysis
router.get('/insights/document/:analysisId', getDocumentInsightsController)

// Get comparison insights for multiple analyses
router.post('/insights/comparison/:workspaceId', getComparisonInsightsController)

// Check LLM service health
router.get('/health', getLLMHealthController)

export default router