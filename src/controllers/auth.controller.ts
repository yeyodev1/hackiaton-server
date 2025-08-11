import type { Response, Request, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import { HttpStatusCode } from 'axios'
import crypto from 'crypto'
import models from '../models'
import ResendEmail from '../services/resend.service'

// JWT Configuration with proper typing
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN: number = Number(process.env.JWT_EXPIRES_IN) || 7 * 24 * 60 * 60
const SALT_ROUNDS: number = 12

// Interface for JWT payload
interface JWTPayload {
  userId: string
  email: string
}

// Interface for decoded JWT
interface DecodedJWT extends JWTPayload {
  iat: number
  exp: number
}

// Helper function to get country code from country name
function getCountryCode(countryName: string): string {
  const countryMap: Record<string, string> = {
    'Ecuador': 'EC',
    'Perú': 'PE',
    'Colombia': 'CO',
    'México': 'MX',
    'Argentina': 'AR',
    'Bolivia': 'BO',
    'Brasil': 'BR',
    'Chile': 'CL',
    'Costa Rica': 'CR',
    'Cuba': 'CU',
    'El Salvador': 'SV',
    'Guatemala': 'GT',
    'Honduras': 'HN',
    'Nicaragua': 'NI',
    'Panamá': 'PA',
    'Paraguay': 'PY',
    'República Dominicana': 'DO',
    'Uruguay': 'UY',
    'Venezuela': 'VE',
    'España': 'ES',
    'Estados Unidos': 'US',
    'Canadá': 'CA'
  }
  return countryMap[countryName] || 'OT'
}

export async function registerUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, companyName, country } = req.body

    // Validate required fields
    if (!name || !email || !password || !companyName || !country) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Todos los campos son requeridos'
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Formato de email inválido'
      })
      return
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      })
      return
    }

    // Check if user already exists
    const existingUser = await models.User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      res.status(HttpStatusCode.Conflict).send({
        success: false,
        message: 'Ya existe un usuario con este email'
      })
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    // Create new user
    const newUser = new models.User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      companyName: companyName.trim(),
      country: country.trim()
    })

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Add verification token to user
    newUser.verificationToken = verificationToken
    newUser.verificationTokenExpires = verificationTokenExpires
    
    const savedUser = await newUser.save()

    // Create default workspace for the user
    const defaultWorkspace = new models.Workspace({
      name: companyName.trim(),
      companyId: savedUser._id,
      ownerId: savedUser._id,
      status: 'active',
      isFullyConfigured: false,
      members: [{
        userId: savedUser._id,
        role: 'owner'
      }],
      settings: {
        country: {
          name: country.trim(),
          code: getCountryCode(country.trim())
        },
        legalDocuments: {},
        analysisConfig: {
          riskThresholds: {
            legal: 0.7,
            technical: 0.7,
            financial: 0.8
          },
          scoringWeights: {
            compliance: 0.4,
            risk: 0.3,
            completeness: 0.3
          }
        },
        nlpSettings: {
          language: 'es',
          extractionRules: []
        }
      },
      usage: {
        documentCount: 0,
        analysisCount: 0
      },
      notifications: {}
    })

    const savedWorkspace = await defaultWorkspace.save()

    // Send verification email
    console.log('previo a enviar email')
    try {
      const emailService = new ResendEmail()
      await emailService.sendVerificationEmail(
        savedUser.name,
        savedUser.email,
        verificationToken
      )
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      // Don't fail registration if email fails, but log it
    }

    // Generate JWT token with proper typing
    const payload: JWTPayload = {
      userId: (savedUser._id as Types.ObjectId).toString(),
      email: savedUser.email
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.status(HttpStatusCode.Created).send({
      success: true,
      message: 'User registered successfully. Please verify your email to activate your account.',
      data: {
        user: {
          id: (savedUser._id as Types.ObjectId).toString(),
          name: savedUser.name,
          email: savedUser.email,
          companyName: savedUser.companyName,
          country: savedUser.country,
          isVerified: savedUser.isVerified,
          createdAt: savedUser.createdAt,
          updatedAt: savedUser.updatedAt
        },
        workspace: {
          id: (savedWorkspace._id as Types.ObjectId).toString(),
          name: savedWorkspace.name,
          isFullyConfigured: savedWorkspace.isFullyConfigured,
          status: savedWorkspace.status,
          country: savedWorkspace.settings.country
        },
        token
      }
    })
  } catch (error: unknown) {
    console.error('Error in registerUserController:', error)
    next(error)
  }
}

export async function loginUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body

    // Validate required fields
    if (!email || !password) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Email y contraseña son requeridos'
      })
      return
    }

    // Find user by email
    const user = await models.User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Credenciales inválidas'
      })
      return
    }

    // Check if user is verified
    if (!user.isVerified) {
      res.status(HttpStatusCode.Forbidden).send({
        success: false,
        message: 'Tu cuenta no está verificada. Por favor verifica tu email antes de iniciar sesión.'
      })
      return
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Credenciales inválidas'
      })
      return
    }

    // Generate JWT token with proper typing
    const payload: JWTPayload = {
      userId: (user._id as Types.ObjectId).toString(),
      email: user.email
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          id: (user._id as Types.ObjectId).toString(),
          name: user.name,
          email: user.email,
          companyName: user.companyName,
          country: user.country,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      }
    })
  } catch (error: unknown) {
    console.error('Error in loginUserController:', error)
    next(error)
  }
}

export async function verifyEmailController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.params

    if (!token) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Token de verificación requerido'
      })
      return
    }

    // Find user with verification token
    const user = await models.User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    })

    if (!user) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Token de verificación inválido o expirado'
      })
      return
    }

    // Update user as verified and remove verification token
    user.isVerified = true
    user.verificationToken = undefined
    user.verificationTokenExpires = undefined
    await user.save()

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
      data: {
        user: {
          id: (user._id as Types.ObjectId).toString(),
          name: user.name,
          email: user.email,
          companyName: user.companyName,
          country: user.country,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    })
    return
  } catch (error) {
    console.error('Error verifying email:', error)
    res.status(HttpStatusCode.InternalServerError).send({
      success: false,
      message: 'Error interno del servidor'
    })
    return
  }
}

export async function verifyUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    
    // Check if authorization header exists
    if (!authHeader) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Header de autorización es requerido'
      })
      return
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Header de autorización debe comenzar con Bearer'
      })
      return
    }

    // Extract token
    const token = authHeader.substring(7)
    if (!token) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Token es requerido'
      })
      return
    }

    try {
      // Verify and decode token
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedJWT
      
      // Find user in database
      const user = await models.User.findById(decoded.userId).select('-password')
      if (!user) {
        res.status(HttpStatusCode.Unauthorized).send({
          success: false,
          message: 'Usuario no encontrado'
        })
        return
      }

      res.status(HttpStatusCode.Ok).send({
        success: true,
        message: 'Token es válido',
        data: {
          user: {
            id: (user._id as Types.ObjectId).toString(),
            name: user.name,
            email: user.email,
            companyName: user.companyName,
            country: user.country,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          tokenInfo: {
            issuedAt: new Date(decoded.iat * 1000),
            expiresAt: new Date(decoded.exp * 1000)
          }
        }
      })
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError)
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Token inválido o expirado'
      })
      return
    }
  } catch (error: unknown) {
    console.error('Error in verifyUserController:', error)
    next(error)
  }
}

export async function deleteUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      
      // Verify user exists
      const user = await models.User.findById(decoded.userId)
      if (!user) {
        res.status(HttpStatusCode.NotFound).send({
          success: false,
          message: 'User not found'
        })
        return
      }

      // Send account deletion notification email
      const resendService = new ResendEmail()
      await resendService.sendAccountDeletionEmail(user.name, user.email)

      // Delete all user's workspaces (soft delete)
      await models.Workspace.updateMany(
        { 
          $or: [
            { ownerId: user._id },
            { companyId: user._id },
            { 'members.userId': user._id }
          ],
          deletedAt: null
        },
        { 
          deletedAt: new Date(),
          status: 'archived'
        }
      )

      // Delete the user
      await models.User.findByIdAndDelete(user._id)

      res.status(HttpStatusCode.Ok).send({
        success: true,
        message: 'User and all associated data deleted successfully'
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
    console.error('Error in deleteUserController:', error)
    next(error)
  }
}

// Temporary function for demo purposes - manually verify user
export async function manualVerifyController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.params

    if (!email) {
      res.status(HttpStatusCode.BadRequest).send({
        success: false,
        message: 'Email is required'
      })
      return
    }

    // Find user by email
    const user = await models.User.findOne({ email })

    if (!user) {
      res.status(HttpStatusCode.NotFound).send({
        success: false,
        message: 'User not found'
      })
      return
    }

    // Manually verify the user
    user.isVerified = true
    user.verificationToken = undefined
    user.verificationTokenExpires = undefined
    await user.save()

    res.status(HttpStatusCode.Ok).send({
      success: true,
      message: 'User manually verified successfully',
      data: {
        user: {
          id: (user._id as Types.ObjectId).toString(),
          name: user.name,
          email: user.email,
          companyName: user.companyName,
          country: user.country,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    })
    return
  } catch (error) {
    console.error('Error manually verifying user:', error)
    res.status(HttpStatusCode.InternalServerError).send({
      success: false,
      message: 'Internal server error'
    })
    return
  }
}