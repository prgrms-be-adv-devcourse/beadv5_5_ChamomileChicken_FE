import api from './index'

export const usersApi = {
  getMe: () =>
    api.get('/users/me'),

  updateMe: (name, phone) =>
    api.put('/users/me', { name, phone }),

  updateEmail: (newEmail, verifiedToken) =>
    api.put('/users/me/email', { newEmail, verifiedToken }),

  deleteMe: () =>
    api.delete('/users/me'),

  emailCheck: (email) =>
    api.post('/users/email-check', { email }),

  register: (name, email, password, phone, verifiedToken) =>
    api.post('/users/register', { name, email, password, phone, verifiedToken }),
}
