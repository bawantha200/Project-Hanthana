// frontend/src/components/FloatingOrderButton/Step4_Success.jsx
import { CheckCircle } from "lucide-react";

const Step4_Success = ({ orderId, resetOrder }) => {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
        <CheckCircle className="w-12 h-12" />
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mt-4">Order Placed Successfully!</h3>
      <p className="text-gray-500 mt-2">Order ID: <span className="font-bold">#{orderId}</span></p>
      <p className="text-sm text-gray-400 mt-1">We'll process your order shortly.</p>
      <button 
        onClick={resetOrder} 
        className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
      >
        Continue Shopping
      </button>
    </div>
  );
};

export default Step4_Success;