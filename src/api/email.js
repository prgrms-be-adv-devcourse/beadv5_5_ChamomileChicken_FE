import api from './index'

export const emailApi = {
  sendCode: (email) =>
    api.post('/email/verifications', { email }),

  verifyCode: (email, code) =>
    api.post('/email/verifications/confirm', { email, code }),
}
