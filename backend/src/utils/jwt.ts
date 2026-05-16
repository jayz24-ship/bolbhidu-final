import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayloadBase {
  sub: string;
  role: 'user'|'admin';
}

export function signAccessToken(payload: JwtPayloadBase) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRE } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayloadBase {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayloadBase;
}
