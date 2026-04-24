import api from './index'

export const adminApi = {
  // 유저 관리
  getUsers: (params) => api.get('/admins/users', { params }),
  getUserDetail: (userId) => api.get(`/admins/users/${userId}`),
  approveSeller: (userId) => api.patch(`/admins/users/${userId}/approve-seller`),

  // 상품 관리
  getProducts: (params) => api.get('/admins/products', { params }),
  forceDownProduct: (productId) => api.patch(`/admins/products/${productId}/force-down`),

  // 주문/정산 조회
  getOrders: (params) => api.get('/admins/orders', { params }),
  getSettlements: (params) => api.get('/admins/settlements', { params }),

  // 리뷰 관리
  getReviews: (params) => api.get('/admins/reviews', { params }),
  deleteReview: (reviewId) => api.delete(`/admins/reviews/${reviewId}`),

  // 대시보드
  getDashboard: (year) => api.get('/admins/dashboard', { params: year ? { year } : {} }),
}
