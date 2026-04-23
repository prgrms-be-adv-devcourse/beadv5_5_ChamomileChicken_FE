import api from './index'

export const productsApi = {
  list: (params) =>
    api.get('/products', { params }),

  recommendations: () =>
    api.get('/recommendations'),
  
  detail: (productId) =>
    api.get(`/products/${productId}`),

  create: (body) =>
    api.post('/products', body),

  update: (productId, body) =>
    api.put(`/products/${productId}`, body),

  delete: (productId) =>
    api.delete(`/products/${productId}`),

  schedules: (productId) =>
    api.get(`/products/${productId}/schedules`),

  createSchedule: (productId, body) =>
    api.post(`/products/${productId}/schedules`, body),

  updateSchedule: (productId, scheduleId, body) =>
    api.put(`/products/${productId}/schedules/${scheduleId}`, body),

  deleteSchedule: (productId, scheduleId) =>
    api.delete(`/products/${productId}/schedules/${scheduleId}`),

  reviews: (productId) =>
    api.get(`/products/${productId}/reviewList`),

  createReview: (productId, body) =>
    api.post(`/products/${productId}/reviews`, body),

  updateReview: (productId, reviewId, body) =>
    api.put(`/products/${productId}/reviews/${reviewId}`, body),

  deleteReview: (productId, reviewId) =>
    api.delete(`/products/${productId}/reviews/${reviewId}`),

  addLike: (scheduleId, quantity) =>
    api.post(`/products/${scheduleId}/likes`, null, { params: { quantity } }),

  deleteLike: (scheduleId, likeId) =>
    api.delete(`/products/${scheduleId}/likes`, { params: { likeId } }),

  my: (params) =>
    api.get('/products/my', { params }),

  myLikes: () =>
    api.get('/products/me/likes'),

  myReviews: () =>
    api.get('/products/me/reviews'),

  esMigrate: () =>
    api.post('/products/es-migrate'),
}
