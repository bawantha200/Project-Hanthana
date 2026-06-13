// Mock data aligned with Water Management ERP structure

export const financialData = [
  { month: 'Jan', income: 285000, expenses: 237000, profit: 48000, vehicleCosts: 35000, bottleCosts: 85000, salaryCosts: 117000 },
  { month: 'Feb', income: 310000, expenses: 247000, profit: 63000, vehicleCosts: 38000, bottleCosts: 92000, salaryCosts: 117000 },
  { month: 'Mar', income: 295000, expenses: 238000, profit: 57000, vehicleCosts: 33000, bottleCosts: 88000, salaryCosts: 117000 },
  { month: 'Apr', income: 340000, expenses: 257000, profit: 83000, vehicleCosts: 42000, bottleCosts: 98000, salaryCosts: 117000 },
  { month: 'May', income: 365000, expenses: 267000, profit: 98000, vehicleCosts: 45000, bottleCosts: 105000, salaryCosts: 117000 },
  { month: 'Jun', income: 390000, expenses: 277000, profit: 113000, vehicleCosts: 48000, bottleCosts: 112000, salaryCosts: 117000 },
];

export const branchPerformance = [
  { branch: 'Mumbai Central', orders: 420, revenue: 156000, growth: 12 },
  { branch: 'Pune West', orders: 310, revenue: 118000, growth: 8 },
  { branch: 'Delhi North', orders: 380, revenue: 142000, growth: 15 },
  { branch: 'Bangalore East', orders: 290, revenue: 98000, growth: 6 },
  { branch: 'Hyderabad South', orders: 250, revenue: 87000, growth: -2 },
];

export const orderGrowth = [
  { month: 'Jan', orders: 180, delivered: 165 },
  { month: 'Feb', orders: 210, delivered: 198 },
  { month: 'Mar', orders: 195, delivered: 180 },
  { month: 'Apr', orders: 240, delivered: 225 },
  { month: 'May', orders: 265, delivered: 250 },
  { month: 'Jun', orders: 290, delivered: 278 },
];

export const waterUsagePrediction = [
  { month: 'Jan', actual: 1800, predicted: 1900 },
  { month: 'Feb', actual: 2100, predicted: 2050 },
  { month: 'Mar', actual: 1950, predicted: 2000 },
  { month: 'Apr', actual: 2400, predicted: 2350 },
  { month: 'May', actual: 2650, predicted: 2600 },
  { month: 'Jun', actual: 0, predicted: 2900 },
];

export const recentOrders = [
  { id: 'ORD-2401', customer: 'Rahul Verma', branch: 'Mumbai Central', amount: 180, status: 'Delivered', date: '2026-05-04', product: '19L Refill', qty: 3 },
  { id: 'ORD-2402', customer: 'Sneha Patil', branch: 'Pune West', amount: 200, status: 'Delivered', date: '2026-05-06', product: '1L Sealed Bottle', qty: 5 },
  { id: 'ORD-2403', customer: 'Amit Kumar', branch: 'Delhi North', amount: 120, status: 'Preparing', date: '2026-05-08', product: '19L Refill', qty: 2 },
  { id: 'ORD-2404', customer: 'Priya Sharma', branch: 'Bangalore East', amount: 480, status: 'Pending', date: '2026-05-09', product: '5L Sealed Bottle', qty: 4 },
  { id: 'ORD-2405', customer: 'Vikram Singh', branch: 'Hyderabad South', amount: 350, status: 'Pending', date: '2026-05-09', product: '19L New Bottle', qty: 1 },
  { id: 'ORD-2406', customer: 'Neha Gupta', branch: 'Mumbai Central', amount: 250, status: 'Preparing', date: '2026-05-09', product: '500ml Sealed Bottle', qty: 10 },
  { id: 'ORD-2407', customer: 'Kiran Rao', branch: 'Delhi North', amount: 720, status: 'Delivered', date: '2026-05-07', product: '5L Sealed Bottle', qty: 6 },
  { id: 'ORD-2408', customer: 'Deepak Nair', branch: 'Pune West', amount: 60, status: 'Delivered', date: '2026-05-05', product: '19L Refill', qty: 1 },
];

export const inventoryData = [
  { id: 1, product: '500ml Sealed Bottle', type: 'sealed', stock: 450, predicted: 520, price: 25, unit: 'bottle', status: 'low' },
  { id: 2, product: '1L Sealed Bottle', type: 'sealed', stock: 320, predicted: 380, price: 40, unit: 'bottle', status: 'low' },
  { id: 3, product: '5L Sealed Bottle', type: 'sealed', stock: 180, predicted: 210, price: 120, unit: 'bottle', status: 'low' },
  { id: 4, product: '19L Refill', type: 'refill', stock: 600, predicted: 750, price: 60, unit: 'refill', status: 'low' },
  { id: 5, product: '19L New Bottle', type: 'sealed', stock: 95, predicted: 120, price: 350, unit: 'bottle', status: 'low' },
  { id: 6, product: '500ml Sealed Bottle', type: 'sealed', stock: 580, predicted: 520, price: 25, unit: 'bottle', status: 'ok' },
  { id: 7, product: '1L Sealed Bottle', type: 'sealed', stock: 400, predicted: 380, price: 40, unit: 'bottle', status: 'ok' },
  { id: 8, product: '19L Refill', type: 'refill', stock: 800, predicted: 750, price: 60, unit: 'refill', status: 'ok' },
];

export const emptyBottleData = [
  { id: 1, product: '19L Empty Bottle', stock: 340, branch: 'Mumbai Central', status: 'ok' },
  { id: 2, product: '19L Empty Bottle', stock: 120, branch: 'Pune West', status: 'low' },
  { id: 3, product: '19L Empty Bottle', stock: 280, branch: 'Delhi North', status: 'ok' },
  { id: 4, product: '5L Empty Bottle', stock: 90, branch: 'Bangalore East', status: 'low' },
  { id: 5, product: '1L Empty Bottle', stock: 450, branch: 'Hyderabad South', status: 'ok' },
];

export const vendorData = [
  { id: 1, name: 'AquaPure Suppliers', contact: 'Rajesh Kumar', phone: '+91-9876543210', email: 'rajesh@aquapure.com', supplyType: 'Sealed Bottles', lastDelivery: '2026-05-01', status: 'active' },
  { id: 2, name: 'Crystal Water Co.', contact: 'Priya Sharma', phone: '+91-9876543211', email: 'priya@crystalwater.com', supplyType: 'Sealed Bottles', lastDelivery: '2026-04-28', status: 'active' },
  { id: 3, name: 'PureDrop Logistics', contact: 'Amit Patel', phone: '+91-9876543212', email: 'amit@puredrop.com', supplyType: 'Refill Supply', lastDelivery: '2026-05-03', status: 'active' },
  { id: 4, name: 'BlueSource Industries', contact: 'Neha Gupta', phone: '+91-9876543213', email: 'neha@bluesource.com', supplyType: 'Empty Bottles', lastDelivery: '2026-04-25', status: 'inactive' },
  { id: 5, name: 'HydroMax Corp', contact: 'Suresh Menon', phone: '+91-9876543214', email: 'suresh@hydromax.com', supplyType: 'Sealed Bottles', lastDelivery: '2026-05-05', status: 'active' },
];




export const deliveryData = [
  { id: 'DEL-001', orderId: 'ORD-2403', driver: 'Suresh Menon', vehicle: 'Truck MH-12-AB-1234', status: 'On Route', currentLocation: 'Highway 4, Near Pune', branch: 'Mumbai Central', eta: '30 mins', customer: 'Amit Kumar' },
  { id: 'DEL-002', orderId: 'ORD-2406', driver: 'Vikram Singh', vehicle: 'Van DL-05-CD-5678', status: 'Dispatched', currentLocation: 'Warehouse, Delhi North', branch: 'Delhi North', eta: '1 hr', customer: 'Neha Gupta' },
  { id: 'DEL-003', orderId: 'ORD-2404', driver: 'Meera Joshi', vehicle: 'Truck KA-01-EF-9012', status: 'Preparing', currentLocation: 'Warehouse, Bangalore East', branch: 'Bangalore East', eta: '2 hrs', customer: 'Priya Sharma' },
  { id: 'DEL-004', orderId: 'ORD-2405', driver: 'Kiran Rao', vehicle: 'Van TS-08-GH-3456', status: 'Preparing', currentLocation: 'Warehouse, Hyderabad South', branch: 'Hyderabad South', eta: '3 hrs', customer: 'Vikram Singh' },
  { id: 'DEL-005', orderId: 'ORD-2401', driver: 'Suresh Menon', vehicle: 'Truck MH-12-AB-1234', status: 'Delivered', currentLocation: 'Customer Location, Mumbai', branch: 'Mumbai Central', eta: 'Delivered', customer: 'Rahul Verma' },
  { id: 'DEL-006', orderId: 'ORD-2402', driver: 'Suresh Menon', vehicle: 'Truck MH-12-AB-1234', status: 'Delivered', currentLocation: 'Customer Location, Pune', branch: 'Pune West', eta: 'Delivered', customer: 'Sneha Patil' },
];


export const branchLocations = [
  { name: 'Mumbai Central', address: '42 Marine Drive, Mumbai 400001', phone: '+91-22-12345678', hours: 'Mon-Sat: 7AM-9PM' },
  { name: 'Pune West', address: '15 FC Road, Pune 411004', phone: '+91-20-23456789', hours: 'Mon-Sat: 7AM-9PM' },
  { name: 'Delhi North', address: '78 Connaught Place, New Delhi 110001', phone: '+91-11-34567890', hours: 'Mon-Sat: 7AM-9PM' },
  { name: 'Bangalore East', address: '23 Koramangala, Bangalore 560034', phone: '+91-80-45678901', hours: 'Mon-Sat: 7AM-9PM' },
  { name: 'Hyderabad South', address: '56 Jubilee Hills, Hyderabad 500033', phone: '+91-40-56789012', hours: 'Mon-Sat: 7AM-9PM' },
];


export const customerOrders = [
  { id: 'ORD-2401', product: '19L Refill', qty: 3, amount: 180, status: 'Delivered', date: '2026-05-04', delivery: { status: 'Delivered', location: 'Customer Location', driver: 'Suresh Menon', vehicle: 'Truck MH-12-AB-1234', eta: 'Delivered' } },
  { id: 'ORD-2402', product: '1L Sealed Bottle', qty: 5, amount: 200, status: 'Delivered', date: '2026-05-06', delivery: { status: 'Delivered', location: 'Customer Location', driver: 'Suresh Menon', vehicle: 'Truck MH-12-AB-1234', eta: 'Delivered' } },
  { id: 'ORD-2403', product: '19L Refill', qty: 2, amount: 120, status: 'Preparing', date: '2026-05-08', delivery: { status: 'On Route', location: 'Highway 4, Near Pune', driver: 'Suresh Menon', vehicle: 'Truck MH-12-AB-1234', eta: '30 mins' } },
  { id: 'ORD-2406', product: '500ml Sealed Bottle', qty: 10, amount: 250, status: 'Preparing', date: '2026-05-09', delivery: { status: 'Dispatched', location: 'Warehouse, Delhi North', driver: 'Vikram Singh', vehicle: 'Van DL-05-CD-5678', eta: '1 hr' } },
];

export const products = [
  { id: 1, name: '500ml Sealed Bottle', price: 25, type: 'sealed', description: 'Pure mineral water in convenient 500ml bottles', image: 'https://images.pexels.com/photos/3184180/pexels-photo-3184180.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 2, name: '1L Sealed Bottle', price: 40, type: 'sealed', description: 'Premium 1-liter sealed water bottles', image: 'https://images.pexels.com/photos/3184180/pexels-photo-3184180.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 3, name: '5L Sealed Bottle', price: 120, type: 'sealed', description: 'Family-size 5-liter water bottles', image: 'https://images.pexels.com/photos/3184180/pexels-photo-3184180.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 4, name: '19L Refill', price: 60, type: 'refill', description: 'Economical 19L water refill service', image: 'https://images.pexels.com/photos/3184180/pexels-photo-3184180.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 5, name: '19L New Bottle', price: 350, type: 'sealed', description: 'New 19L water bottle with first fill', image: 'https://images.pexels.com/photos/3184180/pexels-photo-3184180.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

export const services = [
  { id: 1, name: 'Sealed Bottle Delivery', description: 'Fresh sealed water bottles delivered to your doorstep. Available in 500ml, 1L, 5L, and 19L sizes.', icon: 'Package', features: ['Multiple sizes', 'Same-day delivery', 'Bulk discounts'] },
  { id: 2, name: 'Water Refill Service', description: 'Eco-friendly 19L water refill service. We collect empty bottles and deliver fresh refills.', icon: 'Droplets', features: ['Eco-friendly', 'Scheduled refills', 'Subscription plans'] },
  { id: 3, name: 'Office Water Supply', description: 'Dedicated water supply for offices and commercial spaces with regular delivery schedules.', icon: 'Building', features: ['Corporate plans', 'Regular schedule', 'Priority delivery'] },
  { id: 4, name: 'Bulk Distribution', description: 'Large-scale water distribution for events, construction sites, and industrial needs.', icon: 'Truck', features: ['Volume discounts', 'Flexible scheduling', 'Dedicated fleet'] },
  { id: 5, name: 'Emergency Delivery', description: 'Urgent water delivery within 2 hours. Available 24/7 for critical situations.', icon: 'Siren', features: ['2-hour delivery', '24/7 availability', 'Priority dispatch'] },
];

export const testimonials = [
  { id: 1, name: 'Rahul Verma', role: 'Regular Customer', text: 'Hanthana has been delivering water to my home for over a year. Always on time, always fresh. The tracking feature is fantastic!', rating: 5 },
  { id: 2, name: 'Priya Sharma', role: 'Office Manager', text: 'We switched to Hanthana for our office supply and the service has been exceptional. The corporate plan saves us money every month.', rating: 5 },
  { id: 3, name: 'Amit Kumar', role: 'Restaurant Owner', text: 'Reliable bulk delivery for our restaurant. The emergency delivery service saved us more than once during peak season.', rating: 4 },
  { id: 4, name: 'Sneha Patil', role: 'Residential Customer', text: 'Love the refill service! Eco-friendly and economical. The delivery drivers are always courteous and professional.', rating: 5 },
];


export const companyTimeline = [
  { year: '2018', title: 'Founded', description: 'Hanthana started operations in Sri Lanka, serving 50 customers.' },
  { year: '2019', title: 'Expansion', description: 'Expanded services across the Western Province, reaching 500+ customers.' },
  { year: '2020', title: 'Digital Platform', description: 'Launched online ordering and delivery tracking system.' },
  { year: '2021', title: 'National Reach', description: 'Expanded services to multiple regions across Sri Lanka.' },
  { year: '2022', title: '10,000 Customers', description: 'Reached the milestone of 10,000 active customers across Sri Lanka.' },
  { year: '2023', title: 'Service Expansion', description: 'expanded services to cover all 25 districts of Sri Lanka.' },
  { year: '2024', title: 'ERP System', description: 'Deployed enterprise resource planning for streamlined operations.' },
];

export const teamMembers = [
  { name: 'Dilshan Perera', role: 'CEO & Founder', description: 'Visionary leader with 15+ years in water management industry.' },
  { name: 'Dr. Chamari Wickramasinghe', role: 'CTO', description: 'Tech innovator driving digital transformation and system integration.' },
  { name: 'Nuwan Jayawardena', role: 'COO', description: 'Operations expert managing company-wide logistics and 200+ employees.' },
  { name: 'Thilini Fernando', role: 'CFO', description: 'Financial strategist with expertise in scaling operations.' },
];

export const users = [
  { id: 'u1', name: 'Admin User', email: 'admin@Hanthana.com', role: 'ADMIN', status: 'active', branch: 'All Branches', lastLogin: '2026-05-09' },
  { id: 'u2', name: 'Deepak Nair', email: 'deepak@Hanthana.com', role: 'MANAGER', status: 'active', branch: 'Mumbai Central', lastLogin: '2026-05-09' },
  { id: 'u3', name: 'Raj Malhotra', email: 'raj@Hanthana.com', role: 'MANAGER', status: 'active', branch: 'Delhi North', lastLogin: '2026-05-08' },
  { id: 'u4', name: 'Suresh Menon', email: 'suresh@Hanthana.com', role: 'EMPLOYEE', status: 'active', branch: 'Mumbai Central', lastLogin: '2026-05-09' },
  { id: 'u5', name: 'Vikram Singh', email: 'vikram@Hanthana.com', role: 'EMPLOYEE', status: 'active', branch: 'Delhi North', lastLogin: '2026-05-09' },
  { id: 'u6', name: 'Anita Desai', email: 'anita@Hanthana.com', role: 'EMPLOYEE', status: 'active', branch: 'Pune West', lastLogin: '2026-05-08' },
  { id: 'u7', name: 'Pooja Iyer', email: 'pooja@Hanthana.com', role: 'EMPLOYEE', status: 'on_leave', branch: 'Pune West', lastLogin: '2026-05-01' },
  { id: 'u8', name: 'Rahul Verma', email: 'rahul@email.com', role: 'CUSTOMER', status: 'active', branch: 'Mumbai Central', lastLogin: '2026-05-09' },
  { id: 'u9', name: 'Sneha Patil', email: 'sneha@email.com', role: 'CUSTOMER', status: 'active', branch: 'Pune West', lastLogin: '2026-05-06' },
  { id: 'u10', name: 'Amit Kumar', email: 'amit@email.com', role: 'CUSTOMER', status: 'active', branch: 'Delhi North', lastLogin: '2026-05-08' },
];

export const notifications = [
  { id: 1, type: 'order', message: 'New order ORD-2408 received from Neha Gupta', time: '5 min ago', read: false },
  { id: 2, type: 'delivery', message: 'DEL-001 is on route - 30 mins to destination', time: '15 min ago', read: false },
  { id: 3, type: 'inventory', message: 'Low stock alert: 19L Refill at Delhi North branch', time: '1 hr ago', read: true },
  { id: 4, type: 'payment', message: 'Payment of ₹43,240 pending for Raj Malhotra', time: '2 hrs ago', read: true },
  { id: 5, type: 'system', message: 'System maintenance scheduled for tonight 2AM', time: '3 hrs ago', read: true },
];

export const expenseBreakdown = [
  { name: 'Vehicle Costs', value: 48000, color: '#2563eb' },
  { name: 'Bottle Costs', value: 112000, color: '#0891b2' },
  { name: 'Salaries', value: 117000, color: '#1e3a8a' },
  { name: 'Utilities', value: 15000, color: '#06b6d4' },
  { name: 'Maintenance', value: 8500, color: '#38bdf8' },
];
