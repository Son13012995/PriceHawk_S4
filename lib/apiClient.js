import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api'
});

export const getProducts = (page, pageSize, signal) => {
    return apiClient.get('/product', { params: { page, pageSize }, signal });
};

export const searchProducts = (q, page, pageSize, signal) => {
    return apiClient.get('/pagination', { params: { q, page, pageSize }, signal });
};

export default apiClient;
