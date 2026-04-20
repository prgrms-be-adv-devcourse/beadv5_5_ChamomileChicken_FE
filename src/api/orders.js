import api from './index'

function toMoneyValue(value) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

export const ordersApi = {
  create: ({ productId, productScheduleId, quantity, productPrice, depositAmount }) =>
    api.post('/orders', {
      productId,
      productScheduleId,
      quantity,
      productPrice: toMoneyValue(productPrice),
      depositAmount: toMoneyValue(depositAmount),
    }),

  list: (status) =>
    api.get('/orders', { params: status && status !== 'ALL' ? { status } : {} }),

  detail: (orderId) =>
    api.get(`/orders/${orderId}`),

  getRefundInfo: (orderId) =>
    api.get(`/orders/${orderId}/refund-info`),

  refund: (orderId) =>
    api.delete(`/orders/${orderId}/refund`),
}
