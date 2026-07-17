// frontend/src/pages/customer/PaymentCancel.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Home, ShoppingBag } from 'lucide-react';

export default function PaymentCancel() {
  const navigate = useNavigate();

  useEffect(() => {
    // VIVA POINT: Automatically redirect the customer to the home page after 5 seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 5000);

    // VIVA POINT: Cleanup the timer on component unmount to prevent memory leaks
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        {/* Warning Icon Container */}
        <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <Clock size={48} className="text-amber-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mt-4">Payment Cancelled</h2>
        <p className="text-gray-500 mt-2">
          Your payment was cancelled. Redirecting to home...
        </p>
        
        {/* Animated Loading Bar */}
        <div className="mt-6">
          <div className="animate-pulse flex justify-center">
            <div className="h-2 w-32 bg-gray-200 rounded-full"></div>
          </div>
        </div>
        
        {/* Navigation Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag size={18} />
            Go to Home
          </button>
          
          <button
            onClick={() => navigate('/orders')}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={18} />
            View My Orders
          </button>
        </div>
      </motion.div>
    </div>
  );
}