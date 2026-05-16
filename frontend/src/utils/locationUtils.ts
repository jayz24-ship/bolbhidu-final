/**
 * Location detection and geocoding utilities
 */

export interface LocationResult {
  success: boolean;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  error?: string;
}

export interface GeocodingResult {
  address: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  fullAddress: string;
}

/**
 * Get current location using browser's Geolocation API
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  if (!navigator.geolocation) {
    return {
      success: false,
      error: 'Geolocation is not supported by your browser'
    };
  }

  if (!window.isSecureContext) {
    return {
      success: false,
      error: 'Location detection requires HTTPS'
    };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    });

    const { latitude, longitude, accuracy } = position.coords;
    
    // Try to get human-readable address
    const geocodingResult = await reverseGeocode(latitude, longitude);
    
    return {
      success: true,
      location: geocodingResult.address,
      coordinates: {
        lat: latitude,
        lng: longitude,
        accuracy: accuracy
      }
    };
  } catch (error: any) {
    let errorMessage = 'Failed to detect location';
    
    if (error.code === 1) {
      errorMessage = 'Location permission denied';
    } else if (error.code === 2) {
      errorMessage = 'Location unavailable';
    } else if (error.code === 3) {
      errorMessage = 'Location request timed out';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Reverse geocode coordinates to human-readable address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
  try {
    // Use OpenStreetMap Nominatim (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'BolbhiduApp/1.0',
          'Accept-Language': 'en'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    const address = data.address;

    // Extract location components with fallbacks
    const area = address.suburb || 
                address.neighbourhood || 
                address.quarter || 
                address.residential ||
                address.hamlet ||
                address.locality;
                
    const city = address.city || 
                address.town || 
                address.village || 
                address.municipality ||
                address.county;
                
    const state = address.state || 
                 address.state_district || 
                 address.region;
                 
    const country = address.country;

    // Build location string with intelligent formatting
    let locationString = '';
    
    if (area && city) {
      locationString = `${area}, ${city}`;
      if (state) locationString += `, ${state}`;
    } else if (city) {
      locationString = city;
      if (state) locationString += `, ${state}`;
    } else if (area) {
      locationString = area;
      if (state) locationString += `, ${state}`;
    } else if (state && country) {
      locationString = `${state}, ${country}`;
    } else {
      // Fallback to first 3 parts of display name
      locationString = data.display_name.split(',').slice(0, 3).join(',').trim();
    }

    // If still empty, use coordinates
    if (!locationString) {
      locationString = `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
    }

    return {
      address: locationString,
      area,
      city,
      state,
      country,
      fullAddress: data.display_name
    };
  } catch (error) {
    console.error('[Geocoding] Reverse geocode failed:', error);
    
    // Return coordinates as fallback
    return {
      address: `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`,
      fullAddress: `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`
    };
  }
}

/**
 * Format location for display
 */
export function formatLocation(location: string): string {
  // Remove extra whitespace and clean up
  return location.trim().replace(/\s+/g, ' ');
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
}

/**
 * Get location from IP (fallback when GPS unavailable)
 */
export async function getLocationFromIP(): Promise<LocationResult> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    
    if (!response.ok) {
      throw new Error('IP geolocation failed');
    }

    const data = await response.json();
    
    // Build location string
    const locationParts = [data.city, data.region, data.country_name].filter(Boolean);
    const location = locationParts.join(', ');

    return {
      success: true,
      location: location || 'Unknown',
      coordinates: {
        lat: data.latitude,
        lng: data.longitude,
        accuracy: 5000 // IP-based location is less accurate (±5km)
      }
    };
  } catch (error) {
    console.error('[IP Geolocation] Failed:', error);
    return {
      success: false,
      error: 'Could not determine location from IP'
    };
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
