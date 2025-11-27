document.addEventListener('DOMContentLoaded', () => {
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

    function getRandomColor(currentTasks) {
        const colors = [
            'pastel-blue',
            'pastel-orange',
            'pastel-pink',
            'pastel-green',
            'pastel-yellow',
            'pastel-purple',
            'pastel-red',
            'pastel-teal',
            'pastel-lime',
            'pastel-indigo'
        ];
        const usedColors = currentTasks.map(task => task.color);
        const availableColors = colors.filter(color => !usedColors.includes(color));
        if (availableColors.length > 0) {
            return availableColors[Math.floor(Math.random() * availableColors.length)];
        }
        return colors[Math.floor(Math.random() * colors.length)];
    }

    const stored = localStorage.getItem('subjects');
    let subjects = stored ? JSON.parse(stored) : [];

    const mathSubject = subjects.find(s => s.name === 'Математика');
    if (mathSubject && (!mathSubject.team || mathSubject.team.length === 0)) {
        mathSubject.team = ['Иванов И.И.', 'Петров П.П.', 'Сидорова С.С.'];
        localStorage.setItem('subjects', JSON.stringify(subjects));
    }

    const subjectsData = {};
    subjects.forEach(s => {
        subjectsData[s.id] = {
            name: s.name,
            description: s.description || '',
            result: s.result || '',
            deadline: s.deadline || '',
            tasks: s.tasks || [],
            team: s.team || []
        };
    });

    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get('id');

    if (!subjectId) {
        alert('Не указан ID предмета');
        window.location.href = '../MenuSubjects/index.html';
        return;
    }

    const subject = subjectsData[subjectId];
    if (!subject) {
        alert('Предмет не найден');
        window.location.href = '../MenuSubjects/index.html';
        return;
    }

    function renderSubjectData() {
        nameSubjectButton.textContent = subject.name;

        createdColumn.innerHTML = '';
        processColumn.innerHTML = '';
        doneColumn.innerHTML = '';

        subject.tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task ${task.color}`;
            taskElement.draggable = true;
            taskElement.ondragstart = dragStart;
            taskElement.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `task.html?subjectId=${subjectId}&taskId=${task.id}`;
            });
            taskElement.textContent = `${task.id}. ${task.name}`;
            taskElement.dataset.taskId = task.id;
            taskElement.dataset.status = task.status;

            if (task.status === 'created') {
                createdColumn.appendChild(taskElement);
            } else if (task.status === 'process') {
                processColumn.appendChild(taskElement);
            } else if (task.status === 'done') {
                doneColumn.appendChild(taskElement);
            }
        });

        teamList.innerHTML = '';
        subject.team.forEach(member => {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'ФИО';
            input.className = 'team-input';
            input.value = member;
            input.readOnly = true;
            teamList.appendChild(input);
        });
    }

    let draggedTask = null;

    function dragStart(e) {
        draggedTask = e.target;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => e.target.classList.add('dragging'), 0);
    }

    document.querySelectorAll('.column-body').forEach(body => {
        body.addEventListener('dragover', e => e.preventDefault());
        body.addEventListener('dragenter', e => {
            e.preventDefault();
            body.style.backgroundColor = '#eef';
        });
        body.addEventListener('dragleave', () => {
            body.style.backgroundColor = 'transparent';
        });
        body.addEventListener('drop', e => {
            e.preventDefault();
            if (draggedTask && !body.contains(draggedTask)) {
                body.appendChild(draggedTask);
                const newStatus = body === createdColumn ? 'created' :
                                  body === processColumn ? 'process' : 'done';
                draggedTask.dataset.status = newStatus;

                const taskId = draggedTask.dataset.taskId;
                const task = subject.tasks.find(t => t.id === taskId);
                if (task) {
                    task.status = newStatus;
                    const storedSubjects = JSON.parse(localStorage.getItem('subjects')) || [];
                    const updatedSubjects = storedSubjects.map(s =>
                        s.id === subjectId ? { ...s, tasks: subject.tasks } : s
                    );
                    localStorage.setItem('subjects', JSON.stringify(updatedSubjects));
                    subjectsData[subjectId] = {
                        ...subject,
                        tasks: [...subject.tasks]
                    };
                }
            }
            body.style.backgroundColor = 'transparent';
            draggedTask = null;
        });
    });

    teamButton.addEventListener('click', () => teamModal.style.display = 'block');
    backButton.addEventListener('click', () => window.location.href = '../MenuSubjects/index.html');
    nameSubjectButton.addEventListener('click', () => {
        const current = subjectsData[subjectId];
        if (current) {
            editModalTitle.textContent = current.name;
            editSubjectName.value = current.name;
            editSubjectDescription.value = current.description;
            editSubjectResult.value = current.result;
            editSubjectDeadline.value = current.deadline;
            editSubjectModal.style.display = 'block';
        }
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            teamModal.style.display = 'none';
            taskModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === teamModal) teamModal.style.display = 'none';
        if (e.target === taskModal) taskModal.style.display = 'none';
        if (e.target === editSubjectModal) editSubjectModal.style.display = 'none';
    });

    closeEditSubjectModal.addEventListener('click', () => editSubjectModal.style.display = 'none');

    addTaskButton.addEventListener('click', () => {
        const assigneesList = document.getElementById('assigneesList');
        assigneesList.innerHTML = '';
        subject.team.forEach(member => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = member;
            label.append(checkbox, document.createTextNode(member));
            assigneesList.appendChild(label);
        });
        taskModal.style.display = 'block';
    });

    document.getElementById('taskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('taskName').value.trim();
        if (!name) return;

        const description = document.getElementById('taskDescription').value.trim();
        const deadline = document.getElementById('taskDeadline').value;

        const checked = document.querySelectorAll('#assigneesList input[type="checkbox"]:checked');
        const assignees = Array.from(checked).map(cb => cb.value);

        if (deadline) {
            const d = new Date(deadline);
            const today = new Date();
            today.setHours(0,0,0,0);
            if (d < today) {
                alert('Дедлайн не может быть в прошлом!');
                return;
            }
        }

        const topLevelIds = subject.tasks
            .map(t => t.id)
            .filter(id => /^\d+$/.test(id))
            .map(id => parseInt(id, 10))
            .filter(n => !isNaN(n));

        const nextId = topLevelIds.length ? Math.max(...topLevelIds) + 1 : 1;

        const topLevelTasks = subject.tasks.filter(t => /^\d+$/.test(t.id));
        const color = getRandomColor(topLevelTasks);

        const newTask = {
            id: String(nextId),
            name: name,
            status: 'created',
            color: color,
            description: description,
            deadline: deadline,
            assignees: assignees
        };

        subject.tasks.push(newTask);
        const storedSubjects = JSON.parse(localStorage.getItem('subjects')) || [];
        const updated = storedSubjects.map(s => s.id === subjectId ? { ...s, tasks: subject.tasks } : s);
        localStorage.setItem('subjects', JSON.stringify(updated));

        subjectsData[subjectId] = {
            ...subject,
            tasks: [...subject.tasks]
        };

        const el = document.createElement('div');
        el.className = `task ${color}`;
        el.draggable = true;
        el.ondragstart = dragStart;
        el.textContent = `${nextId}. ${name}`;
        el.dataset.taskId = String(nextId);
        el.dataset.status = 'created';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `task.html?subjectId=${subjectId}&taskId=${nextId}`;
        });
        createdColumn.appendChild(el);

        taskModal.style.display = 'none';
        document.getElementById('taskForm').reset();
    });

    editSubjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = editSubjectName.value.trim();
        const newDescription = editSubjectDescription.value.trim();
        const newResult = editSubjectResult.value.trim();
        const newDeadline = editSubjectDeadline.value;

        if (!newName || !newResult) {
            alert('Заполните название и результат!');
            return;
        }

        if (newDeadline) {
            const d = new Date(newDeadline);
            const today = new Date();
            today.setHours(0,0,0,0);
            if (d < today) {
                alert('Дедлайн не может быть в прошлом!');
                return;
            }
        }

        const storedSubjects = JSON.parse(localStorage.getItem('subjects')) || [];
        const updated = storedSubjects.map(s =>
            s.id === subjectId ? { ...s, name: newName, description: newDescription, result: newResult, deadline: newDeadline } : s
        );
        localStorage.setItem('subjects', JSON.stringify(updated));

        subjectsData[subjectId] = {
            name: newName,
            description: newDescription,
            result: newResult,
            deadline: newDeadline,
            tasks: subject.tasks,
            team: subject.team
        };

        nameSubjectButton.textContent = newName;
        editSubjectModal.style.display = 'none';
    });

    deleteSubjectBtn.addEventListener('click', () => {
        if (confirm('Удалить предмет?')) {
            const storedSubjects = JSON.parse(localStorage.getItem('subjects')) || [];
            const filtered = storedSubjects.filter(s => String(s.id) !== subjectId);
            localStorage.setItem('subjects', JSON.stringify(filtered));
            delete subjectsData[subjectId];
            window.location.href = '../MenuSubjects/index.html';
        }
    });

    renderSubjectData();
});