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
    modal.style.display = 'block';
  });

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
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

    let resultDeadline = null;
    if (deadlineInput) {
      const localDate = new Date(deadlineInput);
      const utcDate = new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000);
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

  loadSubjects();

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
});