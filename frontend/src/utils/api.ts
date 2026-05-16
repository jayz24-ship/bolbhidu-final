import axios from 'axios';

// API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_id');
      
      // Only redirect if not already on public pages
      const currentPath = window.location.pathname;
      const publicPaths = ['/', '/login', '/register'];
      if (!publicPaths.includes(currentPath)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Real API service
export const apiService = {
  // Authentication
  auth: {
    login: async (email: string, password: string) => {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('jwt_token', response.data.token);
      }
      return response;
    },
    
    loginWithGoogle: async (idToken: string) => {
      const response = await api.post('/auth/google', { idToken });
      if (response.data.token) {
        localStorage.setItem('jwt_token', response.data.token);
      }
      return response;
    },
    
    register: async (email: string, password: string, name: string) => {
      const response = await api.post('/auth/register', { email, password, name });
      if (response.data.token) {
        localStorage.setItem('jwt_token', response.data.token);
      }
      return response;
    },

    me: async () => {
      return await api.get('/auth/me');
    },

    updateProfile: async (data: { name?: string; bio?: string; location?: string; avatar?: string }) => {
      return await api.put('/auth/profile', data);
    },
  },

  // Posts
  posts: {
    getFeed: async (page: number = 1, limit: number = 20, lat?: number, lng?: number, radiusKm: number = 25) => {
      const params: any = { page, limit, radiusKm };
      if (lat !== undefined && lng !== undefined) {
        params.lat = lat;
        params.lng = lng;
      }
      const response = await api.get('/posts/feed', { params });
      return {
        data: {
          posts: response.data.items || [],
          hasMore: response.data.hasMore || false,
          page: response.data.page || page,
          totalPages: response.data.totalPages || 1,
        }
      };
    },
    
    createPost: async (postData: { description: string; category: string; location: string; lat: number; lng: number; media: Array<{ publicId: string; type: string }> }) => {
      return await api.post('/posts', postData);
    },
    
    likePost: async (postId: string) => {
      return await api.post(`/posts/${postId}/like`);
    },

    unlikePost: async (postId: string) => {
      return await api.delete(`/posts/${postId}/like`);
    },
    
    addComment: async (postId: string, content: string) => {
      return await api.post(`/posts/${postId}/comments`, { content });
    },

    getComments: async (postId: string) => {
      return await api.get(`/posts/${postId}/comments`);
    },

    sharePost: async (postId: string) => {
      return await api.post(`/posts/${postId}/share`);
    },

    getPost: async (postId: string) => {
      return await api.get(`/posts/${postId}`);
    },

    savePost: async (postId: string) => {
      return await api.post(`/posts/${postId}/save`);
    },

    unsavePost: async (postId: string) => {
      return await api.delete(`/posts/${postId}/save`);
    },

    deletePost: async (postId: string) => {
      return await api.delete(`/posts/${postId}`);
    },

    getSavedPosts: async (page: number = 1, limit: number = 20) => {
      return await api.get('/posts/saved', { params: { page, limit } });
    },

    getTrendingPosts: async (page: number = 1, limit: number = 10, timeframe: string = '7d', lat?: number, lng?: number, radiusKm: number = 25) => {
      const params: any = { page, limit, timeframe };
      if (lat !== undefined && lng !== undefined) {
        params.lat = lat;
        params.lng = lng;
        params.radiusKm = radiusKm;
      }
      return await api.get('/posts/trending', { params });
    },

    getTrendingCategories: async (timeframe: string = '7d', lat?: number, lng?: number, radiusKm: number = 25) => {
      const params: any = { timeframe };
      if (lat !== undefined && lng !== undefined) {
        params.lat = lat;
        params.lng = lng;
        params.radiusKm = radiusKm;
      }
      return await api.get('/posts/trending/categories', { params });
    },
  },

  // Notifications
  notifications: {
    list: async (limit: number = 20, skip: number = 0) => {
      return await api.get('/notifications', { params: { limit, skip } });
    },
    
    markAsRead: async (notificationId: string) => {
      return await api.post(`/notifications/${notificationId}/read`);
    },
    
    markAllAsRead: async () => {
      return await api.post('/notifications/mark-all-read');
    },
    
    getUnreadCount: async () => {
      return await api.get('/notifications/unread-count');
    },
  },

  // Admin
  admin: {
    getIssues: async (status?: string) => {
      const params = status ? { status } : {};
      return await api.get('/admin/issues', { params });
    },
    
    validateIssue: async (issueId: string, etaDays: number) => {
      return await api.post(`/admin/issues/${issueId}/validate`, { etaDays });
    },
    
    updateIssueProgress: async (issueId: string, progressPercent: number) => {
      return await api.post(`/admin/issues/${issueId}/progress`, { progressPercent });
    },

    extendDeadline: async (issueId: string) => {
      return await api.post(`/admin/issues/${issueId}/extend-deadline`);
    },

    completeIssue: async (issueId: string, afterImages: string[]) => {
      return await api.post(`/admin/issues/${issueId}/complete`, { afterImages });
    },
    
    uploadIssueImages: async (issueId: string, data: { beforeImages?: string[]; afterImages?: string[] }) => {
      return await api.post(`/admin/issues/${issueId}/images`, data);
    },

    markInvalid: async (issueId: string, reason?: string) => {
      return await api.post(`/admin/issues/${issueId}/invalid`, { reason });
    },
  },

  // File upload (Cloudinary direct upload with signature)
  upload: {
    getSignature: async () => {
      return await api.post('/media/signature');
    },

    image: async (file: File) => {
      // Get signature from backend
      const sigResponse = await apiService.upload.getSignature();
      const { timestamp, signature, folder, api_key, cloud_name } = sigResponse.data;

      // Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('api_key', api_key);
      formData.append('folder', folder);

      const uploadResponse = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        formData
      );

      return {
        data: {
          url: uploadResponse.data.secure_url,
          publicId: uploadResponse.data.public_id,
        }
      };
    },
    
    video: async (file: File) => {
      // Get signature from backend
      const sigResponse = await apiService.upload.getSignature();
      const { timestamp, signature, folder, api_key, cloud_name } = sigResponse.data;

      // Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('api_key', api_key);
      formData.append('folder', folder);

      const uploadResponse = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`,
        formData
      );

      return {
        data: {
          url: uploadResponse.data.secure_url,
          publicId: uploadResponse.data.public_id,
        }
      };
    },
  },

  // Public issue tracking
  issues: {
    getPublic: async (issueId: string) => {
      return await api.get(`/issues/${issueId}/public`);
    },
    getMyIssues: async () => {
      return await api.get('/issues/my-issues');
    },
  },

  // Geocoding
  geocoding: {
    cityToCoords: async (cityName: string) => {
      return await api.get('/geocoding/city', { params: { q: cityName } });
    },
  },
};

export default api;
