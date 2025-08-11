import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import { HttpStatusCode } from 'axios'
import models from '../models'
import { GoogleDriveService } from '../services/googleDrive.service'
import { COUNTRIES_CONFIG, getCountryByKey, getAllCountries } from '../enums/country.enum'
import path from 'path'

// JWT Configuration
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key'
const GOOGLE_DRIVE_FOLDER_ID = '1XMOlJCE74sqDdv8rh7chl4YMlKfoAWPB'

// Interface for JWT payload
interface DecodedJWT {
  userId: string
  email: string
  iat: number
  exp: number
}

export async function getUserWorkspaceController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Access token required'
      })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedJWT
      
      // Find user's workspace
      const workspace = await models.Workspace.findOne({
        ownerId: decoded.userId,
        deletedAt: null
      }).populate('ownerId', 'name email')

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Workspace not found'
        })
        return
      }

      res.status(HttpStatusCode.Ok).send({
        success: true,
        message: 'Workspace retrieved successfully',
        workspace,
        availableCountries: getAllCountries()
      })
      return
    } catch (jwtError) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Invalid or expired token'
      })
      return
    }
  } catch (error: unknown) {
    console.error('Error in getUserWorkspaceController:', error)
    next(error)
  }
}

export async function updateWorkspaceCountryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    const { country } = req.body
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Access token required'
      })
      return
    }

    const selectedCountryInfo = getCountryByKey(country)
    
    if (!country || !selectedCountryInfo) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid country selection required',
        availableCountries: Object.keys(COUNTRIES_CONFIG)
      })
      return
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedJWT
      
      // Update workspace with selected country
      const workspace = await models.Workspace.findOneAndUpdate(
        {
          ownerId: decoded.userId,
          deletedAt: null
        },
        {
          'settings.country': {
            name: selectedCountryInfo.name,
            code: selectedCountryInfo.code
          },
          'settings.legalDocuments.constitution': selectedCountryInfo.legalDocuments.constitution,
          'settings.legalDocuments.organicCode': selectedCountryInfo.legalDocuments.organicCode,
          updatedAt: new Date()
        },
        { new: true }
      )

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Workspace not found'
        })
        return
      }

      res.status(HttpStatusCode.Ok).send({
        success: true,
        message: 'Workspace country updated successfully',
        workspace
      })
      return
    } catch (jwtError) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Invalid or expired token'
      })
      return
    }
  } catch (error: unknown) {
    console.error('Error in updateWorkspaceCountryController:', error)
    next(error)
  }
}

export async function uploadCompanyDocumentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Access token required'
      })
      return
    }

    if (!req.file) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Document file is required'
      })
      return
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedJWT
      
      // Find user's workspace
      const workspace = await models.Workspace.findOne({
        ownerId: decoded.userId,
        deletedAt: null
      })

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Workspace not found'
        })
        return
      }

      // Initialize Google Drive service
      const credentialsPath = path.join(process.cwd(), 'google-credentials.json')
      const driveService = new GoogleDriveService(credentialsPath, GOOGLE_DRIVE_FOLDER_ID)
      
      // Create workspace folder if it doesn't exist
      const workspaceFolderId = await driveService.ensureSubfolder(`workspace_${workspace._id}`)
      
      // Upload the document
      const fileName = `company_document_${Date.now()}_${req.file.originalname}`
      const documentUrl = await driveService.uploadFileToSubfolder(
        req.file.path,
        fileName,
        workspaceFolderId
      )

      // Update workspace with company document
      const updatedWorkspace = await models.Workspace.findByIdAndUpdate(
        workspace._id,
        {
          'settings.legalDocuments.companyDocument': {
            name: req.file.originalname,
            url: documentUrl,
            uploadedAt: new Date()
          },
          updatedAt: new Date()
        },
        { new: true }
      )

      res.status(HttpStatusCode.Ok).send({
        success: true,
        message: 'Company document uploaded successfully',
        document: {
          name: req.file.originalname,
          url: documentUrl
        },
        workspace: updatedWorkspace
      })
      return
    } catch (jwtError) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Invalid or expired token'
      })
      return
    }
  } catch (error: unknown) {
    console.error('Error in uploadCompanyDocumentController:', error)
    next(error)
  }
}

export async function completeWorkspaceSetupController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Access token required'
      })
      return
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedJWT
      
      // Find and update workspace to mark as fully configured
      const workspace = await models.Workspace.findOneAndUpdate(
        {
          ownerId: decoded.userId,
          deletedAt: null
        },
        {
          isFullyConfigured: true,
          status: 'active',
          updatedAt: new Date()
        },
        { new: true }
      )

      if (!workspace) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'Workspace not found'
        })
        return
      }

      res.status(HttpStatusCode.Ok).send({
        success: true,
        message: 'Workspace setup completed successfully',
        workspace
      })
      return
    } catch (jwtError) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Invalid or expired token'
      })
      return
    }
  } catch (error: unknown) {
    console.error('Error in completeWorkspaceSetupController:', error)
    next(error)
  }
}