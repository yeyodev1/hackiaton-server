import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  companyName: string
  country: string
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Por favor ingresa un email válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
  },
  companyName: {
    type: String,
    required: [true, 'El nombre de la empresa es requerido'],
    trim: true,
    maxlength: [200, 'El nombre de la empresa no puede exceder 200 caracteres']
  },
  country: {
    type: String,
    required: [true, 'El país es requerido'],
    trim: true,
    enum: [
      'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica',
      'Cuba', 'Ecuador', 'El Salvador', 'Guatemala', 'Honduras', 'México',
      'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'República Dominicana',
      'Uruguay', 'Venezuela', 'España', 'Estados Unidos', 'Canadá', 'Otro'
    ]
  },
  isVerified: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
})

// Índices para optimizar consultas
userSchema.index({ email: 1 })
userSchema.index({ companyName: 1 })

export const User = model<IUser>('User', userSchema)
export default User