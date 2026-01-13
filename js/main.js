document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'https://localhost:7109';
    const token = localStorage.getItem('authToken');

    if (!token) {
        alert('Пожалуйста, войдите в систему.');
        window.location.href = '../index.html';
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
    const editSubjectModal = document.getElementById('editSubjectModal');
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
    let currentUserId = null;
    let currentViewTask = null;
    let currentFilter = { isMine: false, notAssigned: false };

    function isAfter(dateA, dateB) {
        const a = dateA instanceof Date ? dateA : new Date(dateA);
        const b = dateB instanceof Date ? dateB : new Date(dateB);
        return a > b;
    }

    function getColorById(taskId) {
        const colors = [
            'pastel-blue', 'pastel-orange', 'pastel-pink', 'pastel-green',
            'pastel-yellow', 'pastel-purple', 'pastel-red', 'pastel-teal',
            'pastel-lime', 'pastel-indigo'
        ];
        
        if (!taskId) return colors[0];
        
        let hash = 0;
        for (let i = 0; i < taskId.length; i++) {
            hash = taskId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    async function loadSubjectAndTasks(isMine = false, notAssigned = false) {
        try {
            const subjectRes = await fetch(`${API_BASE}/subject/${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (subjectRes.status === 401) {
                localStorage.removeItem('authToken');
                alert('Сессия истекла. Пожалуйста, войдите снова.');
                window.location.href = '../index.html';
                return;
            }
            
            if (!subjectRes.ok) throw new Error('Не удалось загрузить предмет');
            currentSubject = await subjectRes.json();

            const queryParams = new URLSearchParams({
                isMine: isMine,
                notAssigned: notAssigned
            });
            const tasksUrl = `${API_BASE}/task/tasks/${subjectId}?${queryParams}`;
            const tasksRes = await fetch(tasksUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!tasksRes.ok) throw new Error('Не удалось загрузить задачи');
            currentTasks = await tasksRes.json();

            const teamRes = await fetch(`${API_BASE}/team/${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!teamRes.ok) throw new Error('Не удалось загрузить команду');
            currentTeam = await teamRes.json();

            const profileRes = await fetch(`${API_BASE}/student/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (profileRes.ok) {
                const profile = await profileRes.json();
                currentUserId = profile.id; 
            } else {
                console.warn('Не удалось загрузить профиль пользователя');
            }

            renderSubjectData();
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            alert('Не удалось загрузить данные предмета.');
            window.location.href = '../menu.html';
        }
    }

    function renderSubjectData() {
        nameSubjectButton.textContent = currentSubject.name;
        renderTasks();
        renderTeam();
    }

    function sortColumn(columnElement) {
        const tasks = Array.from(columnElement.querySelectorAll('.task'));
        
        tasks.sort((a, b) => {
            const taskA = currentTasks.find(t => t.id === a.dataset.taskId);
            const taskB = currentTasks.find(t => t.id === b.dataset.taskId);
            if (!taskA || !taskB) return 0;
            return compareTaskNumbers(taskA, taskB);
        });

        columnElement.innerHTML = '';
        tasks.forEach(task => columnElement.appendChild(task));
    }
    
    function compareTaskNumbers(a, b) {
        const aParts = a.number.split('.').map(Number);
        const bParts = b.number.split('.').map(Number);    
        const len = Math.max(aParts.length, bParts.length);
        for (let i = 0; i < len; i++) {
            const aNum = i < aParts.length ? aParts[i] : 0;
            const bNum = i < bParts.length ? bParts[i] : 0;
            if (aNum !== bNum) {
                return aNum - bNum;
            }
        }
        return 0;
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


        const sortedTasks = [...currentTasks].sort(compareTaskNumbers);

        sortedTasks.forEach(task => {
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
                openTaskModal(task.id);
            });

            switch (displayStatus) {
                case 'created':
                    createdColumn.appendChild(taskElement);
                    break;
                case 'process':
                    processColumn.appendChild(taskElement);
                    break;
                case 'done':
                    doneColumn.appendChild(taskElement);
                    break;
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

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Opera Mini/i.test(navigator.userAgent);
    let draggedTask = null;
    let touchOffsetY = 0;

    async function moveTaskToColumn(taskElement, newStatus, targetColumn) {
        const taskId = taskElement.dataset.taskId;
        if (taskElement.dataset.status === newStatus) return;

        const statusMapToBackend = {
            'created': 'Created',
            'process': 'InProcess',
            'done': 'Done'
        };
        const backendStatus = statusMapToBackend[newStatus];

        try {
            const res = await fetch(`${API_BASE}/task/status/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: backendStatus })
            });

            if (!res.ok) throw new Error('Не удалось обновить статус');

            const task = currentTasks.find(t => t.id === taskId);
            if (task) task.status = backendStatus;

            taskElement.dataset.status = newStatus;
            targetColumn.appendChild(taskElement);
            sortColumn(targetColumn);
        } catch (err) {
            console.error(err);
            alert('Не удалось изменить статус задачи.');
        }
    }

    function dragStart(e) {
        draggedTask = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }

    function handleTouchStart(e) {
        draggedTask = e.currentTarget;
        const rect = draggedTask.getBoundingClientRect();
        touchOffsetY = e.touches[0].clientY - rect.top;
        draggedTask.style.opacity = '0.6';
        draggedTask.style.transform = 'scale(1.02)';
        e.preventDefault();
    }

    function handleTouchMove(e) {
        if (!draggedTask) return;
        e.preventDefault();
        const y = e.touches[0].clientY - touchOffsetY;
        Object.assign(draggedTask.style, {
            position: 'fixed',
            left: '0',
            right: '0',
            zIndex: '1000',
            pointerEvents: 'none',
            margin: '0',
            transform: `translateY(${y}px)`
        });
    }

    function handleTouchEnd(e) {
        if (!draggedTask) return;

        Object.assign(draggedTask.style, {
            position: '',
            left: '',
            right: '',
            zIndex: '',
            pointerEvents: '',
            transform: '',
            opacity: ''
        });

        const clientY = e.changedTouches[0].clientY;
        const columns = [
            { el: createdColumn, status: 'created' },
            { el: processColumn, status: 'process' },
            { el: doneColumn, status: 'done' }
        ];

        const dropTarget = columns.find(col => {
            const rect = col.el.getBoundingClientRect();
            return clientY >= rect.top && clientY <= rect.bottom;
        });

        if (dropTarget) {
            moveTaskToColumn(draggedTask, dropTarget.status, dropTarget.el);
        }

        draggedTask = null;
    }

    const originalRenderTasks = renderTasks;
    renderTasks = function() {
        originalRenderTasks();

        document.querySelectorAll('.task').forEach(task => {
            task.draggable = false;
            task.removeEventListener('touchstart', handleTouchStart);
            task.removeEventListener('touchmove', handleTouchMove);
            task.removeEventListener('touchend', handleTouchEnd);
        });

        if (isMobile) {
            document.querySelectorAll('.task').forEach(task => {
                task.addEventListener('touchstart', handleTouchStart, { passive: false });
                task.addEventListener('touchmove', handleTouchMove, { passive: false });
                task.addEventListener('touchend', handleTouchEnd, { passive: false });
            });
        } else {
            document.querySelectorAll('.task').forEach(task => {
                task.draggable = true;
                task.ondragstart = dragStart;
            });
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
            body.addEventListener('drop', (e) => {
                e.preventDefault();
                body.classList.remove('drag-over');
                if (!draggedTask) return;
                const newStatus = 
                    body === createdColumn ? 'created' : 
                    body === processColumn ? 'process' : 'done';
                moveTaskToColumn(draggedTask, newStatus, body);
                draggedTask = null;
            });
        });
    };

    backButton.addEventListener('click', () => {
        window.location.href = '../menu.html';
    });

    teamButton.addEventListener('click', () => {
        teamModal.style.display = 'block';
    });

    nameSubjectButton.addEventListener('click', () => {
        if (!currentSubject) return;
        
        editModalTitle.textContent = currentSubject.name;
        editSubjectName.value = currentSubject.name;
        editSubjectDescription.value = currentSubject.resultDescription || '';
        editSubjectResult.value = currentSubject.result || '';
        
        if (currentSubject.resultDeadline) {
            const deadlineDate = new Date(currentSubject.resultDeadline);
            editSubjectDeadline.value = deadlineDate.toISOString().split('T')[0];
        } else {
            editSubjectDeadline.value = '';
        }
        
        editSubjectModal.style.display = 'block';
    });

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
        }
    });

    addTaskButton.addEventListener('click', () => {
        const assigneesList = document.getElementById('assigneesList');
        assigneesList.innerHTML = '';
        
        currentTeam.forEach(member => {
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = member.id;
            label.append(checkbox, document.createTextNode(` ${member.name}`));
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
            const deadlineDate = new Date(deadlineInput);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (deadlineDate < today) {
                alert('Дедлайн не может быть в прошлом!');
                return;
            }
            if (deadlineInput && currentSubject.resultDeadline) {
                const taskDeadlineDate = new Date(deadlineInput);
                taskDeadlineDate.setHours(23, 59, 59, 999);

                const subjectDeadline = new Date(currentSubject.resultDeadline);
                if (isAfter(taskDeadlineDate, subjectDeadline)) {
                    alert('Дедлайн задачи не может быть позже дедлайна проекта.');
                    return;
                }
            }
        }

        const checked = document.querySelectorAll('#assigneesList input[type="checkbox"]:checked');
        const assignees = Array.from(checked).map(cb => cb.value);

        const topLevelNumbers = currentTasks
            .map(t => t.number)
            .filter(num => /^\d+$/.test(num)) 
            .map(num => parseInt(num, 10))
            .filter(n => !isNaN(n));

        const nextNumber = topLevelNumbers.length > 0 
            ? Math.max(...topLevelNumbers) + 1 
            : 1;

        const taskNumber = nextNumber.toString();

        let taskDeadline = null;
        if (deadlineInput) {
            const localDate = new Date(deadlineInput);
            localDate.setHours(23, 59, 59, 999); 
            taskDeadline = localDate.toISOString(); 
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
                let errorMessage = 'Не удалось создать задачу.';
                try {
                    const errorJson = await res.json();
                    if (res.status === 400 && errorJson.details === "Deadline is uncorrect") {
                        errorMessage = 'Дедлайн задачи не может быть позже дедлайна проекта.';
                    } else {
                        errorMessage += ' ' + (errorJson.details || '');
                    }
                } catch {
                }
                throw new Error(errorMessage);
            }

            taskModal.style.display = 'none';
            document.getElementById('taskForm').reset();
            await loadSubjectAndTasks();
        } catch (err) {
            console.error(err);
            alert(err.message);
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

            localDate.setHours(23, 59, 59, 999);
            resultDeadline = localDate.toISOString();
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
                throw new Error(`Не удалось обновить предмет: ${errorText}`);
            }

            editSubjectModal.style.display = 'none';
            await loadSubjectAndTasks();

        } catch (err) {
            console.error(err);
            alert('Ошибка при обновлении предмета: ' + err.message);
        }
    });

    deleteSubjectBtn.addEventListener('click', async () => {
        if (!confirm) return;

        try {
            const res = await fetch(`${API_BASE}/subject/delete/${subjectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Не удалось удалить предмет');

            window.location.href = '../menu.html';

        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении предмета');
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    subjectId = urlParams.get('id');

    if (!subjectId) {
        alert('Не указан ID предмета');
        window.location.href = '../menu.html';
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
    const exitSubjectBtn = document.getElementById('exitSubjectBtn');

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
            if (member.id === currentUserId) return;
            
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.style.display = 'block';
            label.style.margin = '6px 0';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = member.id;
            
            label.append(checkbox, ' ', document.createTextNode(member.name));
            deleteCheckboxList.appendChild(label);
        });
        
        deleteStudentsModal.style.display = 'block';
    });

    confirmDeleteBtn?.addEventListener('click', async () => {
        const checked = deleteCheckboxList.querySelectorAll('input[type="checkbox"]:checked');
        const studentIds = Array.from(checked).map(cb => cb.value);

        if (studentIds.length === 0) {
            alert('Выберите хотя бы одного студента для удаления');
            return;
        }

        if (!confirm) return;

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

    exitSubjectBtn?.addEventListener('click', async () => {
        if (!confirm) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/team/exit/${subjectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Не удалось выйти из предмета');
            }

            window.location.href = '../menu.html';

        } catch (err) {
            console.error('Ошибка при выходе:', err);
            alert('Ошибка: ' + err.message);
        }
    });

    async function openTaskModal(taskId) {
        try {
            const taskRes = await fetch(`${API_BASE}/task/${taskId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!taskRes.ok) throw new Error('Не удалось загрузить задачу');
            const task = await taskRes.json();

            currentViewTask = task;

            const teamRes = await fetch(`${API_BASE}/team/${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const team = teamRes.ok ? await teamRes.json() : [];

            document.getElementById('viewTaskTitle').textContent = `${task.number}. ${task.name}`;
            document.getElementById('viewTaskDescription').textContent = task.description || '—';
            document.getElementById('viewTaskDeadline').textContent = task.deadline
                ? new Date(task.deadline).toLocaleDateString('ru-RU')
                : '—';

            const assigneesContainer = document.getElementById('viewTaskAssignees');
            if (task.responsibleStudents?.length) {
                const assigneeNames = task.responsibleStudents;
                assigneesContainer.innerHTML = assigneeNames.map(name => `<div>${name}</div>`).join('');
            } else {
                assigneesContainer.innerHTML = '—';
            }

            const parentContainer = document.getElementById('viewParentTaskContainer');
            const parentTaskElement = document.getElementById('viewParentTask');
            
            if (task.parentNumber && task.parentName) {
                parentTaskElement.textContent = `${task.parentNumber}. ${task.parentName}`;
                parentContainer.style.display = 'block';
            } else {
                parentContainer.style.display = 'none';
            }

            const rootNumber = task.number.split('.')[0];
            const color = getColorById(rootNumber);
            const colorMap = {
                'pastel-blue': '#cce5ff',
                'pastel-orange': '#ffe0b2',
                'pastel-pink': '#f8bbd9',
                'pastel-green': '#c8e6c9',
                'pastel-yellow': '#fff9c4',
                'pastel-purple': '#e1bee7',
                'pastel-red': '#ffcdd2',
                'pastel-teal': '#b2ebf2',
                'pastel-lime': '#e6ee9c',
                'pastel-indigo': '#d1c4e9'
            };
            
            const header = document.querySelector('#viewTaskModal .task-modal-header');
            if (header) {
                header.style.backgroundColor = colorMap[color] || '#cce5ff';
            }

            document.getElementById('viewTaskModal').style.display = 'block';
            setupViewTaskModalListeners(team);
        } catch (err) {
            console.error('Ошибка загрузки задачи:', err);
            alert('Не удалось открыть задачу.');
        }
    }

    function setupViewTaskModalListeners(team) {
        document.getElementById('closeViewTaskModal').onclick = () => {
            document.getElementById('viewTaskModal').style.display = 'none';
        };

        document.getElementById('viewDeleteTaskBtn').onclick = async () => {
            if (!confirm) return;
            
            try {
                const res = await fetch(`${API_BASE}/task/${currentViewTask.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!res.ok) throw new Error('Не удалось удалить задачу');
                
                document.getElementById('viewTaskModal').style.display = 'none';
                await loadSubjectAndTasks();
            } catch (err) {
                alert('Ошибка удаления: ' + err.message);
            }
        };

        document.getElementById('viewEditTaskBtn').onclick = () => {
            document.getElementById('viewTaskModal').style.display = 'none';
            
            const assigneesList = document.getElementById('editAssigneesList');
            assigneesList.innerHTML = '';
            
            team.forEach(member => {
                const label = document.createElement('label');
                label.className = 'checkbox-label';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = member.id;
                
                if (currentViewTask.responsibleStudents?.includes(member.name)) {
                    checkbox.checked = true;
                }
                
                label.append(checkbox, document.createTextNode(` ${member.name}`));
                assigneesList.appendChild(label);
            });
            
            document.getElementById('editTaskName').value = currentViewTask.name;
            document.getElementById('editDescription').value = currentViewTask.description || '';
            
            if (currentViewTask.deadline) {
                const deadlineDate = new Date(currentViewTask.deadline);
                document.getElementById('editDeadline').value = deadlineDate.toISOString().split('T')[0];
            } else {
                document.getElementById('editDeadline').value = '';
            }
            
            document.getElementById('editTaskModal').style.display = 'block';
        };

        document.getElementById('viewCreateSubtaskBtn').onclick = () => {
            document.getElementById('viewTaskModal').style.display = 'none';
            
            const assigneesList = document.getElementById('subtaskAssigneesList');
            assigneesList.innerHTML = '';
            
            team.forEach(member => {
                const label = document.createElement('label');
                label.className = 'checkbox-label';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = member.id;
                label.append(checkbox, document.createTextNode(` ${member.name}`));
                assigneesList.appendChild(label);
            });
            
            document.getElementById('subtaskModal').style.display = 'block';
        };
    }

    document.getElementById('subtaskForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('subtaskName').value.trim();
        if (!name) {
            alert('Введите название подзадачи');
            return;
        }

        const parentTaskId = currentViewTask.id;

        let allTasks = [];
        try {
            const tasksRes = await fetch(`${API_BASE}/task/tasks/${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (tasksRes.ok) {
                allTasks = await tasksRes.json();
            }
        } catch (err) {
            console.warn('Не удалось загрузить список задач для нумерации подзадачи');
        }

        const number = getNextSubtaskNumber(currentViewTask.number, allTasks);
        const description = document.getElementById('subtaskDescription').value.trim();
        const deadlineInput = document.getElementById('subtaskDeadline').value;

        if (deadlineInput) {
            const deadlineDate = new Date(deadlineInput);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (deadlineDate < today) {
                alert('Дедлайн не может быть в прошлом!');
                return;
            }
            if (deadlineInput && currentSubject.resultDeadline) {
                const subtaskDeadlineDate = new Date(deadlineInput);
                subtaskDeadlineDate.setHours(23, 59, 59, 999);

                const subjectDeadline = new Date(currentSubject.resultDeadline);
                if (isAfter(subtaskDeadlineDate, subjectDeadline)) {
                    alert('Дедлайн подзадачи не может быть позже дедлайна главной задачи.');
                    return;
                }
            }
        }

        const checked = document.querySelectorAll('#subtaskAssigneesList input[type="checkbox"]:checked');
        const assigneeIds = Array.from(checked).map(cb => cb.value);

        try {
            let subtaskDeadline = null;
            if (deadlineInput) {
                const d = new Date(deadlineInput);
                d.setHours(23, 59, 59, 999);
                subtaskDeadline = d.toISOString();
            }

            const subtaskData = {
                number,
                name,
                description,
                deadline: subtaskDeadline,
                responsibleStudents: assigneeIds
            };

            const res = await fetch(`${API_BASE}/task/add/${parentTaskId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(subtaskData)
            });

            if (!res.ok) {
                let errorMessage = 'Не удалось создать подзадачу.';
                try {
                    const errorJson = await res.json();
                    if (res.status === 400 && errorJson.details === "Deadline is uncorrect") {
                        errorMessage = 'Дедлайн подзадачи не может быть позже дедлайна главной задачи.';
                    } else {
                        errorMessage += ' ' + (errorJson.details || '');
                    }
                } catch {
                }
                throw new Error(errorMessage);
            }

            document.getElementById('subtaskModal').style.display = 'none';
            document.getElementById('subtaskForm').reset();
            await loadSubjectAndTasks();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    });

    function getNextSubtaskNumber(parentNumber, existingTasks) {
        const siblings = existingTasks.filter(t =>
            t.number.startsWith(parentNumber + '.') &&
            t.number.split('.').length === parentNumber.split('.').length + 1
        );
        
        const indices = siblings.map(t => {
            const parts = t.number.split('.');
            return parseInt(parts[parts.length - 1], 10);
        }).filter(n => !isNaN(n));
        
        const maxIndex = indices.length > 0 ? Math.max(...indices) : 0;
        return `${parentNumber}.${maxIndex + 1}`;
    }

    document.getElementById('editTaskForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newTaskName = document.getElementById('editTaskName').value.trim();
        const newDescription = document.getElementById('editDescription').value.trim();
        const newDeadline = document.getElementById('editDeadline').value;

        if (!newTaskName) {
            alert('Название задачи не может быть пустым');
            return;
        }

        if (newDeadline) {
            const deadlineDate = new Date(newDeadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (deadlineDate < today) {
                alert('Дедлайн не может быть в прошлом!');
                return;
            }
            if (newDeadline && currentSubject.resultDeadline) {
                const taskDeadlineDate = new Date(newDeadline);
                taskDeadlineDate.setHours(23, 59, 59, 999);

                const subjectDeadline = new Date(currentSubject.resultDeadline);
                if (isAfter(taskDeadlineDate, subjectDeadline)) {
                    alert('Дедлайн задачи не может быть позже дедлайна проекта.');
                    return;
                }
            }
        }

        const checked = document.querySelectorAll('#editAssigneesList input[type="checkbox"]:checked');
        const newAssignees = Array.from(checked).map(cb => cb.value);

        let deadlineToSend = null;
        if (newDeadline) {
            const d = new Date(newDeadline);
            d.setHours(23, 59, 59, 999);
            deadlineToSend = d.toISOString();
        }

        try {
            const updateData = {
                name: newTaskName,
                description: newDescription,
                deadline: deadlineToSend,
                responsibleStudents: newAssignees
            };

            const res = await fetch(`${API_BASE}/task/update/${currentViewTask.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!res.ok) {
                let errorMessage = 'Не удалось обновить задачу.';
                try {
                    const errorJson = await res.json();
                    if (res.status === 400 && errorJson.details === "Deadline is uncorrect") {
                        errorMessage = 'Дедлайн задачи не может быть позже дедлайна проекта.';
                    } else {
                        errorMessage += ' ' + (errorJson.details || '');
                    }
                } catch {
                }
                throw new Error(errorMessage);
            }

            document.getElementById('editTaskModal').style.display = 'none';
            await loadSubjectAndTasks();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    });

    document.getElementById('filter-button')?.addEventListener('click', () => {
        document.getElementById('filterModal').style.display = 'block';
    });

    document.getElementById('filterMine')?.addEventListener('click', () => {
        document.getElementById('filterModal').style.display = 'none';
        loadSubjectAndTasks(true, false);
    });

    document.getElementById('filterUnassigned')?.addEventListener('click', () => {
        document.getElementById('filterModal').style.display = 'none';
        loadSubjectAndTasks(false, true);
    });

    document.getElementById('filterAll')?.addEventListener('click', () => {
        document.getElementById('filterModal').style.display = 'none';
        loadSubjectAndTasks(false, false);
    });

    loadSubjectAndTasks();
});