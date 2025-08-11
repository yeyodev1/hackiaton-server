import express from "express"
import { upload } from "../middlewares/upload.middleware"
import { authenticateToken } from "../middlewares/auth.middleware"
import {
  getUserWorkspaceController,
  updateWorkspaceCountryController,
  uploadCompanyDocumentController,
  completeWorkspaceSetupController
} from "../controllers/workspace.controller"

const router = express.Router()

// Get user's workspace with available countries
router.get('/my-workspace', authenticateToken, getUserWorkspaceController)

// Update workspace country selection
router.put('/country', authenticateToken, updateWorkspaceCountryController)

// Upload company document (constitution, organic code, etc.)
router.post('/upload-document', authenticateToken, upload.single('document'), uploadCompanyDocumentController)

// Mark workspace setup as complete
router.put('/complete-setup', authenticateToken, completeWorkspaceSetupController)

export default router