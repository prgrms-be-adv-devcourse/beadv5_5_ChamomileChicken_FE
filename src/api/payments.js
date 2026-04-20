import api from './index'

export const paymentsApi = {
  prepare: ({ productId, orderId, userId, paymentAmount, depositAmount }) =>
    api.post('/payments/prepare', {
      productId,
      orderId,
      userId,
      paymentMethod: 'TOSS',
      paymentAmount,
      depositAmount,
    }),

  confirm: (orderId, paymentKey, amount) =>
    api.post('/payments/confirm', { orderId, paymentKey, amount }),

  depositPrepare: (userId, amount) =>
    api.post('/payments/deposits/prepare', { userId, paymentMethod: 'CARD', amount }),

  depositConfirm: (depositPaymentsId, paymentKey, amount) =>
    api.post('/payments/deposits/confirm', { depositPaymentsId, paymentKey, amount }),
}
