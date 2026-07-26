// frontend/src/components/FloatingOrderButton/hooks/useLocationPicker.js
import { useState, useRef } from "react";
import toast from "react-hot-toast";
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// MapTiler Configuration
const MAPTILER_CONFIG = {
  apiKey: import.meta.env.VITE_MAPTILER_API_KEY || '',
  styleUrl: 'https://api.maptiler.com/maps/basic/style.json',
  geocodingUrl: 'https://api.maptiler.com/geocoding',
};

export const useLocationPicker = () => {
  const [locationInput, setLocationInput] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isMapInitializing, setIsMapInitializing] = useState(false);
  const mapInitAttempts = useRef(0);
  
  const [orderData, setOrderData] = useState({
    latitude: null,
    longitude: null,
    locationAddress: ""
  });

  const hasLocationSelected = () => {
    return orderData.latitude && orderData.longitude;
  };

  const maptilerApiKey = MAPTILER_CONFIG.apiKey;
  const hasValidApiKey = maptilerApiKey && maptilerApiKey !== '';

  const searchAddress = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${MAPTILER_CONFIG.geocodingUrl}/${encodeURIComponent(query)}.json?key=${maptilerApiKey}&limit=5&language=en&country=lk`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const results = data.features.map(feature => ({
          label: feature.place_name || feature.text,
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0],
          formatted: feature.place_name || feature.text,
          context: feature.context?.map(c => c.text).join(', ') || ''
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('[Geocoding] Error:', error);
      setSearchResults([]);
      try {
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=lk`
        );
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.length > 0) {
          const results = fallbackData.map(item => ({
            label: item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            formatted: item.display_name,
            context: ''
          }));
          setSearchResults(results);
        }
      } catch (fallbackError) {
        console.warn('[Geocoding] Fallback failed:', fallbackError);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const { latitude, longitude, label } = result;
    setOrderData(prev => ({
      ...prev,
      latitude: latitude,
      longitude: longitude,
      locationAddress: label
    }));
    setLocationInput(label);
    setSearchResults([]);
    toast.success('Location selected!');
  };

  const initMap = (mapContainer, mapRef, markerRef, orderDataRef) => {
    if (isMapInitializing) {
      return;
    }

    if (!mapContainer || !mapContainer.current) {
      setTimeout(() => initMap(mapContainer, mapRef, markerRef, orderDataRef), 200);
      return;
    }

    if (!hasValidApiKey) {
      toast.error('MapTiler API key is missing');
      return;
    }

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        console.warn('[initMap] Error removing existing map:', e);
      }
      mapRef.current = null;
    }

    const rect = mapContainer.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setTimeout(() => initMap(mapContainer, mapRef, markerRef, orderDataRef), 300);
      return;
    }

    setIsMapInitializing(true);
    mapInitAttempts.current += 1;
    console.log(`[initMap] Initializing map (attempt ${mapInitAttempts.current})...`);

    try {
      const MapLibreGL = maplibregl;
      const style = `${MAPTILER_CONFIG.styleUrl}?key=${maptilerApiKey}`;
      
      const centerLng = orderDataRef.longitude || 79.8919;
      const centerLat = orderDataRef.latitude || 7.0744;
      
      mapRef.current = new MapLibreGL.Map({
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
        try {
          mapRef.current.addControl(new MapLibreGL.AttributionControl(), 'bottom-right');
          mapRef.current.addControl(new MapLibreGL.NavigationControl(), 'top-right');

          markerRef.current = new MapLibreGL.Marker({
            draggable: true,
            color: '#2563eb'
          })
            .setLngLat([centerLng, centerLat])
            .addTo(mapRef.current);

          markerRef.current.on('dragend', async () => {
            const lngLat = markerRef.current.getLngLat();
            await reverseGeocodeLocation(lngLat.lat, lngLat.lng);
          });

          mapRef.current.on('click', async (e) => {
            const { lat, lng } = e.lngLat;
            if (markerRef.current) {
              markerRef.current.setLngLat([lng, lat]);
            }
            await reverseGeocodeLocation(lat, lng);
          });

          setIsMapInitializing(false);
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

  const reverseGeocodeLocation = async (lat, lng) => {
    try {
      setOrderData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));
      
      let address = null;
      let formattedAddress = null;
      
      if (hasValidApiKey) {
        try {
          const response = await fetch(
            `${MAPTILER_CONFIG.geocodingUrl}/${lng},${lat}.json?key=${maptilerApiKey}&language=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              const feature = data.features[0];
              formattedAddress = feature.place_name || feature.text;
              address = formattedAddress
                .replace(/,\s*[A-Za-z\s]+District/g, '')
                .replace(/,\s*[A-Za-z\s]+Province/g, '')
                .replace(/,\s*\d{5}/g, '')
                .trim();
              
              if (!address.includes('Sri Lanka')) {
                address = `${address}, Sri Lanka`;
              }
            }
          }
        } catch (e) {
          console.warn('MapTiler reverse geocode failed:', e.message);
        }
      }

      if (!address || address === 'Sri Lanka') {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&accept-language=en`,
            {
              headers: { 'User-Agent': 'HanthanaWater/1.0' }
            }
          );
          const data = await response.json();
          
          if (data.display_name && data.display_name !== 'Sri Lanka') {
            address = data.display_name
              .replace(/,\s*[A-Za-z\s]+District/g, '')
              .replace(/,\s*[A-Za-z\s]+Province/g, '')
              .replace(/,\s*\d{5}/g, '')
              .trim();
            
            if (!address.includes('Sri Lanka')) {
              address = `${address}, Sri Lanka`;
            }
            formattedAddress = data.display_name;
          }
        } catch (e) {
          console.warn('Nominatim fallback failed:', e.message);
        }
      }

      if (!address || address === 'Sri Lanka') {
        address = `${lat.toFixed(4)}, ${lng.toFixed(4)}, Sri Lanka`;
        formattedAddress = address;
      }

      address = address.replace(/, Sri Lanka, Sri Lanka$/, ', Sri Lanka');
      address = address.replace(/^Sri Lanka, /, '');
      
      setOrderData(prev => ({
        ...prev,
        locationAddress: address,
        latitude: lat,
        longitude: lng
      }));
      
      setLocationInput(address);
      setLocationError(null);
      toast.success('Location selected!');
      return true;
    } catch (error) {
      console.error('[reverseGeocode] Error:', error);
      setLocationError('Failed to get address for this location');
      toast.error('Failed to get address');
      return false;
    }
  };

  const getUserCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    if (isGettingLocation) return;

    setIsGettingLocation(true);
    setLocationError(null);
    toast.loading('Getting your location...', { id: 'location-loading' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        toast.dismiss('location-loading');
        await reverseGeocodeLocation(latitude, longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        toast.dismiss('location-loading');
        let message = 'Unable to get your location. Please enter address manually.';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable. Please check your GPS or enter address manually.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
          default:
            message = `Location error: ${error.message}`;
        }
        setLocationError(message);
        toast.error(message);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  return {
    locationInput,
    setLocationInput,
    showLocationPicker,
    setShowLocationPicker,
    searchResults,
    isSearching,
    isGettingLocation,
    locationError,
    setLocationError,
    orderData,
    setOrderData,
    hasLocationSelected,
    searchAddress,
    selectSearchResult,
    reverseGeocodeLocation,
    getUserCurrentLocation,
    initMap,
    isMapInitializing,
    setIsMapInitializing
  };
};