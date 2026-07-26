// frontend/src/components/FloatingOrderButton/Step1_Products.jsx
import { motion } from "framer-motion";
import { Droplet } from "lucide-react";

const Step1_Products = ({ products, orderData, setOrderData, subtotal, itemCount }) => {
  const handleQuantity = (productId, increment) => {
    setOrderData(prev => {
      const current = prev.items[productId] || 0;
      const newQty = Math.max(0, current + increment);
      const items = { ...prev.items };
      if (newQty === 0) delete items[productId];
      else items[productId] = newQty;
      return { ...prev, items };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Choose Your Water</h3>
        <span className="text-sm text-gray-400">{products.length} products</span>
      </div>
      <div className="space-y-3 max-h-72 overflow-y-auto order-scroll pr-2">
        {products.map((product) => {
          const qty = orderData.items[product.id] || 0;
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                qty > 0 ? "border-blue-300 bg-blue-50/50" : "border-gray-100 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-blue-600">
                    <Droplet className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">Rs. {product.unit_price.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button 
                  onClick={() => handleQuantity(product.id, -1)} 
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xl font-bold transition"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold">{qty}</span>
                <button 
                  onClick={() => handleQuantity(product.id, 1)} 
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-xl font-bold transition"
                >
                  +
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm text-gray-500">Items: {itemCount}</span>
        <span className="text-lg font-bold">Rs. {subtotal.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default Step1_Products;