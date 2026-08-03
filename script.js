// NAVIGATION

const navButtons = document.querySelectorAll('.nav-btn');
const listPage = document.getElementById('list-page');
const reviewsPage = document.getElementById('reviews-page');
const activityForm = document.getElementById('activity-form');
const activityList = document.getElementById('activity-list');
const activityNameInput = document.getElementById('activity-name');
const activityDateInput = document.getElementById('activity-date');
const activityTimeInput = document.getElementById('activity-time');
const completionForm = document.getElementById('completion-form');
const completionTitle = document.getElementById('completion-title');
const nikScoreInput = document.getElementById('nik-score');
const leiScoreInput = document.getElementById('lei-score');
const nikScoreValue = document.getElementById('nik-score-value');
const leiScoreValue = document.getElementById('lei-score-value');
const saveCompletionButton = document.getElementById('save-completion');
const cancelCompletionButton = document.getElementById('cancel-completion');

const STORAGE_KEY = 'bubweb-activities';
let activities = loadActivities();
let activeActivityId = null;
let nikScoreTouched = false;
let leiScoreTouched = false;

function loadActivities() {
    const savedActivities = localStorage.getItem(STORAGE_KEY);

    if (!savedActivities) {
        return [];
    }

    try {
        return JSON.parse(savedActivities);
    } catch (error) {
        console.warn('Could not load activities', error);
        return [];
    }
}

function saveActivities() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getStatusDetails(activity) {
    if (activity.completed) {
        return { label: 'Completed', className: 'status-completed' };
    }

    if (activity.nikScore !== null || activity.leiScore !== null) {
        return { label: 'Partly rated', className: 'status-partial' };
    }

    return { label: 'Planned', className: 'status-planned' };
}

function formatScore(value) {
    return value === null || value === undefined ? '—' : Number(value).toFixed(1);
}

function renderActivities() {
    if (!activityList) {
        return;
    }

    if (!activities.length) {
        activityList.innerHTML = '<p class="empty-state">No planned activities yet. Add one above.</p>';
        return;
    }

    activityList.innerHTML = activities.map(activity => {
        const activityDate = activity.date ? new Date(`${activity.date}T${activity.time || '00:00'}`) : null;
        const formattedDate = activityDate
            ? activityDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
            : 'Date TBD';
        const formattedTime = activity.time || 'Time TBD';
        const status = getStatusDetails(activity);
        const scoreText = activity.finalScore !== null && activity.finalScore !== undefined
            ? `BubScore: ${Number(activity.finalScore).toFixed(2)}/10`
            : 'No BubScore yet ';

        return `
            <article class="bubble activity-card">
                <div>
                    <h4>${escapeHtml(activity.name)}</h4>
                    <p>${formattedDate}</p>
                    <p>${formattedTime}</p>
                    <div class="score-summary">
                        <div><strong>Nik:</strong> ${formatScore(activity.nikScore)} / 10</div>
                        <div><strong>Lei:</strong> ${formatScore(activity.leiScore)} / 10</div>
                        <div>${scoreText}</div>
                    </div>
                </div>
                <div class="activity-actions">
                    <span class="status-chip ${status.className}">${status.label}</span>
                    <button type="button" class="save-btn complete-btn" data-id="${activity.id}">${activity.completed ? 'Edit score' : 'Complete & score'}</button>
                    <button type="button" class="ghost-btn delete-btn" data-id="${activity.id}">Delete</button>
                </div>
            </article>
        `;
    }).join('');
}

function updateSliderLabels() {
    if (nikScoreValue && nikScoreInput) {
        nikScoreValue.textContent = Number(nikScoreInput.value).toFixed(1);
    }

    if (leiScoreValue && leiScoreInput) {
        leiScoreValue.textContent = Number(leiScoreInput.value).toFixed(1);
    }
}

function resetCompletionForm() {
    if (!completionForm) {
        return;
    }

    completionForm.classList.add('hidden');
    completionTitle.textContent = 'Mission Complete';
    nikScoreInput.value = '5';
    leiScoreInput.value = '5';
    updateSliderLabels();
    nikScoreTouched = false;
    leiScoreTouched = false;
    activeActivityId = null;
}

function setupActivityManager() {
    if (!activityForm || !activityNameInput || !activityDateInput || !activityTimeInput) {
        return;
    }

    activityDateInput.value = new Date().toISOString().split('T')[0];
    activityTimeInput.value = '19:00';

    if (nikScoreInput && leiScoreInput) {
        nikScoreInput.addEventListener('input', () => {
            nikScoreTouched = true;
            updateSliderLabels();
        });
        leiScoreInput.addEventListener('input', () => {
            leiScoreTouched = true;
            updateSliderLabels();
        });
    }

    updateSliderLabels();

    activityForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const name = activityNameInput.value.trim();
        const date = activityDateInput.value;
        const time = activityTimeInput.value;

        if (!name || !date || !time) {
            return;
        }

        activities.unshift({
            id: Date.now(),
            name,
            date,
            time,
            completed: false,
            nikScore: null,
            leiScore: null,
            finalScore: null
        });

        saveActivities();
        renderActivities();

        activityForm.reset();
        activityDateInput.value = new Date().toISOString().split('T')[0];
        activityTimeInput.value = '19:00';
        activityNameInput.focus();
    });

    activityList.addEventListener('click', (event) => {
        const completeButton = event.target.closest('.complete-btn');
        const deleteButton = event.target.closest('.delete-btn');

        if (completeButton) {
            const activity = activities.find(item => item.id === Number(completeButton.dataset.id));

            if (!activity) {
                return;
            }

            activeActivityId = activity.id;
            completionTitle.textContent = `Complete & score: ${activity.name}`;
            nikScoreInput.value = activity.nikScore !== null && activity.nikScore !== undefined ? activity.nikScore.toString() : '5';
            leiScoreInput.value = activity.leiScore !== null && activity.leiScore !== undefined ? activity.leiScore.toString() : '5';
            updateSliderLabels();
            nikScoreTouched = false;
            leiScoreTouched = false;
            completionForm.classList.remove('hidden');
            nikScoreInput.focus();
            return;
        }

        if (deleteButton) {
            const activityId = Number(deleteButton.dataset.id);
            const activity = activities.find(item => item.id === activityId);

            if (!activity) {
                return;
            }

            const confirmed = window.confirm(`Delete "${activity.name}"?`);

            if (!confirmed) {
                return;
            }

            activities = activities.filter(item => item.id !== activityId);
            saveActivities();
            renderActivities();
        }
    });

    if (saveCompletionButton) {
        saveCompletionButton.addEventListener('click', () => {
            if (activeActivityId === null) {
                return;
            }

            const activity = activities.find(item => item.id === activeActivityId);

            if (!activity) {
                return;
            }

            const nikScore = Number(nikScoreInput.value);
            const leiScore = Number(leiScoreInput.value);
            const nextNikScore = nikScoreTouched ? Number(nikScore.toFixed(1)) : (activity.nikScore !== null && activity.nikScore !== undefined ? Number(activity.nikScore) : null);
            const nextLeiScore = leiScoreTouched ? Number(leiScore.toFixed(1)) : (activity.leiScore !== null && activity.leiScore !== undefined ? Number(activity.leiScore) : null);
            const submittedScores = [nextNikScore, nextLeiScore].filter(score => score !== null && !Number.isNaN(score));

            if (!submittedScores.length) {
                return;
            }

            const averageScore = submittedScores.length === 1
                ? submittedScores[0]
                : submittedScores.reduce((sum, score) => sum + score, 0) / submittedScores.length;

            activity.completed = true;
            activity.nikScore = nextNikScore;
            activity.leiScore = nextLeiScore;
            activity.finalScore = Number(averageScore.toFixed(2));

            saveActivities();
            renderActivities();
            resetCompletionForm();
        });
    }

    if (cancelCompletionButton) {
        cancelCompletionButton.addEventListener('click', resetCompletionForm);
    }

    renderActivities();
}

//listen for clicks 
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        if (button.textContent.toLowerCase().includes('list')){
            listPage.classList.remove('hidden');
            reviewsPage.classList.add('hidden');
        } else {
            reviewsPage.classList.remove('hidden');
            listPage.classList.add('hidden');

            runScoreTest();
        }
    });
});

//CALCULATOR
function calculateAdventureScore(nikScore, leiScore) {
    let totalScore = 0;
    let totalCategories = nikScore.length +  leiScore.length;

    nikScore.forEach(score => totalScore += score);
    leiScore.forEach(score => totalScore += score);

    let finalAvg = totalScore/totalCategories;

    return finalAvg.toFixed(2);
}

//test example
function runScoreTest() {
    const nikScore = [8,9,9];
    const leiScore = [9, 8, 7];

    const finalRating = calculateAdventureScore(nikScore, leiScore);

    const displayElement = document.getElementById('average-display');
    displayElement.innerHTML= `🌌 <strong>Planetarium Trip Shared Rating:</strong> ${finalRating} / 10`;
}

setupActivityManager();