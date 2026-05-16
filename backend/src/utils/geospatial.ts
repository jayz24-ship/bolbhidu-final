import { Post } from '../models/Post.js';

/**
 * Comprehensive geospatial health check utility
 */
export class GeospatialHealthCheck {
  
  /**
   * Verify geospatial index exists and is working
   */
  static async verifyIndex(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const indexes = await Post.collection.getIndexes();
      const has2dsphere = Object.keys(indexes).some(indexName => 
        indexes[indexName].some((field: any) => 
          field[0] === 'location' && field[1] === '2dsphere'
        )
      );
      
      if (!has2dsphere) {
        return {
          success: false,
          message: 'Missing 2dsphere index on location field',
          details: { availableIndexes: Object.keys(indexes) }
        };
      }
      
      // Test a simple geospatial query
      await Post.findOne({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [0, 0] },
            $maxDistance: 1000
          }
        }
      });
      
      return {
        success: true,
        message: 'Geospatial index verified and working correctly'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Geospatial index verification failed: ${error.message}`,
        details: error
      };
    }
  }
  
  /**
   * Find and report posts with invalid coordinates
   */
  static async findInvalidCoordinates(): Promise<{ 
    success: boolean; 
    invalidPosts: any[];
    suspiciousPosts: any[];
    summary: string;
  }> {
    try {
      // Find posts with [0,0] coordinates
      const zeroCoordPosts = await Post.find({ 
        'location.coordinates': [0, 0] 
      }).select('_id description locationName location authorId createdAt').limit(10);
      
      // Find posts with coordinates very close to [0,0] (suspicious)
      const suspiciousPosts = await Post.find({
        $and: [
          { 'location.coordinates.0': { $gt: -0.1, $lt: 0.1 } }, // lng close to 0
          { 'location.coordinates.1': { $gt: -0.1, $lt: 0.1 } }, // lat close to 0
          { 'location.coordinates': { $ne: [0, 0] } } // but not exactly [0,0]
        ]
      }).select('_id description locationName location authorId createdAt').limit(10);
      
      // Find posts with out-of-range coordinates
      const outOfRangePosts = await Post.find({
        $or: [
          { 'location.coordinates.0': { $lt: -180 } }, // lng < -180
          { 'location.coordinates.0': { $gt: 180 } },  // lng > 180
          { 'location.coordinates.1': { $lt: -90 } },  // lat < -90
          { 'location.coordinates.1': { $gt: 90 } }    // lat > 90
        ]
      }).select('_id description locationName location authorId createdAt').limit(10);
      
      const invalidPosts = [...zeroCoordPosts, ...outOfRangePosts];
      
      return {
        success: true,
        invalidPosts,
        suspiciousPosts,
        summary: `Found ${invalidPosts.length} invalid posts and ${suspiciousPosts.length} suspicious posts`
      };
    } catch (error: any) {
      return {
        success: false,
        invalidPosts: [],
        suspiciousPosts: [],
        summary: `Error checking coordinates: ${error.message}`
      };
    }
  }
  
  /**
   * Test geospatial query performance
   */
  static async testGeospatialQuery(lat: number, lng: number, radiusKm: number = 25): Promise<{
    success: boolean;
    queryTime: number;
    resultsCount: number;
    message: string;
  }> {
    try {
      const startTime = Date.now();
      
      const results = await Post.find({
        aiVerdict: 'accepted',
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radiusKm * 1000
          }
        }
      }).limit(10);
      
      const queryTime = Date.now() - startTime;
      
      return {
        success: true,
        queryTime,
        resultsCount: results.length,
        message: `Geospatial query completed in ${queryTime}ms, found ${results.length} posts within ${radiusKm}km`
      };
    } catch (error: any) {
      return {
        success: false,
        queryTime: -1,
        resultsCount: 0,
        message: `Geospatial query failed: ${error.message}`
      };
    }
  }
}

/**
 * Coordinate validation utilities
 */
export class CoordinateValidator {
  
  /**
   * Validate if coordinates are valid and not suspicious
   */
  static validate(lat: number, lng: number): {
    isValid: boolean;
    isSuspicious: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if coordinates are numbers
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      errors.push('Coordinates must be numbers');
    }
    
    // Check if coordinates are finite
    if (!isFinite(lat) || !isFinite(lng)) {
      errors.push('Coordinates must be finite numbers');
    }
    
    // Check coordinate ranges
    if (lat < -90 || lat > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
    
    if (lng < -180 || lng > 180) {
      errors.push('Longitude must be between -180 and 180');
    }
    
    // Check for [0,0] (invalid)
    if (lat === 0 && lng === 0) {
      errors.push('Coordinates [0,0] are invalid - location access may be disabled');
    }
    
    // Check for coordinates very close to [0,0] (suspicious)
    if (Math.abs(lat) < 0.1 && Math.abs(lng) < 0.1 && !(lat === 0 && lng === 0)) {
      warnings.push('Coordinates are suspiciously close to [0,0] - verify location accuracy');
    }
    
    // Check for common invalid patterns
    if (lat === lng) {
      warnings.push('Latitude and longitude are identical - this may be an error');
    }
    
    const isValid = errors.length === 0;
    const isSuspicious = warnings.length > 0;
    
    return { isValid, isSuspicious, errors, warnings };
  }
  
  /**
   * Calculate distance between two coordinates in kilometers
   */
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}