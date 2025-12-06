document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'https://localhost:7109';
    const token = localStorage.getItem('authToken');

    if (!token) {
        alert('Пожалуйста, войдите в систему.');
        window.location.href = '../Login/login.html';
        return;
    }
    const nameSubjectButton = document.getElementById('nameSubjectButton');
    const createdColumn = document.getElementById('createdColumn');
    const processColumn = document.getElementById('processColumn');
    const doneColumn = document.getElementById('doneColumn');
    const teamList = document.getElementById('teamList');
    const backButton = document.getElementById('backButton');
    const teamButton = document.querySelector('.team-button');
    const teamModal = document.getElementById('teamModal');
    const taskModal = document.getElementById('taskModal');
    const addTaskButton = document.getElementById('add-button');
    const closeButtons = document.querySelectorAll('.close');
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
    let currentSubject = null;
    let currentTasks = [];
    let currentTeam = [];

    function getColorById(taskId) {
      const colors = [
        'pastel-blue', 'pastel-orange', 'pastel-pink', 'pastel-green',
        'pastel-yellow', 'pastel-purple', 'pastel-red', 'pastel-teal',
        'pastel-lime', 'pastel-indigo'
      ];
      let hash = 0;
      for (let i = 0; i < taskId.length; i++) {
        hash = taskId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % colors.length;
      return colors[index];
    }

    async function loadSubjectAndTasks() {
      try {
        const subjectRes = await fetch(`${API_BASE}/subject/${subjectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (subjectRes.status === 401) {
          localStorage.removeItem('authToken');
          alert('Сессия истекла. Пожалуйста, войдите снова.');
          window.location.href = '../Login/login.html';
          return;
        }
        if (!subjectRes.ok) throw new Error('Не удалось загрузить предмет');
        currentSubject = await subjectRes.json();

        const tasksRes = await fetch(`${API_BASE}/task/tasks/${subjectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!tasksRes.ok) throw new Error('Не удалось загрузить задачи');
        currentTasks = await tasksRes.json();

        const teamRes = await fetch(`${API_BASE}/team/${subjectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!teamRes.ok) throw new Error('Не удалось загрузить команду');
        currentTeam = await teamRes.json();

        renderSubjectData();
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        alert('Не удалось загрузить данные предмета.');
        window.location.href = '../MenuSubjects/index.html';
      }
    }

    function renderSubjectData() {
      nameSubjectButton.textContent = currentSubject.name;
      renderTasks();
      renderTeam();
    }

    function renderTasks() {
      createdColumn.innerHTML = '';
      processColumn.innerHTML = '';
      doneColumn.innerHTML = '';

      const statusMap = {
        'Created': 'created',
        'InProcess': 'process',
        'Done': 'done'
    };

    currentTasks.forEach(task => {
      const displayStatus = statusMap[task.status] || 'created';
      const taskElement = document.createElement('div');
      const rootNumber = task.number.split('.')[0];
      taskElement.className = `task ${getColorById(rootNumber)}`;
      taskElement.draggable = true;
      taskElement.dataset.taskId = task.id;
      taskElement.dataset.status = displayStatus;
      taskElement.textContent = `${task.number}. ${task.name}`;
      taskElement.ondragstart = dragStart;
      taskElement.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `task.html?subjectId=${subjectId}&taskId=${task.id}`;
      });

      if (displayStatus === 'created') {
        createdColumn.appendChild(taskElement);
      } else if (displayStatus === 'process') {
        processColumn.appendChild(taskElement);
      } else if (displayStatus === 'done') {
        doneColumn.appendChild(taskElement);
      }
    });
  }

    function renderTeam() {
      teamList.innerHTML = '';
      currentTeam.forEach(member => {
        const div = document.createElement('div');
        div.className = 'team-member';
        div.textContent = member.name;
        teamList.appendChild(div);
      });
    }

    let draggedTask = null;
    function dragStart(e) {
      draggedTask = e.target;
      e.dataTransfer.effectAllowed = 'move';
      e.target.classList.add('dragging');
    }

    document.querySelectorAll('.column-body').forEach(body => {
      body.addEventListener('dragover', e => e.preventDefault());
      body.addEventListener('dragenter', e => {
        e.preventDefault();
        body.classList.add('drag-over');
      });
      body.addEventListener('dragleave', () => {
        body.classList.remove('drag-over');
      });
      body.addEventListener('drop', async (e) => {
        e.preventDefault();
        body.classList.remove('drag-over');
        if (!draggedTask) return;

        const newStatus = body === createdColumn ? 'created' : body === processColumn ? 'process' : 'done';
        const taskId = draggedTask.dataset.taskId;

        if (draggedTask.dataset.status === newStatus) {
          draggedTask = null;
          return;
        }

        try {
          const statusMapToBackend = {
            'created': 'Created',
            'process': 'InProcess',
            'done': 'Done'
          };
          const backendStatus = statusMapToBackend[newStatus];

          const res = await fetch(`${API_BASE}/task/status/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: backendStatus })
          });

          if (!res.ok) throw new Error('Не удалось обновить статус');

          draggedTask.dataset.status = newStatus;
          body.appendChild(draggedTask);

          const task = currentTasks.find(t => t.id === taskId);
          if (task) task.status = newStatus;

        } catch (err) {
          console.error(err);
          alert('Не удалось изменить статус задачи.');
        }

        draggedTask = null;
      });
    });

    backButton.addEventListener('click', () => {
      window.location.href = '../MenuSubjects/index.html';
    });

    teamButton.addEventListener('click', () => {
      teamModal.style.display = 'block';
    });

    nameSubjectButton.addEventListener('click', () => {
      editModalTitle.textContent = currentSubject.name;
      editSubjectName.value = currentSubject.name;
      editSubjectDescription.value = currentSubject.resultDescription || '';
      editSubjectResult.value = currentSubject.result || '';
      editSubjectDeadline.value = currentSubject.resultDeadline ? 
        new Date(currentSubject.resultDeadline).toISOString().split('T')[0] : '';
      editSubjectModal.style.display = 'block';
    });

    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        teamModal.style.display = 'none';
        taskModal.style.display = 'none';
      });
    });

    closeEditSubjectModal.addEventListener('click', () => {
      editSubjectModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
      if (e.target === teamModal) teamModal.style.display = 'none';
      if (e.target === taskModal) taskModal.style.display = 'none';
      if (e.target === editSubjectModal) editSubjectModal.style.display = 'none';
    });

    addTaskButton.addEventListener('click', () => {
      const assigneesList = document.getElementById('assigneesList');
      assigneesList.innerHTML = '';
      currentTeam.forEach(member => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = member.id;
        label.append(checkbox, document.createTextNode(member.name));
        assigneesList.appendChild(label);
      });
      taskModal.style.display = 'block';
    });

    document.getElementById('taskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('taskName').value.trim();
        if (!name) {
            alert('Введите название задачи');
            return;
        }

        const description = document.getElementById('taskDescription').value.trim();
        const deadlineInput = document.getElementById('taskDeadline').value;

        if (deadlineInput) {
            const d = new Date(deadlineInput);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d < today) {
                alert('Дедлайн не может быть в прошлом!');
                return;
            }
        }

        const checked = document.querySelectorAll('#assigneesList input[type="checkbox"]:checked');
        const assignees = Array.from(checked).map(cb => cb.value);

        const topLevelNumbers = currentTasks
        .map(t => t.number)
        .filter(num => /^\d+$/.test(num)) 
        .map(num => parseInt(num, 10))
        .filter(n => !isNaN(n));

        const nextNumber = topLevelNumbers.length 
        ? Math.max(...topLevelNumbers) + 1 : 1;

        const taskNumber = nextNumber.toString();

        let taskDeadline = null;
        if (deadlineInput) {
            const localDate = new Date(deadlineInput);
            taskDeadline = new Date(Date.UTC(
                localDate.getFullYear(),
                localDate.getMonth(),
                localDate.getDate()
            )).toISOString();
        }

        try {
            const taskData = {
                number: taskNumber, 
                name,
                description,
                deadline: taskDeadline,
                responsibleStudents: assignees
            };

            const res = await fetch(`${API_BASE}/task/create/${subjectId}`, {
                method: 'POST',
                headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            if (!res.ok) {
                const errorText = await res.text().catch(() => 'Неизвестная ошибка');
                console.error('Ошибка бэкенда:', errorText);
                throw new Error('Не удалось создать задачу');
            }

            taskModal.style.display = 'none';
            document.getElementById('taskForm').reset();
            loadSubjectAndTasks();
        } catch (err) {
            console.error(err);
            alert('Ошибка при создании задачи: ' + err.message);
        }
    });

    editSubjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = editSubjectName.value.trim();
        const description = editSubjectDescription.value.trim();
        const result = editSubjectResult.value.trim();
        const deadlineInput = editSubjectDeadline.value;

        if (!name || !result) {
            alert('Заполните название и результат!');
            return;
        }

        let resultDeadline = null;
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

            resultDeadline = new Date(Date.UTC(
                localDate.getFullYear(),
                localDate.getMonth(),
                localDate.getDate()
            )).toISOString();
        }

        try {
            const updateData = {
                name,
                result,
                resultDescription: description,
                resultDeadline
            };

            const res = await fetch(`${API_BASE}/subject/update/${subjectId}`, {
                method: 'PUT',
                headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Ошибка сервера:', errorText);
                throw new Error('Не удалось обновить предмет');
            }

            editSubjectModal.style.display = 'none';
            loadSubjectAndTasks();

        } catch (err) {
            console.error(err);
            alert('Ошибка при обновлении предмета: ' + err.message);
        }
    });

    deleteSubjectBtn.addEventListener('click', async () => {
        if (!confirm('Удалить предмет и все задачи? Это действие нельзя отменить.')) return;

        try {
            const res = await fetch(`${API_BASE}/subject/delete/${subjectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Не удалось удалить предмет');

            window.location.href = '../MenuSubjects/index.html';

        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении предмета');
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    subjectId = urlParams.get('id');

    if (!subjectId) {
        alert('Не указан ID предмета');
        window.location.href = '../MenuSubjects/index.html';
        return;
    }

    const showInviteBtn = document.getElementById('showInviteBtn');
    const showDeleteBtn = document.getElementById('showDeleteBtn');
    const inviteCodeModal = document.getElementById('inviteCodeModal');
    const inviteCodeInput = document.getElementById('inviteCode');
    const closeInviteModal = document.getElementById('closeInviteModal');
    const deleteStudentsModal = document.getElementById('deleteStudentsModal');
    const deleteCheckboxList = document.getElementById('deleteCheckboxList');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const closeDeleteModal = document.getElementById('closeDeleteModal');

    showInviteBtn?.addEventListener('click', () => {
        if (!currentSubject?.code) {
            alert('Код предмета не загружен. Обновите страницу.');
            return;
        }
        inviteCodeInput.value = currentSubject.code;
        inviteCodeModal.style.display = 'block';
    });

    showDeleteBtn?.addEventListener('click', () => {
    deleteCheckboxList.innerHTML = '';
    currentTeam.forEach(member => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = member.id;
        label.style.display = 'block';
        label.style.margin = '6px 0';
        label.append(checkbox, ' ', document.createTextNode(member.name));
        deleteCheckboxList.appendChild(label);
    });
    deleteStudentsModal.style.display = 'block';
    });

    confirmDeleteBtn?.addEventListener('click', async () => {
    const checked = deleteCheckboxList.querySelectorAll('input[type="checkbox"]:checked');
    const studentIds = Array.from(checked).map(cb => cb.value);

    if (!confirm(`Удалить ${studentIds.length} студент(ов)?`)) return;

    try {
        for (const studentId of studentIds) {
            const res = await fetch(`${API_BASE}/team/student/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'SubjectId': subjectId
                }
            });
            if (!res.ok) throw new Error(`Ошибка при удалении ${studentId}`);
        }
        alert('Студенты удалены.');
        deleteStudentsModal.style.display = 'none';
        await loadSubjectAndTasks();
    } catch (err) {
        console.error(err);
        alert('Не удалось удалить студентов.');
    }
    });

    closeInviteModal?.addEventListener('click', () => {
    inviteCodeModal.style.display = 'none';
    });

    closeDeleteModal?.addEventListener('click', () => {
    deleteStudentsModal.style.display = 'none';
    });

    loadSubjectAndTasks();
});