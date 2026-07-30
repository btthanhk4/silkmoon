const API_URL = import.meta.env.VITE_API_URL;

const uploadQueue = [];
let activeUploads = 0;
// Keep every admin image upload in one FIFO lane. This prevents Cloudinary and
// the backend upload endpoint from being hit by bursts from different screens.
const MAX_CONCURRENT_UPLOADS = 1;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const withUploadSlot = async (task) => {
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    await new Promise((resolve) => uploadQueue.push(resolve));
  }
  activeUploads += 1;
  try {
    return await task();
  } finally {
    activeUploads -= 1;
    uploadQueue.shift()?.();
  }
};

const getHeaders = () => {
  const token = localStorage.getItem("admin_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};
const apiRequest = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: getHeaders(),
    cache: options.cache || "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("admin_token");
      window.dispatchEvent(new Event("admin:unauthorized"));
      const error = new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      error.status = 401;
      throw error;
    }
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || "Thao tác không thành công");
  }
  return res.status === 204 ? null : res.json().catch(() => null);
};

export const adminApi = {
  getReviews: () => apiRequest("/reviews?limit=500"),
  createReview: (data) =>
    apiRequest("/reviews/admin", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  uploadReviewImage: (image) => withUploadSlot(async () => {
    const result = await apiRequest("/ar/upload", {
      method: "POST",
      body: JSON.stringify({ image, usage: "review" }),
    });
    if (!result?.url) throw new Error("Không thể tải ảnh đánh giá lên.");
    return result.url;
  }),
  updateReview: (id, data) =>
    apiRequest(`/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteReview: (id) => apiRequest(`/reviews/${id}`, { method: "DELETE" }),
  getPromotions: () => apiRequest("/promotions"),
  createPromotion: (data) => apiRequest("/promotions", { method: "POST", body: JSON.stringify(data) }),
  updatePromotion: (id,data) => apiRequest(`/promotions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePromotion: (id) => apiRequest(`/promotions/${id}`, { method: "DELETE" }),
  getSettings: () => apiRequest(`/settings?_=${Date.now()}`, { cache: "no-store" }),
  saveSetting: (key,data) => apiRequest(`/settings/${key}`, { method: "POST", body: JSON.stringify(data) }),
  getNewsletterSubscriptions: ({ page = 1, limit = 20, search = '', status = 'all', type = 'all' } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    if (type !== 'all') params.set('type', type);
    return apiRequest(`/newsletter/subscriptions?${params}`);
  },
  updateNewsletterStatus: (id, status) => apiRequest(`/newsletter/subscriptions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteNewsletterSubscription: (id) => apiRequest(`/newsletter/subscriptions/${id}`, { method: 'DELETE' }),
  sendNewsletterCampaign: (data) => apiRequest('/newsletter/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  getAnalytics: () => apiRequest("/admin/analytics"),
  getAnalyticsReport: () => apiRequest("/admin/analytics/report"),
  getAiUsage: () => apiRequest("/admin/ai-usage"),
  getFinance: ({ from, to, groupBy = "day" } = {}) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("groupBy", groupBy);
    return apiRequest(`/admin/finance?${params}`);
  },
  getBlogPosts: ({ page = 1, limit = 10 } = {}) =>
    apiRequest(`/blog/admin/posts?page=${page}&limit=${limit}`),
  createBlogPost: (data) =>
    apiRequest("/blog/admin/posts", { method: "POST", body: JSON.stringify(data) }),
  updateBlogPost: (id, data) =>
    apiRequest(`/blog/admin/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteBlogPost: (id) => apiRequest(`/blog/admin/posts/${id}`, { method: "DELETE" }),
  getBlogCategories: () => apiRequest("/blog/admin/categories"),
  createBlogCategory: (data) =>
    apiRequest("/blog/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateBlogCategory: (id, data) =>
    apiRequest(`/blog/admin/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteBlogCategory: (id) =>
    apiRequest(`/blog/admin/categories/${id}`, { method: "DELETE" }),
  getBlogComments: () => apiRequest("/blog/admin/comments?limit=500"),
  createBlogComment: (data) => apiRequest("/blog/admin/comments", { method: "POST", body: JSON.stringify(data) }),
  uploadBlogCommentImage: (image) => withUploadSlot(async () => {
    const result = await apiRequest("/ar/upload", { method: "POST", body: JSON.stringify({ image, usage: "comment" }) });
    if (!result?.url) throw new Error("Không thể tải ảnh bình luận lên.");
    return result.url;
  }),
  updateBlogComment: (id, data) =>
    apiRequest(`/blog/admin/comments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteBlogComment: (id) =>
    apiRequest(`/blog/admin/comments/${id}`, { method: "DELETE" }),
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },
  getDashboardStats: async () => {
    const res = await fetch(`${API_URL}/admin/dashboard`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },
  getOrders: async ({ page = 1, limit = 15, customization = 'all' } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (customization !== 'all') params.set('customization', customization);
    const res = await fetch(`${API_URL}/orders?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch orders");
    return res.json();
  },
  updateOrderStatus: async (id, status) => {
    const res = await fetch(`${API_URL}/orders/${id}/status`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    return res.json();
  },
  getProducts: async ({ page = 1, limit = 20 } = {}) => {
    const res = await fetch(`${API_URL}/products?page=${page}&limit=${limit}&_=${Date.now()}`, { headers: getHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
  },
  getCategories: ({ page, limit } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const qs = params.toString() ? `?${params}` : '';
    return apiRequest(`/categories${qs}`);
  },
  createCategory: (data) =>
    apiRequest("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCategory: (id, data) =>
    apiRequest(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id) => apiRequest(`/categories/${id}`, { method: "DELETE" }),
  createProduct: async (productData) => {
    const res = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(productData),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || "Không thể tạo sản phẩm");
    }
    return res.json();
  },
  importProducts: (rows) =>
    apiRequest("/products/import", { method: "POST", body: JSON.stringify({ rows }) }),
  updateProduct: async (id, productData) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(productData),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || "Failed to update product");
    }
    return res.json();
  },
  uploadProductImage: async (image) => {
    return withUploadSlot(async () => {
      let lastError;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);
        try {
          const res = await fetch(`${API_URL}/ar/upload`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ image, usage: "product" }),
            signal: controller.signal,
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.url) return data.url;

          const message = res.status === 413
            ? "Ảnh quá lớn sau khi mã hóa. Vui lòng chọn ảnh nhỏ hơn 8 MB."
            : data?.message || `Không thể tải ảnh lên (${res.status})`;
          const error = new Error(Array.isArray(message) ? message.join("; ") : message);
          error.retryable = res.status === 408 || res.status === 429 || res.status >= 500;
          error.retryAfter = Number(res.headers.get("retry-after")) || 0;
          throw error;
        } catch (error) {
          lastError = error;
          const retryable = error.name === "AbortError" || error instanceof TypeError || error.retryable;
          if (!retryable || attempt === 2) break;
          await wait(error.retryAfter > 0 ? error.retryAfter * 1000 : 700 * (2 ** attempt));
        } finally {
          clearTimeout(timeout);
        }
      }
      if (lastError?.name === "AbortError") throw new Error("Upload ảnh quá thời gian chờ. Vui lòng thử lại.");
      throw lastError || new Error("Không thể tải ảnh lên.");
    });
  },
  deleteProduct: async (id) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || "Failed to delete product");
    }
    return res.status === 204 ? null : res.json().catch(() => null);
  },
  getUsers: async ({ page = 1, limit = 20 } = {}) => {
    const res = await fetch(`${API_URL}/users?page=${page}&limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },
  createUser: (data) =>
    apiRequest("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id, data) =>
    apiRequest(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};
