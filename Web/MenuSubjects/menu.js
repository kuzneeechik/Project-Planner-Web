document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('subjectsContainer');
    const addButton = document.getElementById('addButton');
    const modal = document.getElementById('subjectModal');
    const closeModal = document.getElementById('closeModal');
    const subjectForm = document.getElementById('subjectForm');
    const subjectDescription = document.getElementById('subjectDescription');
    const subjectResult = document.getElementById('subjectResult');

    let subjects = JSON.parse(localStorage.getItem('subjects')) || [
        { id: 'math123', name: 'Математика', description: 'Изучение основ алгебры', result: 'Сдать экзамен на отлично', deadline: '2025-12-31' },
        { id: 'physics456', name: 'Физика', description: 'Изучение механики', result: 'Понять квантовую механику', deadline: '2025-11-20' }
    ];

    subjects = subjects.map(s => {
        if (!s.deadline) {
            s.deadline = '2025-12-31';
        }
        return s;
    });

    function renderSubjects() {
        container.innerHTML = '';
        subjects.forEach(subject => {
            const formattedDate = formatDate(subject.deadline || '2025-12-31');
            const card = document.createElement('div');
            card.className = 'subject-card';
            card.innerHTML = `
                <div class="card-content">
                    <div class="subject-name">${subject.name}</div>
                    <div class="subject-result">Результат: ${subject.result}</div>
                    <div class="subject-description">Описание: ${subject.description}</div>
                </div>
                <div class="subject-deadline">Дедлайн: ${formattedDate}</div>
            `;
            card.addEventListener('click', () => {
                window.location.href = `../Subject/subject.html?id=${subject.id}`;
            });
            container.appendChild(card);
        });
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    addButton.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    subjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('subjectName').value.trim();
        const description = subjectDescription.value.trim(); 
        const result = subjectResult.value.trim();           
        const deadline = document.getElementById('subjectDeadline').value;

        if (!name || !result) {
            alert('Заполните название и результат!');
            return;
        }

        if (deadline) {
            const selectedDate = new Date(deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                alert('Дедлайн не может быть в прошлом!');
                return;
            }
        }

        subjects.push({
            id: Date.now().toString(),
            name: name,
            description: description, 
            result: result,          
            deadline: deadline || '', 
            tasks: [],
            team: []
        });

        localStorage.setItem('subjects', JSON.stringify(subjects));
        renderSubjects();
        modal.style.display = 'none';
        subjectForm.reset();
    });

    renderSubjects();
});