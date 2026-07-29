// frontend/src/pages/customer/PickupConfirmation.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Store, Banknote, Clock, MapPin, 
  Printer, Download, Phone, Mail, Globe, Info,
  Home, ShoppingBag, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

// Default company settings
const defaultSettings = {
  companyName: 'Hanthana Water',
  contactPhone: '+94 76 835 6860',
  contactEmail: 'info@hanthana.com',
  address: 'Ja Ela, Sri Lanka',
  website: 'www.hanthanawater.com'
};

export default function PickupConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPrinting, setIsPrinting] = useState(false);
//   const [timeLeft, setTimeLeft] = useState(100);
  const [companySettings, setCompanySettings] = useState(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const invoiceRef = useRef(null);
  
  // Get order data from location state
  const { orderId, orderedItems, subtotal, total, orderData } = location.state || {
    orderId: null,
    orderedItems: [],
    subtotal: 0,
    total: 0,
    orderData: { deliveryType: 'PICKUP' }
  };

  // Fetch company settings
  useEffect(() => {
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
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchCompanySettings();
  }, []);

  // Auto-redirect after 10 seconds
  useEffect(() => {
    if (!orderId) {
      navigate('/');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderId, navigate]);

  // Download invoice as PNG
  const downloadInvoice = async () => {
    if (!invoiceRef.current) return;
    setIsPrinting(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `invoice-${orderId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Invoice downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download invoice');
    } finally {
      setIsPrinting(false);
    }
  };

  // Print invoice
  const printInvoice = async () => {
    if (!invoiceRef.current) return;
    setIsPrinting(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
      
      if (!printWindow) {
        toast.error('Please allow popups to print');
        setIsPrinting(false);
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
              @media print { body { padding: 0; } img { box-shadow: none; } }
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
      toast.success('Invoice ready for printing');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print invoice');
    } finally {
      setIsPrinting(false);
    }
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

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        {/* Auto-redirect banner */}
        {/* <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-sm text-blue-700">
            Redirecting to home in <span className="font-bold">{timeLeft}</span> seconds
          </p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 10, ease: "linear" }}
            />
          </div>
        </div> */}

        {/* Invoice Card */}
        <div ref={invoiceRef} className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header with Dynamic Company Details */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200">
            <div className="flex items-center gap-4">
              <img 
                src="/images/logo.png" 
                alt={companySettings.companyName} 
                className="h-16 w-auto object-contain"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%232563eb" stroke-width="2"%3E%3Cpath d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"%3E%3C/path%3E%3C/svg%3E';
                }}
              />
              <div className="text-left">
                <h4 className="text-xl font-bold text-gray-900">{companySettings.companyName}</h4>
                <p className="text-xs text-gray-500">Pure & Natural Spring Water</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-blue-600">INVOICE</div>
              <div className="text-xs text-gray-500">#{String(orderId).padStart(6, '0')}</div>
            </div>
          </div>

          {/* Company Contact Info - Dynamic */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-gray-50 rounded-lg text-xs">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Phone size={14} className="text-blue-600 flex-shrink-0" />
              <span className="text-gray-600">{companySettings.contactPhone}</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Mail size={14} className="text-blue-600 flex-shrink-0" />
              <span className="text-gray-600">{companySettings.contactEmail}</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Globe size={14} className="text-blue-600 flex-shrink-0" />
              <span className="text-gray-600">{companySettings.website}</span>
            </div>
          </div>

          {/* Success Badge */}
          <div className="mt-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
            <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Order Confirmed!</p>
              <p className="text-xs text-green-600">Please collect from store</p>
            </div>
          </div>

          {/* Order Info Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs text-gray-500">Order Date</p>
              <p className="text-sm font-medium text-gray-800">
                {formatDate(new Date().toISOString())}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Order Type</p>
              <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                <Store size={14} className="text-blue-600" />
                Pickup at Store
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Method</p>
              <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                <Banknote size={14} className="text-green-600" />
                Cash on Pickup
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Status</p>
              <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
                <Clock size={14} />
                Pending
              </p>
            </div>
          </div>

          {/* Order Items Table */}
          {orderedItems.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Order Items</h5>
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
                    {orderedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-800 truncate max-w-[120px]">{item.name}</td>
                        <td className="px-4 py-2 text-center text-gray-600">×{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-gray-600">Rs. {item.unit_price?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-2 text-right font-medium">Rs. {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoice Summary */}
          <div className="mt-4 pt-3 border-t-2 border-gray-200">
            <div className="flex justify-end">
              <div className="w-56 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-blue-600">Rs. {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Important Note with Dynamic Store Address */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Pickup Instructions</p>
                <p className="text-sm text-blue-700">
                  Please show this invoice to the cashier when you visit the store to pick up your order.
                  Have your payment ready.
                </p>
                <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                  <MapPin size={14} /> Store: {companySettings.address}
                </p>
              </div>
            </div>
          </div>

          {/* Footer with Dynamic Company Details */}
          <div className="mt-4 pt-3 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400">Thank you for choosing {companySettings.companyName}!</p>
            <p className="text-xs text-gray-400 mt-0.5">Visit us at: {companySettings.website}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={downloadInvoice}
            disabled={isPrinting}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Download size={16} />
            Download PNG
          </button>
          <button
            onClick={printInvoice}
            disabled={isPrinting}
            className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Printer size={16} />
            Print Invoice
          </button>
        </div>

        {/* Manual redirect buttons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium flex items-center justify-center gap-2 text-sm"
          >
            <Home size={16} />
            Go Home Now
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingBag size={16} />
            View Orders
          </button>
        </div>
      </motion.div>
    </div>
  );
}