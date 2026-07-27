// frontend/src/components/FloatingOrderButton/LocationPickerModal.jsx
import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, MapPin, Search, Loader2, Crosshair } from "lucide-react";
import toast from "react-hot-toast";

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '320px'
};

const LocationPickerModal = ({
  isOpen,
  onClose,
  locationInput,
  setLocationInput,
  orderData,
  setOrderData,
  searchResults,
  isSearching,
  searchAddress,
  selectSearchResult,
  getUserCurrentLocation,
  isGettingLocation,
  hasLocationSelected,
  initMap
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        initMap(mapContainer, map, marker, orderData);
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {
      if (map.current) {
        try {
          map.current.remove();
        } catch (e) {
          console.warn('[LocationPickerModal] Error removing map:', e);
        }
        map.current = null;
        marker.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (map.current && marker.current && orderData.latitude && orderData.longitude) {
      marker.current.setLngLat([orderData.longitude, orderData.latitude]);
      map.current.flyTo({
        center: [orderData.longitude, orderData.latitude],
        zoom: 15,
        essential: true
      });
    }
  }, [orderData.latitude, orderData.longitude]);

  const formatCoordinate = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return value.toFixed(6);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Select Location</h3>
              <p className="text-xs text-gray-500">Search or drag the marker on the map</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    if (e.target.value !== orderData.locationAddress) {
                      setOrderData(prev => ({
                        ...prev,
                        latitude: null,
                        longitude: null,
                        locationAddress: ""
                      }));
                      searchAddress(e.target.value);
                    }
                  }}
                  placeholder="Type your delivery location..."
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition pr-10"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  </div>
                )}
                {!isSearching && (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                )}
              </div>
              <button
                onClick={getUserCurrentLocation}
                disabled={isGettingLocation}
                className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                  isGettingLocation 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isGettingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crosshair className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">GPS</span>
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && !hasLocationSelected() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => selectSearchResult(result)}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 transition flex items-start gap-2 border-b border-gray-100 last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-800">{result.label}</p>
                      {result.context && (
                        <p className="text-xs text-gray-400">{result.context}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Container */}
          <div className="w-full h-64 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative">
            <div ref={mapContainer} style={mapContainerStyle} />
            {!map.current && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2">Loading map...</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-400 text-center">
            📍 Drag the marker or click on the map to select your delivery location
          </p>

          {/* GPS Status */}
          {isGettingLocation && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-1" />
              <p className="text-sm text-blue-700">Getting your location...</p>
              <p className="text-xs text-blue-500">Please wait or enter address manually</p>
            </div>
          )}

          {/* Selected Location */}
          {hasLocationSelected() && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm font-medium text-green-800">Selected Location</p>
              <p className="text-sm text-green-700">{orderData.locationAddress || 'Address not available'}</p>
              <p className="text-xs text-green-600 mt-1">
                📍 {formatCoordinate(orderData.latitude)}, {formatCoordinate(orderData.longitude)}
              </p>
              <button
                onClick={() => {
                  setOrderData(prev => ({
                    ...prev,
                    latitude: null,
                    longitude: null,
                    locationAddress: ""
                  }));
                  setLocationInput("");
                  toast.info('Location cleared. Select a new location.');
                }}
                className="text-xs text-red-600 hover:text-red-800 underline mt-1"
              >
                ✕ Clear location
              </button>
            </div>
          )}

          {/* Manual Entry Fallback */}
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Having trouble with GPS?</p>
            <button
              onClick={() => {
                onClose();
                setTimeout(() => {
                  const input = document.querySelector('input[placeholder*="Type your delivery location"]');
                  if (input) input.focus();
                }, 300);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Enter location manually →
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (hasLocationSelected()) {
                onClose();
                toast.success('Location selected!');
              } else {
                toast.error('Please select a location on the map');
              }
            }}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${
              hasLocationSelected() 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!hasLocationSelected()}
          >
            Confirm Location
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LocationPickerModal;