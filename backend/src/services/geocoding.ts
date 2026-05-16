/**
 * Geocoding service - Convert city names to coordinates
 */

interface GeocodeResult {
  city: string;
  lat: number;
  lng: number;
  displayName: string;
  country: string;
}

/**
 * Geocode city name to coordinates using OpenStreetMap Nominatim (free, no API key)
 */
export async function geocodeCityName(cityName: string): Promise<GeocodeResult> {
  const trimmedCity = cityName.trim();
  
  if (!trimmedCity) {
    throw new Error('City name is required');
  }

  console.log(`[Geocoding] Looking up coordinates for: "${trimmedCity}"`);

  try {
    // Use Nominatim API (free, no API key needed)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(trimmedCity)}&` +
      `format=json&` +
      `limit=1&` +
      `addressdetails=1`,
      {
        headers: {
          'User-Agent': 'BolbhiduApp/1.0',
          'Accept-Language': 'en'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error(`City "${trimmedCity}" not found`);
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates received from geocoding service');
    }

    console.log(`[Geocoding] ✅ Found: ${result.display_name} at [${lat}, ${lng}]`);

    return {
      city: result.address?.city || result.address?.town || result.address?.village || trimmedCity,
      lat,
      lng,
      displayName: result.display_name,
      country: result.address?.country || ''
    };

  } catch (error: any) {
    console.error(`[Geocoding] ❌ Error:`, error.message);
    throw new Error(`Failed to geocode city: ${error.message}`);
  }
}

/**
 * Validate coordinates are within valid ranges
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
