// frontend/src/pages/customer/PaymentResult.jsx
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle, XCircle, Clock, Package, Home, ShoppingBag, Loader2, 
  Printer, Download, Truck, Droplet, MapPin, Calendar, CreditCard,
  Phone, Mail, Globe
} from 'lucide-react';
import { getPaymentStatus } from '../../services/paymentService';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import html2canvas from 'html2canvas';

// Default company settings
const defaultSettings = {
  companyName: 'Hanthana Water',
  contactPhone: '+94 123 456 789',
  contactEmail: 'info@hanthanawater.com',
  address: '123 Main Street, Kandy, Sri Lanka',
  website: 'www.hanthanawater.com'
};

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [companySettings, setCompanySettings] = useState(defaultSettings);
  
  const invoiceRef = useRef(null);
  
  // VIVA POINT 1: PayHere gateways send 'order_id' parameter, fallback to 'order'
  const rawOrderId = searchParams.get('order_id') || searchParams.get('order');
  const status = searchParams.get('status');

  // VIVA POINT 2: PayHere passes the padded string (e.g. "000213"). 
  // We parse it into an integer (213) to match our Database structure type.
  const orderId = rawOrderId ? parseInt(rawOrderId, 10) : null;

  useEffect(() => {
    if (orderId) {
      loadPaymentStatus();
      loadOrderDetails();
      fetchCompanySettings();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  // Fetch company settings
  const fetchCompanySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('http://localhost:5000/api/settings/public', {
        headers,
      });
      const data = await response.json();

      if (data.success && data.data.general) {
        const general = data.data.general;
        setCompanySettings({
          companyName: general.companyName || defaultSettings.companyName,
          contactPhone: general.contactPhone || 
                       general.companyPhone || 
                       defaultSettings.contactPhone,
          contactEmail: general.contactEmail || 
                       general.companyEmail || 
                       defaultSettings.contactEmail,
          address: general.address || defaultSettings.address,
          website: general.website || defaultSettings.website,
        });
      }
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
      // Keep using default settings
    }
  };

  const loadPaymentStatus = async () => {
    try {
      setLoading(true);
      
      // Fetch status via custom backend API using numeric order ID
      const paymentData = await getPaymentStatus(orderId);
      setPayment(paymentData);
    } catch (error) {
      console.error('Failed to load payment status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async () => {
    try {
      // Fetch latest order details directly from Supabase Database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            sub_total,
            products (
              id,
              name,
              unit_price,
              image_url
            )
          )
        `)
        .eq('id', orderId)
        .single();
      
      if (!orderError && order) {
        setOrderDetails(order);
        setDeliveryFee(order.delivery_fee || 0);
        
        // Format order items
        if (order.order_items) {
          const items = order.order_items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            subTotal: item.sub_total,
            product: item.products ? {
              id: item.products.id,
              name: item.products.name,
              unitPrice: item.products.unit_price,
              imageUrl: item.products.image_url
            } : null
          }));
          setOrderItems(items);
          
          // Calculate subtotal
          const total = items.reduce((sum, item) => sum + (item.subTotal || 0), 0);
          setSubtotal(total);
        }
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
    }
  };

  // VIVA POINT 3: Dynamic fallback validation. Checks all potential states:
  // - status === '2' means PayHere gateway confirmed success via URL query
  // - payment status or order payment status inside Supabase DB is marked 'COMPLETED'
  const isSuccess = 
    status === '2' || 
    payment?.status === 'COMPLETED' || 
    orderDetails?.payment_status === 'COMPLETED';

  const isCancelled = status === 'cancelled' || status === '-1';

  const total = subtotal + deliveryFee;

  // Helper function to get order type display
  const getOrderTypeDisplay = (type) => {
    return type === 'HOME_DELIVERY' ? 'Home Delivery' : 'Pickup at Store';
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get payment method icon
  const getPaymentMethodIcon = (method) => {
    if (method === 'ONLINE') return <CreditCard size={16} className="text-blue-600" />;
    if (method === 'CASH') return <Droplet size={16} className="text-green-600" />;
    return <CreditCard size={16} className="text-gray-600" />;
  };

  // Print invoice function
  const handlePrintInvoice = async () => {
    if (!invoiceRef.current) return;
    
    setIsPrinting(true);
    try {
      // Wait for any pending renders
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        useCORS: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        toast.error('Please allow popups for printing');
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice #${orderId}</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; font-family: Arial, sans-serif; }
              img { max-width: 100%; height: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              @media print {
                body { padding: 0; }
                img { box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <img src="${imgData}" alt="Invoice" />
            <script>
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 500);
              }, 500);
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Print failed:', error);
      toast.error('Failed to print invoice');
    } finally {
      setIsPrinting(false);
    }
  };

  // Download invoice as PNG
  const handleDownloadInvoice = async () => {
    if (!invoiceRef.current) return;
    
    setIsPrinting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        useCORS: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
      });
      
      const link = document.createElement('a');
      link.download = `invoice-${orderId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download invoice');
    } finally {
      setIsPrinting(false);
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Invoice Content - Hidden during loading */}
      {isSuccess && (
        <>
          {/* Invoice Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full"
          >
            {/* Invoice Content */}
            <div ref={invoiceRef} className="bg-white rounded-2xl shadow-xl p-8">
              {/* Header with Dynamic Company Details */}
              <div className="flex items-center justify-between pb-6 border-b-2 border-gray-200">
                <div className="flex items-center gap-4">
                  <img 
                    src="/images/logo.png" 
                    alt={companySettings.companyName} 
                    className="h-16 w-auto object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%232563eb" stroke-width="2"%3E%3Cpath d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"%3E%3C/path%3E%3C/svg%3E';
                    }}
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {companySettings.companyName}
                    </h1>
                    <p className="text-sm text-gray-500">Pure & Natural Spring Water</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-600">INVOICE</div>
                  <div className="text-xs text-gray-500">#{String(orderId).padStart(6, '0')}</div>
                </div>
              </div>

              {/* Company Contact Info */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-blue-600 flex-shrink-0" />
                  <span className="text-gray-600">{companySettings.contactPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-blue-600 flex-shrink-0" />
                  <span className="text-gray-600">{companySettings.contactEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-blue-600 flex-shrink-0" />
                  <span className="text-gray-600">{companySettings.website}</span>
                </div>
              </div>

              {/* Success Badge */}
              <div className="mt-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Payment Successful!</p>
                  <p className="text-sm text-green-600">Your order has been confirmed</p>
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500">Order Date</p>
                  <p className="text-sm font-medium">{formatDate(orderDetails?.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Order Type</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    {orderDetails?.order_type === 'HOME_DELIVERY' ? (
                      <Truck size={14} className="text-blue-600" />
                    ) : (
                      <Droplet size={14} className="text-blue-600" />
                    )}
                    {getOrderTypeDisplay(orderDetails?.order_type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment Method</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    {getPaymentMethodIcon(orderDetails?.payment_method)}
                    {orderDetails?.payment_method || 'Online'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment Status</p>
                  <p className="text-sm font-medium text-green-600">Paid</p>
                </div>
              </div>

              {/* Delivery Address for Home Delivery */}
              {orderDetails?.order_type === 'HOME_DELIVERY' && orderDetails?.delivery_location && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Delivery Address</p>
                      <p className="text-sm text-gray-700">{orderDetails.delivery_location}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items Table */}
              {orderItems.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h4>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orderItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-800">{item.product?.name || 'Product'}</td>
                            <td className="px-4 py-2 text-center text-gray-600">×{item.quantity}</td>
                            <td className="px-4 py-2 text-right text-gray-600">
                              {formatCurrency(item.product?.unitPrice || 0)}
                            </td>
                            <td className="px-4 py-2 text-right font-medium">
                              {formatCurrency(item.subTotal || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invoice Summary */}
              <div className="mt-6 pt-4 border-t-2 border-gray-200">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {orderDetails?.order_type === 'HOME_DELIVERY' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Delivery Fee</span>
                        <span className={`font-medium ${deliveryFee > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                          {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Free'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Total</span>
                      <span className="text-blue-600">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with Dynamic Company Details */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400">
                  Thank you for choosing {companySettings.companyName}!
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  <span className="inline-flex items-center gap-1 mx-2">
                    <Phone size={10} /> {companySettings.contactPhone}
                  </span>
                  <span className="inline-flex items-center gap-1 mx-2">
                    <Mail size={10} /> {companySettings.contactEmail}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {companySettings.address}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePrintInvoice}
                disabled={isPrinting}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPrinting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Printer size={18} />
                )}
                Print Invoice
              </button>
              <button
                onClick={handleDownloadInvoice}
                disabled={isPrinting}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download size={18} />
                Download Invoice
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Package size={18} />
                View Orders
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* Cancelled View */}
      {isCancelled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
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
        </motion.div>
      )}

      {/* Failed View */}
      {!isSuccess && !isCancelled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
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
        </motion.div>
      )}
    </div>
  );
}