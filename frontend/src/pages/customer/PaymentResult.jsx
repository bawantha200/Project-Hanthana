// frontend/src/pages/customer/PaymentResult.jsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Package, Home, ShoppingBag, Loader2 } from 'lucide-react';
import { getPaymentStatus } from '../../services/paymentService';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  
  // VIVA POINT 1: PayHere gateways send 'order_id' parameter, fallback to 'order'
  const rawOrderId = searchParams.get('order_id') || searchParams.get('order');
  const status = searchParams.get('status');

  // VIVA POINT 2: PayHere passes the padded string (e.g. "000213"). 
  // We parse it into an integer (213) to match our Database structure type.
  const orderId = rawOrderId ? parseInt(rawOrderId, 10) : null;

  useEffect(() => {
    if (orderId) {
      loadPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const loadPaymentStatus = async () => {
    try {
      setLoading(true);
      
      // Fetch status via custom backend API using numeric order ID
      const paymentData = await getPaymentStatus(orderId);
      setPayment(paymentData);
      
      // Fetch latest order details directly from Supabase Database
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (!error) setOrderDetails(order);
    } catch (error) {
      // VIVA POINT: Sometimes IPN (Instant Payment Notification) takes a few seconds 
      // to update the DB. So we catch the error gracefully without crashing the UI.
      console.error('Failed to load payment status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Processing your payment...</p>
        </div>
      </div>
    );
  }

  // VIVA POINT 3: Dynamic fallback validation. Checks all potential states:
  // - status === '2' means PayHere gateway confirmed success via URL query
  // - payment status or order payment status inside Supabase DB is marked 'COMPLETED'
  const isSuccess = 
    status === '2' || 
    payment?.status === 'COMPLETED' || 
    orderDetails?.payment_status === 'COMPLETED';

  const isCancelled = status === 'cancelled' || status === '-1';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        {isSuccess ? (
          <>
            {/* SUCCESS VIEW */}
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle size={48} className="text-green-600" />
              </div>
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mt-4">Payment Successful! 🎉</h2>
            <p className="text-gray-500 mt-2">Your order #{orderId} has been confirmed</p>
            
            {/* Receipt Summary Breakdown */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order ID</span>
                <span className="font-medium text-blue-600">#{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium">{formatCurrency(payment?.amount || orderDetails?.total_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-medium capitalize">{payment?.payment_method || 'Online'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-green-600">Paid</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button onClick={() => navigate('/orders')} className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <Package size={18} /> View My Orders
              </button>
              <button onClick={() => navigate('/')} className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                <Home size={18} /> Continue Shopping
              </button>
            </div>
          </>
        ) : isCancelled ? (
          <>
            {/* CANCELLED VIEW */}
            <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Clock size={48} className="text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-4">Payment Cancelled</h2>
            <p className="text-gray-500 mt-2">You cancelled the payment for order #{orderId}</p>
            <div className="mt-6 space-y-3">
              <button onClick={() => navigate('/')} className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <ShoppingBag size={18} /> Try Again
              </button>
              <button onClick={() => navigate('/')} className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                <Home size={18} /> Go Home
              </button>
            </div>
          </>
        ) : (
          <>
            {/* FAILED VIEW */}
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle size={48} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-4">Payment Failed</h2>
            <p className="text-gray-500 mt-2">There was an issue processing your payment</p>
            <div className="mt-6 space-y-3">
              <button onClick={() => navigate('/')} className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <ShoppingBag size={18} /> Try Again
              </button>
              <button onClick={() => navigate('/')} className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                <Home size={18} /> Go Home
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}