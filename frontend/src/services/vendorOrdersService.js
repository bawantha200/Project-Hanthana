// frontend/src/services/vendorOrdersService.js
import api from './api';

export async function getVendorOrders(filters = {}) {
  const params = {};
  if (filters.vendorId) params.vendorId = filters.vendorId;
  if (filters.status) params.status = filters.status;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;

  const response = await api.get('/vendor-orders', { params });
  return normalizeVendorOrderList(response.data);
}

function normalizeVendorOrder(row) {
  if (!row) return row;
  return {
    id: row.id,
    vendorName: row.vendors?.vendor_name || 'Unknown vendor',
    productName: row.products?.name || 'Unknown product',
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
    orderDate: row.order_date,
    deliveryDate: row.delivery_date,
    status: row.status,
    orderType: row.order_type,
  };
}

function normalizeVendorOrderList(rows) {
  return (rows || []).map(normalizeVendorOrder);
}