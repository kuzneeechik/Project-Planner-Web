document.addEventListener('DOMContentLoaded', () => {
	const API_BASE = 'https://localhost:7109';
	const token = localStorage.getItem('authToken');

	if (!token) {
		alert('Пожалуйста, войдите в систему.');
		window.location.href = '../Login/login.html';
		return;
	}

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

	let currentTask = null;
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

	async function loadTaskAndTeam() {
		try {
			const taskRes = await fetch(`${API_BASE}/task/${taskId}`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (taskRes.status === 401) {
				localStorage.removeItem('authToken');
				alert('Сессия истекла. Пожалуйста, войдите снова.');
				window.location.href = '../Login/login.html';
				return;
			}
			if (!taskRes.ok) throw new Error('Не удалось загрузить задачу');
			currentTask = await taskRes.json();

			const teamRes = await fetch(`${API_BASE}/team/${subjectId}`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (!teamRes.ok) throw new Error('Не удалось загрузить команду');
			currentTeam = await teamRes.json();

			renderTaskData();
		} catch (err) {
			console.error('Ошибка загрузки:', err);
			alert('Не удалось загрузить данные задачи.');
			window.location.href = `subject.html?id=${subjectId}`;
		}
	}

	function renderTaskData() {
		taskTitle.textContent = `${currentTask.number}. ${currentTask.name}`;
		taskDescription.textContent = currentTask.description || '—';
		headerDeadlineDate.textContent = currentTask.deadline
			? new Date(currentTask.deadline).toLocaleDateString('ru-RU')
			: '—';

		taskAssignees.innerHTML = currentTask.responsibleStudents?.length
			? currentTask.responsibleStudents.map(name => `<div>${name}</div>`).join('')
			: '—';

		if (currentTask.parentNumber && currentTask.parentName) {
			parentTaskElement.textContent = `${currentTask.parentNumber}. ${currentTask.parentName}`;
			parentTaskContainer.style.display = 'block';
		} else {
			parentTaskContainer.style.display = 'none';
		}

		const rootNumber = currentTask.number.split('.')[0];
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
		document.querySelector('.page-container').style.backgroundColor = colorMap[color] || '#d8c9f0';
	}

	backButton.addEventListener('click', () => {
		window.location.href = `subject.html?id=${subjectId}`;
	});

	editTaskBtn.addEventListener('click', () => {
		const assigneesList = document.getElementById('editAssigneesList');
		assigneesList.innerHTML = '';
		currentTeam.forEach(member => {
			const label = document.createElement('label');
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.value = member.name;
			if (currentTask.responsibleStudents?.includes(member.name)) {
				checkbox.checked = true;
			}
			label.append(checkbox, document.createTextNode(member.name));
			assigneesList.appendChild(label);
		});
		document.getElementById('editDescription').value = currentTask.description || '';
		document.getElementById('editDeadline').value = currentTask.deadline
			? new Date(currentTask.deadline).toISOString().split('T')[0]
			: '';
		editTaskModal.style.display = 'block';
	});

	document.getElementById('editTaskForm').addEventListener('submit', async (e) => {
		e.preventDefault();
		const newDescription = document.getElementById('editDescription').value.trim();
		const newDeadline = document.getElementById('editDeadline').value;

		if (newDeadline) {
			const d = new Date(newDeadline);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (d < today) {
				alert('Дедлайн не может быть в прошлом!');
				return;
			}
		}

		const checked = document.querySelectorAll('#editAssigneesList input[type="checkbox"]:checked');
		const newAssignees = Array.from(checked).map(cb => cb.value);

		const responsibleStudents = newAssignees.map(name => {
			const member = currentTeam.find(m => m.name === name);
			return member ? member.id : null;
		}).filter(id => id);

		const deadlineToSend = newDeadline 
			? new Date(new Date(newDeadline).setUTCHours(0, 0, 0, 0)).toISOString()
			: null;

		try {
			const updateData = {
				name: currentTask.name,
				description: newDescription,
				deadline: deadlineToSend,
				responsibleStudents
			};

			const res = await fetch(`${API_BASE}/task/update/${taskId}`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});

			if (!res.ok) {
				const errorText = await res.text().catch(() => 'Ошибка сервера');
				console.error('Ошибка обновления:', errorText);
				throw new Error('Не удалось обновить задачу');
			}

			currentTask.description = newDescription;
			currentTask.deadline = newDeadline;
			currentTask.responsibleStudents = newAssignees;

			taskDescription.textContent = newDescription || '—';
			headerDeadlineDate.textContent = newDeadline
				? new Date(newDeadline).toLocaleDateString('ru-RU')
				: '—';
			taskAssignees.innerHTML = newAssignees.length
				? newAssignees.map(name => `<div>${name}</div>`).join('')
				: '—';

			editTaskModal.style.display = 'none';
		} catch (err) {
			console.error(err);
			alert('Ошибка при обновлении задачи: ' + err.message);
		}
	});

	deleteTaskBtn.addEventListener('click', async () => {
		if (!confirm(`Вы уверены, что хотите удалить задачу "${currentTask.name}" и все её подзадачи?`)) {
			return;
		}

		try {
			const res = await fetch(`${API_BASE}/task/${taskId}`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (!res.ok) throw new Error('Не удалось удалить задачу');

			window.location.href = `subject.html?id=${subjectId}`;
		} catch (err) {
			console.error(err);
			alert('Ошибка при удалении: ' + err.message);
		}
	});

	createSubtaskBtn.addEventListener('click', () => {
		const assigneesList = document.getElementById('subtaskAssigneesList');
		assigneesList.innerHTML = '';
		currentTeam.forEach(member => {
			const label = document.createElement('label');
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.value = member.name;
			label.append(checkbox, document.createTextNode(member.name));
			assigneesList.appendChild(label);
		});
		subtaskModal.style.display = 'block';
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
		const maxIndex = indices.length ? Math.max(...indices) : 0;
		return `${parentNumber}.${maxIndex + 1}`;
	}

	document.getElementById('subtaskForm').addEventListener('submit', async (e) => {
		e.preventDefault();
		const name = document.getElementById('subtaskName').value.trim();
		if (!name) {
			alert('Введите название подзадачи');
			return;
		}

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

		const number = getNextSubtaskNumber(currentTask.number, allTasks);

		const description = document.getElementById('subtaskDescription').value.trim();
		const deadlineInput = document.getElementById('subtaskDeadline').value;

		if (deadlineInput) {
			const d = new Date(deadlineInput);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (d < today) {
				alert('Дедлайн не может быть в прошлом!');
				return;
			}
		}

		const checked = document.querySelectorAll('#subtaskAssigneesList input[type="checkbox"]:checked');
		const assigneeNames = Array.from(checked).map(cb => cb.value);
		const responsibleStudents = assigneeNames.map(name => {
			const member = currentTeam.find(m => m.name === name);
			return member ? member.id : null;
		}).filter(id => id);

		const subtaskData = {
			number,
			name,
			description,
			deadline: deadlineInput ? new Date(deadlineInput).toISOString() : null,
			responsibleStudents
		};

		try {
			const res = await fetch(`${API_BASE}/task/add/${taskId}`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(subtaskData)
			});

			if (!res.ok) {
				const errorText = await res.text().catch(() => 'Ошибка');
				console.error('Ошибка бэка:', errorText);
				throw new Error('Не удалось создать подзадачу');
			}

			subtaskModal.style.display = 'none';
			document.getElementById('subtaskForm').reset();
		} catch (err) {
			console.error(err);
			alert('Ошибка: ' + err.message);
		}
	});

	closeEditTaskModal.addEventListener('click', () => {
		editTaskModal.style.display = 'none';
	});

	closeSubtaskModal.addEventListener('click', () => {
		subtaskModal.style.display = 'none';
	});

	window.addEventListener('click', (e) => {
		if (e.target === editTaskModal) editTaskModal.style.display = 'none';
		if (e.target === subtaskModal) subtaskModal.style.display = 'none';
	});

	loadTaskAndTeam();
});