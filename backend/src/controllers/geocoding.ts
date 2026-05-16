import { Request, Response } from 'express';
import { geocodeCityName } from '../services/geocoding.js';

/**
 * GET /geocoding/city?q=CityName
 * Convert city name to coordinates
 */
export async function geocodeCity(req: Request, res: Response) {
  const cityName = String(req.query.q || '').trim();
  
  if (!cityName) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'City name is required (query parameter: q)'
      }
    });
  }

  try {
    const result = await geocodeCityName(cityName);
    
    return res.json({
      city: result.city,
      lat: result.lat,
      lng: result.lng,
      displayName: result.displayName,
      country: result.country
    });
    
  } catch (error: any) {
    console.error('[Geocoding Controller] Error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
    }
    
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to geocode city name'
      }
    });
  }
}
