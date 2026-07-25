// backend/src/services/osrmService.js
const axios = require('axios');

class OSRMService {
  constructor() {
    this.servers = [
      'http://router.project-osrm.org',
      'https://routing.openstreetmap.de',
      'https://routing.ohsome.org'
    ];
    this.currentServerIndex = 0;
  }

  async calculateRoute(fromLat, fromLng, toLat, toLng) {
    try {
      if (!fromLat || !fromLng || !toLat || !toLng) {
        throw new Error('All coordinates are required');
      }

      console.log('[OSRM] 🗺️ Calculating route...');
      console.log('[OSRM] From:', fromLat, fromLng);
      console.log('[OSRM] To:', toLat, toLng);

      for (let i = 0; i < this.servers.length; i++) {
        const server = this.servers[i];
        try {
          console.log(`[OSRM] Trying server ${i + 1}: ${server}`);
          
          const response = await axios.get(
            `${server}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`,
            {
              params: {
                overview: 'full',
                geometries: 'geojson',
                steps: 'true'
              },
              timeout: 10000
            }
          );

          if (response.data.code === 'Ok' && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            const distance_km = Math.round((route.distance / 1000) * 100) / 100;
            const duration_minutes = Math.ceil(route.duration / 60);
            
            console.log(`[OSRM] ✅ Route found on server ${i + 1}:`, {
              distance_km,
              duration_minutes,
              server: server
            });

            return {
              distance_km: distance_km,
              duration_minutes: duration_minutes,
              geometry: route.geometry,
              summary: `OSRM route (${server})`,
              source: 'OSRM',
              isFallback: false,
              server: server
            };
          }
        } catch (error) {
          console.warn(`[OSRM] ❌ Server ${i + 1} failed:`, error.message);
          continue;
        }
      }

      console.warn('[OSRM] ⚠️ All OSRM servers failed');
      return null;
    } catch (error) {
      console.error('[OSRM] ❌ Error:', error.message);
      return null;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(
        `${this.servers[0]}/health`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new OSRMService();