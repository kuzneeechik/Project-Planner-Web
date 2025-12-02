document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://localhost:7109';

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const formTitle = document.getElementById('formTitle');
  const switchToRegister = document.getElementById('switchToRegister');
  const switchToLogin = document.getElementById('switchToLogin');
  const errorMessage = document.getElementById('errorMessage');

  function showForm(formName) {
    if (formName === 'login') {
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      formTitle.textContent = 'Вход в систему';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      formTitle.textContent = 'Регистрация';
    }
    errorMessage.style.display = 'none';
  }

  switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showForm('register');
  });

  switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showForm('login');
  });

  // Валидация пароля 
  function isValidPassword(password) {
    if (password.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    return hasLetter && hasDigit;
  }

  // Вход
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!isValidPassword(password)) {
      showError('Пароль должен содержать минимум 8 символов, буквы и цифры.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('authToken', data.accessToken);
        window.location.href = '..';
      } else {
        const errorMsg = data.message || 'Неверный email или пароль.';
        showError(errorMsg);
      }
    } catch (err) {
      console.error('Ошибка сети:', err);
      showError('Не удаётся подключиться к серверу. Убедитесь, что бэкенд запущен.');
    }
  });

  // Регистрация
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    if (password !== passwordConfirm) {
      showError('Пароли не совпадают.');
      return;
    }

    if (!isValidPassword(password)) {
      showError('Пароль должен содержать минимум 8 символов, буквы и цифры.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/student/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (res.ok) {
        alert('Регистрация успешна! Теперь войдите.');
        showForm('login');
      } else if (res.status === 400) {
        showError('Пользователь с таким email уже существует.');
      } else {
        showError('Ошибка регистрации.');
      }
    } catch (err) {
      console.error('Ошибка сети:', err);
      showError('Не удаётся подключиться к серверу. Убедитесь, что бэкенд запущен.');
    }
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }
});