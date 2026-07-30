const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const LOCATION_API_URL = 'https://provinces.open-api.vn/api/v2';
let provincesPromise;
const wardsPromises = new Map();

async function locationRequest(path) {
  const response = await fetch(`${LOCATION_API_URL}${path}`);
  if (!response.ok) throw new Error('Không thể tải dữ liệu địa giới Việt Nam.');
  return response.json();
}

export const locationApi = {
  getProvinces: () => {
    if (!provincesPromise) provincesPromise = locationRequest('/p/').catch((error) => { provincesPromise = undefined; throw error; });
    return provincesPromise;
  },
  getWards: (provinceCode) => {
    const code = Number(provinceCode);
    if (!wardsPromises.has(code)) wardsPromises.set(code, locationRequest(`/w/?province=${code}`).catch((error) => { wardsPromises.delete(code); throw error; }));
    return wardsPromises.get(code);
  },
};

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    cache: options.cache || 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Có lỗi xảy ra');
  }

  return res.json();
}

export const analyticsApi = {
  track: (data) => request('/analytics/track', { method: 'POST', body: JSON.stringify(data) }).catch(() => null),
};

export const assistantApi = {
  chat: (message, history = []) => request('/assistant/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
};

// ── Products ──────────────────────────────────────────────
export const productsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ''}`);
  },

  getBestSellers: () => request('/products/best-sellers'),

  getById: (id) => request(`/products/${id}`),

  getRelated: (id) => request(`/products/${id}/related`),

  getCategories: () => request('/products/categories'),
};
export const categoriesApi = {
  getAll: async () => {
    const response = await request('/categories');
    return Array.isArray(response) ? response : (response?.items || []);
  },
};
export const blogApi = {
  getPosts: async () => {
    const response = await request('/blog/posts');
    return Array.isArray(response) ? response : (response?.items || []);
  },
  getPost: (id) => request(`/blog/posts/${id}`),
  getCategories: () => request('/blog/categories'),
  getComments: (postId) => request(`/blog/comments/${postId}`),
  createComment: (data) => request('/blog/comments', { method: 'POST', body: JSON.stringify(data) }),
};
export const settingsApi = {
  get: (key) => request(`/settings/${encodeURIComponent(key)}?_=${Date.now()}`, { cache: 'no-store' }),
};

export const newsletterApi = {
  subscribe: (contact) => request('/newsletter/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ contact }),
  }),
};

// ── Promotions ────────────────────────────────────────────
export const promotionsApi = {
  validate: (code) =>
    request('/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

// ── Orders ────────────────────────────────────────────────
export const ordersApi = {
  create: (orderData) =>
    request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  getById: (id) => request(`/orders/${id}`),
  getPaymentStatus: (id) => request(`/orders/${encodeURIComponent(id)}/payment-status`),
};

// ── Reviews ───────────────────────────────────────────────
export const reviewsApi = {
  getByProduct: (productId) => request(`/reviews/product/${productId}`),
  getProductSummary: (productId) => request(`/reviews/product/${productId}/summary`),
  getFeatured: (limit = 6) => request(`/reviews/featured?limit=${limit}`),

  create: (reviewData) =>
    request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    }),
};

// ── AR ────────────────────────────────────────────────────
export const arApi = {
  getDownloadUrl: (imageUrl, filename = 'Silkmoon_AR.jpg') => {
    const params = new URLSearchParams({ url: imageUrl, filename });
    return `${BASE_URL}/ar/download-image?${params}`;
  },
  detectBed: (data) =>
    request('/ar/detect-bed', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generatePreview: (data) =>
    request('/ar/generate-preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  inpaintBed: (data) =>
    request('/ar/inpaint', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadImage: (data) =>
    request('/ar/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  autoTryOn: (data) =>
    request('/ar/auto-tryon', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyRegistration: (email, otp) =>
    request('/auth/verify-registration', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  resendRegistrationOtp: (email) =>
    request('/auth/resend-registration-otp', { method: 'POST', body: JSON.stringify({ email }) }),

  getProfile: () => request('/auth/profile'),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};

export const usersApi = {
  updateProfile: (data) => request('/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  uploadAvatar: (image) => request('/users/profile/avatar', { method: 'POST', body: JSON.stringify({ image }) }),
  changePassword: (currentPassword, newPassword) => request('/users/profile/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  }),
};

// ── Cart (For Logged-in Users) ────────────────────────────
export const cartApi = {
  getCart: () => request('/users/cart'),
  
  updateCart: (cart) =>
    request('/users/cart', {
      method: 'PUT',
      body: JSON.stringify(cart),
    }),
};
