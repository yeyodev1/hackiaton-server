import { Router } from 'express'
import { analyzeDocumentController, compareDocumentsController, getWorkspaceAnalysesController, getAnalysisByIdController, getTechnicalAnalysisController, getDocumentInsightsController, uploadAndCompareController } from '../controllers/analysis.controller'
import { upload } from '../middlewares/upload.middleware'
import { authenticateToken } from '../middlewares/auth.middleware'

const router = Router()

// GET /api/analysis/workspace/:workspaceId - Get workspace analyses with pagination and filters
router.get('/workspace/:workspaceId', authenticateToken, getWorkspaceAnalysesController)

// GET /api/analysis/:analysisId - Get specific analysis by ID
router.get('/:analysisId', authenticateToken, getAnalysisByIdController)

// GET /api/analysis/:analysisId/insights - Get focused insights for a document (legal, technical, economic, risks)
router.get('/:analysisId/insights', authenticateToken, getDocumentInsightsController)

// GET /api/analysis/:analysisId/technical - Get technical analysis for a specific document
router.get('/:analysisId/technical', authenticateToken, getTechnicalAnalysisController)

// POST /api/analysis/document - Analyze a single document (pliego, propuesta, contrato)
router.post('/document', authenticateToken, upload.single('document'), analyzeDocumentController)

// POST /api/analysis/compare - Compare multiple documents by IDs
router.post('/compare', authenticateToken, compareDocumentsController)

// POST /api/analysis/upload-and-compare - Upload and compare multiple documents in one operation
router.post('/upload-and-compare', authenticateToken, upload.array('documents', 5), uploadAndCompareController)

export default router