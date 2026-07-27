// frontend/src/components/FloatingOrderButton/hooks/useDeliveryFee.js
import { useState } from "react";
import { calculateDeliveryFee } from "../../../services/ordersService";

export const useDeliveryFee = () => {
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryDuration, setDeliveryDuration] = useState(0);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [deliveryFeeMessage, setDeliveryFeeMessage] = useState('');

  const calculateFee = async (address, subtotal) => {
    if (!address || address.trim().length < 5) {
      setDeliveryCharge(0);
      setDeliveryDistance(0);
      setDeliveryDuration(0);
      setDeliveryFeeMessage('Enter a valid address');
      return;
    }

    setIsCalculatingFee(true);
    try {
      const response = await calculateDeliveryFee(address, subtotal);
      if (response.success && response.data) {
        const { delivery_fee, distance_km, duration_minutes, message } = response.data;
        setDeliveryCharge(typeof delivery_fee === 'number' ? delivery_fee : 0);
        setDeliveryDistance(typeof distance_km === 'number' ? distance_km : 0);
        setDeliveryDuration(typeof duration_minutes === 'number' ? duration_minutes : 0);
        setDeliveryFeeMessage(message || '');
      } else {
        setDeliveryCharge(0);
        setDeliveryDistance(0);
        setDeliveryDuration(0);
        setDeliveryFeeMessage('Using default delivery charge');
      }
    } catch (error) {
      console.error('[useDeliveryFee] Error:', error);
      setDeliveryCharge(0);
      setDeliveryDistance(0);
      setDeliveryDuration(0);
      setDeliveryFeeMessage('Using default delivery charge');
    } finally {
      setIsCalculatingFee(false);
    }
  };

  return {
    deliveryCharge,
    setDeliveryCharge,
    deliveryDistance,
    setDeliveryDistance,
    deliveryDuration,
    setDeliveryDuration,
    isCalculatingFee,
    setIsCalculatingFee,
    deliveryFeeMessage,
    setDeliveryFeeMessage,
    calculateFee,
  };
};