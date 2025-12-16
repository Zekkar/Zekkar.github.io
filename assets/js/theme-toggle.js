// 深色模式切換功能
(function() {
  const THEME_KEY = 'theme';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';

  // 取得儲存的主題或系統偏好
  function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      return savedTheme;
    }
    // 檢查系統偏好
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return DARK_THEME;
    }
    return LIGHT_THEME;
  }

  // 設定主題
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateToggleButton(theme);
  }

  // 更新按鈕圖示
  function updateToggleButton(theme) {
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.innerHTML = theme === DARK_THEME ? '☀️' : '🌙';
      button.setAttribute('aria-label', theme === DARK_THEME ? '切換至淺色模式' : '切換至深色模式');
    }
  }

  // 切換主題
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || LIGHT_THEME;
    const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    setTheme(newTheme);
  }

  // 建立切換按鈕
  function createToggleButton() {
    const button = document.createElement('button');
    button.id = 'theme-toggle';
    button.className = 'theme-toggle';
    button.addEventListener('click', toggleTheme);
    document.body.appendChild(button);
  }

  // 初始化
  function init() {
    createToggleButton();
    const preferredTheme = getPreferredTheme();
    setTheme(preferredTheme);

    // 監聽系統主題變化
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
          setTheme(e.matches ? DARK_THEME : LIGHT_THEME);
        }
      });
    }
  }

  // 確保 DOM 載入完成後執行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
