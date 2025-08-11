import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { HttpStatusCode } from 'axios'

// JWT Configuration
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key'

// Interface for JWT payload
export interface DecodedJWT {
  userId: string
  email: string
  iat: number
  exp: number
}

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: DecodedJWT
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
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
      req.user = decoded
      next()
    } catch (jwtError) {
      res.status(HttpStatusCode.Unauthorized).send({
        success: false,
        message: 'Invalid or expired token'
      })
      return
    }
  } catch (error: unknown) {
    next(error)
  }
}