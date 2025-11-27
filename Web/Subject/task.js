document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get('subjectId');
    const taskId = urlParams.get('taskId');

    if (!subjectId || !taskId) {
        alert('Некорректный URL');
        history.back();
        return;
    }

    const backButton = document.getElementById('backButton');
    const taskTitle = document.getElementById('taskTitle');
    const taskDescription = document.getElementById('taskDescription');
    const taskAssignees = document.getElementById('taskAssignees');
    const headerDeadlineDate = document.getElementById('headerDeadlineDate'); 
    const parentTaskElement = document.getElementById('parentTask');
    const parentTaskContainer = document.getElementById('parentTaskContainer');

    const editTaskBtn = document.getElementById('editTaskBtn');
    const deleteTaskBtn = document.getElementById('deleteTaskBtn');
    const createSubtaskBtn = document.getElementById('createSubtaskBtn');

    const editTaskModal = document.getElementById('editTaskModal');
    const subtaskModal = document.getElementById('subtaskModal');
    const closeEditTaskModal = document.getElementById('closeEditTaskModal');
    const closeSubtaskModal = document.getElementById('closeSubtaskModal');

    backButton.addEventListener('click', () => {
        window.location.href = `subject.html?id=${subjectId}`;
    });

    let subjects = JSON.parse(localStorage.getItem('subjects') || '[]');

    const mathSubject = subjects.find(s => s.name === 'Математика');
    if (mathSubject && (!mathSubject.team || mathSubject.team.length === 0)) {
        mathSubject.team = ['Иванов И.И.', 'Петров П.П.', 'Сидорова С.С.'];
        localStorage.setItem('subjects', JSON.stringify(subjects));
    }

    const subject = subjects.find(s => String(s.id) === subjectId);

    if (!subject) {
        alert('Предмет не найден');
        window.location.href = '../MenuSubjects/index.html';
        return;
    }

    const task = subject.tasks.find(t => t.id === taskId);
    if (!task) {
        alert('Задача не найдена');
        window.location.href = `subject.html?id=${subjectId}`;
        return;
    }

    const getParentTaskId = id => {
        const parts = id.split('.');
        return parts.length > 1 ? parts.slice(0, -1).join('.') : null;
    };

    const getRootTaskId = id => id.split('.')[0];

    const getAllSubtaskIds = (taskId, tasks) => {
        const directChildren = tasks
            .filter(t => t.id.startsWith(taskId + '.') && t.id.split('.').length === taskId.split('.').length + 1)
            .map(t => t.id);
        let all = [...directChildren];
        for (const childId of directChildren) {
            all = all.concat(getAllSubtaskIds(childId, tasks));
        }
        return all;
    };

    const parentId = getParentTaskId(taskId);
    const parentTaskObj = parentId ? subject.tasks.find(t => t.id === parentId) : null;
    const rootTask = subject.tasks.find(t => t.id === getRootTaskId(taskId));

    taskTitle.textContent = `${taskId}. ${task.name}`;
    taskDescription.textContent = task.description || '—';
    headerDeadlineDate.textContent = task.deadline 
        ? new Date(task.deadline).toLocaleDateString('ru-RU')
        : '—';

    taskAssignees.innerHTML = task.assignees?.length
        ? task.assignees.map(name => `<div>${name}</div>`).join('')
        : '—';

    if (parentId && parentTaskObj) {
        parentTaskElement.textContent = `${parentTaskObj.id}. ${parentTaskObj.name}`;
        parentTaskContainer.style.display = 'block';
    } else {
        parentTaskContainer.style.display = 'none';
    }

    if (rootTask?.color) {
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
        document.querySelector('.page-container').style.backgroundColor = colorMap[rootTask.color] || '#d8c9f0';
    }

    editTaskBtn.addEventListener('click', () => {
        const assigneesList = document.getElementById('editAssigneesList');
        assigneesList.innerHTML = '';
        subject.team.forEach(member => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = member;
            if (task.assignees?.includes(member)) checkbox.checked = true;
            label.append(checkbox, document.createTextNode(member));
            assigneesList.appendChild(label);
        });
        document.getElementById('editDescription').value = task.description || '';
        document.getElementById('editDeadline').value = task.deadline || '';
        editTaskModal.style.display = 'block';
    });

    document.getElementById('editTaskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newDescription = document.getElementById('editDescription').value.trim();
        const newDeadline = document.getElementById('editDeadline').value;

        const checked = document.querySelectorAll('#editAssigneesList input[type="checkbox"]:checked');
        const newAssignees = Array.from(checked).map(cb => cb.value);

        if (newDeadline) {
            const d = new Date(newDeadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d < today) {
                alert('Дедлайн не может быть в прошлом!');
                return;
            }
        }

        task.description = newDescription;
        task.deadline = newDeadline;
        task.assignees = newAssignees;

        localStorage.setItem('subjects', JSON.stringify(subjects));

        taskDescription.textContent = newDescription || '—';
        headerDeadlineDate.textContent = newDeadline 
            ? new Date(newDeadline).toLocaleDateString('ru-RU')
            : '—';
        taskAssignees.innerHTML = newAssignees.length
            ? newAssignees.map(name => `<div>${name}</div>`).join('')
            : '—';

        editTaskModal.style.display = 'none';
    });

    deleteTaskBtn.addEventListener('click', () => {
        if (!confirm(`Вы уверены, что хотите удалить задачу "${task.name}" и все её подзадачи?`)) {
            return;
        }

        const subtaskIds = getAllSubtaskIds(taskId, subject.tasks);
        const allIdsToDelete = [taskId, ...subtaskIds];
        subject.tasks = subject.tasks.filter(t => !allIdsToDelete.includes(t.id));
        localStorage.setItem('subjects', JSON.stringify(subjects));
        window.location.href = `subject.html?id=${subjectId}`;
    });

    createSubtaskBtn.addEventListener('click', () => {
        const assigneesList = document.getElementById('subtaskAssigneesList');
        assigneesList.innerHTML = '';
        subject.team.forEach(member => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = member;
            label.append(checkbox, document.createTextNode(member));
            assigneesList.appendChild(label);
        });
        subtaskModal.style.display = 'block';
    });

    document.getElementById('subtaskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('subtaskName').value.trim();
        if (!name) return;

        const siblings = subject.tasks.filter(t =>
            t.id.startsWith(taskId + '.') &&
            t.id.split('.').length === taskId.split('.').length + 1
        );
        const indices = siblings.map(t => {
            const parts = t.id.split('.');
            return parseInt(parts[parts.length - 1], 10);
        }).filter(n => !isNaN(n));
        const maxIndex = indices.length ? Math.max(...indices) : 0;
        const newId = `${taskId}.${maxIndex + 1}`;

        const description = document.getElementById('subtaskDescription').value.trim();
        const deadline = document.getElementById('subtaskDeadline').value;

        const checked = document.querySelectorAll('#subtaskAssigneesList input[type="checkbox"]:checked');
        const assignees = Array.from(checked).map(cb => cb.value);

        if (deadline) {
            const d = new Date(deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d < today) {
                alert('Дедлайн не может быть в прошлом!');
                return;
            }
        }

        const rootId = getRootTaskId(taskId);
        const actualRootTask = subject.tasks.find(t => t.id === rootId);

        const newSubtask = {
            id: newId,
            name: name,
            status: 'created',
            color: actualRootTask?.color || 'pastel-blue',
            description: description,
            deadline: deadline,
            assignees: assignees
        };

        subject.tasks.push(newSubtask);
        localStorage.setItem('subjects', JSON.stringify(subjects));

        subtaskModal.style.display = 'none';
        document.getElementById('subtaskForm').reset();
    });

    closeEditTaskModal.addEventListener('click', () => editTaskModal.style.display = 'none');
    closeSubtaskModal.addEventListener('click', () => subtaskModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === editTaskModal) editTaskModal.style.display = 'none';
        if (e.target === subtaskModal) subtaskModal.style.display = 'none';
    });
});