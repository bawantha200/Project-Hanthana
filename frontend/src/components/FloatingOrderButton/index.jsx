// frontend/src/components/FloatingOrderButton/index.jsx
import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Droplet, ShoppingCart, X, Loader2, ChevronLeft, 
  ChevronRight, CircleCheck 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";
import api from "../../services/api";
import CryptoJS from 'crypto-js';

// Lazy load steps
const Step1_Products = lazy(() => import("./Step1_Products"));
const Step2_Delivery = lazy(() => import("./Step2_Delivery"));
const Step3_Review = lazy(() => import("./Step3_Review"));
const Step4_Success = lazy(() => import("./Step4_Success"));
const LocationPickerModal = lazy(() => import("./LocationPickerModal"));

// Custom hooks
import { useOrderData } from "./hooks/useOrderData";
import { useDeliveryFee } from "./hooks/useDeliveryFee";
import { useLocationPicker } from "./hooks/useLocationPicker";

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

const FloatingOrderButton = ({ onLoginRequired }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");
  
  // Custom hooks
  const { 
    orderData, setOrderData, 
    products, setProducts, 
    subtotal, setSubtotal, 
    savedAddress, setSavedAddress 
  } = useOrderData();
  
  const { 
    deliveryCharge, setDeliveryCharge, 
    deliveryDistance, setDeliveryDistance, 
    deliveryDuration, setDeliveryDuration, 
    isCalculatingFee, setIsCalculatingFee, 
    deliveryFeeMessage, setDeliveryFeeMessage, 
    calculateFee 
  } = useDeliveryFee();
  
  const { 
    locationInput, setLocationInput, 
    hasLocationSelected, 
    showLocationPicker, setShowLocationPicker, 
    searchResults, isSearching, 
    searchAddress, selectSearchResult, 
    reverseGeocodeLocation, 
    getUserCurrentLocation, 
    isGettingLocation, 
    locationError, setLocationError,
    initMap,
    setOrderData: setLocationOrderData
  } = useLocationPicker();

  // Fetch products and user address
  useEffect(() => {
    if (isOpen && user) {
      supabase.from("products").select("id, name, type, unit_price, image_url").order("name")
        .then(({ data }) => setProducts(data || []));
      
      supabase.from("users").select("address").eq("id", user.id).single()
        .then(({ data, error }) => {
          if (!error && data?.address) {
            setSavedAddress({ address: data.address });
            setOrderData(prev => ({ ...prev, address: data.address }));
          }
        });
    }
  }, [isOpen, user]);

  // Calculate subtotal
  useEffect(() => {
    let total = 0;
    products.forEach(p => { 
      const qty = orderData.items[p.id] || 0; 
      total += qty * p.unit_price; 
    });
    setSubtotal(total);
  }, [orderData.items, products]);

  // Calculate delivery fee
  useEffect(() => {
    if (orderData.deliveryType === "HOME_DELIVERY") {
      const deliveryAddress = orderData.locationAddress || orderData.address;
      if (deliveryAddress) {
        calculateFee(deliveryAddress, subtotal);
      }
    }
  }, [orderData.deliveryType, orderData.locationAddress, orderData.address, subtotal]);

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
      if (orderData.deliveryType === "HOME_DELIVERY" && !hasLocationSelected()) {
        toast.error("Please select a delivery location.");
        return;
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

      const apiItems = orderItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity
      }));

      const deliveryAddress = orderData.locationAddress || orderData.address;

      const response = await api.post('/orders', {
        customerId: user.id,
        orderType: orderData.deliveryType,
        paymentMethod: isOnline ? "ONLINE" : "CASH",
        deliveryAddress: deliveryAddress,
        items: apiItems,
        latitude: orderData.latitude,
        longitude: orderData.longitude
      });

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

  const orderedItems = Object.entries(orderData.items)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({ 
      ...products.find(p => p.id === Number(id)), 
      quantity: qty, 
      subtotal: qty * (products.find(p => p.id === Number(id))?.unit_price || 0) 
    }));

  const total = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? deliveryCharge : 0);
  const itemCount = Object.values(orderData.items).reduce((a, b) => a + b, 0);

  const StepLoader = () => (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <span className="ml-2 text-gray-500">Loading...</span>
    </div>
  );

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
                <Suspense fallback={<StepLoader />}>
                  {step === 1 && (
                    <Step1_Products
                      products={products}
                      orderData={orderData}
                      setOrderData={setOrderData}
                      subtotal={subtotal}
                      itemCount={itemCount}
                    />
                  )}
                  {step === 2 && (
                    <Step2_Delivery
                      orderData={orderData}
                      setOrderData={setOrderData}
                      deliveryCharge={deliveryCharge}
                      deliveryDistance={deliveryDistance}
                      deliveryDuration={deliveryDuration}
                      isCalculatingFee={isCalculatingFee}
                      deliveryFeeMessage={deliveryFeeMessage}
                      locationInput={locationInput}
                      setLocationInput={setLocationInput}
                      hasLocationSelected={hasLocationSelected}
                      setShowLocationPicker={setShowLocationPicker}
                      searchResults={searchResults}
                      isSearching={isSearching}
                      searchAddress={searchAddress}
                      selectSearchResult={selectSearchResult}
                      getUserCurrentLocation={getUserCurrentLocation}
                      isGettingLocation={isGettingLocation}
                      locationError={locationError}
                      savedAddress={savedAddress}
                      setSelectedPaymentMethod={setSelectedPaymentMethod}
                    />
                  )}
                  {step === 3 && (
                    <Step3_Review
                      orderData={orderData}
                      orderedItems={orderedItems}
                      subtotal={subtotal}
                      deliveryCharge={deliveryCharge}
                      deliveryDistance={deliveryDistance}
                      selectedPaymentMethod={selectedPaymentMethod}
                      setSelectedPaymentMethod={setSelectedPaymentMethod}
                      total={total}
                      handleConfirm={handleConfirm}
                      loading={loading}
                      isCalculatingFee={isCalculatingFee}
                    />
                  )}
                  {step === 4 && (
                    <Step4_Success
                      orderId={orderId}
                      resetOrder={resetOrder}
                    />
                  )}
                </Suspense>
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
      {showLocationPicker && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}>
          <LocationPickerModal
            isOpen={showLocationPicker}
            onClose={() => setShowLocationPicker(false)}
            locationInput={locationInput}
            setLocationInput={setLocationInput}
            orderData={orderData}
            setOrderData={setOrderData}
            searchResults={searchResults}
            isSearching={isSearching}
            searchAddress={searchAddress}
            selectSearchResult={selectSearchResult}
            getUserCurrentLocation={getUserCurrentLocation}
            isGettingLocation={isGettingLocation}
            hasLocationSelected={hasLocationSelected}
            initMap={initMap}
          />
        </Suspense>
      )}
    </>
  );
};

export default FloatingOrderButton;