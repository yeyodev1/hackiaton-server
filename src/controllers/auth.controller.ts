import type { Response, Request, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { Types } from 'mongoose'
import { HttpStatusCode } from 'axios'
import models from '../models'

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

export async function registerUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, companyName, country } = req.body

    // Validate required fields
    if (!name || !email || !password || !companyName || !country) {
      res.status(400).send({
        success: false,
        message: 'All fields are required'
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      res.status(400).send({
        success: false,
        message: 'Invalid email format'
      })
      return
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).send({
        success: false,
        message: 'Password must be at least 6 characters long'
      })
      return
    }

    // Check if user already exists
    const existingUser = await models.User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      res.status(409).send({
        success: false,
        message: 'User already exists with this email'
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

    const savedUser = await newUser.save()

    // Generate JWT token with proper typing
    const payload: JWTPayload = {
      userId: (savedUser._id as Types.ObjectId).toString(),
      email: savedUser.email
    }

    const signOptions: SignOptions = {
      expiresIn: JWT_EXPIRES_IN
    }

    const token = jwt.sign(payload, JWT_SECRET, signOptions)

    res.status(201).send({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: (savedUser._id as Types.ObjectId).toString(),
          name: savedUser.name,
          email: savedUser.email,
          companyName: savedUser.companyName,
          country: savedUser.country,
          createdAt: savedUser.createdAt,
          updatedAt: savedUser.updatedAt
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

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      res.status(401).send({
        success: false,
        message: 'Invalid credentials'
      })
      return
    }

    // Generate JWT token with proper typing
    const payload: JWTPayload = {
      userId: (user._id as Types.ObjectId).toString(),
      email: user.email
    }

    const signOptions: SignOptions = {
      expiresIn: JWT_EXPIRES_IN
    }

    const token = jwt.sign(payload, JWT_SECRET, signOptions)

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