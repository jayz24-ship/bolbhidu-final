import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

export function getUploadSignature() {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'bolbhidu-posts';
  
  // Parameters that will be sent to Cloudinary
  const params = {
    timestamp,
    folder,
  };
  
  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET);
  
  return { 
    timestamp, 
    signature,
    folder,
    api_key: env.CLOUDINARY_API_KEY,
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
  };
}
