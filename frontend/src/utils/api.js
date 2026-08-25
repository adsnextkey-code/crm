import axios from 'axios'

const defaultBaseUrl =
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : 'https://crm.futurekeytechnologies.com/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('crm_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
