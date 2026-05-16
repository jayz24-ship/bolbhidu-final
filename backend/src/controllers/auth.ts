import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { signAccessToken } from '../utils/jwt.js';
import { userToDTO } from '../utils/dto.js';
import { env } from '../config/env.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// Helper function to check validation errors
function checkValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`).join(', ');
    console.error('[Validation Error]', errors.array());
    res.status(400).json({ 
      error: { 
        code: 'VALIDATION_ERROR', 
        message: `Validation failed: ${errorMessages}`, 
        details: errors.array() 
      } 
    });
    return true;
  }
  return false;
}

export async function register(req: Request, res: Response) {
  if (checkValidationErrors(req, res)) return;
  
  const { email, password, name } = req.body || {};
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: { code: 'CONFLICT', message: 'Email already registered' } });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, name, passwordHash, role: 'user', reportCount: 0 });
  const token = signAccessToken({ sub: String(user._id), role: user.role });
  return res.json({ token, user: userToDTO(user) });
}

export async function login(req: Request, res: Response) {
  if (checkValidationErrors(req, res)) return;
  
  const { email, password } = req.body || {};
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
  const token = signAccessToken({ sub: String(user._id), role: user.role });
  return res.json({ token, user: userToDTO(user) });
}

export async function loginWithGoogle(req: Request, res: Response) {
  if (checkValidationErrors(req, res)) return;
  
  try {
    const { idToken } = req.body || {};

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({ 
      idToken, 
      audience: env.GOOGLE_CLIENT_ID 
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ 
        error: { code: 'UNAUTHORIZED', message: 'Invalid Google token' } 
      });
    }

    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture;

    // Check if user exists by email or googleId
    let user = await User.findOne({ 
      $or: [{ email }, { googleId }] 
    });

    if (!user) {
      // Create new user
      user = await User.create({
        email,
        name,
        avatarUrl,
        googleId,
        role: 'user',
        reportCount: 0
      });
    } else {
      // Update existing user's Google info if needed
      const updateData: any = {};
      if (!user.googleId && googleId) updateData.googleId = googleId;
      if (!user.avatarUrl && avatarUrl) updateData.avatarUrl = avatarUrl;
      if (!user.name || user.name === email.split('@')[0]) updateData.name = name;
      
      if (Object.keys(updateData).length > 0) {
        user = await User.findByIdAndUpdate(user._id, updateData, { new: true });
      }
    }

    if (!user) {
      return res.status(500).json({ 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create or update user' } 
      });
    }

    const token = signAccessToken({ sub: String(user._id), role: user.role });
    return res.json({ token, user: userToDTO(user) });
    
  } catch (error: any) {
    console.error('[Google OAuth] Error:', error);
    
    // Handle specific Google Auth errors
    if (error.message?.includes('Token used too late') || error.message?.includes('Token expired')) {
      return res.status(401).json({ 
        error: { code: 'TOKEN_EXPIRED', message: 'Google token has expired' } 
      });
    }
    
    if (error.message?.includes('Invalid token')) {
      return res.status(401).json({ 
        error: { code: 'INVALID_TOKEN', message: 'Invalid Google token' } 
      });
    }
    
    return res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'Google authentication failed' } 
    });
  }
}

export async function updateProfile(req: Request, res: Response) {
  if (checkValidationErrors(req, res)) return;
  
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  try {
    const { name, bio, location, avatar } = req.body || {};
    
    console.log('[Profile Update] User ID:', userId);
    console.log('[Profile Update] Request body:', { name, bio, location, avatar: avatar ? 'provided' : 'not provided' });
    
    const updateData: any = {};
    if (name !== undefined && name !== null) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (avatar !== undefined && avatar !== null) updateData.avatarUrl = avatar; // Database field is avatarUrl
    
    console.log('[Profile Update] Update data:', { ...updateData, avatarUrl: updateData.avatarUrl ? 'provided' : 'not provided' });
    
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    
    console.log('[Profile Update] Success for user:', user.email);
    
    return res.json({ user: userToDTO(user) });
  } catch (error: any) {
    console.error('[Profile Update] Error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' } });
  }
}

export async function me(req: Request, res: Response) {
  const authUser = (req as any).user?.doc;
  if (!authUser) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  
  return res.json({ token, user: userToDTO(authUser) });
}

export async function refreshToken(req: Request, res: Response) {
  const authUser = (req as any).user?.doc;
  if (!authUser) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  
  const token = signAccessToken({ sub: String(authUser._id), role: authUser.role });
  return res.json({ token, user: userToDTO(authUser) });
}
