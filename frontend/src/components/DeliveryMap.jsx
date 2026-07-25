// frontend/src/components/DeliveryMap.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, X, Loader2, MapPin, Target, Compass, 
  Crosshair, Maximize2, Minimize2, Info, Phone,
  AlertTriangle, CheckCircle, Truck, Package, Clock,
  Route, Eye, EyeOff, Bike
} from 'lucide-react';
import toast from 'react-hot-toast';

const DeliveryMap = ({ 
  deliveries, 
  onClose, 
  onDeliverySelect,
  userLocation,
  isOpen 
}) => {
  const mapContainerId = 'delivery-map-container';
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [optimizingRoute, setOptimizingRoute] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [maplibregl, setMaplibregl] = useState(null);
  const isInitializedRef = useRef(false);
  const markersAddedRef = useRef(false);
  const routeOptimizedRef = useRef(false);

  // MapTiler API Key - Only for map tiles
  const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '';
  const hasValidApiKey = MAPTILER_API_KEY && MAPTILER_API_KEY !== '';

  // Filter: ONLY ASSIGNED and PICKED_UP deliveries
  const activeDeliveries = deliveries?.filter(d => 
    d.status === 'ASSIGNED' || d.status === 'PICKED_UP'
  ) || [];
  const activeCount = activeDeliveries.length;

  // Helper to get location from delivery
  const getDeliveryLocation = (delivery) => {
    if (delivery.location) {
      return {
        latitude: delivery.location.latitude,
        longitude: delivery.location.longitude
      };
    }
    if (delivery.latitude && delivery.longitude) {
      return {
        latitude: delivery.latitude,
        longitude: delivery.longitude
      };
    }
    if (delivery.order?.location) {
      return {
        latitude: delivery.order.location.latitude,
        longitude: delivery.order.location.longitude
      };
    }
    return null;
  };

  // Get distance between two points (Haversine formula)
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get route between two points using GraphHopper (Free, supports toll avoidance)
    const getRoute = async (startLat, startLng, endLat, endLng) => {
    try {
        // Get API key from environment or use default
        const GRAPHOPPER_API_KEY = import.meta.env.VITE_GRAPHOPPER_API_KEY || '31a038da-7c08-4347-8afe-98b51c458a12';
        
        // GraphHopper with toll avoidance
        const url = `https://graphhopper.com/api/1/route?point=${startLat},${startLng}&point=${endLat},${endLng}&vehicle=car&key=${GRAPHOPPER_API_KEY}&locale=en&elevation=false&optimize=true&debug=true&points_encoded=false&avoid=toll`;
        
        console.log('[Route] Fetching GraphHopper (toll-free)...');
        
        const response = await fetch(url);
        
        if (!response.ok) {
        console.warn('[Route] GraphHopper response not OK:', response.status);
        return getRouteOpenRouteService(startLat, startLng, endLat, endLng);
        }
        
        const data = await response.json();
        
        if (data && data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        const coordinates = path.points.coordinates.map(coord => [coord[0], coord[1]]);
        const distance = path.distance || 0;
        const duration = path.time / 1000 || 0;
        
        console.log('[Route] GraphHopper success! Distance:', distance, 'Duration:', duration);
        
        return {
            coordinates: coordinates,
            distance: distance,
            duration: duration
        };
        }
        console.warn('[Route] No routes found in GraphHopper response');
        return getRouteOpenRouteService(startLat, startLng, endLat, endLng);
    } catch (error) {
        console.error('[Route] GraphHopper Error:', error);
        return getRouteOpenRouteService(startLat, startLng, endLat, endLng);
    }
    };

  // Fallback: OpenRouteService with toll avoidance
  const getRouteOpenRouteService = async (startLat, startLng, endLat, endLng) => {
    try {
      const apiKey = '5b3ce3597851110001cf6248d847cfd67ed1e63a89d077c89c42564b';
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${startLng},${startLat}&end=${endLng},${endLat}&format=geojson&options={"avoid":"tolls"}`;
      
      console.log('[Route] Fallback to OpenRouteService...');
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('[Route] OpenRouteService response not OK:', response.status);
        return getRouteOSRM(startLat, startLng, endLat, endLng);
      }
      
      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        const feature = data.features[0];
        const coordinates = feature.geometry.coordinates;
        const distance = feature.properties?.summary?.distance || 0;
        const duration = feature.properties?.summary?.duration || 0;
        
        return {
          coordinates: coordinates,
          distance: distance,
          duration: duration
        };
      }
      return getRouteOSRM(startLat, startLng, endLat, endLng);
    } catch (error) {
      console.error('[Route] OpenRouteService Error:', error);
      return getRouteOSRM(startLat, startLng, endLat, endLng);
    }
  };

  // Final fallback: OSRM (no toll avoidance)
  const getRouteOSRM = async (startLat, startLng, endLat, endLng) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      console.log('[Route] Final fallback to OSRM');
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('[Route] OSRM response not OK:', response.status);
        // Last resort: direct line
        return {
          coordinates: [
            [startLng, startLat],
            [endLng, endLat]
          ],
          distance: getDistance(startLat, startLng, endLat, endLng) * 1000,
          duration: 0
        };
      }
      
      const data = await response.json();
      
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          coordinates: route.geometry.coordinates,
          distance: route.distance || 0,
          duration: route.duration || 0
        };
      }
      return null;
    } catch (error) {
      console.error('[Route] OSRM Error:', error);
      return null;
    }
  };

  // Optimize route using nearest neighbor algorithm
  const optimizeRoute = async (startCoords, deliveryPoints) => {
    if (!deliveryPoints || deliveryPoints.length === 0 || !mapRef.current || !maplibregl) {
      return;
    }

    if (optimizingRoute) {
      return;
    }

    setOptimizingRoute(true);
    toast.loading('Optimizing route...', { id: 'route-optimizing' });
    
    try {
      const sorted = [...deliveryPoints];
      const optimized = [];
      let currentPos = startCoords;

      while (sorted.length > 0) {
        let nearestIndex = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < sorted.length; i++) {
          const dist = getDistance(
            currentPos.lat, currentPos.lng,
            sorted[i].latitude, sorted[i].longitude
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIndex = i;
          }
        }

        const nearest = sorted.splice(nearestIndex, 1)[0];
        optimized.push(nearest);
        currentPos = { lat: nearest.latitude, lng: nearest.longitude };
      }

      await drawOptimizedRoute(startCoords, optimized);
      updateMarkerOrder(optimized);

      routeOptimizedRef.current = true;
      toast.success(`Route optimized for ${optimized.length} deliveries!`, { id: 'route-optimizing' });
    } catch (error) {
      console.error('Optimize error:', error);
      toast.error('Failed to optimize route', { id: 'route-optimizing' });
    } finally {
      setOptimizingRoute(false);
    }
  };

  // Draw optimized route with waypoints
  const drawOptimizedRoute = async (startCoords, waypoints) => {
    if (!mapRef.current || !maplibregl || waypoints.length === 0) return;

    try {
      // Remove existing route layers
      routeLayersRef.current.forEach(layerId => {
        if (mapRef.current && mapRef.current.getLayer(layerId)) {
          mapRef.current.removeLayer(layerId);
        }
      });
      routeLayersRef.current = [];

      if (mapRef.current && mapRef.current.getSource('route-source')) {
        mapRef.current.removeSource('route-source');
      }

      // Build route segments
      let allCoordinates = [];
      let currentPos = startCoords;

      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        console.log(`[DrawRoute] Getting route segment ${i+1}/${waypoints.length}`);
        
        const routeData = await getRoute(
          currentPos.lat, currentPos.lng,
          wp.latitude, wp.longitude
        );
        
        if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
          console.log(`[DrawRoute] Segment ${i+1} has ${routeData.coordinates.length} coordinates (toll-free)`);
          allCoordinates = allCoordinates.concat(routeData.coordinates);
        } else {
          console.warn(`[DrawRoute] Segment ${i+1} failed, using direct line`);
          // Fallback: direct line between points
          allCoordinates.push([currentPos.lng, currentPos.lat]);
          allCoordinates.push([wp.longitude, wp.latitude]);
        }
        currentPos = { lat: wp.latitude, lng: wp.longitude };
      }

      if (allCoordinates.length === 0) {
        console.warn('[DrawRoute] No coordinates to draw');
        return;
      }

      const geoJsonRoute = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: allCoordinates
        },
        properties: {}
      };

      const MapLibreGL = maplibregl;
      
      mapRef.current.addSource('route-source', {
        type: 'geojson',
        data: geoJsonRoute
      });

      // Glow layer
      const glowLayerId = 'route-layer-glow';
      mapRef.current.addLayer({
        id: glowLayerId,
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#93c5fd',
          'line-width': 12,
          'line-opacity': 0.2
        }
      });
      routeLayersRef.current.push(glowLayerId);

      // Main route layer
      const mainLayerId = 'route-layer-main';
      mapRef.current.addLayer({
        id: mainLayerId,
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.9
        }
      });
      routeLayersRef.current.push(mainLayerId);

      // Animated dashed layer
      const animatedLayerId = 'route-layer-animated';
      mapRef.current.addLayer({
        id: animatedLayerId,
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#60a5fa',
          'line-width': 6,
          'line-opacity': 0.3,
          'line-dasharray': [2, 4]
        }
      });
      routeLayersRef.current.push(animatedLayerId);

      // Fit bounds to show all route
      const bounds = new MapLibreGL.LngLatBounds();
      allCoordinates.forEach(coord => {
        bounds.extend([coord[0], coord[1]]);
      });
      mapRef.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 1000
      });

      console.log('[DrawRoute] Toll-free route drawn successfully!');

    } catch (error) {
      console.error('[DrawRoute] Error:', error);
    }
  };

  // Update marker order numbers
  const updateMarkerOrder = (optimizedDeliveries) => {
    const deliveryMarkers = markersRef.current.filter(m => m.type === 'delivery');
    const orderMap = {};
    optimizedDeliveries.forEach((d, index) => {
      orderMap[d.id] = index + 1;
    });

    deliveryMarkers.forEach(({ marker, data }) => {
      const orderNum = orderMap[data.id];
      if (orderNum) {
        const el = marker.getElement();
        const span = el.querySelector('span');
        if (span) {
          span.textContent = orderNum;
        }
      }
    });
  };

  // Load maplibre-gl dynamically
  useEffect(() => {
    if (!isOpen) return;
    
    const loadMapLibre = async () => {
      try {
        const module = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        setMaplibregl(module);
        console.log('[DeliveryMap] MapLibre loaded');
      } catch (error) {
        console.error('[DeliveryMap] Failed to load:', error);
        setError('Failed to load map library');
        setLoading(false);
      }
    };
    
    loadMapLibre();
  }, [isOpen]);

  // Initialize map - ONLY ONCE
  useEffect(() => {
    if (!isOpen || !maplibregl || mapInitialized || !hasValidApiKey) {
      return;
    }

    if (isInitializedRef.current) {
      console.log('[DeliveryMap] Already initialized, skipping');
      return;
    }

    console.log('[DeliveryMap] Initializing map...');
    setLoading(true);
    setError(null);
    isInitializedRef.current = true;

    const initMap = async () => {
      try {
        const MapLibreGL = maplibregl;
        const styleUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`;
        
        const mapInstance = new MapLibreGL.Map({
          container: mapContainerId,
          style: styleUrl,
          center: [79.8612, 6.9271],
          zoom: 11,
          attributionControl: false,
        });

        mapRef.current = mapInstance;

        mapInstance.on('load', () => {
          console.log('[DeliveryMap] Map loaded!');
          setLoading(false);
          setMapInitialized(true);

          mapInstance.addControl(new MapLibreGL.NavigationControl(), 'top-right');
          mapInstance.addControl(new MapLibreGL.AttributionControl(), 'bottom-right');

          if (userLocation) {
            addUserMarker(userLocation);
          }

          if (activeDeliveries && activeDeliveries.length > 0) {
            addDeliveryMarkers(activeDeliveries);
            
            setTimeout(() => {
              fitBounds();
              
              if (userLocation && activeDeliveries.length > 0) {
                setTimeout(() => {
                  handleOptimizeRoute();
                }, 1500);
              }
            }, 500);
          }
        });

        mapInstance.on('error', (e) => {
          console.error('[DeliveryMap] Map error:', e);
          if (e.error?.message) {
            const msg = e.error.message.toLowerCase();
            if (msg.includes('sprite') || msg.includes('image') || msg.includes('resource')) {
              return;
            }
          }
          setError('Failed to load map');
          setLoading(false);
        });

      } catch (error) {
        console.error('[DeliveryMap] Init error:', error);
        setError(error.message || 'Failed to initialize map');
        setLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
        markersRef.current = [];
        routeLayersRef.current = [];
        setMapInitialized(false);
        isInitializedRef.current = false;
        markersAddedRef.current = false;
        routeOptimizedRef.current = false;
      }
    };
  }, [isOpen, maplibregl, hasValidApiKey]);

  // Handle optimize route
  const handleOptimizeRoute = () => {
    if (!userLocation) {
      toast.error('Please enable location to optimize route');
      return;
    }

    if (activeDeliveries.length === 0) {
      toast.info('No active deliveries to optimize');
      return;
    }

    routeOptimizedRef.current = false;

    const deliveryPoints = activeDeliveries
      .map(d => {
        const loc = getDeliveryLocation(d);
        if (loc && loc.latitude && loc.longitude) {
          return {
            id: d.id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            delivery: d
          };
        }
        return null;
      })
      .filter(Boolean);

    if (deliveryPoints.length > 0) {
      optimizeRoute(userLocation, deliveryPoints);
    } else {
      toast.info('No deliveries with location data');
    }
  };

  // Fit bounds to show all markers
  const fitBounds = () => {
    if (!mapRef.current || !maplibregl) return;

    try {
      const MapLibreGL = maplibregl;
      const bounds = new MapLibreGL.LngLatBounds();
      let hasBounds = false;
      
      activeDeliveries.forEach(d => {
        const loc = getDeliveryLocation(d);
        if (loc && loc.latitude && loc.longitude) {
          bounds.extend([loc.longitude, loc.latitude]);
          hasBounds = true;
        }
      });
      
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
        hasBounds = true;
      }
      
      if (hasBounds && mapRef.current) {
        mapRef.current.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          duration: 1000
        });
      }
    } catch (e) {
      console.warn('Fit bounds error:', e);
    }
  };

  // Add user marker
  const addUserMarker = (location) => {
    if (!mapRef.current || !maplibregl) return;

    const MapLibreGL = maplibregl;
    const userEl = document.createElement('div');
    userEl.className = 'relative';
    userEl.innerHTML = `
      <div class="flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-30"></div>
        <div class="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    `;

    const marker = new MapLibreGL.Marker({
      element: userEl,
      anchor: 'center'
    })
      .setLngLat([location.lng, location.lat])
      .addTo(mapRef.current);

    markersRef.current.push({ type: 'user', marker, data: location });
  };

  // Add delivery markers
  const addDeliveryMarkers = (deliveries) => {
    if (!mapRef.current || !maplibregl) return;

    if (markersAddedRef.current) {
      return;
    }

    const MapLibreGL = maplibregl;

    deliveries.forEach((delivery, index) => {
      const loc = getDeliveryLocation(delivery);
      if (!loc || !loc.latitude || !loc.longitude) {
        return;
      }

      const statusColors = {
        'ASSIGNED': '#2563eb',
        'PICKED_UP': '#0ea5e9'
      };

      const color = statusColors[delivery.status] || '#6b7280';

      const markerEl = document.createElement('div');
      markerEl.className = 'flex items-center justify-center cursor-pointer';
      markerEl.innerHTML = `
        <div class="relative group">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white" 
               style="background-color: ${color}">
            <span class="text-xs text-white font-bold">${index + 1}</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
               style="border-top-color: ${color}"></div>
        </div>
      `;

      const marker = new MapLibreGL.Marker({
        element: markerEl,
        anchor: 'center'
      })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(mapRef.current);

      const customerName = delivery.order?.customer?.name || 'Customer';
      const address = delivery.order?.deliveryLocation || 'No address';
      const statusLabels = {
        'ASSIGNED': 'Assigned',
        'PICKED_UP': 'In Progress'
      };

      const popupHTML = `
        <div class="p-3 max-w-sm">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>
            <strong class="text-sm text-gray-900">${customerName}</strong>
          </div>
          <p class="text-xs text-gray-600">📍 ${address}</p>
          <p class="text-xs text-gray-500 mt-1">Order #${delivery.orderId}</p>
          <p class="text-xs mt-1"><span class="font-medium">Status:</span> ${statusLabels[delivery.status] || delivery.status}</p>
          ${delivery.refillCount > 0 ? `<p class="text-xs text-amber-600 mt-1">🔄 ${delivery.refillCount} empty bottles</p>` : ''}
          <button 
            onclick="window.handleDeliveryClick('${delivery.id}')"
            class="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Details
          </button>
        </div>
      `;

      const popup = new MapLibreGL.Popup({
        offset: 35,
        className: 'delivery-popup',
        closeButton: true
      })
        .setHTML(popupHTML)
        .setLngLat([loc.longitude, loc.latitude]);

      marker.setPopup(popup);

      marker.getElement().addEventListener('click', () => {
        if (onDeliverySelect) {
          onDeliverySelect(delivery);
        }
      });

      markersRef.current.push({ type: 'delivery', marker, data: delivery });
    });

    markersAddedRef.current = true;
    console.log('[DeliveryMap] Markers added:', deliveries.length);
  };

  // Update markers when deliveries change
  useEffect(() => {
    if (mapInitialized && activeDeliveries && activeDeliveries.length > 0 && !markersAddedRef.current) {
      markersRef.current.forEach(item => {
        if (item.type === 'delivery' && item.marker) {
          try { item.marker.remove(); } catch (e) {}
        }
      });
      markersRef.current = markersRef.current.filter(item => item.type === 'user');

      addDeliveryMarkers(activeDeliveries);
      setTimeout(fitBounds, 500);
    }
  }, [activeDeliveries, mapInitialized]);

  // Handle resize
  useEffect(() => {
    if (mapRef.current && mapInitialized && isOpen) {
      const resize = () => {
        try { mapRef.current.resize(); } catch (e) {}
      };
      setTimeout(resize, 200);
      setTimeout(resize, 600);
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
  }, [isOpen, mapInitialized]);

  // Clear route layers
  const clearRoute = () => {
    routeLayersRef.current.forEach(layerId => {
      if (mapRef.current && mapRef.current.getLayer(layerId)) {
        mapRef.current.removeLayer(layerId);
      }
    });
    routeLayersRef.current = [];
    if (mapRef.current && mapRef.current.getSource('route-source')) {
      mapRef.current.removeSource('route-source');
    }
    routeOptimizedRef.current = false;
    toast.success('Route cleared');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Active Deliveries</h3>
                <p className="text-xs text-gray-500">{activeCount} deliveries to complete</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* <button
                onClick={() => setShowMarkers(!showMarkers)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Toggle Markers"
              >
                {showMarkers ? <Eye size={18} className="text-gray-500" /> : <EyeOff size={18} className="text-gray-500" />}
              </button> */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative">
            <div 
              id={mapContainerId}
              className="h-[550px] w-full bg-gray-100"
              style={{ minHeight: '550px' }}
            />
            
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90">
                <Loader2 size={40} className="text-blue-600 animate-spin" />
                <p className="mt-3 text-sm text-gray-500">Loading map...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 p-6">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Map Unavailable</h3>
                <p className="text-sm text-gray-600 text-center max-w-md">{error}</p>
              </div>
            )}

            {/* Optimizing Route Overlay */}
            {optimizingRoute && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
                <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center gap-3">
                  <Loader2 size={32} className="text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-gray-700">Optimizing route...</p>
                  <p className="text-xs text-gray-400">Finding the most efficient path</p>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 rounded-xl shadow-lg p-3 border border-gray-100 z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-gray-600">Assigned</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <span className="text-gray-600">In Progress</span>
                </div>
                <div className="flex items-center gap-2 text-xs pt-1 border-t border-gray-100">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-gray-600">Your Location</span>
                </div>
              </div>
            </div>

            {/* Optimize Route Button */}
            {activeCount > 0 && userLocation && (
              <button
                onClick={handleOptimizeRoute}
                disabled={optimizingRoute}
                className="absolute bottom-4 right-4 bg-blue-600 text-white rounded-xl px-4 py-2.5 shadow-lg hover:bg-blue-700 transition-colors z-10 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Route size={18} />
                {optimizingRoute ? 'Optimizing...' : 'Best Route'}
              </button>
            )}

            {/* Clear Route Button */}
            {routeLayersRef.current.length > 0 && (
              <button
                onClick={clearRoute}
                className="absolute bottom-16 right-4 bg-red-500 text-white rounded-xl px-4 py-2 shadow-lg hover:bg-red-600 transition-colors z-10 flex items-center gap-2 text-sm font-medium"
              >
                <X size={16} />
                Clear Route
              </button>
            )}

            {/* No Active Deliveries Message */}
            {activeCount === 0 && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                <CheckCircle size={48} className="text-emerald-500 mb-3" />
                <p className="text-lg font-semibold text-gray-700">No Active Deliveries</p>
                <p className="text-sm text-gray-500">All deliveries are completed! 🎉</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-white">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const { latitude, longitude } = pos.coords;
                        if (mapRef.current) {
                          mapRef.current.flyTo({
                            center: [longitude, latitude],
                            zoom: 14,
                            duration: 1000
                          });
                          toast.success('Location found!');
                        }
                      },
                      () => toast.error('Unable to get location'),
                      { enableHighAccuracy: true, timeout: 10000 }
                    );
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Crosshair size={16} />
                My Location
              </button>

              <button
                onClick={fitBounds}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                <Compass size={16} />
                Fit All
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Bike size={14} />
              <span>{activeCount} remaining</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeliveryMap;