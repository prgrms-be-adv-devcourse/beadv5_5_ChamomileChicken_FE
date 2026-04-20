import api from './index'

export const adminApi = {
  // 유저 관리
  getUsers: () => api.get('/admins/users'),
  getUserDetail: (userId) => api.get(`/admins/users/${userId}`),
  approveSeller: (userId) => api.patch(`/admins/users/${userId}/approve-seller`),

  // 상품 관리
  getProducts: () => api.get('/admins/products'),
  forceDownProduct: (productId) => api.patch(`/admins/products/${productId}/force-down`),

  // 주문/정산 조회
  getOrders: () => api.get('/admins/orders'),
  getSettlements: () => api.get('/admins/settlements'),

  // 리뷰 관리
  deleteReview: (reviewId) => api.delete(`/admins/reviews/${reviewId}`),
}
