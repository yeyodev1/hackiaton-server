import { Router } from 'express'
import {
  registerUserController,
  loginUserController,
  verifyUserController,
  verifyEmailController
} from '../controllers/auth.controller'

const router = Router()

// Authentication routes
router.post('/register', registerUserController)
router.post('/login', loginUserController)
router.get('/verify-email/:token', verifyEmailController)
router.get('/verify', verifyUserController)

export default router
