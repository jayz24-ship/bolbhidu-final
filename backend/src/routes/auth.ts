import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { login, register, loginWithGoogle, me, updateProfile, refreshToken } from '../controllers/auth.js';
const router = Router();

// Validation middleware
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be under 100 characters')
];

const validateGoogleAuth = [
  body('idToken').isString().notEmpty().withMessage('Google ID token is required')
];

const validateProfileUpdate = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1-100 characters'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be under 500 characters'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('Location must be under 100 characters'),
  body('avatar').optional().custom((value) => {
    // Allow empty string or valid URL
    if (value === '' || value === null || value === undefined) return true;
    // Check if it's a valid URL
    try {
      new URL(value);
      return true;
    } catch (e) {
      throw new Error('Avatar must be a valid URL');
    }
  })
];

router.post('/login', validateLogin, login);
router.post('/register', validateRegister, register);
router.post('/google', validateGoogleAuth, loginWithGoogle);
router.post('/refresh', requireAuth, refreshToken);
router.get('/me', requireAuth, me);
router.put('/profile', requireAuth, validateProfileUpdate, updateProfile);

export default router;
