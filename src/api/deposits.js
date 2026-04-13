import api from './index'

export const depositsApi = {
  getBalance: () =>
    api.get('/deposits/me'),

  getHistory: () =>
    api.get('/deposits'),

  getDetail: (depositHistoryId) =>
    api.get(`/deposits/${depositHistoryId}`),
}
