import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api'
});

// ─── Products ────────────────────────────────────────────────────────────────

export const getProducts = (page, pageSize, signal) =>
    apiClient.get('/product', { params: { page, pageSize }, signal });

export const searchProducts = (q, page, pageSize, signal) =>
    apiClient.get('/pagination', { params: { q, page, pageSize }, signal });

export const getProductDetail = (id, signal) =>
    apiClient.get('/compare', { params: { id }, signal });

export const getPriceHistory = (id, signal) =>
    apiClient.get('/price-history', { params: { id }, signal });

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const getWishlist = (signal) =>
    apiClient.get('/wishlist', { signal });

export const addToWishlist = (productId) =>
    apiClient.post('/wishlist', { productId });

export const removeFromWishlist = (productId) =>
    apiClient.delete('/wishlist', { data: { productId } });

// ─── Price Alerts ─────────────────────────────────────────────────────────────

export const getAlerts = (signal) =>
    apiClient.get('/price-alert', { params: { status: 'all' }, signal });

export const checkTriggeredAlerts = (signal) =>
    apiClient.get('/price-alert', { params: { action: 'check-triggers' }, signal });

export const createAlert = (productId, targetPrice, note) =>
    apiClient.post('/price-alert', { productId, targetPrice, note });

export const updateAlertStatus = (alertId, status) =>
    apiClient.put('/price-alert', { alertId, status });

export const deleteAlert = (alertId) =>
    apiClient.delete('/price-alert', { data: { alertId } });

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerUser = (email, password) =>
    apiClient.post('/auth/register', { email, password });

export default apiClient;
