// components/FloatingOrderButton.jsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplet,
  X,
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
  Home,
  Store,
  CreditCard,
  DollarSign,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

const DELIVERY_CHARGE = 350;

const FloatingOrderButton = ({ onLoginRequired }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState({
    items: {},
    deliveryType: null,
    address: "",
    paymentMethod: "CASH",
  });
  const [step, setStep] = useState(1);
  const [subtotal, setSubtotal] = useState(0);
  const [userAddress, setUserAddress] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
  });

  // Fetch products when modal opens
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, type, unit_price, image_url, description")
        .order("name");
      if (error) {
        console.error("Error fetching products:", error);
        return;
      }
      setProducts(data);
    };
    if (isOpen) {
      fetchProducts();
      if (user) {
        supabase
          .from("users")
          .select("address")
          .eq("id", user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data?.address) {
              setUserAddress(data.address);
              setOrderData((prev) => ({ ...prev, address: data.address }));
            }
          });
      }
    }
  }, [isOpen, user]);

  // Recalculate subtotal
  useEffect(() => {
    let newTotal = 0;
    products.forEach((product) => {
      const qty = orderData.items[product.id] || 0;
      newTotal += qty * product.unit_price;
    });
    setSubtotal(newTotal);
  }, [orderData.items, products]);

  // When delivery type changes, enforce payment method
  useEffect(() => {
    if (orderData.deliveryType === "HOME_DELIVERY") {
      setOrderData((prev) => ({ ...prev, paymentMethod: "ONLINE" }));
    }
  }, [orderData.deliveryType]);

  const handleQuantityChange = (productId, increment) => {
    setOrderData((prev) => {
      const current = prev.items[productId] || 0;
      const newQty = Math.max(0, current + increment);
      const newItems = { ...prev.items };
      if (newQty === 0) {
        delete newItems[productId];
      } else {
        newItems[productId] = newQty;
      }
      return { ...prev, items: newItems };
    });
  };

  const handleNext = () => {
    if (step === 1) {
      const hasItems = Object.values(orderData.items).some((qty) => qty > 0);
      if (!hasItems) {
        alert("Please select at least one product.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!orderData.deliveryType) {
        alert("Please select a delivery method.");
        return;
      }
      if (orderData.deliveryType === "HOME_DELIVERY" && !orderData.address.trim()) {
        alert("Please enter a delivery address.");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 4) {
      resetOrder();
      return;
    }
    setStep((prev) => Math.max(1, prev - 1));
  };

  const resetOrder = () => {
    setOrderData({
      items: {},
      deliveryType: null,
      address: userAddress || "",
      paymentMethod: "CASH",
    });
    setCardDetails({ number: "", expiry: "", cvv: "" });
    setStep(1);
    setOrderId(null);
    setIsOpen(false);
  };

  const handleConfirm = async () => {
    if (!user) {
      onLoginRequired();
      return;
    }

    const orderItems = [];
    products.forEach((product) => {
      const qty = orderData.items[product.id] || 0;
      if (qty > 0) {
        orderItems.push({
          product_id: product.id,
          quantity: qty,
          sub_total: qty * product.unit_price,
        });
      }
    });

    if (orderItems.length === 0) {
      alert("No items selected.");
      return;
    }

    setLoading(true);

    try {
      const totalWithDelivery = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? DELIVERY_CHARGE : 0);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          order_type: orderData.deliveryType,
          payment_method: orderData.paymentMethod,
          payment_status: "PENDING",
          order_status: "PLACED",
          total_amount: totalWithDelivery,
          delivery_location: orderData.deliveryType === "HOME_DELIVERY" ? orderData.address : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsWithOrderId = orderItems.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsWithOrderId);

      if (itemsError) throw itemsError;

      for (const item of orderItems) {
        const { data: inventoryData, error: invFetchError } = await supabase
          .from("inventory")
          .select("id, current_stock")
          .eq("product_id", item.product_id)
          .single();

        if (invFetchError) {
          console.warn(`No inventory record for product ${item.product_id}, skipping stock update.`);
          continue;
        }

        const newStock = Math.max(0, inventoryData.current_stock - item.quantity);
        const { error: updateError } = await supabase
          .from("inventory")
          .update({ current_stock: newStock, last_updated: new Date() })
          .eq("id", inventoryData.id);

        if (updateError) {
          console.error(`Error updating inventory for product ${item.product_id}:`, updateError);
        }
      }

      setOrderId(order.id);
      setStep(4);
    } catch (error) {
      console.error("Order creation error:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getProductById = (id) => products.find((p) => p.id === id);

  const orderedItems = Object.entries(orderData.items)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => {
      const product = getProductById(Number(id));
      return { ...product, quantity: qty, subtotal: qty * (product?.unit_price || 0) };
    });

  const totalWithDelivery = subtotal + (orderData.deliveryType === "HOME_DELIVERY" ? DELIVERY_CHARGE : 0);

  return (
    <>
      {/* Floating Button with bobbing animation */}
      <motion.button
        onClick={() => {
          if (!user) {
            onLoginRequired();
          } else {
            setIsOpen(true);
            setStep(1);
            setOrderId(null);
          }
        }}
        className="fixed top-20 right-6 z-50 flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:scale-105 transition-all duration-300 group"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut",
        }}
      >
        <Droplet className="w-6 h-6 fill-white/30" />
        <span className="font-bold tracking-wide">ORDER NOW</span>
        <div className="absolute -inset-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
      </motion.button>

      {/* Order Modal - unchanged, keep as before */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (step !== 4) setIsOpen(false);
              else resetOrder();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Custom scrollbar */}
              <style>{`
                .order-scroll::-webkit-scrollbar {
                  width: 6px;
                }
                .order-scroll::-webkit-scrollbar-track {
                  background: #f1f5f9;
                  border-radius: 10px;
                }
                .order-scroll::-webkit-scrollbar-thumb {
                  background: #2563eb;
                  border-radius: 10px;
                }
                .order-scroll::-webkit-scrollbar-thumb:hover {
                  background: #1e3a8a;
                }
              `}</style>

              {/* Header */}
              <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-100 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-800">
                    {step === 4 ? "Order Placed!" : "Place Your Order"}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    if (step === 4) resetOrder();
                    else setIsOpen(false);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto order-scroll p-6 space-y-6">
                {step !== 4 && (
                  <>
                    {/* Step indicator */}
                    <div className="flex items-center justify-between mb-4">
                      {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                              step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {s}
                          </div>
                          {s < 3 && (
                            <div
                              className={`w-12 h-0.5 transition-colors ${
                                step > s ? "bg-blue-600" : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Step 1: Products */}
                    {step === 1 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Choose Your Water</h3>
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-2 order-scroll">
                          {products.map((product) => {
                            const qty = orderData.items[product.id] || 0;
                            return (
                              <div
                                key={product.id}
                                className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50/50 to-white rounded-xl border border-blue-100/50"
                              >
                                <div className="flex items-center gap-4">
                                  {product.image_url ? (
                                    <img
                                      src={product.image_url}
                                      alt={product.name}
                                      className="w-14 h-14 object-cover rounded-lg"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                      <Droplet className="w-6 h-6" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-800">{product.name}</p>
                                    <p className="text-sm text-gray-500">
                                      {product.type} · Rs. {product.unit_price}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleQuantityChange(product.id, -1)}
                                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xl font-bold transition"
                                  >
                                    −
                                  </button>
                                  <span className="w-8 text-center font-semibold">{qty}</span>
                                  <button
                                    onClick={() => handleQuantityChange(product.id, 1)}
                                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-xl font-bold transition"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 text-right text-lg font-bold text-gray-800">
                          Subtotal: Rs. {subtotal.toFixed(2)}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Delivery */}
                    {step === 2 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Delivery Method</h3>
                        <div className="space-y-4">
                          <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-blue-50/50 transition border-blue-200">
                            <input
                              type="radio"
                              name="deliveryType"
                              value="HOME_DELIVERY"
                              checked={orderData.deliveryType === "HOME_DELIVERY"}
                              onChange={(e) =>
                                setOrderData({ ...orderData, deliveryType: e.target.value })
                              }
                              className="w-5 h-5 text-blue-600"
                            />
                            <Home className="w-5 h-5 text-blue-600" />
                            <span className="font-medium">Home Delivery</span>
                            <span className="ml-auto text-sm text-gray-500">+ Rs. {DELIVERY_CHARGE}</span>
                          </label>
                          {orderData.deliveryType === "HOME_DELIVERY" && (
                            <div className="ml-10 mt-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Delivery Address
                              </label>
                              <textarea
                                value={orderData.address}
                                onChange={(e) =>
                                  setOrderData({ ...orderData, address: e.target.value })
                                }
                                rows="2"
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter your full address"
                              />
                              <p className="text-xs text-blue-600 mt-1">
                                <CreditCard className="inline w-3 h-3 mr-1" />
                                Payment will be processed online.
                              </p>
                            </div>
                          )}

                          <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-blue-50/50 transition border-blue-200">
                            <input
                              type="radio"
                              name="deliveryType"
                              value="PICKUP"
                              checked={orderData.deliveryType === "PICKUP"}
                              onChange={(e) => {
                                setOrderData({ ...orderData, deliveryType: e.target.value, paymentMethod: "CASH" });
                              }}
                              className="w-5 h-5 text-blue-600"
                            />
                            <Store className="w-5 h-5 text-blue-600" />
                            <span className="font-medium">Pickup at Store</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === 3 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Review Your Order</h3>
                        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 order-scroll">
                            {orderedItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center border-b border-gray-200 pb-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-sm text-gray-500">× {item.quantity}</span>
                                </div>
                                <span className="text-sm font-semibold">
                                  Rs. {item.subtotal.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Totals */}
                          <div className="space-y-1 border-t border-gray-300 pt-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Subtotal</span>
                              <span>Rs. {subtotal.toFixed(2)}</span>
                            </div>
                            {orderData.deliveryType === "HOME_DELIVERY" && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Delivery Charge</span>
                                <span>Rs. {DELIVERY_CHARGE.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-base">
                              <span>Total</span>
                              <span className="text-blue-600">Rs. {totalWithDelivery.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Delivery info */}
                          <p className="flex justify-between text-sm">
                            <span className="text-gray-600">Delivery:</span>
                            <span className="font-medium">
                              {orderData.deliveryType === "HOME_DELIVERY"
                                ? "Home Delivery"
                                : "Pickup"}
                            </span>
                          </p>
                          {orderData.deliveryType === "HOME_DELIVERY" && (
                            <p className="text-sm text-gray-500">Address: {orderData.address}</p>
                          )}

                          {/* Payment Method */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Payment Method
                            </label>
                            {orderData.deliveryType === "HOME_DELIVERY" ? (
                              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-2 rounded-lg">
                                <CreditCard className="w-4 h-4" />
                                <span>Online Payment (required for home delivery)</span>
                              </div>
                            ) : (
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="CASH"
                                    checked={orderData.paymentMethod === "CASH"}
                                    onChange={(e) =>
                                      setOrderData({ ...orderData, paymentMethod: e.target.value })
                                    }
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <DollarSign className="w-4 h-4" /> Cash
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="ONLINE"
                                    checked={orderData.paymentMethod === "ONLINE"}
                                    onChange={(e) =>
                                      setOrderData({ ...orderData, paymentMethod: e.target.value })
                                    }
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <CreditCard className="w-4 h-4" /> Online
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Card Payment Form – placeholder */}
                          {orderData.paymentMethod === "ONLINE" && (
                            <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-white">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Card Payment</h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs text-gray-500">Card Number</label>
                                  <input
                                    type="text"
                                    placeholder="1234 5678 9012 3456"
                                    value={cardDetails.number}
                                    onChange={(e) =>
                                      setCardDetails({ ...cardDetails, number: e.target.value })
                                    }
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                  />
                                </div>
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <label className="block text-xs text-gray-500">Expiry</label>
                                    <input
                                      type="text"
                                      placeholder="MM/YY"
                                      value={cardDetails.expiry}
                                      onChange={(e) =>
                                        setCardDetails({ ...cardDetails, expiry: e.target.value })
                                      }
                                      className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-xs text-gray-500">CVV</label>
                                    <input
                                      type="text"
                                      placeholder="123"
                                      value={cardDetails.cvv}
                                      onChange={(e) =>
                                        setCardDetails({ ...cardDetails, cvv: e.target.value })
                                      }
                                      className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-gray-400 italic">Card payment integration coming soon.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                  <div className="flex flex-col items-center text-center py-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                      <CheckCircle className="w-20 h-20 text-green-500" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-4">Order Successful!</h3>
                    <p className="text-gray-600 mt-2">
                      Thank you for your order. We'll process it shortly.
                    </p>
                    <div className="mt-4 bg-blue-50 px-6 py-3 rounded-xl">
                      <p className="text-sm text-gray-600">Order ID</p>
                      <p className="font-mono font-bold text-blue-700">#{orderId}</p>
                    </div>
                    <div className="mt-6 w-full max-w-xs bg-gray-50 p-4 rounded-xl text-left space-y-2">
                      <p className="font-semibold text-gray-700">Order Summary</p>
                      {orderedItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.name} × {item.quantity}
                          </span>
                          <span>Rs. {item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                      {orderData.deliveryType === "HOME_DELIVERY" && (
                        <div className="flex justify-between text-sm border-t border-gray-300 pt-1">
                          <span>Delivery</span>
                          <span>Rs. {DELIVERY_CHARGE.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>Rs. {totalWithDelivery.toFixed(2)}</span>
                      </div>
                    </div>
                    <button
                      onClick={resetOrder}
                      className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
                    >
                      Continue Shopping
                    </button>
                  </div>
                )}
              </div>

              {/* Footer buttons - only for steps 1-3 */}
              {step !== 4 && (
                <div className="sticky bottom-0 bg-white p-4 border-t border-gray-100 rounded-b-3xl flex justify-between">
                  {step > 1 && (
                    <button
                      onClick={handleBack}
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                    >
                      <ChevronLeft className="inline w-4 h-4 mr-1" /> Back
                    </button>
                  )}
                  <div className="flex-1" />
                  {step < 3 ? (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="px-8 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2 disabled:bg-green-400"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Placing...
                        </>
                      ) : (
                        "Confirm Order"
                      )}
                    </button>
                  )}
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