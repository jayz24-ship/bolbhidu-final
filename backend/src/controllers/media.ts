import { Request, Response } from 'express';
import { getUploadSignature } from '../services/media.js';

export async function signature(_req: Request, res: Response) {
  const signatureData = getUploadSignature();
  return res.json(signatureData);
}
