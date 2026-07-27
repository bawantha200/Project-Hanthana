// frontend/src/components/FloatingOrderButton/hooks/useOrderData.js
import { useState } from "react";

export const useOrderData = () => {
  const [orderData, setOrderData] = useState({
    items: {},
    deliveryType: null,
    address: "",
    latitude: null,
    longitude: null,
    locationAddress: "",
  });
  
  const [products, setProducts] = useState([]);
  const [savedAddress, setSavedAddress] = useState({ address: "" });
  const [subtotal, setSubtotal] = useState(0);

  return {
    orderData,
    setOrderData,
    products,
    setProducts,
    savedAddress,
    setSavedAddress,
    subtotal,
    setSubtotal,
  };
};