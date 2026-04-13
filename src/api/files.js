import api from './index'

export const filesApi = {
  uploadRequest: (originalName) =>
    api.post('/files/upload-request', { originalName }),

  complete: (fileId) =>
    api.patch(`/files/${fileId}/complete`),
}
