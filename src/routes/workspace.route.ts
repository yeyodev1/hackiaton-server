import express from "express"
import { upload } from "../middlewares/upload.middleware"
import {
  getUserWorkspaceController,
  updateWorkspaceCountryController,
  uploadCompanyDocumentController,
  completeWorkspaceSetupController
} from "../controllers/workspace.controller"

const router = express.Router()

// Get user's workspace with available countries
router.get('/my-workspace', getUserWorkspaceController)

// Update workspace country selection
router.put('/country', updateWorkspaceCountryController)

// Upload company document (constitution, organic code, etc.)
router.post('/upload-document', upload.single('document'), uploadCompanyDocumentController)

// Mark workspace setup as complete
router.put('/complete-setup', completeWorkspaceSetupController)

export default router