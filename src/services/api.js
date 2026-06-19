import axios from 'axios';

const API_BASE_URL = import.meta.env.API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout for production
});

// Request interceptor for logging in development
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('🚨 API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export const inventoryApi = {
  // Fetch table data with onDate/toDate calculated metrics
  getInventory: (date) => api.get(`/inventory?date=${date}`),
  
  // Register a new Agricultural Input
  createInput: (data) => api.post('/inventory', data),
  
  // Edit metadata of an input (Name, UOM, Sale Price)
  updateInput: (id, data) => api.put(`/inventory/${id}`, data),
  
  // Remove an agricultural input
  deleteInput: (id) => api.delete(`/inventory/${id}`),
  
  // Bulk-save cell entries for a date
  saveTransactions: (date, updates) => api.post('/inventory/save-transactions', { date, updates }),
};

export const reportsApi = {
  // Fetch financial & inventory reconciliation summaries
  getWeeklyReport: (date) => api.get(`/reports/weekly?date=${date}`),
  getMonthlyReport: (date) => api.get(`/reports/monthly?date=${date}`),
  getYearlyReport: (date) => api.get(`/reports/yearly?date=${date}`),
  
  // Helper to trigger browser downloads of the generated CSV sheet
  getCSVDownloadUrl: (date) => `${API_BASE_URL}/reports/export?date=${date}`,
};

export const analysisApi = {
  // Fetch enhanced analysis with new metrics
  getEnhancedAnalysis: (date) => api.get(`/analysis/enhanced?date=${date}`),
  
  // Export enhanced analysis
  exportEnhancedCSV: (date) => api.get(`/analysis/export-enhanced?date=${date}&format=csv`),
  getEnhancedExportData: (date) => api.get(`/analysis/export-enhanced?date=${date}&format=json`),
};

export default api;
