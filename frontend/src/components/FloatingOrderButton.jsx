// frontend/src/components/FloatingOrderButton.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CryptoJS from 'crypto-js';
import {
  Droplet, X, ChevronRight, ChevronLeft, ShoppingCart,
  Home, Store, CreditCard, CheckCircle, Loader2,
  Truck, MapPin, Shield, Lock, CircleCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
// IMPORT THE API SERVICE
import api from '../services/api';

const DELIVERY_CHARGE = 350;

// PAYHERE CONFIGURATION METADATA
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
  console.log('🔑 Hash Composition String:', hashString);
  const hash = CryptoJS.MD5(hashString).toString().toUpperCase();
  console.log('🔑 Final Generated Hash Signature:', hash);
  return hash;
};

const FloatingOrderButton = ({ onLoginRequired,hasMaintenanceBanner}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState({ items: {}, deliveryType: null, address: "" });
  const [step, setStep] = useState(1);
  const [subtotal, setSubtotal] = useState(0);
  const [orderId, setOrderId] = useState(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");
  const [pendingProductId, setPendingProductId] = useState(null);

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
  return () => window.removeEventListener("open-order-modal", handler);
}, [user, onLoginRequired]);

  useEffect(() => {
  if (isOpen) {
    supabase.from("products").select("id, name, type, unit_price, image_url").order("name")
      .then(({ data }) => {
        setProducts(data || []);
        if (pendingProductId) {
          setOrderData(prev => ({
            ...prev,
            items: {
              ...prev.items,
              [pendingProductId]: (prev.items[pendingProductId] || 0) + 1,
            },
          }));
          setPendingProductId(null);
        }
      });
    if (user) {
      supabase.from("users").select("address").eq("id", user.id).single()
        .then(({ data }) => {
          if (data?.address) setOrderData(prev => ({ ...prev, address: data.address }));
        });
    }
  }
}, [isOpen, user]);

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
      if (orderData.deliveryType === "HOME_DELIVERY" && !orderData.address.trim()) {
        toast.error("Please enter a delivery address.");
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
    setOrderData({ items: {}, deliveryType: null, address: "" });
    setStep(1);
    setOrderId(null);
    setIsOpen(false);
    setIsPaymentProcessing(false);
    setSelectedPaymentMethod("CASH");
  };

  const initiatePayHerePayment = async (order) => {
    try {
      setIsPaymentProcessing(true);
      setLoading(true);

      const total = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? DELIVERY_CHARGE : 0);
      
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
        delivery_address: orderData.address || "No Address",
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
      const total = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? DELIVERY_CHARGE : 0);
      const isOnline = orderData.deliveryType === "HOME_DELIVERY" || selectedPaymentMethod === "ONLINE";

      // =============================================
      // FIX: Call the BACKEND API instead of direct Supabase
      // =============================================
      console.log('📝 [FloatingOrderButton] Calling backend API to create order...');
      
      // Prepare items for API (match backend expected format)
      const apiItems = orderItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity
      }));

      const response = await api.post('/orders', {
        customerId: user.id,
        orderType: orderData.deliveryType,
        paymentMethod: isOnline ? "ONLINE" : "CASH",
        deliveryLocation: orderData.deliveryType === "HOME_DELIVERY" ? orderData.address : null,
        items: apiItems
      });

      console.log('📝 [FloatingOrderButton] API response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create order');
      }

      const order = response.data.order;
      setOrderId(order.id);

      // Check if it's an inventory error
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
      
      // Check for inventory error in response
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (data.code === 'INSUFFICIENT_STOCK' || data.message.includes('Insufficient stock')) {
          toast.error(data.message);
          setLoading(false);
          return;
        }
      }
      
      toast.error(error.message || "Failed to place order.");
      setLoading(false);
    }
  };

  const getProduct = (id) => products.find(p => p.id === id);
  const orderedItems = Object.entries(orderData.items)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({ ...getProduct(Number(id)), quantity: qty, subtotal: qty * (getProduct(Number(id))?.unit_price || 0) }));

  const total = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? DELIVERY_CHARGE : 0);
  const itemCount = Object.values(orderData.items).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Trigger Button Interface Layout View */}
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

      {/* Main Checkout Wizard Overlay Window */}
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
              {/* Internal Scroller Styles Block */}
              <style>{`
                .order-scroll::-webkit-scrollbar { width: 6px; }
                .order-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
                .order-scroll::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
                .order-scroll::-webkit-scrollbar-thumb:hover { background: #1e3a8a; }
              `}</style>

              {/* Title Section Header bar panel */}
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

              {/* Main Content Area Container Node */}
              <div className="flex-1 overflow-y-auto order-scroll p-6 space-y-6">
                {step !== 4 && (
                  <>
                    {/* Visual Progress Steps Map Indicators */}
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

                    {/* Step 1: Products Catalogue Selection List View */}
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

                    {/* Step 2: Logistics Fulfillment Configurations Panel */}
                    {step === 2 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Delivery Method</h3>
                        <div className="space-y-3">
                          <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${orderData.deliveryType === "HOME_DELIVERY" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}>
                            <input type="radio" name="delivery" value="HOME_DELIVERY" checked={orderData.deliveryType === "HOME_DELIVERY"} onChange={(e) => { setOrderData({ ...orderData, deliveryType: e.target.value }); setSelectedPaymentMethod("ONLINE"); }} className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2"><Home className="w-5 h-5 text-blue-600" /><span className="font-medium">Home Delivery</span></div>
                              <p className="text-sm text-gray-500">Delivered to your doorstep</p>
                            </div>
                            <span className="text-sm font-semibold text-blue-600">+ Rs. {DELIVERY_CHARGE}</span>
                          </label>

                          {orderData.deliveryType === "HOME_DELIVERY" && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="ml-12 space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <MapPin className="inline w-4 h-4 mr-1" /> Delivery Address
                                </label>
                                <textarea value={orderData.address} onChange={(e) => setOrderData({ ...orderData, address: e.target.value })} rows="2" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Enter your full delivery address" />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                                <Lock className="w-3 h-3" /><span>Online payment required</span>
                              </div>
                            </motion.div>
                          )}

                          <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${orderData.deliveryType === "PICKUP" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}>
                            <input type="radio" name="delivery" value="PICKUP" checked={orderData.deliveryType === "PICKUP"} onChange={(e) => { setOrderData({ ...orderData, deliveryType: e.target.value }); setSelectedPaymentMethod("CASH"); }} className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2"><Store className="w-5 h-5 text-blue-600" /><span className="font-medium">Pickup at Store</span></div>
                              <p className="text-sm text-gray-500">Collect from our location</p>
                            </div>
                            <span className="text-sm font-shadow-400">Free</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Transaction Invoice Summary Review */}
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
                            {orderData.deliveryType === "HOME_DELIVERY" && <div className="flex justify-between text-sm"><span className="text-gray-600">Delivery</span><span>Rs. {DELIVERY_CHARGE.toFixed(2)}</span></div>}
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
                              {orderData.deliveryType === "HOME_DELIVERY" && <p className="text-sm text-gray-600">{orderData.address}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Payment Gateway Method Selection */}
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                          {orderData.deliveryType === "HOME_DELIVERY" ? (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                              <CreditCard className="w-5 h-5 text-blue-600" />
                              <div><p className="font-medium text-blue-700">Online Payment (Required)</p><p className="text-xs text-blue-600">Secure via PayHere</p></div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => setSelectedPaymentMethod("CASH")} className={`p-4 border-2 rounded-xl text-center transition-all ${selectedPaymentMethod === "CASH" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}>
                                💰 <p className="font-medium">Cash</p><p className="text-xs text-gray-400">Pay at pickup</p>
                              </button>
                              <button onClick={() => setSelectedPaymentMethod("ONLINE")} className={`p-4 border-2 rounded-xl text-center transition-all ${selectedPaymentMethod === "ONLINE" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"}`}>
                                💳 <p className="font-medium">Online</p><p className="text-xs text-gray-400">Pay via PayHere</p>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-4">
                          <Shield className="w-4 h-4" /><span>Secure SSL encryption</span>
                        </div>

                        {/* SANDBOX TESTING SIMULATOR METRICS - CRITICAL FOR VIVA DEMO */}
                        {(orderData.deliveryType === "HOME_DELIVERY" || selectedPaymentMethod === "ONLINE") && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-xs font-medium text-amber-700">🧪 Sandbox Test Card for Viva Demo</p>
                            <p className="text-xs text-amber-600">
                              Number: <span className="font-mono font-bold">4012001037141112</span> | 
                              Expiry: <span className="font-bold">12/26</span> | 
                              CVV: <span className="font-bold">123</span>
                            </p>
                            <p className="text-xs text-amber-500 mt-1">💡 Do not enter spaces when pasting card number</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Step 4: Transaction Pipeline Terminal Success Template View */}
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

              {/* Step Navigation Action Trigger Row Panel Footer */}
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
                    <button onClick={handleConfirm} disabled={loading} className="px-8 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {orderData.deliveryType === "HOME_DELIVERY" || selectedPaymentMethod === "ONLINE" ? "Pay Online" : "Confirm Order"}
                    </button>
                  )}
                </div>
              )}

              {/* Processing Loader Interstitial Screen Shield Overlay */}
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
    </>
  );
};

export default FloatingOrderButton;