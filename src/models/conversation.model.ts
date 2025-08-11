import { Schema, model, Document, Types } from 'mongoose'

export interface IChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface IConversation extends Document {
  workspaceId: Types.ObjectId
  analysisId: Types.ObjectId
  userId: Types.ObjectId
  title: string
  messages: IChatMessage[]
  isActive: boolean
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}

const chatMessageSchema = new Schema<IChatMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false })

const conversationSchema = new Schema<IConversation>({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  analysisId: {
    type: Schema.Types.ObjectId,
    ref: 'DocumentAnalysis',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  messages: [chatMessageSchema],
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  lastMessageAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
})

// Indexes for optimization
conversationSchema.index({ workspaceId: 1 })
conversationSchema.index({ analysisId: 1 })
conversationSchema.index({ userId: 1 })
conversationSchema.index({ isActive: 1 })
conversationSchema.index({ lastMessageAt: -1 })

// Compound indexes
conversationSchema.index({ workspaceId: 1, analysisId: 1 })
conversationSchema.index({ userId: 1, isActive: 1, lastMessageAt: -1 })
conversationSchema.index({ analysisId: 1, userId: 1, isActive: 1 })

export const Conversation = model<IConversation>('Conversation', conversationSchema)