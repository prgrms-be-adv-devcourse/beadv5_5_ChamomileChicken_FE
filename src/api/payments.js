import api from './index'

export const paymentsApi = {
  prepare: (body) =>
    api.post('/payments/prepare', body),

  confirm: (orderId, paymentKey, amount) =>
    api.post('/payments/confirm', { orderId, paymentKey, amount }),

  refund: (orderId, reason) =>
    api.post('/refunds', { orderId, reason }),

  depositPrepare: (userId, amount) =>
    api.post('/payments/deposits/prepare', { userId, paymentMethod: 'CARD', amount }),

  depositConfirm: (paymentId, paymentKey, amount) =>
    api.post('/payments/deposits/confirm', { paymentId, paymentKey, amount }),
}
