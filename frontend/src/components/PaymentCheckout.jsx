// frontend/src/components/PaymentCheckout.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Building2, Wallet, CheckCircle, Loader2 } from 'lucide-react';
import { initiatePayment, redirectToPayHere, getPaymentStatus } from '../services/paymentService';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const paymentMethods = [
  { id: 'CARD', label: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, Amex' },
  { id: 'MOBILE', label: 'Mobile Money', icon: Smartphone, description: 'Dialog, Mobitel, Hutch' },
  { id: 'BANK', label: 'Bank Transfer', icon: Building2, description: 'All major banks' },
  { id: 'WALLET', label: 'Wallet', icon: Wallet, description: 'PayHere Wallet' }
];

export default function PaymentCheckout({ orderId, amount, onSuccess, onCancel }) {
  const [selectedMethod, setSelectedMethod] = useState('CARD');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    // VIVA POINT: Intercept query parameters on mounting if coming back from an explicit redirect
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const order = urlParams.get('order');
    
    if (status && order) {
      handlePaymentResult(status, order);
    }
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);
      // Initiate payment processing sequence token on our backend server
      const paymentData = await initiatePayment(orderId, selectedMethod);
      
      if (paymentData) {
        // VIVA POINT: Safe programmatic web form post redirection to external PayHere merchant checkout
        redirectToPayHere(paymentData);
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentResult = async (status, order) => {
    try {
      const payment = await getPaymentStatus(order);
      setPaymentStatus(payment);
      
      // Status code '2' explicitly tags verified authorization success on PayHere engine network
      if (status === '2' || payment?.status === 'COMPLETED') {
        toast.success('Payment successful!');
        if (onSuccess) onSuccess(order);
      } else if (status === 'cancelled') {
        toast.error('Payment was cancelled');
        if (onCancel) onCancel();
      } else {
        toast.error('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Failed to get payment status:', error);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment Checkout</h2>
        <p className="text-sm text-gray-500 mt-1">Complete your payment securely</p>
      </div>

      {/* Dynamic Summary Card */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Order #{orderId}</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(amount)}</span>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {paymentStatus && (
            <span className={`font-medium ${paymentStatus.status === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600'}`}>
              Status: {paymentStatus.status}
            </span>
          )}
        </div>
      </div>

      {/* Interactive Gateway Channel Grid Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Payment Method
        </label>
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            
            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} className={isSelected ? 'text-blue-600' : 'text-gray-400'} />
                  <span className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                    {method.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{method.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form CTA Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handlePayment}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={18} />
              Pay Now
            </>
          )}
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
          <CheckCircle size={14} className="text-emerald-500" />
          Secured by PayHere SSL encryption
        </p>
      </div>
    </div>
  );
}