// frontend/src/components/FloatingOrderButton/Step2_Delivery.jsx
import { motion } from "framer-motion";
import { 
  Home, Store, MapPin, Lock, Loader2, 
  Crosshair, AlertCircle, TrendingUp 
} from "lucide-react";
import toast from "react-hot-toast";

const Step2_Delivery = ({
  orderData,
  setOrderData,
  deliveryCharge,
  deliveryDistance,
  isCalculatingFee,
  deliveryFeeMessage,
  locationInput,
  setLocationInput,
  hasLocationSelected,
  setShowLocationPicker,
  searchResults,
  isSearching,
  searchAddress,
  selectSearchResult,
  getUserCurrentLocation,
  isGettingLocation,
  locationError,
  savedAddress,
  setSelectedPaymentMethod
}) => {

  const handleDeliveryTypeChange = (type) => {
    setOrderData(prev => ({ 
      ...prev, 
      deliveryType: type 
    }));
    if (type === "HOME_DELIVERY") {
      setSelectedPaymentMethod("ONLINE");
    } else {
      setSelectedPaymentMethod("CASH");
    }
  };

  const formatCharge = (value) => {
    if (value === null || value === undefined) return '0.00';
    return value.toFixed(2);
  };

  const formatDistance = (value) => {
    if (value === null || value === undefined) return '0.0';
    return value.toFixed(1);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Delivery Method</h3>
      <div className="space-y-3">
        {/* Home Delivery */}
        <label 
          className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
            orderData.deliveryType === "HOME_DELIVERY" 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-200 hover:border-blue-200"
          }`}
        >
          <input 
            type="radio" 
            name="delivery" 
            value="HOME_DELIVERY" 
            checked={orderData.deliveryType === "HOME_DELIVERY"} 
            onChange={() => handleDeliveryTypeChange("HOME_DELIVERY")} 
            className="w-5 h-5 text-blue-600" 
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Home Delivery</span>
            </div>
            <p className="text-sm text-gray-500">Delivered to your doorstep</p>
          </div>
          <span className="text-sm font-semibold text-blue-600">
            + Rs. {formatCharge(deliveryCharge)}
          </span>
        </label>

        {orderData.deliveryType === "HOME_DELIVERY" && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            className="ml-12 space-y-3"
          >
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

              {/* Selected Location */}
              {hasLocationSelected() && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Location Selected</p>
                      <p className="text-sm text-blue-700">{orderData.locationAddress}</p>
                      <p className="text-xs text-blue-500 mt-1">
                        📍 {orderData.latitude?.toFixed(6) || 'N/A'}, {orderData.longitude?.toFixed(6) || 'N/A'}
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

            {/* Delivery Fee */}
            {deliveryDistance > 0 && hasLocationSelected() && (
              <div className="flex items-center gap-4 text-xs bg-blue-50 p-2 rounded-lg">
                <span className="text-blue-700 flex items-center gap-1">
                  <MapPin size={12} /> {formatDistance(deliveryDistance)} km
                </span>
                <span className="text-blue-700 font-semibold flex items-center gap-1">
                  <TrendingUp size={12} /> Rs. {formatCharge(deliveryCharge)}
                </span>
              </div>
            )}
            
            {deliveryFeeMessage && (
              <p className="text-xs text-gray-400 italic">{deliveryFeeMessage}</p>
            )}
            
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
              <Lock className="w-3 h-3" /><span>Online payment required</span>
            </div>
          </motion.div>
        )}

        {/* Pickup */}
        <label 
          className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
            orderData.deliveryType === "PICKUP" 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-200 hover:border-blue-200"
          }`}
        >
          <input 
            type="radio" 
            name="delivery" 
            value="PICKUP" 
            checked={orderData.deliveryType === "PICKUP"} 
            onChange={() => handleDeliveryTypeChange("PICKUP")} 
            className="w-5 h-5 text-blue-600" 
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Pickup at Store</span>
            </div>
            <p className="text-sm text-gray-500">Collect from our location</p>
          </div>
          <span className="text-sm text-gray-400">Free</span>
        </label>
      </div>
    </div>
  );
};

export default Step2_Delivery;