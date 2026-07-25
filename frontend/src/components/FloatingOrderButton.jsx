// frontend/src/components/FloatingOrderButton.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CryptoJS from 'crypto-js';
import {
  Droplet, X, ChevronRight, ChevronLeft, ShoppingCart,
  Home, Store, CreditCard, CheckCircle, Loader2,
  Truck, MapPin, Shield, Lock, CircleCheck, TrendingUp,
  Crosshair, AlertCircle, Search, Clock, Banknote
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import api from '../services/api';
import { calculateDeliveryFee } from '../services/ordersService';

// PAYHERE CONFIGURATION
const PAYHERE_CONFIG = {
  merchantId: "1236932",
  merchantSecret: "MTUwODY5ODIwMzYzODI1MDQxNjI3OTI1MDk1OTMzNDY4MjE5OTU4",
  baseUrl: "https://sandbox.payhere.lk",
  returnUrl: `${window.location.origin}/payment-result`,
  cancelUrl: `${window.location.origin}/payment-cancel`,
  notifyUrl: "https://straggler-capitol-unseeing.ngrok-free.dev/api/payments/notify",
};

const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
  const hashedSecret = CryptoJS.MD5(merchantSecret).toString().toUpperCase();
  const hashString = `${merchantId}${orderId}${amount}${currency}${hashedSecret}`;
  const hash = CryptoJS.MD5(hashString).toString().toUpperCase();
  return hash;
};

// MapTiler Configuration
const MAPTILER_CONFIG = {
  apiKey: import.meta.env.VITE_MAPTILER_API_KEY || '',
  styleUrl: 'https://api.maptiler.com/maps/basic/style.json',
  geocodingUrl: 'https://api.maptiler.com/geocoding',
};

// Map Container Style
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '320px'
};

const FloatingOrderButton = ({ onLoginRequired }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // ORDER DATA - Address (from DB) + Location (user selected)
  const [orderData, setOrderData] = useState({ 
    items: {}, 
    deliveryType: null, 
    address: "",
    latitude: null,
    longitude: null,
    locationAddress: "",
  });
  
  const [savedAddress, setSavedAddress] = useState({
    address: "",
  });
  
  const [step, setStep] = useState(1);
  const [subtotal, setSubtotal] = useState(0);
  const [orderId, setOrderId] = useState(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");
  
  // Delivery fee states
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryDuration, setDeliveryDuration] = useState(0);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [deliveryFeeMessage, setDeliveryFeeMessage] = useState('');
  
  // Location states
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  
  // MapLibre state
  const [maplibregl, setMaplibregl] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMapInitializing, setIsMapInitializing] = useState(false);
  const mapInitAttempts = useRef(0);
  
  // Map refs
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const geocoderInputRef = useRef(null);

  const addressDebounceTimer = useRef(null);
  const geolocationTimeoutRef = useRef(null);

  const maptilerApiKey = MAPTILER_CONFIG.apiKey;
  const hasValidApiKey = maptilerApiKey && maptilerApiKey !== '';

  // Load maplibre-gl dynamically
  useEffect(() => {
    const loadMapLibre = async () => {
      try {
        const module = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        setMaplibregl(module);
        setMapLoaded(true);
        console.log('[MapLibre] Module loaded successfully');
      } catch (error) {
        console.error('[MapLibre] Failed to load:', error);
        toast.error('Failed to load map library');
      }
    };
    loadMapLibre();
  }, []);

  // Cleanup geolocation timeout on unmount
  useEffect(() => {
    return () => {
      if (geolocationTimeoutRef.current) {
        clearTimeout(geolocationTimeoutRef.current);
        geolocationTimeoutRef.current = null;
      }
    };
  }, []);

  // ============================================
  // MAP INITIALIZATION
  // ============================================

  const initMap = () => {
    if (isMapInitializing) {
      console.log('[initMap] Already initializing, skipping...');
      return;
    }

    if (!mapContainer.current) {
      console.log('[initMap] Container not ready, retrying...');
      setTimeout(() => initMap(), 200);
      return;
    }

    if (!hasValidApiKey) {
      console.log('[initMap] No API key');
      return;
    }

    if (!maplibregl) {
      console.log('[initMap] MapLibre not loaded yet');
      return;
    }

    if (map.current) {
      console.log('[initMap] Removing existing map');
      try {
        map.current.remove();
      } catch (e) {
        console.warn('[initMap] Error removing existing map:', e);
      }
      map.current = null;
      marker.current = null;
    }

    const rect = mapContainer.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.log('[initMap] Container not visible, retrying...');
      setTimeout(() => initMap(), 300);
      return;
    }

    setIsMapInitializing(true);
    mapInitAttempts.current += 1;
    console.log(`[initMap] Initializing map (attempt ${mapInitAttempts.current})...`);

    try {
      const MapLibreGL = maplibregl;
      const style = `${MAPTILER_CONFIG.styleUrl}?key=${maptilerApiKey}`;
      
      const centerLng = orderData.longitude || 79.8919;
      const centerLat = orderData.latitude || 7.0744;
      
      map.current = new MapLibreGL.Map({
        container: mapContainer.current,
        style: style,
        center: [centerLng, centerLat],
        zoom: 15,
        attributionControl: false,
        fadeDuration: 0,
        interactive: true,
        preserveDrawingBuffer: true,
      });

      if (map.current.setMissingStyleImageResolver) {
        map.current.setMissingStyleImageResolver(() => null);
      }

      map.current.on('load', () => {
        console.log('[MapLibre] Map loaded successfully');
        try {
          map.current.addControl(new MapLibreGL.AttributionControl(), 'bottom-right');
          map.current.addControl(new MapLibreGL.NavigationControl(), 'top-right');

          marker.current = new MapLibreGL.Marker({
            draggable: true,
            color: '#2563eb'
          })
            .setLngLat([centerLng, centerLat])
            .addTo(map.current);

          marker.current.on('dragend', async () => {
            const lngLat = marker.current.getLngLat();
            await reverseGeocodeLocation(lngLat.lat, lngLat.lng);
          });

          map.current.on('click', async (e) => {
            const { lat, lng } = e.lngLat;
            if (marker.current) {
              marker.current.setLngLat([lng, lat]);
            }
            await reverseGeocodeLocation(lat, lng);
          });

          setIsMapInitializing(false);
          console.log('[MapLibre] Map fully initialized');
        } catch (error) {
          console.error('[MapLibre] Error adding controls/marker:', error);
          setIsMapInitializing(false);
        }
      });

      map.current.on('error', (e) => {
        if (e.error && e.error.message) {
          const msg = e.error.message.toLowerCase();
          if (msg.includes('sprite') || msg.includes('image') || msg.includes('could not load') || msg.includes('resource')) {
            return;
          }
          console.error('[MapLibre] Map error:', e);
        }
        setIsMapInitializing(false);
      });

      map.current.on('style.load', () => {
        console.log('[MapLibre] Style loaded');
      });

    } catch (error) {
      console.error('[MapLibre] Failed to initialize map:', error);
      setIsMapInitializing(false);
      toast.error('Failed to load map. Please try again.');
    }
  };

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      console.log('[MapLibre] Cleaning up map...');
      if (map.current) {
        try {
          map.current.remove();
        } catch (e) {
          console.warn('[MapLibre] Error removing map:', e);
        }
        map.current = null;
        marker.current = null;
      }
      if (geolocationTimeoutRef.current) {
        clearTimeout(geolocationTimeoutRef.current);
        geolocationTimeoutRef.current = null;
      }
      setIsMapInitializing(false);
    };
  }, []);

  // Initialize map when location picker opens
  useEffect(() => {
    if (showLocationPicker && hasValidApiKey && maplibregl && !isMapInitializing) {
      console.log('[MapLibre] Location picker opened, initializing map...');
      const timer = setTimeout(() => {
        initMap();
      }, 300);
      return () => clearTimeout(timer);
    }
    
    if (!showLocationPicker && map.current) {
      console.log('[MapLibre] Location picker closed, cleaning up...');
      try {
        map.current.remove();
        map.current = null;
        marker.current = null;
      } catch (e) {
        console.warn('[MapLibre] Error removing map on close:', e);
      }
      setIsMapInitializing(false);
    }
  }, [showLocationPicker, hasValidApiKey, maplibregl]);

  // Update marker position
  const updateMarkerPosition = (lat, lng) => {
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    }
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 15,
        essential: true
      });
    }
  };

  // ============================================
  // LOCATION FUNCTIONS
  // ============================================

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
        console.log('[Geocoding] Results:', results);
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
    updateMarkerPosition(latitude, longitude);
    setSearchQuery(label);
    setSearchResults([]);
    
    if (orderData.deliveryType === "HOME_DELIVERY") {
      handleDeliveryFeeCalculation(label);
    }
    
    toast.success('Location selected!');
  };

  const reverseGeocodeLocation = async (lat, lng) => {
    console.log('[reverseGeocode] Called with:', lat, lng);
    
    try {
      setOrderData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));
      
      updateMarkerPosition(lat, lng);
      
      let address = null;
      let formattedAddress = null;
      
      if (hasValidApiKey) {
        try {
          console.log('[reverseGeocode] Trying MapTiler API...');
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
              console.log('[reverseGeocode] MapTiler result:', address);
            }
          }
        } catch (e) {
          console.warn('MapTiler reverse geocode failed:', e.message);
        }
      }

      if (!address || address === 'Sri Lanka') {
        try {
          console.log('[reverseGeocode] Falling back to Nominatim...');
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
            console.log('[reverseGeocode] Nominatim result:', address);
          }
        } catch (e) {
          console.warn('Nominatim fallback failed:', e.message);
        }
      }

      if (!address || address === 'Sri Lanka') {
        address = `${lat.toFixed(4)}, ${lng.toFixed(4)}, Sri Lanka`;
        formattedAddress = address;
        console.log('[reverseGeocode] Using coordinate fallback:', address);
      }

      address = address.replace(/, Sri Lanka, Sri Lanka$/, ', Sri Lanka');
      address = address.replace(/^Sri Lanka, /, '');
      
      console.log('[reverseGeocode] Final location address:', address);

      setOrderData(prev => ({
        ...prev,
        locationAddress: address,
        latitude: lat,
        longitude: lng
      }));
      
      setLocationInput(address);

      if (orderData.deliveryType === "HOME_DELIVERY") {
        await handleDeliveryFeeCalculation(address);
      }

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
    console.log('[getUserCurrentLocation] Button clicked');
    
    if (!navigator.geolocation) {
      console.error('[getUserCurrentLocation] Geolocation not supported');
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    if (isGettingLocation) {
      console.log('[getUserCurrentLocation] Already getting location');
      return;
    }

    console.log('[getUserCurrentLocation] Starting location request...');
    setIsGettingLocation(true);
    setLocationError(null);
    
    toast.loading('Getting your location...', { id: 'location-loading' });

    if (geolocationTimeoutRef.current) {
      clearTimeout(geolocationTimeoutRef.current);
      geolocationTimeoutRef.current = null;
    }

    geolocationTimeoutRef.current = setTimeout(() => {
      console.log('[getUserCurrentLocation] Location request timed out');
      toast.dismiss('location-loading');
      setIsGettingLocation(false);
      setLocationError('Location request timed out. Please enter address manually.');
      toast.error('Location request timed out. Please try again or enter manually.');
      geolocationTimeoutRef.current = null;
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (geolocationTimeoutRef.current) {
          clearTimeout(geolocationTimeoutRef.current);
          geolocationTimeoutRef.current = null;
        }

        console.log('[getUserCurrentLocation] Location received!');
        console.log('[getUserCurrentLocation] Coordinates:', position.coords);
        const { latitude, longitude, accuracy } = position.coords;
        
        toast.dismiss('location-loading');
        console.log(`Accuracy: ${accuracy} meters`);
        
        await reverseGeocodeLocation(latitude, longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        if (geolocationTimeoutRef.current) {
          clearTimeout(geolocationTimeoutRef.current);
          geolocationTimeoutRef.current = null;
        }

        console.error('[getUserCurrentLocation] Geolocation error:', error);
        toast.dismiss('location-loading');
        
        let message = 'Unable to get your location. Please enter address manually.';
        let logMessage = '';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please allow location access in your browser settings.';
            logMessage = 'Permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable. Please check your GPS or enter address manually.';
            logMessage = 'Position unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again or enter manually.';
            logMessage = 'Timeout';
            break;
          default:
            message = `Location error: ${error.message}`;
            logMessage = error.message;
        }
        
        console.log('[getUserCurrentLocation] Error details:', logMessage);
        setLocationError(message);
        toast.error(message, { duration: 6000 });
        setIsGettingLocation(false);
        
        if (error.code !== error.PERMISSION_DENIED) {
          console.log('[getUserCurrentLocation] Retrying with lower accuracy...');
          setTimeout(() => {
            retryGetLocation();
          }, 2000);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const retryGetLocation = () => {
    console.log('[retryGetLocation] Retrying with lower accuracy...');
    
    if (!navigator.geolocation) {
      setIsGettingLocation(false);
      return;
    }
    
    const retryToastId = toast.loading('Retrying location...', { 
      id: 'location-retry' 
    });

    const retryTimeout = setTimeout(() => {
      toast.dismiss(retryToastId);
      toast.error('Unable to get location. Please enter address manually.', { duration: 5000 });
      setIsGettingLocation(false);
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(retryTimeout);
        toast.dismiss(retryToastId);
        
        const { latitude, longitude } = position.coords;
        console.log('[retryGetLocation] Location received:', { latitude, longitude });
        
        toast.success('Location found!', { duration: 2000 });
        await reverseGeocodeLocation(latitude, longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        clearTimeout(retryTimeout);
        toast.dismiss(retryToastId);
        console.error('[retryGetLocation] Failed:', error.message);
        toast.error('Unable to get location. Please enter address manually.', { duration: 5000 });
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 120000
      }
    );
  };

  // ============================================
  // DELIVERY FEE CALCULATION
  // ============================================

  const handleDeliveryFeeCalculation = async (address) => {
    if (!address || address.trim().length < 5) {
      setDeliveryCharge(0);
      setDeliveryDistance(0);
      setDeliveryDuration(0);
      setDeliveryFeeMessage('Enter a valid address');
      return;
    }

    console.log('[FloatingOrderButton] Calculating delivery fee for:', address);
    setIsCalculatingFee(true);

    try {
      const response = await calculateDeliveryFee(address, subtotal);
      console.log('[FloatingOrderButton] Fee response:', response);
      
      if (response.success && response.data) {
        const { delivery_fee, distance_km, duration_minutes, message } = response.data;
        setDeliveryCharge(delivery_fee || 0);
        setDeliveryDistance(distance_km || 0);
        setDeliveryDuration(duration_minutes || 0);
        setDeliveryFeeMessage(message || '');
        
        console.log('[FloatingOrderButton] Fee calculated:', {
          delivery_fee,
          distance_km,
          duration_minutes
        });
      } else {
        setDeliveryCharge(0);
        setDeliveryDistance(0);
        setDeliveryDuration(0);
        setDeliveryFeeMessage('Using default delivery charge');
      }
    } catch (error) {
      console.error('[FloatingOrderButton] Failed to calculate delivery fee:', error);
      setDeliveryCharge(0);
      setDeliveryDistance(0);
      setDeliveryDuration(0);
      setDeliveryFeeMessage('Using default delivery charge');
    } finally {
      setIsCalculatingFee(false);
    }
  };

  // ============================================
  // ORDER LOGIC
  // ============================================

  useEffect(() => {
    if (isOpen && user) {
      supabase.from("products").select("id, name, type, unit_price, image_url").order("name")
        .then(({ data }) => setProducts(data || []));
      
      supabase.from("users").select("address").eq("id", user.id).single()
        .then(({ data, error }) => {
          if (error) {
            console.warn('[FloatingOrderButton] Error fetching user address:', error);
            return;
          }
          
          if (data && data.address) {
            console.log('[FloatingOrderButton] Found saved address:', data.address);
            
            setSavedAddress({
              address: data.address
            });
            
            setOrderData(prev => ({ 
              ...prev, 
              address: data.address
            }));
          }
        });
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (orderData.deliveryType === "HOME_DELIVERY") {
      const deliveryAddress = orderData.locationAddress || orderData.address;
      if (deliveryAddress) {
        handleDeliveryFeeCalculation(deliveryAddress);
      }
    }
  }, [orderData.deliveryType, orderData.locationAddress, orderData.address]);

  useEffect(() => {
    let total = 0;
    products.forEach(p => { const qty = orderData.items[p.id] || 0; total += qty * p.unit_price; });
    setSubtotal(total);
  }, [orderData.items, products]);

  const handleQuantity = (productId, increment) => {
    setOrderData(prev => {
      const current = prev.items[productId] || 0;
      const newQty = Math.max(0, current + increment);
      const items = { ...prev.items };
      if (newQty === 0) delete items[productId];
      else items[productId] = newQty;
      return { ...prev, items };
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!Object.values(orderData.items).some(q => q > 0)) {
        toast.error("Please select at least one product.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!orderData.deliveryType) {
        toast.error("Please select a delivery method.");
        return;
      }
      if (orderData.deliveryType === "HOME_DELIVERY") {
        if (!orderData.latitude || !orderData.longitude) {
          toast.error("Please select a delivery location using the map or GPS.");
          return;
        }
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 4) { resetOrder(); return; }
    setStep(prev => Math.max(1, prev - 1));
  };

  const resetOrder = () => {
    setOrderData({ 
      items: {}, 
      deliveryType: null, 
      address: "",
      latitude: null,
      longitude: null,
      locationAddress: ""
    });
    setLocationInput("");
    setStep(1);
    setOrderId(null);
    setIsOpen(false);
    setIsPaymentProcessing(false);
    setSelectedPaymentMethod("CASH");
    setDeliveryCharge(0);
    setDeliveryDistance(0);
    setDeliveryDuration(0);
    setDeliveryFeeMessage('');
    setLocationError(null);
    setShowLocationPicker(false);
    setSearchQuery('');
    setSearchResults([]);
    if (addressDebounceTimer.current) {
      clearTimeout(addressDebounceTimer.current);
    }
    if (geolocationTimeoutRef.current) {
      clearTimeout(geolocationTimeoutRef.current);
      geolocationTimeoutRef.current = null;
    }
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    setIsGettingLocation(false);
  };

  const initiatePayHerePayment = async (order) => {
    try {
      setIsPaymentProcessing(true);
      setLoading(true);

      const total = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? deliveryCharge : 0);
      
      const { data: customer } = await supabase
        .from("users")
        .select("name, email, phone")
        .eq("id", user.id)
        .single();

      const orderRef = String(order.id).padStart(6, "0");
      const amount = Number(total).toFixed(2);

      const hash = generatePayHereHash(
        PAYHERE_CONFIG.merchantId,
        orderRef,
        amount,
        "LKR",
        PAYHERE_CONFIG.merchantSecret
      );

      await supabase.from("payments").insert({
        order_id: order.id,
        amount: total,
        payment_method: "ONLINE",
        status: "PENDING",
        transaction_id: `TXN-${Date.now()}`,
      });

      const formData = {
        merchant_id: PAYHERE_CONFIG.merchantId,
        order_id: orderRef,
        items: `Water Order #${order.id}`,
        amount: amount,
        currency: "LKR",
        hash: hash,
        first_name: customer?.name?.split(" ")[0] || "Customer",
        last_name: customer?.name?.split(" ").slice(1).join(" ") || " ",
        email: customer?.email || user.email || "",
        phone: customer?.phone || "",
        address: orderData.address || "No Address",
        city: "Colombo",
        country: "Sri Lanka",
        delivery_address: orderData.locationAddress || orderData.address || "No Address",
        delivery_city: "Colombo",
        delivery_country: "Sri Lanka",
        custom_1: `OrderID:${order.id}`,
        return_url: PAYHERE_CONFIG.returnUrl,
        cancel_url: PAYHERE_CONFIG.cancelUrl,
        notify_url: PAYHERE_CONFIG.notifyUrl,
      };

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `${PAYHERE_CONFIG.baseUrl}/pay/checkout`;

      Object.entries(formData).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      
    } catch (error) {
      console.error("Payment setup exception error:", error);
      toast.error("Failed to initiate payment.");
      setIsPaymentProcessing(false);
      setLoading(false);
    }
  };

// frontend/src/components/FloatingOrderButton.jsx - FIXED handleConfirm

const handleConfirm = async () => {
  if (!user) { 
    onLoginRequired(); 
    return; 
  }

  const orderItems = [];
  products.forEach(p => {
    const qty = orderData.items[p.id] || 0;
    if (qty > 0) orderItems.push({ product_id: p.id, quantity: qty, sub_total: qty * p.unit_price });
  });

  if (orderItems.length === 0) { 
    toast.error("No items selected."); 
    return; 
  }

  setLoading(true);

  try {
    const isOnline = orderData.deliveryType === "HOME_DELIVERY" || selectedPaymentMethod === "ONLINE";

    console.log('📝 [FloatingOrderButton] Calling backend API to create order...');
    
    const apiItems = orderItems.map(item => ({
      productId: item.product_id,
      quantity: item.quantity
    }));

    const deliveryAddress = orderData.locationAddress || orderData.address;

    // ✅ Log the data being sent
    console.log('📝 Sending deliveryAddress:', deliveryAddress);
    console.log('📝 Sending deliveryCharge:', deliveryCharge);
    console.log('📝 Sending latitude:', orderData.latitude);
    console.log('📝 Sending longitude:', orderData.longitude);

    const requestData = {
      customerId: user.id,
      orderType: orderData.deliveryType,
      paymentMethod: isOnline ? "ONLINE" : "CASH",
      deliveryAddress: deliveryAddress,
      items: apiItems,
      latitude: orderData.latitude,   // ✅ Send latitude (may be null)
      longitude: orderData.longitude  // ✅ Send longitude (may be null)
    };

    console.log('📝 Full request data:', JSON.stringify(requestData, null, 2));

    const response = await api.post('/orders', requestData);

    console.log('📝 API response:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to create order');
    }

    const order = response.data.order;
    setOrderId(order.id);

    if (response.data.code === 'INSUFFICIENT_STOCK') {
      toast.error(response.data.message);
      setLoading(false);
      return;
    }

    if (isOnline) {
      await initiatePayHerePayment(order);
    } else {
      setStep(4);
      toast.success("Order placed successfully!");
      setLoading(false);
    }

  } catch (error) {
    console.error("Order process failure exception:", error);
    
    if (error.response && error.response.data) {
      const data = error.response.data;
      if (data.code === 'INSUFFICIENT_STOCK' || data.message?.includes('Insufficient stock')) {
        toast.error(data.message);
        setLoading(false);
        return;
      }
    }
    
    toast.error(error.message || "Failed to place order.");
    setLoading(false);
  }
};

  const hasLocationSelected = () => {
    return orderData.latitude && orderData.longitude;
  };

  const getProduct = (id) => products.find(p => p.id === id);
  const orderedItems = Object.entries(orderData.items)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({ ...getProduct(Number(id)), quantity: qty, subtotal: qty * (getProduct(Number(id))?.unit_price || 0) }));

  const total = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? deliveryCharge : 0);
  const itemCount = Object.values(orderData.items).reduce((a, b) => a + b, 0);

  // ✅ Helper to render delivery charge with loading state
  const renderDeliveryCharge = () => {
    if (isCalculatingFee) {
      return (
        <span className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-gray-400">Calculating...</span>
        </span>
      );
    }
    
    if (deliveryCharge === 0 && !isCalculatingFee) {
      return <span className="text-green-600"></span>;
    }
    
    return <span>Rs. {deliveryCharge.toFixed(2)}</span>;
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        onClick={() => {
          if (!user) onLoginRequired();
          else { setIsOpen(true); setStep(1); setSelectedPaymentMethod("CASH"); }
        }}
        className="fixed top-20 right-6 z-50 flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:scale-105 transition-all duration-300"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <div className="relative">
          <Droplet className="w-6 h-6 fill-white/30" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {itemCount}
            </span>
          )}
        </div>
        <span className="font-bold tracking-wide">ORDER NOW</span>
      </motion.button>

      {/* Main Checkout Wizard */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (step !== 4 && !isPaymentProcessing) setIsOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <style>{`
                .order-scroll::-webkit-scrollbar { width: 6px; }
                .order-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
                .order-scroll::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
                .order-scroll::-webkit-scrollbar-thumb:hover { background: #1e3a8a; }
              `}</style>

              {/* Title Section */}
              <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-100 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  {step === 4 ? <CircleCheck className="w-6 h-6 text-green-500" /> : <ShoppingCart className="w-6 h-6 text-blue-600" />}
                  <h2 className="text-xl font-bold text-gray-800">
                    {step === 4 ? "Order Confirmed!" : step === 1 ? "Select Products" : step === 2 ? "Delivery Method" : "Review Order"}
                  </h2>
                </div>
                {!isPaymentProcessing && (
                  <button onClick={() => { if (step === 4) resetOrder(); else setIsOpen(false); }} className="p-2 rounded-full hover:bg-gray-100 transition">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto order-scroll p-6 space-y-6">
                {step !== 4 && (
                  <>
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-gray-100 text-gray-400"}`}>
                            {s}
                          </div>
                          {s < 3 && <div className={`w-12 h-0.5 transition-all ${step > s ? "bg-blue-600" : "bg-gray-200"}`} />}
                        </div>
                      ))}
                    </div>

                    {/* Step 1: Products */}
                    {step === 1 && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-700">Choose Your Water</h3>
                          <span className="text-sm text-gray-400">{products.length} products</span>
                        </div>
                        <div className="space-y-3 max-h-72 overflow-y-auto order-scroll pr-2">
                          {products.map((product) => {
                            const qty = orderData.items[product.id] || 0;
                            return (
                              <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${qty > 0 ? "border-blue-300 bg-blue-50/50" : "border-gray-100 bg-white hover:border-blue-200"}`}
                              >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                                  ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-blue-600">
                                      <Droplet className="w-6 h-6" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{product.name}</p>
                                    <p className="text-xs text-gray-500">Rs. {product.unit_price.toFixed(2)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <button onClick={() => handleQuantity(product.id, -1)} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xl font-bold transition">−</button>
                                  <span className="w-6 text-center font-semibold">{qty}</span>
                                  <button onClick={() => handleQuantity(product.id, 1)} className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-xl font-bold transition">+</button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                          <span className="text-sm text-gray-500">Items: {itemCount}</span>
                          <span className="text-lg font-bold">Rs. {subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Delivery Method with Location Selection */}
                    {step === 2 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Delivery Method</h3>
                        <div className="space-y-3">
                          <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${orderData.deliveryType === "HOME_DELIVERY" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}>
                            <input type="radio" name="delivery" value="HOME_DELIVERY" checked={orderData.deliveryType === "HOME_DELIVERY"} onChange={(e) => { 
                              setOrderData({ ...orderData, deliveryType: e.target.value }); 
                              setSelectedPaymentMethod("ONLINE");
                            }} className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2"><Home className="w-5 h-5 text-blue-600" /><span className="font-medium">Home Delivery</span></div>
                              <p className="text-sm text-gray-500">Delivered to your doorstep</p>
                            </div>
                            <span className="text-sm font-semibold text-blue-600">
                              {renderDeliveryCharge()}
                            </span>
                          </label>

                          {orderData.deliveryType === "HOME_DELIVERY" && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="ml-12 space-y-3">
                              {/* Saved Address */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <Home className="inline w-4 h-4 mr-1 text-green-600" />
                                  Your Saved Address
                                </label>
                                <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700">
                                  {orderData.address || "No saved address found"}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">This is your registered address from your profile</p>
                              </div>

                              {/* Location Selection */}
                              <div className="border-t border-gray-200 pt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <MapPin className="inline w-4 h-4 mr-1 text-blue-600" />
                                  Delivery Location <span className="text-red-500">*</span>
                                </label>
                                
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
                                      placeholder="Type your delivery location or use map..."
                                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                    {isSearching && (
                                      <div className="absolute right-3 top-3">
                                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setShowLocationPicker(true)}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition flex items-center gap-1 text-sm whitespace-nowrap"
                                  >
                                    <MapPin className="w-4 h-4" />
                                    <span className="hidden sm:inline">Map</span>
                                  </button>
                                  <button
                                    onClick={getUserCurrentLocation}
                                    disabled={isGettingLocation}
                                    className={`px-3 py-2 rounded-xl transition flex items-center gap-1 text-sm whitespace-nowrap ${
                                      isGettingLocation 
                                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                    title="Use current location"
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
                                  <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
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

                                {/* Selected Location Display */}
                                {hasLocationSelected() && (
                                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                                    <div className="flex items-start gap-2">
                                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium text-blue-800">Location Selected</p>
                                        <p className="text-sm text-blue-700">{orderData.locationAddress}</p>
                                        <p className="text-xs text-blue-500 mt-1">
                                          📍 {orderData.latitude.toFixed(6)}, {orderData.longitude.toFixed(6)}
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
                                    </div>
                                  </div>
                                )}

                                {locationError && (
                                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {locationError}
                                  </p>
                                )}
                              </div>

                              {/* Delivery Fee Details */}
                              {deliveryDistance > 0 && hasLocationSelected() && (
                                <div className="flex items-center gap-4 text-xs bg-blue-50 p-2 rounded-lg">
                                  <span className="text-blue-700 flex items-center gap-1">
                                    <MapPin size={12} /> {deliveryDistance.toFixed(1)} km
                                  </span>
                                  <span className="text-blue-700 font-semibold flex items-center gap-1">
                                    <TrendingUp size={12} /> Rs. {deliveryCharge.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                                <Lock className="w-3 h-3" /><span>Online payment required</span>
                              </div>
                            </motion.div>
                          )}

                          <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${orderData.deliveryType === "PICKUP" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}>
                            <input type="radio" name="delivery" value="PICKUP" checked={orderData.deliveryType === "PICKUP"} onChange={(e) => { 
                              setOrderData({ ...orderData, deliveryType: e.target.value }); 
                              setSelectedPaymentMethod("CASH");
                            }} className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2"><Store className="w-5 h-5 text-blue-600" /><span className="font-medium">Pickup at Store</span></div>
                              <p className="text-sm text-gray-500">Collect from our location</p>
                            </div>
                            <span className="text-sm text-gray-400">Free</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Review Your Order</h3>

                        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                          <div className="space-y-2 max-h-40 overflow-y-auto order-scroll pr-2">
                            {orderedItems.map((item) => (
                              <div key={item.id} className="flex justify-between items-center">
                                <span className="font-medium text-sm">{item.name} × {item.quantity}</span>
                                <span className="text-sm font-semibold">Rs. {item.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-gray-200 pt-3 space-y-1.5">
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span></div>
                            {orderData.deliveryType === "HOME_DELIVERY" && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Delivery</span>
                                <span>Rs. {deliveryCharge.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                              <span>Total</span>
                              <span className="text-blue-600">Rs. {total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                          <div className="flex items-start gap-3">
                            <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-medium">{orderData.deliveryType === "HOME_DELIVERY" ? "Home Delivery" : "Pickup"}</p>
                              {orderData.deliveryType === "HOME_DELIVERY" && (
                                <>
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Saved Address:</span> {orderData.address}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">Delivery Location:</span> {orderData.locationAddress}
                                  </p>
                                  {deliveryDistance > 0 && (
                                    <p className="text-xs text-gray-400">Distance: {deliveryDistance.toFixed(1)} km</p>
                                  )}
                                  {orderData.latitude && orderData.longitude && (
                                    <p className="text-xs text-gray-400">
                                      📍 {orderData.latitude.toFixed(6)}, {orderData.longitude.toFixed(6)}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Payment Method */}
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                          {orderData.deliveryType === "HOME_DELIVERY" ? (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                              <CreditCard className="w-5 h-5 text-blue-600" />
                              <div><p className="font-medium text-blue-700">Online Payment (Required)</p><p className="text-xs text-blue-600">Secure via PayHere</p></div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                  type="button"
                                  onClick={() => setSelectedPaymentMethod("CASH")} 
                                  className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                                      selectedPaymentMethod === "CASH" 
                                          ? "border-blue-500 bg-blue-50 text-blue-900" 
                                          : "border-gray-200 hover:border-blue-200 text-gray-700"
                                  }`}
                              >
                                  <Banknote className="w-6 h-6 mb-2 text-green-600" />
                                  <p className="font-medium">Cash</p>
                                  <p className="text-xs text-gray-400">Pay at pickup</p>
                              </button>

                              <button 
                                  type="button"
                                  onClick={() => setSelectedPaymentMethod("ONLINE")} 
                                  className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                                      selectedPaymentMethod === "ONLINE" 
                                          ? "border-blue-500 bg-blue-50 text-blue-900" 
                                          : "border-gray-200 hover:border-blue-200 text-gray-700"
                                  }`}
                              >
                                  <CreditCard className="w-6 h-6 mb-2 text-blue-600" />
                                  <p className="font-medium">Online</p>
                                  <p className="text-xs text-gray-400">Pay via PayHere</p>
                              </button>
                          </div>
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-4">
                          <Shield className="w-4 h-4" /><span>Secure SSL encryption</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
                      <CheckCircle className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-4">Order Placed Successfully!</h3>
                    <p className="text-gray-500 mt-2">Order ID: <span className="font-bold">#{orderId}</span></p>
                    <p className="text-sm text-gray-400 mt-1">We'll process your order shortly.</p>
                    <button onClick={resetOrder} className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium">
                      Continue Shopping
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Footer */}
              {step !== 4 && !isPaymentProcessing && (
                <div className="sticky bottom-0 bg-white p-4 border-t border-gray-100 rounded-b-3xl flex items-center gap-3">
                  {step > 1 && (
                    <button onClick={handleBack} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium">
                      <ChevronLeft className="inline w-4 h-4 mr-1" /> Back
                    </button>
                  )}
                  <div className="flex-1" />
                  {step < 3 ? (
                    <button onClick={handleNext} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center gap-2">
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={handleConfirm} disabled={loading || isCalculatingFee} className="px-8 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {orderData.deliveryType === "HOME_DELIVERY" || selectedPaymentMethod === "ONLINE" ? "Pay Online" : "Confirm Order"}
                    </button>
                  )}
                </div>
              )}

              {/* Payment Processing */}
              {isPaymentProcessing && (
                <div className="p-8 text-center">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                  <p className="mt-4 font-medium text-gray-700">Redirecting to payment gateway...</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Picker Modal */}
      <AnimatePresence>
        {showLocationPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4"
            onClick={() => setShowLocationPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Location Picker Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
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
                  onClick={() => setShowLocationPicker(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Location Picker Content */}
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
                        placeholder="Type your delivery location or use map..."
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-3">
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        </div>
                      )}
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                {hasValidApiKey ? (
                  <div className="w-full h-64 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative">
                    <div ref={mapContainer} style={mapContainerStyle} />
                    {!map.current && maplibregl && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-2">Loading map...</span>
                      </div>
                    )}
                    {!maplibregl && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-2">Loading library...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-64 rounded-xl bg-gray-100 flex flex-col items-center justify-center border border-gray-200">
                    <MapPin className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">MapTiler API Key Required</p>
                    <p className="text-xs text-gray-400">Please set VITE_MAPTILER_API_KEY in .env</p>
                  </div>
                )}
                
                <p className="text-xs text-gray-400 text-center">
                  📍 Drag the marker or click on the map to select your delivery location
                </p>

                {/* GPS Status Message */}
                {isGettingLocation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-1" />
                    <p className="text-sm text-blue-700">Getting your location...</p>
                    <p className="text-xs text-blue-500">Please wait or enter address manually</p>
                  </div>
                )}

                {/* Selected Location Display */}
                {hasLocationSelected() && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-sm font-medium text-green-800">Selected Location</p>
                    <p className="text-sm text-green-700">{orderData.locationAddress}</p>
                    <p className="text-xs text-green-600 mt-1">
                      📍 {orderData.latitude.toFixed(6)}, {orderData.longitude.toFixed(6)}
                    </p>
                  </div>
                )}

                {/* Manual Entry Fallback */}
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Having trouble with GPS?</p>
                  <button
                    onClick={() => {
                      setShowLocationPicker(false);
                      setTimeout(() => {
                        const locationInput = document.querySelector('input[placeholder*="Type your delivery location"]');
                        if (locationInput) locationInput.focus();
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
                  onClick={() => setShowLocationPicker(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (hasLocationSelected()) {
                      setShowLocationPicker(false);
                      setLocationInput(orderData.locationAddress);
                      toast.success('Location selected!');
                    } else {
                      toast.error('Please select a location on the map');
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${hasLocationSelected() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  disabled={!hasLocationSelected()}
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
};

export default FloatingOrderButton;