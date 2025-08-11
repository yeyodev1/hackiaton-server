import { Schema, model, Document, Types } from 'mongoose'

export interface IWorkspaceMember {
  userId: Types.ObjectId
  role: 'owner' | 'admin' | 'analyst' | 'viewer'
}

export interface IWorkspaceUsage {
  documentCount: number
  analysisCount: number
}

export interface IWorkspaceNotifications {
  webhookUrl?: string
}

export interface IWorkspaceDocument {
  id: string
  name: string
  originalName: string
  type: 'contract' | 'pliego' | 'propuesta'
  url: string
  description: string
  extractedText: string
  uploadedAt: Date
  uploadedBy: string
}

export interface IWorkspaceSettings {
  country: {
    name: string
    code: string
  }
  documents?: IWorkspaceDocument[] // User uploaded documents
  legalDocuments: {
    constitution?: string // URL or file path to country constitution
    procurementLaw?: string // URL or file path to procurement law
    procurementRegulation?: string // URL or file path to procurement regulation
    laborCode?: string // URL or file path to labor code
    authority?: string // Regulatory authority
    companyDocument?: {
      name: string
      url: string
      uploadedAt: Date
    } // Company uploaded document
  }
  analysisConfig: {
    riskThresholds: {
      legal: number
      technical: number
      financial: number
    }
    scoringWeights: {
      compliance: number
      risk: number
      completeness: number
    }
  }
  nlpSettings: {
    language: 'es' | 'en'
    extractionRules: string[]
  }
}

export interface IWorkspace extends Document {
  name: string
  companyId: Types.ObjectId
  ownerId: Types.ObjectId
  status: 'active' | 'paused' | 'archived'
  isFullyConfigured: boolean
  members: IWorkspaceMember[]
  settings: IWorkspaceSettings
  usage: IWorkspaceUsage
  notifications: IWorkspaceNotifications
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'analyst', 'viewer'],
    required: true,
    default: 'viewer'
  }
}, { _id: false })

const workspaceUsageSchema = new Schema<IWorkspaceUsage>({
  documentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  analysisCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false })

const workspaceNotificationsSchema = new Schema<IWorkspaceNotifications>({
  webhookUrl: {
    type: String,
    required: false,
    match: [/^https?:\/\/.+/, 'Please provide a valid webhook URL']
  }
}, { _id: false })

const workspaceDocumentSchema = new Schema<IWorkspaceDocument>({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['contract', 'pliego', 'propuesta'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  extractedText: {
    type: String,
    default: ''
  },
  uploadedAt: {
    type: Date,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  }
}, { _id: false })

const workspaceSettingsSchema = new Schema<IWorkspaceSettings>({
  country: {
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true
    }
  },
  documents: [workspaceDocumentSchema],
  legalDocuments: {
    constitution: {
      type: String,
      required: false
    },
    procurementLaw: {
      type: String,
      required: false
    },
    procurementRegulation: {
      type: String,
      required: false
    },
    laborCode: {
      type: String,
      required: false
    },
    authority: {
      type: String,
      required: false
    },
    companyDocument: {
      name: {
        type: String,
        required: false
      },
      url: {
        type: String,
        required: false
      },
      uploadedAt: {
        type: Date,
        required: false
      }
    }
  },
  analysisConfig: {
    riskThresholds: {
      legal: {
        type: Number,
        default: 0.7,
        min: 0,
        max: 1
      },
      technical: {
        type: Number,
        default: 0.7,
        min: 0,
        max: 1
      },
      financial: {
        type: Number,
        default: 0.8,
        min: 0,
        max: 1
      }
    },
    scoringWeights: {
      compliance: {
        type: Number,
        default: 0.4,
        min: 0,
        max: 1
      },
      risk: {
        type: Number,
        default: 0.3,
        min: 0,
        max: 1
      },
      completeness: {
        type: Number,
        default: 0.3,
        min: 0,
        max: 1
      }
    }
  },
  nlpSettings: {
    language: {
      type: String,
      enum: ['es', 'en'],
      default: 'es'
    },
    extractionRules: [{
      type: String
    }]
  }
}, { _id: false })

const workspaceSchema = new Schema<IWorkspace>({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    maxlength: [200, 'Workspace name cannot exceed 200 characters']
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'archived'],
    default: 'active',
    required: true
  },
  isFullyConfigured: {
    type: Boolean,
    default: false,
    required: true
  },
  members: [workspaceMemberSchema],
  settings: {
    type: workspaceSettingsSchema,
    required: true
  },
  usage: {
    type: workspaceUsageSchema,
    default: () => ({ documentCount: 0, analysisCount: 0 })
  },
  notifications: {
    type: workspaceNotificationsSchema,
    default: () => ({})
  },
  deletedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true,
  versionKey: false
})

// Indexes for optimization
workspaceSchema.index({ companyId: 1 })
workspaceSchema.index({ ownerId: 1 })
workspaceSchema.index({ status: 1 })
workspaceSchema.index({ 'members.userId': 1 })
workspaceSchema.index({ deletedAt: 1 })

// Compound index for active workspaces by company
workspaceSchema.index({ companyId: 1, status: 1, deletedAt: 1 })

export const Workspace = model<IWorkspace>('Workspace', workspaceSchema)