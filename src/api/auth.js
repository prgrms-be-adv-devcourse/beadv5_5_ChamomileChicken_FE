import api from './index'

export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  logout: () =>
    api.post('/auth/logout'),

  reissue: () =>
    api.post('/auth/reissue'),
}
