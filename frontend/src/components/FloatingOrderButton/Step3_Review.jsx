// frontend/src/components/FloatingOrderButton/Step3_Review.jsx
import { Truck, CreditCard, Shield, Banknote } from "lucide-react";

const Step3_Review = ({
  orderData,
  orderedItems,
  subtotal,
  deliveryCharge,
  deliveryDistance,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  total,
  handleConfirm,
  loading,
  isCalculatingFee
}) => {
  const formatCharge = (value) => {
    if (value === null || value === undefined) return '0.00';
    return value.toFixed(2);
  };

  return (
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
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          {orderData.deliveryType === "HOME_DELIVERY" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery</span>
              <span>Rs. {formatCharge(deliveryCharge)}</span>
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
            <div>
              <p className="font-medium text-blue-700">Online Payment (Required)</p>
              <p className="text-xs text-blue-600">Secure via PayHere</p>
            </div>
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
  );
};

export default Step3_Review;