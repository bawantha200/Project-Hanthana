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
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  const [isMapInitializing, setIsMapInitializing] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapContainer = useRef(null);
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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showMapPicker, hasValidApiKey]);

  const initMap = () => {
    if (isMapInitializing) return;
    
    if (!mapContainer.current) {
      setTimeout(() => initMap(), 200);
      return;
    }

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        console.warn('Error removing existing map:', e);
      }
      mapRef.current = null;
      markerRef.current = null;
    }

    setIsMapInitializing(true);
    mapInitAttempts.current += 1;
    console.log(`[initMap] Initializing map (attempt ${mapInitAttempts.current})...`);

    try {
      const style = `${MAPTILER_CONFIG.styleUrl}?key=${maptilerApiKey}`;
      
      const centerLng = config.store_longitude || 79.8919;
      const centerLat = config.store_latitude || 7.0744;
      
      mapRef.current = new maplibregl.Map({
        container: mapContainer.current,
        style: style,
        center: [centerLng, centerLat],
        zoom: 15,
        attributionControl: false,
        fadeDuration: 0,
        interactive: true,
        preserveDrawingBuffer: true,
      });

      if (mapRef.current.setMissingStyleImageResolver) {
        mapRef.current.setMissingStyleImageResolver(() => null);
      }

      mapRef.current.on('load', () => {
        console.log('[MapLibre] Map loaded successfully');
        try {
          mapRef.current.addControl(new maplibregl.AttributionControl(), 'bottom-right');
          mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

          // Add marker
          markerRef.current = new maplibregl.Marker({
            draggable: true,
            color: '#2563eb'
          })
            .setLngLat([centerLng, centerLat])
            .addTo(mapRef.current);

          // Handle marker drag
          markerRef.current.on('dragend', async () => {
            const lngLat = markerRef.current.getLngLat();
            await updateLocationFromCoords(lngLat.lat, lngLat.lng);
          });

          // Handle map click
          mapRef.current.on('click', async (e) => {
            const { lat, lng } = e.lngLat;
            await updateLocationFromCoords(lat, lng);
          });

          setMapLoaded(true);
          setIsMapInitializing(false);
          console.log('[MapLibre] Map fully initialized');
        } catch (error) {
          console.error('[MapLibre] Error adding controls/marker:', error);
          setIsMapInitializing(false);
        }
      });

      mapRef.current.on('error', (e) => {
        if (e.error && e.error.message) {
          const msg = e.error.message.toLowerCase();
          if (msg.includes('sprite') || msg.includes('image') || msg.includes('could not load') || msg.includes('resource')) {
            return;
          }
          console.error('[MapLibre] Map error:', e);
        }
        setIsMapInitializing(false);
      });

    } catch (error) {
      console.error('[MapLibre] Failed to initialize map:', error);
      setIsMapInitializing(false);
      toast.error('Failed to load map. Please try again.');
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
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Delivery Fee Configuration</h2>
                <p className="text-sm text-gray-500">Configure delivery fees based on distance</p>
              </div>
            </div>
            {success && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span>Saved successfully</span>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Fee Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Base Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  Base Fee (Rs.)
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Base delivery charge</p>
            </div>

            {/* Per KM Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  Per KM Fee (Rs.)
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Fee per kilometer</p>
            </div>

            {/* Free Delivery Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-gray-400" />
                  Free Delivery Above (Rs.)
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Order total above this gets free delivery</p>
            </div>
          </div>

          {/* Store Location */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Store Location
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Store Address with Map Button */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    Store Address
                  </div>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="store_address"
                    value={config.store_address || ''}
                    onChange={handleChange}
                    placeholder="e.g., 123 Main Street, Colombo, Sri Lanka"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 whitespace-nowrap"
                  >
                    <MapPin size={18} />
                    Pick on Map
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {config.store_latitude && config.store_longitude ? (
                    <span className="text-green-600">
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
              <p className="text-blue-600 mt-1">
                Delivery Fee = Base Fee + (Distance in KM × Per KM Fee)
              </p>
              {/* <p className="text-blue-600 text-xs mt-0.5">
                Distance is calculated using OSRM routing service with OpenRouteService fallback
              </p> */}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={fetchConfig}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving || !hasChanges()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Map Picker Modal - MapTiler */}
      <AnimatePresence>
        {showMapPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4"
            onClick={() => setShowMapPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <MapPin size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Set Store Location</h3>
                    <p className="text-xs text-gray-500">Drag marker or click on map to set location</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMapPicker(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Search and Actions */}
                <div className="flex gap-2">
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
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                  <button
                    onClick={() => searchAddress(searchQuery)}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Search size={18} />
                    Search
                  </button>
                  <button
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGettingLocation ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Crosshair size={18} />
                    )}
                    Current
                  </button>
                </div>

                {/* Map Container - MapTiler */}
                <div 
                  ref={mapContainer}
                  className="w-full h-96 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative"
                >
                  {!mapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-2">Loading map...</span>
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
                    <p className="text-sm text-green-700">{config.store_address || 'Address not available'}</p>
                    <p className="text-xs text-green-600 mt-1">
                      📍 {config.store_latitude.toFixed(6)}, {config.store_longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowMapPicker(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
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
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
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