// frontend/src/components/FloatingOrderButton.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CryptoJS from 'crypto-js';
import html2canvas from 'html2canvas';
import {
  Droplet, X, ChevronRight, ChevronLeft, ShoppingCart,
  Home, Store, CreditCard, CheckCircle, Loader2,
  Truck, MapPin, Shield, Lock, CircleCheck, TrendingUp,
  Crosshair, AlertCircle, Search, Clock, Banknote,
  Plus,
  Minus,
  Printer,
  Info,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import api from '../services/api';
import { calculateDeliveryFee } from '../services/deliveryFeeService';

// ─── Query Keys ───
const QUERY_KEYS = {
  PRODUCTS: ['products'],
  INVENTORY: ['inventory'],
  USER_ADDRESS: (userId) => ['user', userId, 'address'],
  ORDER: (orderId) => ['order', orderId],
};

// ─── PAYHERE CONFIGURATION ───
const PAYHERE_CONFIG = {
  merchantId: "1236932",
  merchantSecret: "MTUwODY5ODIwMzYzODI1MDQxNjI3OTI1MDk1OTMzNDY4MjE5OTU4",
  baseUrl: "https://sandbox.payhere.lk",
  returnUrl: `${window.location.origin}/payment-result`,
  cancelUrl: `${window.location.origin}/payment-cancel`,
  notifyUrl: "https://straggler-capitol-unseeing.ngrok-free.dev/api/payments/notify",
};

// ─── MapTiler Configuration ───
const MAPTILER_CONFIG = {
  apiKey: import.meta.env.VITE_MAPTILER_API_KEY || '',
  styleUrl: 'https://api.maptiler.com/maps/basic/style.json',
  geocodingUrl: 'https://api.maptiler.com/geocoding',
};

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '320px'
};

// ─── Helper Functions ───
const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
  const hashedSecret = CryptoJS.MD5(merchantSecret).toString().toUpperCase();
  const hashString = `${merchantId}${orderId}${amount}${currency}${hashedSecret}`;
  const hash = CryptoJS.MD5(hashString).toString().toUpperCase();
  return hash;
};

const FloatingOrderButton = ({ onLoginRequired, hasMaintenanceBanner }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ─── State ───
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [orderData, setOrderData] = useState({ 
    items: {}, 
    deliveryType: null, 
    address: "",
    latitude: null,
    longitude: null,
    locationAddress: "",
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");
  const [orderId, setOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  
  // Delivery fee states
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryDuration, setDeliveryDuration] = useState(0);
  const [deliveryFeeMessage, setDeliveryFeeMessage] = useState('');
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  
  // Location states
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [savedAddress, setSavedAddress] = useState({ address: "" });
  
  // Map states
  const [maplibregl, setMaplibregl] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMapInitializing, setIsMapInitializing] = useState(false);
  const mapInitAttempts = useRef(0);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [pendingProductId, setPendingProductId] = useState(null);
  const [stockErrors, setStockErrors] = useState({});
  const invoiceContainerRef = useRef(null);
  const addressDebounceTimer = useRef(null);
  const geolocationTimeoutRef = useRef(null);

  // ─── React Query: Fetch Products (Active Only) ───
  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: QUERY_KEYS.PRODUCTS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, type, unit_price, image_url, is_active")
        .order("name");
      if (error) throw error;
      
      // ✅ Filter only active products (handles boolean true, 1, or 'active' string)
      const activeProducts = (data || []).filter(
        (p) => p.is_active === true || p.is_active === 1 || p.status === 'active'
      );
      
      return activeProducts || [];
    },
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    enabled: isOpen, // Only fetch when modal is open
  });

  // ─── React Query: Fetch Inventory ───
  const {
    data: inventoryData = [],
    isLoading: inventoryLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.INVENTORY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("product_id, current_stock");
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
    gcTime: 180000,
    refetchOnWindowFocus: false,
    enabled: isOpen,
  });

  // ─── React Query: Fetch User Address ───
  const {
    data: userAddress = null,
    isLoading: addressLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.USER_ADDRESS(user?.id),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("users")
        .select("address")
        .eq("id", user.id)
        .single();
      if (error) {
        console.warn('[FloatingOrderButton] Error fetching user address:', error);
        return null;
      }
      return data?.address || null;
    },
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    enabled: !!user && isOpen,
  });

  // ─── React Query: Create Order Mutation ───
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const response = await api.post('/orders', orderData);
      return response.data;
    },
    onSuccess: (data) => {
      setOrderId(data.order?.id);
      setOrderDetails(data.order);
    },
    onError: (error) => {
      console.error("Order creation failed:", error);
      const msg = error.response?.data?.message || "Failed to place order.";
      toast.error(msg);
      setLoading(false);
    },
  });

  // ─── React Query: Create Payment Mutation ───
  const createPaymentMutation = useMutation({
    mutationFn: async ({ orderId, amount, order }) => {
      const { data: customer } = await supabase
        .from("users")
        .select("name, email, phone")
        .eq("id", user.id)
        .single();

      const orderRef = String(orderId).padStart(6, "0");
      const totalAmount = Number(amount).toFixed(2);

      const hash = generatePayHereHash(
        PAYHERE_CONFIG.merchantId,
        orderRef,
        totalAmount,
        "LKR",
        PAYHERE_CONFIG.merchantSecret
      );

      await supabase.from("payments").insert({
        order_id: orderId,
        amount: amount,
        payment_method: "ONLINE",
        status: "PENDING",
        transaction_id: `TXN-${Date.now()}`,
      });

      return {
        merchant_id: PAYHERE_CONFIG.merchantId,
        order_id: orderRef,
        items: `Water Order #${orderId}`,
        amount: totalAmount,
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
        custom_1: `OrderID:${orderId}`,
        return_url: PAYHERE_CONFIG.returnUrl,
        cancel_url: PAYHERE_CONFIG.cancelUrl,
        notify_url: PAYHERE_CONFIG.notifyUrl,
      };
    },
    onSuccess: (formData) => {
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
    },
    onError: (error) => {
      console.error("Payment setup failed:", error);
      toast.error("Failed to initiate payment.");
      setIsPaymentProcessing(false);
      setLoading(false);
    },
  });

  // ─── React Query: Calculate Delivery Fee ───
  const calculateDeliveryFeeMutation = useMutation({
    mutationFn: async ({ address, subtotal }) => {
      return await calculateDeliveryFee(address, subtotal);
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { delivery_fee, distance_km, duration_minutes, message } = response.data;
        setDeliveryCharge(delivery_fee || 0);
        setDeliveryDistance(distance_km || 0);
        setDeliveryDuration(duration_minutes || 0);
        setDeliveryFeeMessage(message || '');
      } else {
        setDeliveryCharge(0);
        setDeliveryDistance(0);
        setDeliveryDuration(0);
        setDeliveryFeeMessage('Using default delivery charge');
      }
      setIsCalculatingFee(false);
    },
    onError: (error) => {
      console.error('[FloatingOrderButton] Failed to calculate delivery fee:', error);
      setDeliveryCharge(0);
      setDeliveryDistance(0);
      setDeliveryDuration(0);
      setDeliveryFeeMessage('Using default delivery charge');
      setIsCalculatingFee(false);
    },
  });

  // ─── React Query: Search Address (Geocoding) ───
  const searchAddressMutation = useMutation({
    mutationFn: async (query) => {
      if (!query || query.length < 3) return [];

      // Try MapTiler first
      if (MAPTILER_CONFIG.apiKey) {
        const response = await fetch(
          `${MAPTILER_CONFIG.geocodingUrl}/${encodeURIComponent(query)}.json?key=${MAPTILER_CONFIG.apiKey}&limit=5&language=en&country=lk`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            return data.features.map(feature => ({
              label: feature.place_name || feature.text,
              latitude: feature.geometry.coordinates[1],
              longitude: feature.geometry.coordinates[0],
              formatted: feature.place_name || feature.text,
              context: feature.context?.map(c => c.text).join(', ') || ''
            }));
          }
        }
      }

      // Fallback to Nominatim
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=lk`
      );
      const fallbackData = await fallbackResponse.json();
      if (fallbackData && fallbackData.length > 0) {
        return fallbackData.map(item => ({
          label: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          formatted: item.display_name,
          context: ''
        }));
      }
      return [];
    },
    onSuccess: (results) => {
      setSearchResults(results);
      setIsSearching(false);
    },
    onError: () => {
      setSearchResults([]);
      setIsSearching(false);
    },
  });

  // ─── Product Stock Map (Memoized) ───
  const productStock = useMemo(() => {
    const stockMap = {};
    inventoryData.forEach(item => {
      stockMap[item.product_id] = item.current_stock || 0;
    });
    return stockMap;
  }, [inventoryData]);

  // ─── Compute Subtotal ───
  useEffect(() => {
    let total = 0;
    products.forEach(p => {
      const qty = orderData.items[p.id] || 0;
      total += qty * p.unit_price;
    });
    setSubtotal(total);
  }, [orderData.items, products]);

  // ─── Set Saved Address ───
  useEffect(() => {
    if (userAddress) {
      setSavedAddress({ address: userAddress });
      setOrderData(prev => ({ ...prev, address: userAddress }));
    }
  }, [userAddress]);

  // ─── Handle Delivery Fee Calculation ───
  useEffect(() => {
    if (orderData.deliveryType === "HOME_DELIVERY") {
      const deliveryAddress = orderData.locationAddress || orderData.address;
      if (deliveryAddress && deliveryAddress.trim().length >= 5) {
        setIsCalculatingFee(true);
        calculateDeliveryFeeMutation.mutate({ address: deliveryAddress, subtotal });
      }
    }
  }, [orderData.deliveryType, orderData.locationAddress, orderData.address, subtotal]);

  // ─── Load maplibre-gl dynamically ───
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

  // ─── Cleanup geolocation timeout ───
  useEffect(() => {
    return () => {
      if (geolocationTimeoutRef.current) {
        clearTimeout(geolocationTimeoutRef.current);
        geolocationTimeoutRef.current = null;
      }
    };
  }, []);

  // ─── Handle pending product from event ───
  useEffect(() => {
    if (pendingProductId && productStock[pendingProductId] !== undefined) {
      const maxStock = productStock[pendingProductId] || 0;
      const currentQty = orderData.items[pendingProductId] || 0;
      
      if (currentQty < maxStock) {
        setOrderData(prev => ({
          ...prev,
          items: {
            ...prev.items,
            [pendingProductId]: Math.min(currentQty + 1, maxStock),
          },
        }));
      } else {
        toast.error(`Only ${maxStock} units available for this product`);
      }
      setPendingProductId(null);
    }
  }, [pendingProductId, productStock, orderData.items]);

  // ─── Handlers ───
  const handleQuantity = (productId, increment) => {
    const currentStock = productStock[productId] || 0;
    const currentQty = orderData.items[productId] || 0;
    
    if (increment > 0 && currentQty >= currentStock) {
      toast.error(`Only ${currentStock} units available in stock`);
      return;
    }
    
    if (increment < 0 && currentQty <= 0) {
      return;
    }

    setOrderData(prev => {
      const newQty = Math.max(0, currentQty + increment);
      const items = { ...prev.items };
      if (newQty === 0) delete items[productId];
      else items[productId] = newQty;
      return { ...prev, items };
    });
  };

  const handleNext = () => {
    if (step === 1) {
      for (const [productId, qty] of Object.entries(orderData.items)) {
        const stock = productStock[Number(productId)] || 0;
        if (qty > stock) {
          const product = products.find(p => p.id === Number(productId));
          toast.error(`${product?.name || 'Product'} exceeds available stock (${stock} available)`);
          return;
        }
      }
      
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
    setOrderDetails(null);
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

  const handleConfirm = async () => {
    if (!user) { 
      onLoginRequired(); 
      return; 
    }

    const orderItems = [];
    let hasStockIssue = false;
    let stockErrorMessage = '';

    products.forEach(p => {
      const qty = orderData.items[p.id] || 0;
      if (qty > 0) {
        const stock = productStock[p.id] || 0;
        if (qty > stock) {
          hasStockIssue = true;
          stockErrorMessage += `\n${p.name}: Requested ${qty}, Available ${stock}`;
        }
        orderItems.push({ 
          product_id: p.id, 
          quantity: Math.min(qty, stock),
          sub_total: Math.min(qty, stock) * p.unit_price 
        });
      }
    });

    if (hasStockIssue) {
      toast.error(`Insufficient stock for:${stockErrorMessage}`);
      return;
    }

    if (orderItems.length === 0) { 
      toast.error("No items selected."); 
      return; 
    }

    setLoading(true);

    try {
      const isOnline = orderData.deliveryType === "HOME_DELIVERY" || selectedPaymentMethod === "ONLINE";

      const apiItems = orderItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity
      }));

      const deliveryAddress = orderData.locationAddress || orderData.address;

      const requestData = {
        customerId: user.id,
        orderType: orderData.deliveryType,
        paymentMethod: isOnline ? "ONLINE" : "CASH",
        deliveryAddress: deliveryAddress,
        items: apiItems,
        latitude: orderData.latitude,
        longitude: orderData.longitude
      };

      // Create order using mutation
      const result = await createOrderMutation.mutateAsync(requestData);

      if (!result.success) {
        throw new Error(result.message || 'Failed to create order');
      }

      const order = result.order;
      setOrderId(order.id);
      setOrderDetails(order);

      if (result.code === 'INSUFFICIENT_STOCK') {
        toast.error(result.message);
        setLoading(false);
        return;
      }

      if (isOnline) {
        setIsPaymentProcessing(true);
        await createPaymentMutation.mutateAsync({ 
          orderId: order.id, 
          amount: total,
          order: order
        });
      } else {
        const formattedItems = orderItems.map(item => {
          const product = products.find(p => p.id === item.product_id);
          return {
            id: item.product_id,
            name: product?.name || 'Product',
            quantity: item.quantity,
            unit_price: product?.unit_price || 0,
            subtotal: item.sub_total
          };
        });

        const totalAmount = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? deliveryCharge : 0);

        resetOrder();
        
        navigate('/pickup-confirmation', {
          state: {
            orderId: order.id,
            orderedItems: formattedItems,
            subtotal: subtotal,
            total: totalAmount,
            orderData: orderData
          }
        });
        
        setLoading(false);
        toast.success("Order placed successfully!");
      }

    } catch (error) {
      console.error("Order process failure:", error);
      
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

  const getUserCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    if (isGettingLocation) return;

    setIsGettingLocation(true);
    setLocationError(null);
    
    toast.loading('Getting your location...', { id: 'location-loading' });

    if (geolocationTimeoutRef.current) {
      clearTimeout(geolocationTimeoutRef.current);
    }

    geolocationTimeoutRef.current = setTimeout(() => {
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

        const { latitude, longitude } = position.coords;
        
        toast.dismiss('location-loading');
        
        await reverseGeocodeLocation(latitude, longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        if (geolocationTimeoutRef.current) {
          clearTimeout(geolocationTimeoutRef.current);
          geolocationTimeoutRef.current = null;
        }

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
            message = 'Location request timed out. Please try again or enter manually.';
            break;
          default:
            message = `Location error: ${error.message}`;
        }
        
        setLocationError(message);
        toast.error(message, { duration: 6000 });
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const reverseGeocodeLocation = async (lat, lng) => {
    try {
      setOrderData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));
      
      updateMarkerPosition(lat, lng);
      
      let address = null;
      
      if (MAPTILER_CONFIG.apiKey) {
        try {
          const response = await fetch(
            `${MAPTILER_CONFIG.geocodingUrl}/${lng},${lat}.json?key=${MAPTILER_CONFIG.apiKey}&language=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              const feature = data.features[0];
              address = feature.place_name || feature.text;
              address = address
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
          }
        } catch (e) {
          console.warn('Nominatim fallback failed:', e.message);
        }
      }

      if (!address || address === 'Sri Lanka') {
        address = `${lat.toFixed(4)}, ${lng.toFixed(4)}, Sri Lanka`;
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
    toast.success('Location selected!');
  };

  const hasLocationSelected = () => {
    return orderData.latitude && orderData.longitude;
  };

  const getProduct = (id) => products.find(p => p.id === id);
  const orderedItems = Object.entries(orderData.items)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({ 
      ...getProduct(Number(id)), 
      quantity: qty, 
      subtotal: qty * (getProduct(Number(id))?.unit_price || 0), 
      stock: productStock[Number(id)] || 0 
    }));

  const total = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? deliveryCharge : 0);
  const itemCount = Object.values(orderData.items).reduce((a, b) => a + b, 0);

  const hasLowStock = (productId) => {
    const stock = productStock[productId] || 0;
    return stock > 0 && stock < 25;
  };

  const isOutOfStock = (productId) => {
    return (productStock[productId] || 0) <= 0;
  };

  // ─── Event listener for opening modal ───
  useEffect(() => {
    const handler = (e) => {
      if (!user) {
        onLoginRequired();
        return;
      }
      setIsOpen(true);
      setStep(1);
      setSelectedPaymentMethod("CASH");
      if (e.detail?.productId) {
        setPendingProductId(e.detail.productId);
      }
    };

    window.addEventListener("open-order-modal", handler);
    
    return () => {
      window.removeEventListener("open-order-modal", handler);
    };
  }, [user, onLoginRequired]);

  // ─── Render helper for delivery charge ───
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
      return <span className="text-green-600">Free</span>;
    }
    
    return <span>Rs. {deliveryCharge.toFixed(2)}</span>;
  };

  const isPending = loading || isPaymentProcessing;

  return (
    <>
      {/* ─── Trigger Button ─── */}
      <motion.button
        onClick={() => {
          if (!user) onLoginRequired();
          else { setIsOpen(true); setStep(1); setSelectedPaymentMethod("CASH"); }
        }}
        className={`fixed right-6 z-50 flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:scale-105 transition-all duration-300 ${
          hasMaintenanceBanner ? 'top-32 lg:top-36' : 'top-20'
        }`}
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

      {/* ─── Main Checkout Wizard ─── */}
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

              {/* ─── Title Section ─── */}
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

              {/* ─── Main Content ─── */}
              <div className="flex-1 overflow-y-auto order-scroll p-6 space-y-6">
                {step !== 4 && (
                  <>
                    {/* ─── Progress Steps ─── */}
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

                    {/* ─── Step 1: Products ─── */}
                    {step === 1 && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-700">Choose Your Water</h3>
                          <span className="text-sm text-gray-400">{products.length} products</span>
                        </div>
                        {productsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          </div>
                        ) : products.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Droplet className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p>No active products available</p>
                            <p className="text-xs text-gray-400 mt-1">Please check back later</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-72 overflow-y-auto order-scroll pr-2">
                            {products.map((product) => {
                              const qty = orderData.items[product.id] || 0;
                              const stock = productStock[product.id] || 0;
                              const lowStock = stock > 0 && stock < 25;
                              const outOfStock = stock <= 0;
                              
                              return (
                                <motion.div
                                  key={product.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${qty > 0 ? "border-blue-300 bg-blue-50/50" : outOfStock ? "border-red-200 bg-red-50/30 opacity-60" : "border-gray-100 bg-white hover:border-blue-200"}`}
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
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-gray-800 truncate">{product.name}</p>
                                        {lowStock && (
                                          <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                                            <AlertTriangle className="w-3 h-3" />
                                            Only {stock} left
                                          </span>
                                        )}
                                        {outOfStock && (
                                          <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            Out of Stock
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500">Rs. {product.unit_price.toFixed(2)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <button 
                                      onClick={() => handleQuantity(product.id, -1)} 
                                      disabled={qty === 0 || outOfStock}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold transition ${
                                        qty > 0 && !outOfStock
                                          ? "bg-gray-200 hover:bg-gray-300 text-gray-700" 
                                          : "bg-gray-100 text-gray-300 cursor-not-allowed"
                                      }`}
                                    >
                                      <Minus className="w-6 h-6" />
                                    </button>
                                    <span className="w-6 text-center font-semibold">{qty}</span>
                                    <button 
                                      onClick={() => handleQuantity(product.id, 1)} 
                                      disabled={outOfStock || qty >= stock}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold transition ${
                                        !outOfStock && qty < stock
                                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                      }`}
                                      title={qty >= stock ? "Maximum available stock reached" : ""}
                                    >
                                      <Plus className="w-6 h-6" />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                          <span className="text-sm text-gray-500">Items: {itemCount}</span>
                          <span className="text-lg font-bold">Rs. {subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* ─── Step 2: Delivery Method ─── */}
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
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <Home className="inline w-4 h-4 mr-1 text-green-600" />
                                  Your Saved Address
                                </label>
                                <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700">
                                  {addressLoading ? (
                                    <span className="text-gray-400">Loading...</span>
                                  ) : (
                                    orderData.address || "No saved address found"
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">This is your registered address from your profile</p>
                              </div>

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
                                          setIsSearching(true);
                                          searchAddressMutation.mutate(e.target.value);
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

                                {hasLocationSelected() && (
                                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                                    <div className="flex items-start gap-2">
                                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium text-blue-800">Location Selected</p>
                                        <p className="text-sm text-blue-700">{orderData.locationAddress}</p>
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

                    {/* ─── Step 3: Review ─── */}
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
                                </>
                              )}
                            </div>
                          </div>
                        </div>

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

                {/* ─── Step 4: Success ─── */}
                {step === 4 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
                      <CheckCircle className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-4">Order Placed Successfully!</h3>
                    <p className="text-gray-500 mt-2">Order ID: <span className="font-bold">#{String(orderId).padStart(6, '0')}</span></p>
                    <p className="text-sm text-gray-400 mt-1">We'll process your order shortly.</p>
                    <button onClick={resetOrder} className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium">
                      Continue Shopping
                    </button>
                  </div>
                )}
              </div>

              {/* ─── Navigation Footer ─── */}
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

              {/* ─── Payment Processing ─── */}
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

      {/* ─── Location Picker Modal ─── */}
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
              {/* ─── Location Picker Header ─── */}
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

              {/* ─── Location Picker Content ─── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                            setIsSearching(true);
                            searchAddressMutation.mutate(e.target.value);
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

                {/* ─── Map Container ─── */}
                {MAPTILER_CONFIG.apiKey ? (
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

                {isGettingLocation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-1" />
                    <p className="text-sm text-blue-700">Getting your location...</p>
                    <p className="text-xs text-blue-500">Please wait or enter address manually</p>
                  </div>
                )}

                {hasLocationSelected() && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-sm font-medium text-green-800">Selected Location</p>
                    <p className="text-sm text-green-700">{orderData.locationAddress}</p>
                    <p className="text-xs text-green-600 mt-1">
                      📍 {orderData.latitude.toFixed(6)}, {orderData.longitude.toFixed(6)}
                    </p>
                  </div>
                )}

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

              {/* ─── Footer ─── */}
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