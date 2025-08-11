import express from "express"
import { upload } from "../middlewares/upload.middleware"
import { authenticateToken } from "../middlewares/auth.middleware"
import {
  uploadDocumentController,
  getWorkspaceDocumentsController,
  deleteDocumentController
} from "../controllers/document.controller"

const router = express.Router()

// Upload a new document (contract, pliego, propuesta)
router.post('/upload', authenticateToken, upload.single('document'), uploadDocumentController)

// Get all documents in workspace
router.get('/workspace-documents', authenticateToken, getWorkspaceDocumentsController)

// Delete a document
router.delete('/:documentId', authenticateToken, deleteDocumentController)

export default router