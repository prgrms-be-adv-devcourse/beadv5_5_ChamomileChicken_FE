const MAX = 6
const KEY = 'recent_searches'

export function useRecentSearches() {
  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  }

  function add(query) {
    const q = query?.trim()
    if (!q) return
    const list = getAll().filter(s => s !== q)
    list.unshift(q)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  }

  function remove(query) {
    localStorage.setItem(KEY, JSON.stringify(getAll().filter(s => s !== query)))
  }

  function clear() {
    localStorage.removeItem(KEY)
  }

  return { getAll, add, remove, clear }
}
