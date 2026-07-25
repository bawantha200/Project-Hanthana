// frontend/src/components/MapView.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, X, Loader2, MapPin, Target, Compass, 
  Crosshair, Maximize2, Minimize2, Info, Phone,
  AlertTriangle, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const MapView = ({ 
  address, 
  latitude, 
  longitude, 
  onClose, 
  onLocationSelect,
  deliveryId,
  customerName,
  customerPhone,
  isOpen 
}) => {
  const mapContainerId = 'map-view-container-' + (deliveryId || 'default');
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  // MapTiler API Key
  const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '';
  const hasValidApiKey = MAPTILER_API_KEY && MAPTILER_API_KEY !== '';

  // Initialize map when isOpen becomes true
  useEffect(() => {
    if (!isOpen) {
      // Clean up when closed
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
        markerRef.current = null;
        setMapInitialized(false);
        setLoading(true);
      }
      return;
    }

    if (!hasValidApiKey) {
      setError('MapTiler API key is missing.');
      setLoading(false);
      return;
    }

    // Wait for the container to be in the DOM
    const initMap = async () => {
      // Wait for container to be rendered
      let container = document.getElementById(mapContainerId);
      let attempts = 0;
      const maxAttempts = 20;
      
      while (!container && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        container = document.getElementById(mapContainerId);
        attempts++;
        console.log(`[MapView] Attempt ${attempts}: Container found:`, !!container);
      }

      if (!container) {
        console.error('[MapView] Container not found after max attempts');
        setError('Map container not found');
        setLoading(false);
        return;
      }

      console.log('[MapView] Container found, initializing map...');
      
      try {
        setLoading(true);
        setError(null);

        console.log('[MapView] Loading maplibre-gl...');
        const maplibreglModule = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        
        const MapLibreGL = maplibreglModule.default || maplibreglModule;
        console.log('[MapView] maplibre-gl loaded');

        // Check container size
        const rect = container.getBoundingClientRect();
        console.log('[MapView] Container size:', rect.width, 'x', rect.height);

        // Coordinates - default to Colombo
        const centerLng = longitude || 79.8612;
        const centerLat = latitude || 6.9271;

        const styleUrl = `https://api.maptiler.com/maps/basic/style.json?key=${MAPTILER_API_KEY}`;
        
        console.log('[MapView] Creating map...');
        const mapInstance = new MapLibreGL.Map({
          container: container,
          style: styleUrl,
          center: [centerLng, centerLat],
          zoom: 14,
          attributionControl: false,
        });

        mapRef.current = mapInstance;

        mapInstance.on('load', () => {
          console.log('[MapView] Map loaded successfully!');
          setLoading(false);
          setMapInitialized(true);

          // Add controls
          try {
            mapInstance.addControl(new MapLibreGL.NavigationControl(), 'top-right');
            mapInstance.addControl(new MapLibreGL.AttributionControl(), 'bottom-right');
          } catch (e) {
            console.warn('Controls error:', e);
          }

          // Create marker
          const markerEl = document.createElement('div');
          markerEl.innerHTML = `
            <div class="relative">
              <div class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="absolute -inset-0.5 bg-red-500 rounded-full animate-ping opacity-40"></div>
            </div>
          `;

          markerRef.current = new MapLibreGL.Marker({
            element: markerEl,
            anchor: 'center'
          })
            .setLngLat([centerLng, centerLat])
            .addTo(mapInstance);

          // Popup
          const popupHTML = `
            <div class="p-3 max-w-xs">
              <strong class="text-sm">${customerName || 'Delivery'}</strong>
              ${address ? `<p class="text-xs text-gray-600 mt-1">📍 ${address}</p>` : ''}
              ${deliveryId ? `<p class="text-xs text-gray-400">Order: ${deliveryId}</p>` : ''}
              ${customerPhone ? `<p class="text-xs text-gray-500">📞 ${customerPhone}</p>` : ''}
            </div>
          `;

          const popup = new MapLibreGL.Popup({ offset: 25 })
            .setHTML(popupHTML)
            .setLngLat([centerLng, centerLat]);

          markerRef.current.setPopup(popup);
          markerRef.current.togglePopup();

          // Fly to location
          mapInstance.flyTo({
            center: [centerLng, centerLat],
            zoom: 15,
            duration: 1500
          });

          // Resize after everything
          setTimeout(() => {
            if (mapInstance) {
              try {
                mapInstance.resize();
              } catch (e) {}
            }
          }, 500);
        });

        mapInstance.on('error', (e) => {
          console.error('[MapView] Map error:', e);
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
        console.error('[MapView] Init error:', error);
        setError(error.message || 'Failed to initialize map');
        setLoading(false);
      }
    };

    initMap();

    return () => {
      console.log('[MapView] Cleaning up map...');
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
        markerRef.current = null;
        setMapInitialized(false);
      }
    };
  }, [isOpen, mapContainerId]);

  // Handle resize
  useEffect(() => {
    if (mapRef.current && mapInitialized && isOpen) {
      const resize = () => {
        try { 
          mapRef.current.resize(); 
          console.log('[MapView] Map resized');
        } catch (e) {}
      };
      setTimeout(resize, 200);
      setTimeout(resize, 600);
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
  }, [isOpen, mapInitialized]);

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
          className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <MapPin size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delivery Location</h3>
                <p className="text-xs text-gray-500">{deliveryId || 'Order'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Map Container - ALWAYS rendered, regardless of loading state */}
          <div className="relative">
            {/* The map container div is always rendered */}
            <div 
              id={mapContainerId}
              className="h-[450px] w-full bg-gray-100"
              style={{ minHeight: '450px' }}
            />
            
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90">
                <Loader2 size={40} className="text-blue-600 animate-spin" />
                <p className="mt-3 text-sm text-gray-500">Loading map...</p>
              </div>
            )}

            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 p-6">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Map Unavailable</h3>
                <p className="text-sm text-gray-600 text-center max-w-md">{error}</p>
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl">
                  Close
                </button>
              </div>
            )}

            {/* Info Panel */}
            {address && !loading && !error && mapInitialized && showInfo && (
              <div className="absolute top-4 left-4 bg-white/95 rounded-xl shadow-lg p-4 max-w-xs border border-gray-100 z-10">
                <div className="flex items-start gap-3">
                  <Info size={16} className="text-blue-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500">Delivery Details</p>
                    <p className="text-sm font-semibold text-gray-900">{customerName || 'Customer'}</p>
                    <p className="text-xs text-gray-600 mt-1">{address}</p>
                    {customerPhone && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Phone size={12} /> {customerPhone}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="absolute top-2 right-2 p-0.5 hover:bg-gray-100 rounded-full"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            )}

            {/* Status */}
            {!loading && !error && mapInitialized && (
              <div className="absolute top-4 right-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 shadow-lg z-10">
                <div className="flex items-center gap-2 text-xs text-emerald-700">
                  <CheckCircle size={12} />
                  <span>Map ready</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {!error && mapInitialized && (
            <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-white">
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
                              zoom: 16,
                              duration: 1000
                            });
                            if (markerRef.current) {
                              markerRef.current.setLngLat([longitude, latitude]);
                            }
                            toast.success('Location found!');
                          }
                        },
                        () => toast.error('Unable to get location'),
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  <Crosshair size={16} />
                  My Location
                </button>
              </div>

              <button
                onClick={() => {
                  const lat = latitude || 6.9271;
                  const lng = longitude || 79.8612;
                  window.open(`https://www.google.com/maps/dir//${lat},${lng}`, '_blank');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
              >
                <Navigation size={16} />
                Navigate
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MapView;