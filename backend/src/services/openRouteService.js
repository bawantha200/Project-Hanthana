// backend/src/services/openRouteService.js
const axios = require('axios');
const osrmService = require('./osrmService');

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE_URL = 'https://api.openrouteservice.org';

class OpenRouteService {
  constructor() {
    this.apiKey = ORS_API_KEY;
    this.headers = {
      'Authorization': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  calculateHaversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  async geocode(address) {
    try {
      if (!address || address.trim().length === 0) {
        throw new Error('Address is required');
      }

      console.log('[geocode] 🌍 Geocoding address:', address);

      // Clean address for better geocoding
      const cleanAddress = address
        .replace(/District/g, '')
        .replace(/Province/g, '')
        .replace(/North Western/g, 'NW')
        .trim();

      // Try OpenRouteService first
      try {
        const response = await axios.get(`${ORS_BASE_URL}/geocode/search`, {
          params: {
            text: cleanAddress,
            size: 1,
            'boundary.country': 'LK',
            'lang': 'en'
          },
          headers: this.headers,
          timeout: 10000
        });

        if (response.data.features && response.data.features.length > 0) {
          const feature = response.data.features[0];
          const [longitude, latitude] = feature.geometry.coordinates;
          
          const result = {
            latitude,
            longitude,
            formatted_address: feature.properties.label || address
          };
          
          console.log('[geocode] ✅ ORS result:', result);
          return result;
        }
      } catch (e) {
        console.warn('[geocode] ORS failed:', e.message);
      }

      // Fallback: Try Nominatim
      console.log('[geocode] 🔄 Falling back to Nominatim...');
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanAddress)}&format=json&limit=1&countrycodes=lk`,
        {
          headers: { 'User-Agent': 'HanthanaWater/1.0' }
        }
      );
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData && fallbackData.length > 0) {
        const result = {
          latitude: parseFloat(fallbackData[0].lat),
          longitude: parseFloat(fallbackData[0].lon),
          formatted_address: fallbackData[0].display_name || address
        };
        console.log('[geocode] ✅ Nominatim result:', result);
        return result;
      }

      throw new Error(`Address not found: "${address}"`);
    } catch (error) {
      console.error('[geocode] ❌ Error:', error.message);
      throw new Error(`Failed to geocode address: ${error.message}`);
    }
  }

  async calculateRoute(fromLat, fromLng, toLat, toLng) {
    try {
      if (!fromLat || !fromLng || !toLat || !toLng) {
        throw new Error('All coordinates are required');
      }

      console.log('[calculateRoute] 🗺️ From:', fromLat, fromLng);
      console.log('[calculateRoute] 🗺️ To:', toLat, toLng);

      // PRIMARY: Try OSRM first (free, no API key needed)
      console.log('[calculateRoute] 🔄 Trying OSRM (primary)...');
      const osrmResult = await osrmService.calculateRoute(fromLat, fromLng, toLat, toLng);
      
      if (osrmResult) {
        console.log('[calculateRoute] ✅ OSRM route found:', {
          distance_km: osrmResult.distance_km,
          duration_minutes: osrmResult.duration_minutes
        });
        return {
          ...osrmResult,
          isFallback: false,
          source: 'OSRM'
        };
      }

      // SECONDARY: Try OpenRouteService
      console.log('[calculateRoute] 🔄 Trying OpenRouteService (secondary)...');
      const orsResult = await this.tryORS(fromLat, fromLng, toLat, toLng);
      if (orsResult) {
        console.log('[calculateRoute] ✅ ORS route found:', orsResult);
        return {
          ...orsResult,
          isFallback: true,
          source: 'OpenRouteService',
          fallbackReason: 'OSRM failed'
        };
      }

      // FINAL FALLBACK: Haversine
      console.log('[calculateRoute] ⚠️ All services failed, using Haversine fallback...');
      const distance_km = this.calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
      const duration_minutes = Math.ceil(distance_km * 2);
      
      return {
        distance_km: Math.round(distance_km * 100) / 100,
        duration_minutes: duration_minutes,
        geometry: null,
        summary: 'Estimated distance (straight-line)',
        isFallback: true,
        source: 'Haversine',
        fallbackReason: 'All routing services failed'
      };
    } catch (error) {
      console.error('[calculateRoute] ❌ Error:', error.message);
      const distance_km = this.calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
      return {
        distance_km: Math.round(distance_km * 100) / 100,
        duration_minutes: Math.ceil(distance_km * 2),
        geometry: null,
        summary: 'Emergency fallback (straight-line)',
        isFallback: true,
        source: 'Emergency',
        fallbackReason: error.message
      };
    }
  }

  async tryORS(fromLat, fromLng, toLat, toLng) {
    try {
      const profiles = ['driving-car', 'driving-hgv'];
      
      for (const profile of profiles) {
        try {
          const response = await axios.post(
            `${ORS_BASE_URL}/v2/directions/${profile}`,
            {
              coordinates: [
                [fromLng, fromLat],
                [toLng, toLat]
              ],
              format: 'json'
            },
            { 
              headers: this.headers,
              timeout: 15000
            }
          );

          if (response.data.features && response.data.features.length > 0) {
            const feature = response.data.features[0];
            const segments = feature.properties.segments[0];
            
            return {
              distance_km: Math.round((segments.distance / 1000) * 100) / 100,
              duration_minutes: Math.ceil(segments.duration / 60),
              geometry: feature.geometry,
              summary: feature.properties.summary,
              profile: profile
            };
          }
        } catch (error) {
          console.warn(`[ORS] ${profile} failed:`, error.message);
        }
      }
      return null;
    } catch (error) {
      console.error('[ORS] Error:', error.message);
      return null;
    }
  }

  async calculateDeliveryFee(fromAddress, toAddress, feeConfig, orderTotal = 0) {
    try {
      console.log('[calculateDeliveryFee] 🚚 From:', fromAddress);
      console.log('[calculateDeliveryFee] 📦 To:', toAddress);
      
      if (feeConfig.free_delivery_above && orderTotal >= feeConfig.free_delivery_above) {
        console.log('[calculateDeliveryFee] 🎉 Free delivery');
        return {
          distance_km: 0,
          duration_minutes: 0,
          delivery_fee: 0,
          from: null,
          to: null,
          message: 'Free delivery (order above threshold)'
        };
      }

      // Geocode both addresses
      console.log('[calculateDeliveryFee] 🌍 Geocoding...');
      const from = await this.geocode(fromAddress);
      const to = await this.geocode(toAddress);

      // Calculate route (OSRM with fallback)
      const route = await this.calculateRoute(
        from.latitude, from.longitude,
        to.latitude, to.longitude
      );

      // Calculate fee
      const delivery_fee = feeConfig.base_fee + (feeConfig.per_km_fee * route.distance_km);
      const rounded_fee = Math.round(delivery_fee * 100) / 100;

      const result = {
        distance_km: route.distance_km,
        duration_minutes: route.duration_minutes,
        delivery_fee: rounded_fee,
        from: from,
        to: to,
        source: route.source || 'Unknown',
        isFallback: route.isFallback || false,
        message: route.isFallback 
          ? `Estimated distance (${route.distance_km.toFixed(1)}km) - using ${route.source || 'fallback'}`
          : `Calculated using ${route.source || 'routing'} service (${route.distance_km.toFixed(1)}km)`
      };

      console.log('[calculateDeliveryFee] ✅ Final result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('[calculateDeliveryFee] ❌ Error:', error);
      return {
        distance_km: 0,
        duration_minutes: 0,
        delivery_fee: feeConfig.base_fee || 350,
        from: null,
        to: null,
        message: 'Using default delivery fee (calculation failed)'
      };
    }
  }
}

module.exports = new OpenRouteService();