import { Schema, model, Document, Types } from 'mongoose'

export interface IDocumentSection {
  legal: {
    guarantees: string[]
    penalties: string[]
    deadlines: string[]
    risks: string[]
    complianceScore: number
  }
  technical: {
    requirements: string[]
    materials: string[]
    processes: string[]
    timeline: string[]
    completenessScore: number
  }
  economic: {
    budget: string
    paymentTerms: string[]
    costs: string[]
    financialRisks: string[]
    economicScore: number
  }
}

export interface IRucValidation {
  ruc: string
  companyName: string
  isValid: boolean
  canPerformWork: boolean
  businessType: string
}

export interface IDocumentAnalysis extends Document {
  workspaceId: Types.ObjectId
  documentName: string
  documentType: 'pliego' | 'propuesta' | 'contrato'
  documentUrl?: string
  analysisDate: Date
  aiAnalysis: string // Raw AI response in markdown format
  rucValidation?: IRucValidation
  status: 'processing' | 'completed' | 'failed'
  processingTime?: number // in milliseconds
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const rucValidationSchema = new Schema<IRucValidation>({
  ruc: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  isValid: {
    type: Boolean,
    required: true
  },
  canPerformWork: {
    type: Boolean,
    required: true
  },
  businessType: {
    type: String,
    required: true
  }
}, { _id: false })

const documentSectionSchema = new Schema<IDocumentSection>({
  legal: {
    guarantees: [{
      type: String,
      required: true
    }],
    penalties: [{
      type: String,
      required: true
    }],
    deadlines: [{
      type: String,
      required: true
    }],
    risks: [{
      type: String,
      required: true
    }],
    complianceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    }
  },
  technical: {
    requirements: [{
      type: String,
      required: true
    }],
    materials: [{
      type: String,
      required: true
    }],
    processes: [{
      type: String,
      required: true
    }],
    timeline: [{
      type: String,
      required: true
    }],
    completenessScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    }
  },
  economic: {
    budget: {
      type: String,
      required: true
    },
    paymentTerms: [{
      type: String,
      required: true
    }],
    costs: [{
      type: String,
      required: true
    }],
    financialRisks: [{
      type: String,
      required: true
    }],
    economicScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    }
  }
}, { _id: false })

const documentAnalysisSchema = new Schema<IDocumentAnalysis>({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  documentName: {
    type: String,
    required: true,
    trim: true
  },
  documentType: {
    type: String,
    enum: ['pliego', 'propuesta', 'contrato'],
    required: true
  },
  documentUrl: {
    type: String,
    required: false
  },
  analysisDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  aiAnalysis: {
    type: String,
    required: true
  },
  rucValidation: {
    type: rucValidationSchema,
    required: false
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    required: true
  },
  processingTime: {
    type: Number,
    required: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
})

// Indexes for better query performance
documentAnalysisSchema.index({ workspaceId: 1 })
documentAnalysisSchema.index({ createdBy: 1 })
documentAnalysisSchema.index({ documentType: 1 })
documentAnalysisSchema.index({ status: 1 })
documentAnalysisSchema.index({ analysisDate: -1 })

// Compound indexes
documentAnalysisSchema.index({ workspaceId: 1, documentType: 1 })
documentAnalysisSchema.index({ workspaceId: 1, status: 1 })
documentAnalysisSchema.index({ workspaceId: 1, analysisDate: -1 })

export const DocumentAnalysis = model<IDocumentAnalysis>('DocumentAnalysis', documentAnalysisSchema)