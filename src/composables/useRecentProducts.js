const MAX = 8
const KEY = 'recent_products'

export function useRecentProducts() {
  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  }

  function add(product) {
    if (!product?.id) return
    const list = getAll().filter(p => p.id !== product.id)
    list.unshift({
      id: product.id,
      title: product.title ?? '',
      price: product.price ?? null,
      thumbnailPath: product.thumbnailPath ?? '',
      sellerName: product.sellerName ?? '',
    })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  }

  function remove(id) {
    localStorage.setItem(KEY, JSON.stringify(getAll().filter(p => p.id !== id)))
  }

  function clear() {
    localStorage.removeItem(KEY)
  }

  return { getAll, add, remove, clear }
}
