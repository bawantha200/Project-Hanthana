// frontend/src/pages/admin/Inventory.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Factory, Package, FlaskConical, ShoppingCart, RefreshCw } from 'lucide-react';
import StockLevels from '../../components/inventory/StockLevels';
import EmptyBottles from '../../components/inventory/EmptyBottles';
import VendorOrders from '../../components/inventory/VendorOrders';
import JITDashboard from '../../components/JITDashboard';
import { inventoryAPI } from '../../services/api';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const tabs = [
  { key: 'stock', label: 'Stock Levels', icon: Package },
  { key: 'empty', label: 'Empty Bottles', icon: FlaskConical },
  { key: 'orders', label: 'Vendor Orders', icon: ShoppingCart },
];

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('stock');
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      console.log('🔄 Fetching inventory data...');

      const [productsRes, vendorsRes] = await Promise.all([
        inventoryAPI.getProductsWithStock(),
        inventoryAPI.getVendors()
      ]);

      console.log('📦 Products response:', productsRes.data);
      console.log('🏢 Vendors response:', vendorsRes.data);

      // Extract data correctly
      const newProducts = productsRes.data?.products || [];
      // Vendors might be in data.vendors or directly in data
      const newVendors = vendorsRes.data?.vendors || vendorsRes.data || [];

      console.log(`✅ Loaded ${newProducts.length} products and ${newVendors.length} vendors`);
      console.log('📊 First vendor:', newVendors[0]);

      setProducts(newProducts);
      setVendors(newVendors);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('❌ Failed to load data:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load data';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-500">Loading inventory data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <h3 className="font-semibold text-lg mb-2">Error Loading Data</h3>
        <p>{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track stock levels, empty bottles, and vendor orders
            </p>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()} | {products.length} products, {vendors.length} vendors
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit flex-wrap"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      

      {activeTab === 'stock' && (
        <StockLevels 
          products={products} 
          onRefresh={handleRefresh}
        />
      )}

      {activeTab === 'empty' && (
        <EmptyBottles 
          products={products}
          onRefresh={handleRefresh}
          loading={loading || refreshing}
        />
      )}

      {activeTab === 'orders' && (
        <VendorOrders 
          vendors={vendors}
          products={products}
          onRefresh={handleRefresh}
          loading={loading || refreshing}
        />
      )}
    </motion.div>
  );
}