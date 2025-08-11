import { Router } from 'express'
import { analyzeDocumentController, compareDocumentsController, getWorkspaceAnalysesController, getAnalysisByIdController } from '../controllers/analysis.controller'
import { upload } from '../middlewares/upload.middleware'

const router = Router()

// GET /api/analysis/workspace/:workspaceId - Get workspace analyses with pagination and filters
router.get('/workspace/:workspaceId', getWorkspaceAnalysesController)

// GET /api/analysis/:analysisId - Get specific analysis by ID
router.get('/:analysisId', getAnalysisByIdController)

// POST /api/analysis/document - Analyze a single document (pliego, propuesta, contrato)
router.post('/document', upload.single('document'), analyzeDocumentController)

// POST /api/analysis/compare - Compare multiple analyzed documents
router.post('/compare', upload.array('documents', 10), compareDocumentsController)

export default router