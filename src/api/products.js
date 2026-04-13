import api from './index'

export const productsApi = {
  list: (params) =>
    api.get('/products', { params }),

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

  reviews: (productId) =>
    api.get(`/products/${productId}/reviews`),

  createReview: (productId, body) =>
    api.post(`/products/${productId}/reviews`, body),

  deleteReview: (productId, reviewId) =>
    api.delete(`/products/${productId}/reviews/${reviewId}`),

  addLike: (scheduleId, quantity) =>
    api.post(`/products/${scheduleId}/likes`, null, { params: { quantity } }),

  deleteLike: (scheduleId, likeId) =>
    api.delete(`/products/${scheduleId}/likes`, { params: { likeId } }),

  myLikes: () =>
    api.get('/products/me/likes'),

  myReviews: () =>
    api.get('/products/me/reviews'),
}
