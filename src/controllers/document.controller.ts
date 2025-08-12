import type { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { HttpStatusCode } from 'axios'
import models from '../models'
import { GoogleDriveService } from '../services/googleDrive.service'
import path from 'path'
import fs from 'fs/promises'
import pdfParse from 'pdf-parse'

const GOOGLE_DRIVE_FOLDER_ID = '1XMOlJCE74sqDdv8rh7chl4YMlKfoAWPB'

// Interface for document upload request
interface DocumentUploadRequest {
  documentType: 'contract' | 'pliego' | 'propuesta'
  title: string
  description?: string
}

export async function uploadDocumentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { documentType, title, description }: DocumentUploadRequest = req.body
    
    if (!req.file) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Document file is required'
      })
      return
    }

    if (!documentType || !title) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Document type and title are required'
      })
      return
    }

    // Find user's workspace
    const workspace = await models.Workspace.findOne({
      ownerId: req.user!.userId,
      deletedAt: null
    })

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Workspace not found'
        })
        return
      }

      // Extract text content based on file type
      let extractedText = ''
      try {
        const fileBuffer = await fs.readFile(req.file.path)
        
        if (req.file.mimetype === 'application/pdf') {
          const pdfData = await pdfParse(fileBuffer)
          extractedText = pdfData.text
        } else if (req.file.mimetype === 'text/plain') {
          extractedText = fileBuffer.toString('utf-8')
        }
      } catch (error) {
        // Continue without text extraction
      }

      // Initialize Google Drive service and upload file, then delete local file
      const credentialsPath = path.join(process.cwd(), 'dist', 'credentials', 'google-credentials.json')
      const driveService = new GoogleDriveService(credentialsPath, GOOGLE_DRIVE_FOLDER_ID)

      // Ensure workspace folder exists on Drive
      const workspaceFolderId = await driveService.ensureSubfolder(`workspace_${workspace._id}`)

      // Prepare filename and upload
      const fileName = `${documentType}_${Date.now()}_${req.file.originalname}`
      let documentUrl = ''
      try {
        documentUrl = await driveService.uploadFileToSubfolder(
          req.file.path,
          fileName,
          workspaceFolderId
        )
      } finally {
        // Always attempt to remove local file
        try {
          await fs.unlink(req.file.path)
        } catch (_) {
          // Ignore cleanup errors
        }
      }

      // Create document record in workspace
      const documentRecord = {
        id: new Types.ObjectId().toString(),
        name: title,
        originalName: req.file.originalname,
        type: documentType,
        url: documentUrl,
        description: description || '',
        extractedText: extractedText,
        uploadedAt: new Date(),
        uploadedBy: req.user!.userId
      }

      // Update workspace with new document
      const updatedWorkspace = await models.Workspace.findByIdAndUpdate(
        workspace._id,
        {
          $push: {
            'settings.documents': documentRecord
          },
          updatedAt: new Date()
        },
        { new: true }
      )

      res.status(HttpStatusCode.Created).send({
        success: true,
        message: 'Document uploaded successfully',
        document: {
          id: documentRecord.id,
          name: documentRecord.name,
          type: documentRecord.type,
          url: documentRecord.url,
          description: documentRecord.description,
          uploadedAt: documentRecord.uploadedAt,
          hasExtractedText: extractedText.length > 0
        }
      })
      return
  } catch (error: unknown) {
    next(error)
  }
}

export async function getWorkspaceDocumentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Find user's workspace
    const workspace = await models.Workspace.findOne({
      ownerId: req.user!.userId,
      deletedAt: null
    })

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Workspace not found'
        })
        return
      }

      const documents = workspace.settings?.documents || []

      res.status(HttpStatusCode.Ok).send({
        success: true,
        message: 'Documents retrieved successfully',
        documents: documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          url: doc.url,
          description: doc.description,
          uploadedAt: doc.uploadedAt,
          hasExtractedText: (doc.extractedText && doc.extractedText.length > 0) || false
        }))
      })
      return
  } catch (error: unknown) {
    next(error)
  }
}

export async function deleteDocumentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { documentId } = req.params
    
    if (!documentId) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Document ID is required'
      })
      return
    }

    // Find user's workspace and remove document
    const workspace = await models.Workspace.findOneAndUpdate(
      {
        ownerId: req.user!.userId,
        deletedAt: null,
        'settings.documents.id': documentId
      },
        {
          $pull: {
            'settings.documents': { id: documentId }
          },
          updatedAt: new Date()
        },
        { new: true }
      )

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Document not found or access denied'
        })
        return
      }

      res.status(HttpStatusCode.Ok).send({
        success: true,
        message: 'Document deleted successfully'
      })
      return
  } catch (error: unknown) {
    next(error)
  }
}