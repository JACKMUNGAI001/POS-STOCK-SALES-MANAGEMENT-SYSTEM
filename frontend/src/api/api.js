import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'

const api = axios.create({
  baseURL: API_BASE,
})

let activeGetRequests = 0
const loadingListeners = new Set()
const referenceCache = new Map()
const REFERENCE_CACHE_TTL = 10 * 60 * 1000
const PRODUCT_CACHE_STORAGE_KEY = 'pos-product-catalog-v1'

// These values change infrequently but are requested by many pages and modals.
// Serving them from memory removes repeat round trips while mutations clear the
// cache immediately, so stock and sales data are never served stale.
const isReferenceRequest = (config) => {
  const url = (config.url || '').replace(/\/$/, '')
  return url === '/items' || url === '/shops'
}
const currentTenantId = () => {
  // The API returns a tenant-specific catalog, so never share its offline copy
  // between users logged into different tenants on the same browser.
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    return user?.tenant_id ?? 'anonymous'
  } catch {}
  return 'anonymous'
}
const cacheKey = (config) => {
  const baseKey = `${config.url}?${JSON.stringify(config.params || {})}`
  return (config.url || '').replace(/\/$/, '') === '/items' ? `${baseKey}:tenant:${currentTenantId()}` : baseKey
}
const productStorageKey = () => `${PRODUCT_CACHE_STORAGE_KEY}:${currentTenantId()}`

const readProductCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(productStorageKey()) || 'null')
    return cached && Array.isArray(cached.data) ? cached : null
  } catch {
    return null
  }
}

const writeProductCache = (data) => {
  if (!Array.isArray(data)) return
  try {
    localStorage.setItem(productStorageKey(), JSON.stringify({ data, savedAt: Date.now() }))
  } catch {
    // Storage may be disabled or full; the in-memory cache still works.
  }
}

const notifyLoadingListeners = () => {
  loadingListeners.forEach((listener) => listener(activeGetRequests > 0))
}

const stopGlobalLoading = (config) => {
  if (!config?.__globalLoadingTracked) return
  config.__globalLoadingTracked = false
  activeGetRequests = Math.max(0, activeGetRequests - 1)
  notifyLoadingListeners()
}

export const subscribeToGlobalLoading = (listener) => {
  loadingListeners.add(listener)
  listener(activeGetRequests > 0)
  return () => loadingListeners.delete(listener)
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  if ((config.method || 'get').toLowerCase() === 'get' && config.showGlobalLoading !== false) {
    config.__globalLoadingTracked = true
    activeGetRequests += 1
    notifyLoadingListeners()
  }

  if ((config.method || 'get').toLowerCase() === 'get' && isReferenceRequest(config)) {
    let cached = referenceCache.get(cacheKey(config))
    if (!cached && (config.url || '').replace(/\/$/, '') === '/items') {
      cached = readProductCache()
      if (cached && Date.now() - cached.savedAt < REFERENCE_CACHE_TTL) {
        referenceCache.set(cacheKey(config), cached)
      }
    }
    if (cached && Date.now() - cached.savedAt < REFERENCE_CACHE_TTL) {
      config.__referenceCacheHit = true
      config.adapter = () => Promise.resolve({ data: cached.data, status: 200, statusText: 'OK', headers: {}, config })
    }
  }

  if ((config.method || 'get').toLowerCase() !== 'get') {
    referenceCache.clear()
    try { localStorage.removeItem(productStorageKey()) } catch {}
  }

  return config
})

api.interceptors.response.use(
  (response) => {
    if (isReferenceRequest(response.config) && !response.config.__referenceCacheHit) {
      const cached = { data: response.data, savedAt: Date.now() }
      referenceCache.set(cacheKey(response.config), cached)
      if ((response.config.url || '').replace(/\/$/, '') === '/items') writeProductCache(response.data)
    }
    stopGlobalLoading(response.config)
    return response
  },
  (error) => {
    stopGlobalLoading(error.config)
    if (!error.response && (error.config?.url || '').replace(/\/$/, '') === '/items') {
      const cached = readProductCache()
      if (cached) {
        referenceCache.set(cacheKey(error.config), cached)
        return Promise.resolve({ data: cached.data, status: 200, statusText: 'OK (offline cache)', headers: {}, config: error.config })
      }
    }
    // If the low_stock_items endpoint returns 500, return an empty list so UI can continue
    if (error.response && error.response.status === 500 && error.config && error.config.url && error.config.url.includes('low_stock_items')) {
      return Promise.resolve({ data: [] })
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Supplier APIs
export const fetchSuppliers = () => api.get('/suppliers/')
export const createSupplier = (data) => api.post('/suppliers/', data)
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data)
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`)

// Invoice APIs
export const fetchSupplierInvoices = () => api.get('/suppliers/invoices')
export const createSupplierInvoice = (data) => api.post('/suppliers/invoices', data)
export const fetchSupplierInvoiceDetails = (id) => api.get(`/suppliers/invoices/${id}`)
export const updateSupplierInvoiceStatus = (id, status) => api.put(`/suppliers/invoices/${id}/status`, { status })
export const recordSupplierInvoicePayment = (id, data) => api.post(`/suppliers/invoices/${id}/payments`, data)

// Notification APIs
export const fetchNotifications = () => api.get('/notifications/')
export const markNotificationRead = (id) => api.post(`/notifications/mark-read/${id}`)

// Report APIs
export const fetchProductAnalysis = (params) => api.get('/reports/product-analysis', { params })
export const fetchCreditsSummary = (params) => api.get('/reports/credits-summary', { params })
export const fetchCreditSales = (params) => api.get('/reports/credit-sales', { params })

export default api
