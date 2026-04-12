export function useTheme() {
  function toggleTheme() {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }

  function isDark() {
    return document.documentElement.classList.contains('dark')
  }

  return { toggleTheme, isDark }
}
