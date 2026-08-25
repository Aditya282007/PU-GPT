import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const documentApi = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (params) => api.get('/documents', { params }),
  subjects: () => api.get('/documents/subjects'),
  delete: (id) => api.delete(`/documents/${id}`),
};

export const chatApi = {
  ask: (question, subject, conversationId) => api.post('/chat/ask', { question, subject, conversationId }, {
    responseType: 'stream',
  }),
  history: (params) => api.get('/chat/history', { params }),
  getConversation: (id) => api.get(`/chat/history/${id}`),
  deleteConversation: (id) => api.delete(`/chat/history/${id}`),
  flagged: () => api.get('/chat/flagged'),
};

export const teacherApi = {
  flagged: (params) => api.get('/teacher', { params }),
  respond: (id, response, convertToContent) => api.post(`/teacher/${id}/respond`, { response, convertToContent }),
  insights: (params) => api.get('/teacher/insights', { params }),
};

export const adminApi = {
  departments: () => api.get('/admin/departments'),
  createDepartment: (data) => api.post('/admin/departments', data),
  deleteDepartment: (name) => api.delete(`/admin/departments/${encodeURIComponent(name)}`),
  subjects: () => api.get('/admin/subjects'),
  createSubject: (data) => api.post('/admin/subjects', data),
  createTeacher: (data) => api.post('/admin/teachers', data),
  users: (params) => api.get('/admin/users', { params }),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  status: () => api.get('/admin/status'),
};