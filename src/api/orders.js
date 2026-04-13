import api from './index'

export const ordersApi = {
  create: (productId, productScheduleId, quantity, depositAmount) =>
    api.post('/orders', { productId, productScheduleId, quantity, depositAmount }),

  list: (status) =>
    api.get('/orders', { params: status ? { status } : {} }),

  detail: (orderId) =>
    api.get(`/orders/${orderId}`),

  cancel: (orderId) =>
    api.patch(`/orders/${orderId}`),
}
