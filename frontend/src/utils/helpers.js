export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rs. 0.00';

  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
};

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "active":
    case "delivered":
      return "bg-green-100 text-green-700";

    case "pending":
    case "processing":
      return "bg-yellow-100 text-yellow-700";

    case "cancelled":
    case "inactive":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const getRoleColor = (role) => {
  switch (role?.toLowerCase()) {
    case "admin":
      return "bg-purple-100 text-purple-700";

    case "manager":
      return "bg-blue-100 text-blue-700";

    case "employee":
      return "bg-green-100 text-green-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};