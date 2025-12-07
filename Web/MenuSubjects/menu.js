document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://localhost:7109';
  const token = localStorage.getItem('authToken');

  if (!token) {
    alert('Пожалуйста, войдите в систему.');
    window.location.href = '../Login/login.html';
    return;
  }

  const container = document.getElementById('subjectsContainer');
  const addButton = document.getElementById('addButton');
  const modal = document.getElementById('subjectModal');
  const closeModal = document.getElementById('closeModal');
  const subjectForm = document.getElementById('subjectForm');
  const subjectName = document.getElementById('subjectName');
  const subjectDescription = document.getElementById('subjectDescription');
  const subjectResult = document.getElementById('subjectResult');
  const subjectDeadline = document.getElementById('subjectDeadline');

  const actionMenuModal = document.getElementById('actionMenuModal');
  const createSubjectBtn = document.getElementById('createSubjectBtn');
  const joinByCodeBtn = document.getElementById('joinByCodeBtn');
  const entryCodeModal = document.getElementById('entryCodeModal');
  const closeEntryCodeModal = document.getElementById('closeEntryCodeModal');
  const entryCodeForm = document.getElementById('entryCodeForm');

  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // загрузка 
  async function loadSubjects() {
    try {
      const res = await fetch(`${API_BASE}/subject/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) {
        localStorage.removeItem('authToken');
        alert('Сессия истекла. Пожалуйста, войдите снова.');
        window.location.href = '../Login/login.html';
        return;
      }

      if (!res.ok) {
        throw new Error('Не удалось загрузить предметы');
      }

      const subjects = await res.json();

      container.innerHTML = '';
      subjects.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerHTML = `
          <div class="card-content">
            <div class="subject-name">${subject.name}</div>
            <div class="subject-result">Результат: ${subject.result || '—'}</div>
          </div>
          <div class="subject-deadline">Дедлайн: ${formatDate(subject.deadline)}</div>
        `;
        card.addEventListener('click', () => {
          window.location.href = `../Subject/subject.html?id=${subject.id}`;
        });
        container.appendChild(card);
      });
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      alert('Не удалось загрузить предметы. Проверьте подключение.');
    }
  }

  addButton.addEventListener('click', () => {
    actionMenuModal.style.display = 'block';
  });

  createSubjectBtn.addEventListener('click', () => {
    actionMenuModal.style.display = 'none';
    modal.style.display = 'block';
  });

  joinByCodeBtn.addEventListener('click', () => {
    actionMenuModal.style.display = 'none';
    entryCodeModal.style.display = 'block';
  });

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  closeEntryCodeModal.addEventListener('click', () => {
    entryCodeModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === actionMenuModal) actionMenuModal.style.display = 'none';
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === entryCodeModal) entryCodeModal.style.display = 'none';
  });

  // создание
  subjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = subjectName.value.trim();
    const description = subjectDescription.value.trim();
    const result = subjectResult.value.trim();
    const deadlineInput = subjectDeadline.value; 

    if (!name || !result) {
      alert('Заполните название и результат!');
      return;
    }

    if (deadlineInput) {
      const localDate = new Date(deadlineInput);
      if (isNaN(localDate.getTime())) {
        alert('Некорректная дата дедлайна.');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(localDate);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        alert('Дедлайн не может быть в прошлом.');
        return;
      }
    }

    let resultDeadline = null;
    if (deadlineInput) {
      const localDate = new Date(deadlineInput);
      const utcDate = new Date(Date.UTC(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate()
      ));
      resultDeadline = utcDate.toISOString();
    }

    try {
      const res = await fetch(`${API_BASE}/subject/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          result,
          resultDescription: description,
          resultDeadline 
        })
      });

      if (res.ok) {
        modal.style.display = 'none';
        subjectForm.reset();
        loadSubjects();
      } else {
        const errorText = await res.text();
        console.error('Ошибка бэкенда:', errorText);
        alert('Не удалось создать предмет.');
      }
    } catch (err) {
      console.error('Ошибка сети:', err);
      alert('Не удаётся подключиться к серверу.');
    }
  });

  // по коду
  if (entryCodeForm) {
    entryCodeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('entryCode').value.trim();

      if (!code) {
        alert('Введите код предмета');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/team/entry`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        });

        if (res.ok) {
          entryCodeModal.style.display = 'none';
          document.getElementById('entryCode').value = '';
          loadSubjects();
        } else {
          const errorData = await res.json().catch(() => ({}));
          alert(errorData.message || 'Неверный код предмета');
        }
      } catch (err) {
        console.error('Ошибка сети:', err);
        alert('Не удаётся подключиться к серверу');
      }
    });
  }

  // профиль
  const profileButton = document.querySelector('.profile-button');
  const profileModal = document.getElementById('profileModal');
  const profileName = document.getElementById('profileName');
  const logoutButton = document.getElementById('logoutButton');

  async function loadProfile() {
    try {
      const res = await fetch(`${API_BASE}/student/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const profile = await res.json();
        profileName.textContent = profile.name || '—';
      } else {
        profileName.textContent = 'Не удалось загрузить';
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      profileName.textContent = 'Ошибка подключения';
    }
  }

  profileButton.addEventListener('click', () => {
    loadProfile();
    profileModal.style.display = 'block';
    profileModal.classList.add('show');
  });

  logoutButton.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите выйти?')) {
      localStorage.removeItem('authToken');
      window.location.href = '../Login/login.html';
    }
  });

  const closeProfileModal = document.getElementById('closeProfileModal');
  if (closeProfileModal && profileModal) {
    closeProfileModal.addEventListener('click', () => {
      profileModal.classList.remove('show');
      setTimeout(() => {
        profileModal.style.display = 'none';
      }, 300); 
    });
  }
  loadSubjects();
});