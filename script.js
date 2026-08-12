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
        activityList.innerHTML = '<p class="empty-state">We are two bubs in a pod...</p>';
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

const PIN_STORAGE_KEY = 'bubweb-pin-board';
const DEFAULT_PIN_BOARD = [
    {
        id: 'wishlist',
        title: 'Hike!',
        details: 'Next weekend',
        summary: 'Next wishlist item',
        tag: 'Next Wishlist Item',
        type: 'next-up',
        completed: false,
        review: '',
        rating: 0,
        liked: false
    },
    {
        id: 'event',
        title: 'Spiderman',
        details: 'Watching on FRIDAY',
        summary: 'Upcoming event',
        tag: 'Upcoming Event',
        type: 'event',
        completed: false,
        review: '',
        rating: 0,
        liked: false
    },
    {
        id: 'odyssey',
        title: 'The Odyssey',
        details: 'Ticked!',
        summary: 'Latest memory',
        tag: 'Latest Memory',
        type: 'memory',
        completed: true,
        review: 'Ticked! Great visuals and atmosphere.',
        rating: 4.5,
        liked: true
    }
];

const pinBoard = document.getElementById('pin-board');
const addPinButton = document.getElementById('add-pin-btn');
const pinModal = document.getElementById('pin-modal');
const pinModalClose = document.getElementById('pin-modal-close');
const pinModalTitle = document.getElementById('pin-modal-title');
const pinModalDetail = document.getElementById('pin-modal-detail');
const pinReviewInput = document.getElementById('pin-review-input');
const pinNikRatingInput = document.getElementById('pin-nik-rating-input');
const pinLeiRatingInput = document.getElementById('pin-lei-rating-input');
const pinNikRatingValue = document.getElementById('pin-nik-rating-value');
const pinLeiRatingValue = document.getElementById('pin-lei-rating-value');
const pinAggregateScore = document.getElementById('pin-aggregate-score');
const pinLikeButton = document.getElementById('pin-like-btn');
const pinForm = document.getElementById('pin-form');
const pinRemoveButton = document.getElementById('pin-remove-btn');
const reviewList = document.getElementById('review-list');
const addPinModal = document.getElementById('add-pin-modal');
const addPinForm = document.getElementById('add-pin-form');
const newPinTitleInput = document.getElementById('new-pin-title');
const newPinDetailsInput = document.getElementById('new-pin-details');
const addPinModalClose = document.getElementById('add-pin-modal-close');
const addPinCancelButton = document.getElementById('add-pin-cancel');
const confettiLayer = document.getElementById('confetti-layer');
let pinBoardEntries = loadPins();
let activePinId = null;

function normalizePin(pin) {
    const legacyAverage = Number(pin?.rating ?? 0);
    const nikScore = Number.isFinite(Number(pin?.nikScore)) ? Number(pin.nikScore) : legacyAverage;
    const leiScore = Number.isFinite(Number(pin?.leiScore)) ? Number(pin.leiScore) : legacyAverage;

    return {
        ...pin,
        nikScore,
        leiScore,
        rating: Number(pin?.rating ?? ((nikScore + leiScore) / 2)).toFixed(2)
    };
}

function loadPins() {
    const savedPins = localStorage.getItem(PIN_STORAGE_KEY);

    if (!savedPins) {
        return [...DEFAULT_PIN_BOARD].map(normalizePin);
    }

    try {
        const parsed = JSON.parse(savedPins);
        const pins = Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_PIN_BOARD];
        return pins.map(normalizePin);
    } catch (error) {
        console.warn('Could not load pins', error);
        return [...DEFAULT_PIN_BOARD].map(normalizePin);
    }
}

function savePins() {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinBoardEntries));
}

function launchConfettiBurst() {
    if (!confettiLayer) {
        return;
    }

    const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#f87171', '#a78bfa'];

    for (let i = 0; i < 28; i += 1) {
        const piece = document.createElement('span');
        const size = 8 + Math.random() * 10;
        const drift = (Math.random() - 0.5) * 220;
        const rotation = (Math.random() * 360) + 90;

        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.width = `${size}px`;
        piece.style.height = `${size * 1.4}px`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.setProperty('--drift', `${drift}px`);
        piece.style.setProperty('--rotation', `${rotation}deg`);
        piece.style.animationDuration = `${1500 + Math.random() * 700}ms`;

        confettiLayer.appendChild(piece);
        window.setTimeout(() => piece.remove(), 2200);
    }
}

function getPinAverageScore(nikScore, leiScore) {
    const safeNik = Number(nikScore) || 0;
    const safeLei = Number(leiScore) || 0;
    return ((safeNik + safeLei) / 2).toFixed(2);
}

function updatePinRatingLabel() {
    if (pinNikRatingInput && pinNikRatingValue) {
        pinNikRatingValue.textContent = Number(pinNikRatingInput.value).toFixed(1);
    }

    if (pinLeiRatingInput && pinLeiRatingValue) {
        pinLeiRatingValue.textContent = Number(pinLeiRatingInput.value).toFixed(1);
    }

    if (pinNikRatingInput && pinLeiRatingInput && pinAggregateScore) {
        const average = getPinAverageScore(pinNikRatingInput.value, pinLeiRatingInput.value);
        pinAggregateScore.textContent = `BubScore: ${average}/5.00`;
    }
}

function renderPins() {
    if (!pinBoard) {
        return;
    }

    pinBoard.innerHTML = pinBoardEntries.map(pin => {
        const reviewPill = pin.completed && pin.review
            ? '<span class="pin-status">✓ reviewed</span>'
            : '<span class="pin-status">fresh</span>';

        return `
            <div class="pin-card post-it ${pin.type} ${pin.completed ? 'done' : ''}" data-id="${pin.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(pin.title)} pin">
                <div class="pin-head">📌</div>
                <span class="bubble-tag">${escapeHtml(pin.tag)}</span>
                <h3>${escapeHtml(pin.title)}</h3>
                <p>${escapeHtml(pin.details)}</p>
                <div class="pin-meta">
                    <span>${pin.liked ? '♥ liked' : '♡ maybe'}</span>
                    ${reviewPill}
                </div>
            </div>
        `;
    }).join('');

    pinBoard.querySelectorAll('.pin-card').forEach(card => {
        card.addEventListener('click', () => {
            const pinId = card.dataset.id;
            openPinModal(pinId);
        });

        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const pinId = card.dataset.id;
                openPinModal(pinId);
            }
        });
    });
}

function renderReviews() {
    if (!reviewList) {
        return;
    }

    const completedPins = pinBoardEntries.filter(pin => pin.completed && (pin.review || pin.rating > 0 || pin.liked));

    if (!completedPins.length) {
        reviewList.innerHTML = '<p class="empty-state">No completed adventures in the review wall yet.</p>';
        return;
    }

    reviewList.innerHTML = completedPins.map(pin => {
        const average = getPinAverageScore(pin.nikScore ?? pin.rating ?? 0, pin.leiScore ?? pin.rating ?? 0);

        return `
            <article class="review-card">
                <div class="review-meta">
                    <span>${escapeHtml(pin.tag)}</span>
                    <span>${average}★</span>
                </div>
                <h4>${escapeHtml(pin.title)}</h4>
                <p>${escapeHtml(pin.review || pin.details)}</p>
                <p>Nik ${Number(pin.nikScore ?? 0).toFixed(1)} • Lei ${Number(pin.leiScore ?? 0).toFixed(1)} • BubScore ${average}</p>
                <p>${pin.liked ? '♥ Liked' : '♡ Not liked yet'} </p>
                <div class="review-actions">
                    <button type="button" class="ghost-btn edit-review-btn" data-id="${pin.id}">Edit review</button>
                </div>
            </article>
        `;
    }).join('');
}

function closePinModal() {
    if (pinModal) {
        pinModal.classList.add('hidden');
    }
    activePinId = null;
}

function openPinModal(pinId) {
    const pin = pinBoardEntries.find(item => item.id === pinId || item.id.toString() === pinId);

    if (!pin || !pinModal || !pinModalTitle || !pinModalDetail || !pinReviewInput || !pinNikRatingInput || !pinLeiRatingInput) {
        return;
    }

    activePinId = pin.id;
    pinModalTitle.textContent = pin.title;
    pinModalDetail.textContent = `${pin.details} • ${pin.summary}`;
    pinReviewInput.value = pin.review || '';

    const nikScore = pin.nikScore ?? pin.rating ?? 4.5;
    const leiScore = pin.leiScore ?? pin.rating ?? 5.0;
    pinNikRatingInput.value = nikScore.toString();
    pinLeiRatingInput.value = leiScore.toString();
    updatePinRatingLabel();

    pinLikeButton.textContent = pin.liked ? '♥ Liked' : '♡ Like it';
    pinLikeButton.dataset.liked = pin.liked ? 'true' : 'false';
    pinModal.classList.remove('hidden');
}

function openAddPinModal() {
    if (!addPinModal) {
        return;
    }

    addPinModal.classList.remove('hidden');
    if (newPinTitleInput) {
        newPinTitleInput.focus();
    }
}

function closeAddPinModal() {
    if (!addPinModal) {
        return;
    }

    addPinModal.classList.add('hidden');
    if (addPinForm) {
        addPinForm.reset();
    }
}

function addNewPin(title, details) {
    const cleanTitle = title.trim();
    const cleanDetails = details.trim();

    if (!cleanTitle || !cleanDetails) {
        return;
    }

    const typeOptions = ['next-up', 'event', 'memory'];
    const tagOptions = ['Next Wishlist Item', 'Upcoming Event', 'Latest Memory'];
    const randomIndex = Math.floor(Math.random() * typeOptions.length);

    pinBoardEntries.unshift({
        id: `pin-${Date.now()}`,
        title: cleanTitle,
        details: cleanDetails,
        summary: 'A new adventure pin',
        tag: tagOptions[randomIndex],
        type: typeOptions[randomIndex],
        completed: false,
        review: '',
        rating: 0,
        nikScore: 0,
        leiScore: 0,
        liked: false
    });

    savePins();
    renderPins();
    renderReviews();
}

if (addPinButton) {
    addPinButton.addEventListener('click', openAddPinModal);
}

if (addPinModalClose) {
    addPinModalClose.addEventListener('click', closeAddPinModal);
}

if (addPinCancelButton) {
    addPinCancelButton.addEventListener('click', closeAddPinModal);
}

if (addPinModal) {
    addPinModal.addEventListener('click', (event) => {
        if (event.target && event.target.dataset.closeAdd === 'true') {
            closeAddPinModal();
        }
    });
}

if (addPinForm) {
    addPinForm.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!newPinTitleInput || !newPinDetailsInput) {
            return;
        }

        addNewPin(newPinTitleInput.value, newPinDetailsInput.value);
        closeAddPinModal();
    });
}

if (pinModalClose) {
    pinModalClose.addEventListener('click', closePinModal);
}

if (pinModal) {
    pinModal.addEventListener('click', (event) => {
        if (event.target && event.target.dataset.close === 'true') {
            closePinModal();
        }
    });
}

if (reviewList) {
    reviewList.addEventListener('click', (event) => {
        const editButton = event.target.closest('.edit-review-btn');

        if (!editButton) {
            return;
        }

        const targetId = editButton.dataset.id;

        if (targetId) {
            openPinModal(targetId);
        }
    });
}

if (pinNikRatingInput && pinLeiRatingInput) {
    pinNikRatingInput.addEventListener('input', updatePinRatingLabel);
    pinLeiRatingInput.addEventListener('input', updatePinRatingLabel);
}

if (pinLikeButton) {
    pinLikeButton.addEventListener('click', () => {
        const currentLiked = pinLikeButton.dataset.liked === 'true';
        pinLikeButton.dataset.liked = String(!currentLiked);
        pinLikeButton.textContent = !currentLiked ? '♥ Liked' : '♡ Like it';
    });
}

if (pinForm) {
    pinForm.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!activePinId) {
            return;
        }

        const pin = pinBoardEntries.find(item => item.id === activePinId || item.id.toString() === activePinId);

        if (!pin) {
            return;
        }

        pin.review = pinReviewInput.value.trim();
        pin.nikScore = Number(pinNikRatingInput.value);
        pin.leiScore = Number(pinLeiRatingInput.value);
        pin.rating = Number(getPinAverageScore(pin.nikScore, pin.leiScore));
        pin.liked = pinLikeButton.dataset.liked === 'true';
        pin.completed = true;
        pin.details = pin.review || pin.details;

        savePins();
        launchConfettiBurst();
        renderPins();
        renderReviews();
        closePinModal();
    });
}

if (pinRemoveButton) {
    pinRemoveButton.addEventListener('click', () => {
        if (!activePinId) {
            return;
        }

        const pin = pinBoardEntries.find(item => item.id === activePinId || item.id.toString() === activePinId);

        if (!pin) {
            return;
        }

        const confirmed = window.confirm(`Remove "${pin.title}" from your pin board?`);

        if (!confirmed) {
            return;
        }

        pinBoardEntries = pinBoardEntries.filter(item => item.id !== activePinId && item.id.toString() !== activePinId);
        savePins();
        renderPins();
        renderReviews();
        closePinModal();
    });
}

renderPins();
renderReviews();

if (navButtons) {
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (button.textContent.toLowerCase().includes('list')) {
                listPage.classList.remove('hidden');
                reviewsPage.classList.add('hidden');
            } else {
                reviewsPage.classList.remove('hidden');
                listPage.classList.add('hidden');
                renderReviews();
                runScoreTest();
            }
        });
    });
}

if (pinNikRatingInput && pinLeiRatingInput) {
    updatePinRatingLabel();
}

if (window) {
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && pinModal && !pinModal.classList.contains('hidden')) {
            closePinModal();
        }
    });
}

