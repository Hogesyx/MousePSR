const THEME_KEY = 'mousepsr-theme';
const root = document.documentElement;
const toggle = document.querySelector('#themeToggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function resolvedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return systemDark.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  if (!toggle) return;
  const next = theme === 'dark' ? 'light' : 'dark';
  toggle.textContent = theme === 'dark' ? '☀' : '☾';
  toggle.setAttribute('aria-label', `Switch to ${next} mode`);
  toggle.setAttribute('title', `Switch to ${next} mode`);
}

applyTheme(resolvedTheme());

toggle?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

systemDark.addEventListener('change', () => {
  if (!localStorage.getItem(THEME_KEY)) applyTheme(resolvedTheme());
});
