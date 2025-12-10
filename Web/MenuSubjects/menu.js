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

  const editSubjectModal = document.getElementById('editSubjectModal');
  const closeEditSubjectModal = document.getElementById('closeEditSubjectModal');
  const editSubjectForm = document.getElementById('editSubjectForm');
  const editModalTitle = document.getElementById('editModalTitle');
  const editSubjectName = document.getElementById('editSubjectName');
  const editSubjectDescription = document.getElementById('editSubjectDescription');
  const editSubjectResult = document.getElementById('editSubjectResult');
  const editSubjectDeadline = document.getElementById('editSubjectDeadline');
  const deleteSubjectBtn = document.getElementById('deleteSubjectBtn');

  let subjectId = null;

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
          <button class="menu-dots" data-subject-id="${subject.id}">⋮</button>
        `;

        card.addEventListener('click', () => {
          window.location.href = `../Subject/subject.html?id=${subject.id}`;
        });

        const menuDots = card.querySelector('.menu-dots');
        if (menuDots) {
          menuDots.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(subject.id);
          });
        }

        container.appendChild(card);
      });
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      alert('Не удалось загрузить предметы. Проверьте подключение.');
    }
  }

  async function openEditModal(clickedSubjectId) {
    try {
      const res = await fetch(`${API_BASE}/subject/${clickedSubjectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Не удалось загрузить предмет');
      
      const subjectData = await res.json();
      
      subjectId = clickedSubjectId;
      
      editModalTitle.textContent = subjectData.name || 'Без названия';
      editSubjectName.value = subjectData.name || '';
      editSubjectResult.value = subjectData.result || '';
      editSubjectDescription.value = subjectData.resultDescription || '';
      editSubjectDeadline.value = subjectData.resultDeadline
        ? new Date(subjectData.resultDeadline).toISOString().split('T')[0]
        : '';

      editSubjectModal.style.display = 'block';
      
    } catch (err) {
      console.error('Ошибка в openEditModal:', err);
      alert('Не удалось открыть редактирование предмета: ' + err.message);
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
    if (e.target === editSubjectModal) editSubjectModal.style.display = 'none';
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
  const profileP = document.getElementById('profileP');
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
        profileP.textContent = profile.email || '—';
      } else {
        profileName.textContent = '—';
        profileP.textContent = 'Не удалось загрузить';
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      profileName.textContent = 'Ошибка подключения';
      profileP.textContent = 'Ошибка подключения';
    }
  }

  profileButton.addEventListener('click', () => {
    loadProfile();
    profileModal.style.display = 'block';
    profileModal.classList.add('show');
  });

  logoutButton.addEventListener('click', () => {
    if (confirm) {
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

  if (closeEditSubjectModal) {
    closeEditSubjectModal.addEventListener('click', () => {
      editSubjectModal.style.display = 'none';
    });
  }

  if (editSubjectForm) {
    editSubjectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!subjectId) {
        alert('Ошибка: ID предмета не найден.');
        return;
      }
      
      const name = editSubjectName.value.trim();
      const result = editSubjectResult.value.trim();
      const description = editSubjectDescription.value.trim();
      const deadlineInput = editSubjectDeadline.value;

      if (!name || !result) {
        alert('Заполните название и результат!');
        return;
      }

      let resultDeadline = null;
      if (deadlineInput) {
        const localDate = new Date(deadlineInput);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(localDate);
        selected.setHours(0, 0, 0, 0);
        if (selected < today) {
          alert('Дедлайн не может быть в прошлом.');
          return;
        }
        resultDeadline = new Date(Date.UTC(
          localDate.getFullYear(),
          localDate.getMonth(),
          localDate.getDate()
        )).toISOString();
      }

      try {
        const res = await fetch(`${API_BASE}/subject/update/${subjectId}`, {
          method: 'PUT',
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
          editSubjectModal.style.display = 'none';
          loadSubjects();
        } else {
          throw new Error('Не удалось обновить предмет');
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка при сохранении: ' + err.message);
      }
    });
  }

  if (deleteSubjectBtn) {
    deleteSubjectBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!subjectId) {
        alert('Ошибка: ID предмета не найден.');
        return;
      }
      
      if (!confirm) return;

      try {
        const res = await fetch(`${API_BASE}/subject/delete/${subjectId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          editSubjectModal.style.display = 'none';
          subjectId = null;
          loadSubjects();
        } else {
          throw new Error('Не удалось удалить предмет');
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка при удалении: ' + err.message);
      }
    });
  }
  
  loadSubjects();
});