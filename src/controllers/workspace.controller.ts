import type { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { HttpStatusCode } from 'axios'
import models from '../models'
import { GoogleDriveService } from '../services/googleDrive.service'
import { COUNTRIES_CONFIG, getCountryByKey, getAllCountries } from '../enums/country.enum'
import path from 'path'

const GOOGLE_DRIVE_FOLDER_ID = '1XMOlJCE74sqDdv8rh7chl4YMlKfoAWPB'

export async function getUserWorkspaceController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Find user's workspace
    const workspace = await models.Workspace.findOne({
      ownerId: req.user!.userId,
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
  } catch (error: unknown) {
    console.error('Error in getUserWorkspaceController:', error)
    next(error)
  }
}

export async function updateWorkspaceCountryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { country } = req.body
    
    const selectedCountryInfo = getCountryByKey(country)
    
    if (!country || !selectedCountryInfo) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Valid country selection required',
        availableCountries: Object.keys(COUNTRIES_CONFIG)
      })
      return
    }
      
      // Generate file paths for legal documents based on selected country
      const basePath = path.join(process.cwd(), 'src', 'utils', country)
      const legalDocumentPaths = {
        constitution: country !== 'others' ? path.join(basePath, 'constitucion.pdf') : selectedCountryInfo.legalDocuments.constitution,
        procurementLaw: country !== 'others' ? path.join(basePath, 'ley_contrataciones.pdf') : selectedCountryInfo.legalDocuments.procurementLaw,
        procurementRegulation: country !== 'others' ? path.join(basePath, 'reglamento_ley_contrataciones.pdf') : selectedCountryInfo.legalDocuments.procurementRegulation,
        laborCode: selectedCountryInfo.legalDocuments.laborCode,
        authority: selectedCountryInfo.legalDocuments.authority
      }
      
      // Update workspace with selected country and file paths
      const workspace = await models.Workspace.findOneAndUpdate(
        {
          ownerId: req.user!.userId,
          deletedAt: null
        },
        {
          'settings.country': {
            name: selectedCountryInfo.name,
            code: selectedCountryInfo.code
          },
          'settings.legalDocuments.constitution': legalDocumentPaths.constitution,
          'settings.legalDocuments.procurementLaw': legalDocumentPaths.procurementLaw,
          'settings.legalDocuments.procurementRegulation': legalDocumentPaths.procurementRegulation,
          'settings.legalDocuments.laborCode': legalDocumentPaths.laborCode,
          'settings.legalDocuments.authority': legalDocumentPaths.authority,
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
        message: 'Workspace country updated successfully with legal documents',
        workspace,
        legalDocumentPaths: country !== 'others' ? {
          constitution: legalDocumentPaths.constitution,
          procurementLaw: legalDocumentPaths.procurementLaw,
          procurementRegulation: legalDocumentPaths.procurementRegulation
        } : null
      })
      return
  } catch (error: unknown) {
    console.error('Error in updateWorkspaceCountryController:', error)
    next(error)
  }
}

export async function uploadCompanyDocumentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Document file is required'
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
  } catch (error: unknown) {
    console.error('Error in uploadCompanyDocumentController:', error)
    next(error)
  }
}

export async function completeWorkspaceSetupController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Find and update workspace to mark as fully configured
    const workspace = await models.Workspace.findOneAndUpdate(
      {
        ownerId: req.user!.userId,
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
  } catch (error: unknown) {
    console.error('Error in completeWorkspaceSetupController:', error)
    next(error)
  }
}