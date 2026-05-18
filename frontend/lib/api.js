const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.leadflowai.com/api/v1';

export const apiCall = async (endpoint, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    json = { success: false, message: 'Invalid server response format' };
  }

  if (!response.ok) {
    throw new Error(json.message || `API error status: ${response.status}`);
  }

  return json;
};

export const api = {
  get: (endpoint, options) => apiCall(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => apiCall(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (endpoint, body, options) => apiCall(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: (endpoint, body, options) => apiCall(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (endpoint, options) => apiCall(endpoint, { method: 'DELETE', ...options }),
};
