// frontend/src/components/admin/DeliveryConfiguration.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  MapPin,
  DollarSign,
  TrendingUp,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
  Navigation,
  Crosshair,
  X,
  Search,
  Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getDeliveryFeeConfig, updateDeliveryFeeConfig } from '../../services/deliveryFeeService';

// MapTiler Configuration
const MAPTILER_CONFIG = {
  apiKey: import.meta.env.VITE_MAPTILER_API_KEY || '',
  styleUrl: 'https://api.maptiler.com/maps/basic/style.json',
  geocodingUrl: 'https://api.maptiler.com/geocoding',
};

export default function DeliveryConfiguration() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState({
    base_fee: 0,
    per_km_fee: 0,
    store_latitude: 0,
    store_longitude: 0,
    store_address: '',
    free_delivery_above: 0
  });
  const [originalConfig, setOriginalConfig] = useState(null);
  
  // Map states
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  
  const mapContainerId = 'store-location-map-container';
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInitAttempts = useRef(0);

  const maptilerApiKey = MAPTILER_CONFIG.apiKey;
  const hasValidApiKey = maptilerApiKey && maptilerApiKey !== '';

  useEffect(() => {
    fetchConfig();
  }, []);

  // Initialize map when picker opens
  useEffect(() => {
    if (showMapPicker && !mapLoaded && hasValidApiKey) {
      const timer = setTimeout(() => {
        initMap();
      }, 500);
      return () => clearTimeout(timer);
    }

    // Cleanup when modal closes
    if (!showMapPicker && mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {}
      mapRef.current = null;
      markerRef.current = null;
      setMapLoaded(false);
      setMapError(null);
    }
  }, [showMapPicker, hasValidApiKey]);

  const initMap = async () => {
    if (mapLoaded || mapRef.current) {
      console.log('[Map] Already initialized');
      return;
    }

    // Wait for container to be rendered
    let container = document.getElementById(mapContainerId);
    let attempts = 0;
    const maxAttempts = 20;
    
    while (!container && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 200));
      container = document.getElementById(mapContainerId);
      attempts++;
      console.log(`[Map] Attempt ${attempts}: Container found:`, !!container);
    }

    if (!container) {
      console.error('[Map] Container not found after max attempts');
      setMapError('Map container not found');
      return;
    }

    console.log('[Map] Container found, initializing map...');
    mapInitAttempts.current += 1;

    try {
      // Dynamically import maplibre
      const maplibreglModule = await import('maplibre-gl');
      await import('maplibre-gl/dist/maplibre-gl.css');
      
      const MapLibreGL = maplibreglModule.default || maplibreglModule;
      console.log('[Map] maplibre-gl loaded');

      // Coordinates - use store location or default to Colombo
      const centerLng = config.store_longitude || 79.8919;
      const centerLat = config.store_latitude || 7.0744;

      const styleUrl = `${MAPTILER_CONFIG.styleUrl}?key=${maptilerApiKey}`;
      
      console.log('[Map] Creating map...');
      const mapInstance = new MapLibreGL.Map({
        container: container,
        style: styleUrl,
        center: [centerLng, centerLat],
        zoom: 15,
        attributionControl: false,
      });

      mapRef.current = mapInstance;

      mapInstance.on('load', () => {
        console.log('[Map] Map loaded successfully!');
        setMapLoaded(true);
        setMapError(null);

        // Add controls
        try {
          mapInstance.addControl(new MapLibreGL.NavigationControl(), 'top-right');
          mapInstance.addControl(new MapLibreGL.AttributionControl(), 'bottom-right');
        } catch (e) {
          console.warn('Controls error:', e);
        }

        // Create draggable marker
        const markerEl = document.createElement('div');
        markerEl.innerHTML = `
          <div class="relative cursor-grab active:cursor-grabbing">
            <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="absolute -inset-0.5 bg-blue-600 rounded-full animate-ping opacity-40"></div>
          </div>
        `;

        markerRef.current = new MapLibreGL.Marker({
          element: markerEl,
          draggable: true,
          anchor: 'center'
        })
          .setLngLat([centerLng, centerLat])
          .addTo(mapInstance);

        // Handle marker drag
        markerRef.current.on('dragend', async () => {
          const lngLat = markerRef.current.getLngLat();
          await updateLocationFromCoords(lngLat.lat, lngLat.lng);
        });

        // Handle map click
        mapInstance.on('click', async (e) => {
          const { lat, lng } = e.lngLat;
          await updateLocationFromCoords(lat, lng);
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
        console.error('[Map] Map error:', e);
        if (e.error?.message) {
          const msg = e.error.message.toLowerCase();
          if (msg.includes('sprite') || msg.includes('image') || msg.includes('resource')) {
            return;
          }
        }
        setMapError('Failed to load map');
      });

    } catch (error) {
      console.error('[Map] Init error:', error);
      setMapError(error.message || 'Failed to initialize map');
    }
  };

  const updateLocationFromCoords = async (lat, lng) => {
    try {
      setIsGettingLocation(true);
      
      // Reverse geocode to get address using MapTiler + fallback
      const address = await reverseGeocode(lat, lng);
      
      setConfig(prev => ({
        ...prev,
        store_latitude: lat,
        store_longitude: lng,
        store_address: address || prev.store_address
      }));

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      }

      // Update map view
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: 15,
          essential: true
        });
      }

      toast.success('Location updated!');
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to get address for this location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      // Try MapTiler Geocoding first
      if (hasValidApiKey) {
        try {
          const response = await fetch(
            `${MAPTILER_CONFIG.geocodingUrl}/${lng},${lat}.json?key=${maptilerApiKey}&language=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              return data.features[0].place_name || null;
            }
          }
        } catch (e) {
          console.warn('MapTiler reverse geocode failed:', e.message);
        }
      }

      // Fallback: Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&accept-language=en`,
        {
          headers: { 'User-Agent': 'HanthanaWater/1.0' }
        }
      );
      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return null;
    }
  };

  const searchAddress = async (query) => {
    if (!query || query.trim().length < 3) {
      toast.error('Please enter at least 3 characters');
      return;
    }

    setIsGettingLocation(true);
    try {
      // Try MapTiler Geocoding first
      if (hasValidApiKey) {
        try {
          const response = await fetch(
            `${MAPTILER_CONFIG.geocodingUrl}/${encodeURIComponent(query)}.json?key=${maptilerApiKey}&limit=5&language=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              const feature = data.features[0];
              const lat = feature.geometry.coordinates[1];
              const lng = feature.geometry.coordinates[0];
              await updateLocationFromCoords(lat, lng);
              setSearchQuery('');
              return;
            }
          }
        } catch (e) {
          console.warn('MapTiler search failed:', e.message);
        }
      }

      // Fallback: Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        await updateLocationFromCoords(lat, lng);
        setSearchQuery('');
      } else {
        toast.error('Address not found. Please try a different search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search address');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }

    setIsGettingLocation(true);
    toast.loading('Getting your location...', { id: 'location-loading' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        toast.dismiss('location-loading');
        await updateLocationFromCoords(latitude, longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.dismiss('location-loading');
        let message = 'Unable to get your location';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location permission denied. Please allow location access in your browser settings.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        }
        toast.error(message);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await getDeliveryFeeConfig();
      if (response.success) {
        setConfig(response.data);
        setOriginalConfig(response.data);
      } else {
        toast.error('Failed to load delivery fee configuration');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: name === 'store_address' ? value : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (config.base_fee < 0) {
      toast.error('Base fee must be greater than or equal to 0');
      return;
    }
    if (config.per_km_fee < 0) {
      toast.error('Per KM fee must be greater than or equal to 0');
      return;
    }
    if (!config.store_latitude || !config.store_longitude) {
      toast.error('Store coordinates are required. Please set location using the map picker.');
      return;
    }

    try {
      setSaving(true);
      setSuccess(false);
      
      const response = await updateDeliveryFeeConfig(config);
      if (response.success) {
        setSuccess(true);
        setOriginalConfig(config);
        toast.success('Delivery fee configuration updated successfully!');
        setTimeout(() => setSuccess(false), 3000);
      } else {
        toast.error(response.message || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error(error.response?.data?.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!originalConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Delivery Fee Configuration</h2>
                <p className="text-xs sm:text-sm text-gray-500">Configure delivery fees based on distance</p>
              </div>
            </div>
            {success && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full whitespace-nowrap">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Saved successfully</span>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Fee Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Base Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Base Fee (Rs.)</span>
                </div>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs.</span>
                <input
                  type="number"
                  name="base_fee"
                  value={config.base_fee}
                  onChange={handleChange}
                  min="0"
                  step="10"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Base delivery charge</p>
            </div>

            {/* Per KM Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Per KM Fee (Rs.)</span>
                </div>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs.</span>
                <input
                  type="number"
                  name="per_km_fee"
                  value={config.per_km_fee}
                  onChange={handleChange}
                  min="0"
                  step="5"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Fee per kilometer</p>
            </div>

            {/* Free Delivery Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Free Delivery Above (Rs.)</span>
                </div>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs.</span>
                <input
                  type="number"
                  name="free_delivery_above"
                  value={config.free_delivery_above || 0}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Order total above this gets free delivery</p>
            </div>
          </div>

          {/* Store Location */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Store Location</span>
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {/* Store Address with Map Button */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>Store Address</span>
                  </div>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    name="store_address"
                    value={config.store_address || ''}
                    onChange={handleChange}
                    placeholder="e.g., 123 Main Street, Colombo, Sri Lanka"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 whitespace-nowrap text-sm"
                  >
                    <MapPin size={18} />
                    <span>Pick on Map</span>
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {config.store_latitude && config.store_longitude ? (
                    <span className="text-green-600 break-all">
                      📍 {config.store_latitude.toFixed(6)}, {config.store_longitude.toFixed(6)}
                    </span>
                  ) : (
                    <span className="text-amber-600">⚠️ No location set. Click "Pick on Map" to set.</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">How delivery fees are calculated</p>
              <p className="text-blue-600 mt-1 text-xs sm:text-sm">
                Delivery Fee = Base Fee + (Distance in KM × Per KM Fee)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={fetchConfig}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors order-2 sm:order-1"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving || !hasChanges()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Map Picker Modal - Using working approach from MapView */}
      <AnimatePresence>
        {showMapPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-2 sm:p-4"
            onClick={() => setShowMapPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Set Store Location</h3>
                    <p className="text-xs text-gray-500 hidden sm:block">Drag marker or click on map to set location</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMapPicker(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X size={18} className="sm:w-5 sm:h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* Search and Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex gap-2 flex-1">
                    <input
                      type="text"
                      placeholder="Search for an address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchAddress(searchQuery);
                        }
                      }}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                    />
                    <button
                      onClick={() => searchAddress(searchQuery)}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-1 sm:gap-2 text-sm whitespace-nowrap"
                    >
                      <Search size={16} className="sm:w-[18px] sm:h-[18px]" />
                      <span className="hidden sm:inline">Search</span>
                    </button>
                  </div>
                  <button
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 text-sm"
                  >
                    {isGettingLocation ? (
                      <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
                    ) : (
                      <Crosshair size={16} className="sm:w-[18px] sm:h-[18px]" />
                    )}
                    <span>Current</span>
                  </button>
                </div>

                {/* Map Container - Using working approach from MapView */}
                <div className="relative">
                  <div 
                    id={mapContainerId}
                    className="w-full h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
                    style={{ minHeight: '256px' }}
                  />
                  
                  {/* Loading overlay */}
                  {!mapLoaded && !mapError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 rounded-xl">
                      <Loader2 size={32} className="text-blue-600 animate-spin" />
                      <p className="mt-2 text-sm text-gray-500">Loading map...</p>
                    </div>
                  )}

                  {/* Error overlay */}
                  {mapError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 rounded-xl p-4">
                      <AlertCircle size={32} className="text-red-500 mb-2" />
                      <p className="text-sm text-gray-700 text-center">{mapError}</p>
                      <button
                        onClick={() => {
                          setMapError(null);
                          setMapLoaded(false);
                          initMap();
                        }}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-400 text-center">
                  Drag the marker or click on the map to set your store location
                </p>

                {/* Selected Location Info */}
                {config.store_latitude && config.store_longitude && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-sm font-medium text-green-800">Selected Location</p>
                    <p className="text-sm text-green-700 break-words">{config.store_address || 'Address not available'}</p>
                    <p className="text-xs text-green-600 mt-1 break-all">
                      📍 {config.store_latitude.toFixed(6)}, {config.store_longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowMapPicker(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (config.store_latitude && config.store_longitude) {
                      setShowMapPicker(false);
                      toast.success('Store location updated!');
                    } else {
                      toast.error('Please select a location first');
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm order-1 sm:order-2"
                >
                  Confirm Location
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}