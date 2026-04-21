import api from './index'

export const settlementsApi = {
  myList: (params) =>
    api.get('/settlements/me', { params }),

  myDetails: (settlementId, params) =>
    api.get(`/settlements/me/${settlementId}/details`, { params }),
}
