// --- Elements ---
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
const PIN_STORAGE_KEY = 'bubweb-pin-board';

let activities = loadActivities();
let activeActivityId = null;

// --- Firebase Config & Setup ---
const firebaseConfig = {
    apiKey: "AIzaSyBxkrNYSVqVf2_7wyHl6sA7i6MQ_OY69cg",
    authDomain: "guide-to-the-outside.firebaseapp.com",
    projectId: "guide-to-the-outside",
    storageBucket: "guide-to-the-outside.firebasestorage.app",
    messagingSenderId: "242577301245",
    appId: "1:242577301245:web:17387fc6b1df7fa456e894",
    measurementId: "G-YB4TQN6S6Q"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const pinsRef = db.ref('pinBoardEntries');
const activitiesRef = db.ref('activities');

let isApplyingRemotePins = false;
let isApplyingRemoteActivities = false;

// Default initial state
const DEFAULT_PIN_BOARD = [
    {
        id: 'wishlist',
        title: 'Hike & Picnic!',
        details: 'Next weekend up the mountains',
        tag: 'Next Wishlist Item',
        type: 'next-up',
        completed: false,
        review: '',
        rating: 0,
        nikScore: 5,
        leiScore: 5,
        liked: false
    },
    {
        id: 'event',
        title: 'Movie Marathon',
        details: 'Watching on FRIDAY night',
        tag: 'Upcoming Event',
        type: 'event',
        completed: false,
        review: '',
        rating: 0,
        nikScore: 5,
        leiScore: 5,
        liked: false
    },
    {
        id: 'odyssey',
        title: 'The Odyssey',
        details: 'Ticked! Great visuals & atmosphere.',
        tag: 'Latest Memory',
        type: 'memory',
        completed: true,
        review: 'Ticked! Great visuals and atmosphere.',
        rating: 9.0,
        nikScore: 9.0,
        leiScore: 9.0,
        liked: true
    }
];

let pinBoardEntries = loadPins();
let activePinId = null;

// --- Helper Functions ---
function normalizePin(pin) {
    const nik = Number(pin?.nikScore ?? pin?.rating ?? 5.0);
    const lei = Number(pin?.leiScore ?? pin?.rating ?? 5.0);
    const avg = ((nik + lei) / 2).toFixed(1);

    return {
        id: pin.id || `pin-${Date.now()}`,
        title: pin.title || 'Untitled BubAdventure',
        details: pin.details || '',
        tag: pin.tag || (pin.type === 'memory' ? 'Latest Memory' : (pin.type === 'event' ? 'Upcoming Event' : 'Next Wishlist Item')),
        type: pin.type || 'next-up',
        completed: !!pin.completed,
        review: pin.review || '',
        nikScore: nik,
        leiScore: lei,
        rating: Number(avg),
        liked: !!pin.liked
    };
}

function loadActivities() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
}

function saveActivities() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    if (!isApplyingRemoteActivities) {
        activitiesRef.set(activities).catch(e => console.warn(e));
    }
}

function loadPins() {
    try {
        const saved = localStorage.getItem(PIN_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : DEFAULT_PIN_BOARD;
        return (Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_PIN_BOARD).map(normalizePin);
    } catch (e) {
        return DEFAULT_PIN_BOARD.map(normalizePin);
    }
}

function savePins() {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinBoardEntries));
    if (!isApplyingRemotePins) {
        pinsRef.set(pinBoardEntries).catch(e => console.warn(e));
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function launchConfettiBurst() {
    const layer = document.getElementById('confetti-layer');
    if (!layer) return;
    const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#f87171', '#a78bfa'];

    for (let i = 0; i < 30; i++) {
        const piece = document.createElement('span');
        const size = 8 + Math.random() * 8;
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.width = `${size}px`;
        piece.style.height = `${size * 1.5}px`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 200}px`);
        piece.style.setProperty('--rotation', `${Math.random() * 360}deg`);
        layer.appendChild(piece);
        setTimeout(() => piece.remove(), 2000);
    }
}

// --- Dynamic Pin Board & Interactive Physics ---
const pinBoard = document.getElementById('pin-board');

function renderPins() {
    if (!pinBoard) return;

    pinBoard.innerHTML = pinBoardEntries.map(pin => {
        return `
            <div class="pin-card post-it ${pin.type} ${pin.completed ? 'done' : ''}" data-id="${pin.id}" tabindex="0">
                <div class="pin-head">📌</div>
                <span class="bubble-tag">${escapeHtml(pin.tag)}</span>
                <h3>${escapeHtml(pin.title)}</h3>
                <p>${escapeHtml(pin.details)}</p>
                <div class="pin-meta">
                    <span>${pin.liked ? '♥ liked' : '♡ maybe'}</span>
                    ${pin.completed ? '<span class="pin-status">✓ Completed</span>' : '<span class="pin-status">Planned</span>'}
                </div>
            </div>
        `;
    }).join('');

    // Attach dynamic hover/touch physics to cards
    pinBoard.querySelectorAll('.pin-card').forEach(card => {
        card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const tiltX = (y / rect.height) * -12;
            const tiltY = (x / rect.width) * 12;
            card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.04)`;
        });

        card.addEventListener('pointerleave', () => {
            card.style.transform = '';
        });

        card.addEventListener('click', () => {
            openPinModal(card.dataset.id);
        });
    });
}

function renderReviews() {
    if (!reviewList) return;
    const completed = pinBoardEntries.filter(pin => pin.completed);

    if (!completed.length) {
        reviewList.innerHTML = '<p class="empty-state">No completed BubAdventures in the review wall yet.</p>';
        return;
    }

    reviewList.innerHTML = completed.map(pin => {
        const avg = ((pin.nikScore + pin.leiScore) / 2).toFixed(1);
        return `
            <article class="review-card">
                <div class="review-meta">
                    <span>${escapeHtml(pin.tag)}</span>
                    <span>BubScore: ${avg} / 10 ★</span>
                </div>
                <h4 style="font-size: 18px; margin: 6px 0;">${escapeHtml(pin.title)}</h4>
                <p style="color: #4a5568;">${escapeHtml(pin.review || pin.details)}</p>
                <p style="font-size: 13px; font-weight: 700; margin-top: 8px; color: #2d3748;">
                    Nik: ${pin.nikScore.toFixed(1)}/10 • Lei: ${pin.leiScore.toFixed(1)}/10 • ${pin.liked ? '♥ Liked' : '♡'}
                </p>
                <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                    <button type="button" class="ghost-btn edit-review-btn" data-id="${pin.id}">Edit adventure</button>
                </div>
            </article>
        `;
    }).join('');
}

// --- Pin Modal (Full Edit) ---
const pinModal = document.getElementById('pin-modal');
const pinTitleInput = document.getElementById('pin-title-input');
const pinDetailsInput = document.getElementById('pin-details-input');
const pinTypeInput = document.getElementById('pin-type-input');
const pinCompletedInput = document.getElementById('pin-completed-input');
const pinReviewInput = document.getElementById('pin-review-input');
const pinNikRatingInput = document.getElementById('pin-nik-rating-input');
const pinLeiRatingInput = document.getElementById('pin-lei-rating-input');
const pinNikRatingValue = document.getElementById('pin-nik-rating-value');
const pinLeiRatingValue = document.getElementById('pin-lei-rating-value');
const pinAggregateScore = document.getElementById('pin-aggregate-score');
const pinLikeButton = document.getElementById('pin-like-btn');
const pinForm = document.getElementById('pin-form');
const pinRemoveButton = document.getElementById('pin-remove-btn');

function updateModalScoreLabel() {
    const nik = Number(pinNikRatingInput.value);
    const lei = Number(pinLeiRatingInput.value);
    pinNikRatingValue.textContent = nik.toFixed(1);
    pinLeiRatingValue.textContent = lei.toFixed(1);
    pinAggregateScore.textContent = `BubScore: ${((nik + lei) / 2).toFixed(1)} / 10.0`;
}

pinNikRatingInput.addEventListener('input', updateModalScoreLabel);
pinLeiRatingInput.addEventListener('input', updateModalScoreLabel);

function openPinModal(pinId) {
    const pin = pinBoardEntries.find(p => p.id === pinId);
    if (!pin) return;

    activePinId = pin.id;
    pinTitleInput.value = pin.title;
    pinDetailsInput.value = pin.details;
    pinTypeInput.value = pin.type;
    pinCompletedInput.checked = pin.completed;
    pinReviewInput.value = pin.review || '';
    pinNikRatingInput.value = pin.nikScore ?? 5.0;
    pinLeiRatingInput.value = pin.leiScore ?? 5.0;
    pinLikeButton.dataset.liked = pin.liked ? 'true' : 'false';
    pinLikeButton.textContent = pin.liked ? '♥ Liked' : '♡ Like it';

    updateModalScoreLabel();
    pinModal.classList.remove('hidden');
}

function closePinModal() {
    pinModal.classList.add('hidden');
    activePinId = null;
}

document.getElementById('pin-modal-close').addEventListener('click', closePinModal);
document.querySelector('[data-close="true"]').addEventListener('click', closePinModal);

pinLikeButton.addEventListener('click', () => {
    const current = pinLikeButton.dataset.liked === 'true';
    pinLikeButton.dataset.liked = String(!current);
    pinLikeButton.textContent = !current ? '♥ Liked' : '♡ Like it';
});

pinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = pinBoardEntries.find(p => p.id === activePinId);
    if (!pin) return;

    const wasCompleted = pin.completed;
    const isNowCompleted = pinCompletedInput.checked;

    pin.title = pinTitleInput.value.trim();
    pin.details = pinDetailsInput.value.trim();
    pin.type = pinTypeInput.value;
    pin.tag = pin.type === 'memory' ? 'Latest Memory' : (pin.type === 'event' ? 'Upcoming Event' : 'Next Wishlist Item');
    pin.completed = isNowCompleted;
    pin.review = pinReviewInput.value.trim();
    pin.nikScore = Number(pinNikRatingInput.value);
    pin.leiScore = Number(pinLeiRatingInput.value);
    pin.rating = Number(((pin.nikScore + pin.leiScore) / 2).toFixed(1));
    pin.liked = pinLikeButton.dataset.liked === 'true';

    // If marked as memory/completed, auto-set type to memory
    if (isNowCompleted && pin.type !== 'memory') {
        pin.type = 'memory';
        pin.tag = 'Latest Memory';
    }

    savePins();
    renderPins();
    renderReviews();
    closePinModal();

    // Trigger toss animation on the card
    if (!wasCompleted && isNowCompleted) {
        launchConfettiBurst();
        const activeCard = document.querySelector(`.pin-card[data-id="${pin.id}"]`);
        if (activeCard) {
            activeCard.classList.add('tossing');
            setTimeout(() => activeCard.classList.remove('tossing'), 650);
        }
    }
});

pinRemoveButton.addEventListener('click', () => {
    if (!activePinId) return;
    if (confirm('Are you sure you want to remove this BubAdventure pin?')) {
        pinBoardEntries = pinBoardEntries.filter(p => p.id !== activePinId);
        savePins();
        renderPins();
        renderReviews();
        closePinModal();
    }
});

// --- Add Pin Modal ---
const addPinModal = document.getElementById('add-pin-modal');
const addPinForm = document.getElementById('add-pin-form');
const newPinTitle = document.getElementById('new-pin-title');
const newPinDetails = document.getElementById('new-pin-details');
const newPinType = document.getElementById('new-pin-type');

document.getElementById('add-pin-btn').addEventListener('click', () => addPinModal.classList.remove('hidden'));
document.getElementById('add-pin-modal-close').addEventListener('click', () => addPinModal.classList.add('hidden'));
document.getElementById('add-pin-cancel').addEventListener('click', () => addPinModal.classList.add('hidden'));
document.querySelector('[data-close-add="true"]').addEventListener('click', () => addPinModal.classList.add('hidden'));

addPinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = newPinTitle.value.trim();
    const details = newPinDetails.value.trim();
    const type = newPinType.value;
    if (!title || !details) return;

    const tag = type === 'memory' ? 'Latest Memory' : (type === 'event' ? 'Upcoming Event' : 'Next Wishlist Item');

    pinBoardEntries.unshift({
        id: `pin-${Date.now()}`,
        title,
        details,
        tag,
        type,
        completed: type === 'memory',
        review: '',
        nikScore: 5.0,
        leiScore: 5.0,
        rating: 5.0,
        liked: false
    });

    savePins();
    renderPins();
    renderReviews();
    addPinForm.reset();
    addPinModal.classList.add('hidden');
    launchConfettiBurst();
});

// --- Activity List Setup ---
function renderActivities() {
    if (!activityList) return;
    if (!activities.length) {
        activityList.innerHTML = '<p class="empty-state">We are two bubs in a pod...</p>';
        return;
    }

    activityList.innerHTML = activities.map(act => {
        return `
            <article class="bubble activity-card">
                <div>
                    <h4>${escapeHtml(act.name)}</h4>
                    <p>${act.date} at ${act.time}</p>
                    ${act.completed ? `<p style="color: #2f855a; font-weight:700; margin-top:4px;">Score: ${act.finalScore}/10</p>` : ''}
                </div>
                <div class="activity-actions">
                    <button type="button" class="save-btn complete-btn" data-id="${act.id}">${act.completed ? 'Edit score' : 'Score it'}</button>
                    <button type="button" class="ghost-btn delete-btn" data-id="${act.id}">Delete</button>
                </div>
            </article>
        `;
    }).join('');
}

activityForm.addEventListener('submit', (e) => {
    e.preventDefault();
    activities.unshift({
        id: Date.now(),
        name: activityNameInput.value.trim(),
        date: activityDateInput.value,
        time: activityTimeInput.value,
        completed: false,
        nikScore: null,
        leiScore: null,
        finalScore: null
    });
    saveActivities();
    renderActivities();
    activityForm.reset();
});

activityList.addEventListener('click', (e) => {
    const completeBtn = e.target.closest('.complete-btn');
    const delBtn = e.target.closest('.delete-btn');

    if (completeBtn) {
        const act = activities.find(a => a.id === Number(completeBtn.dataset.id));
        if (!act) return;
        activeActivityId = act.id;
        completionTitle.textContent = `Score: ${act.name}`;
        nikScoreInput.value = act.nikScore ?? 5.0;
        leiScoreInput.value = act.leiScore ?? 5.0;
        nikScoreValue.textContent = Number(nikScoreInput.value).toFixed(1);
        leiScoreValue.textContent = Number(leiScoreInput.value).toFixed(1);
        completionForm.classList.remove('hidden');
    }

    if (delBtn) {
        if (confirm('Delete this activity?')) {
            activities = activities.filter(a => a.id !== Number(delBtn.dataset.id));
            saveActivities();
            renderActivities();
        }
    }
});

saveCompletionButton.addEventListener('click', () => {
    const act = activities.find(a => a.id === activeActivityId);
    if (!act) return;
    act.nikScore = Number(nikScoreInput.value);
    act.leiScore = Number(leiScoreInput.value);
    act.finalScore = Number(((act.nikScore + act.leiScore) / 2).toFixed(1));
    act.completed = true;
    saveActivities();
    renderActivities();
    completionForm.classList.add('hidden');
});

cancelCompletionButton.addEventListener('click', () => completionForm.classList.add('hidden'));

// --- Navigation ---
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (btn.textContent.includes('List')) {
            listPage.classList.remove('hidden');
            reviewsPage.classList.add('hidden');
        } else {
            reviewsPage.classList.remove('hidden');
            listPage.classList.add('hidden');
            renderReviews();
        }
    });
});

const reviewList = document.getElementById('review-list');
if (reviewList) {
    reviewList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-review-btn');
        if (editBtn) openPinModal(editBtn.dataset.id);
    });
}

// --- Firebase Realtime Database Sync Listeners ---
pinsRef.on('value', (snap) => {
    const data = snap.val();
    if (!data) return;
    isApplyingRemotePins = true;
    pinBoardEntries = (Array.isArray(data) ? data : Object.values(data)).map(normalizePin);
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinBoardEntries));
    renderPins();
    renderReviews();
    isApplyingRemotePins = false;
});

activitiesRef.on('value', (snap) => {
    const data = snap.val();
    if (!data) return;
    isApplyingRemoteActivities = true;
    activities = Array.isArray(data) ? data : Object.values(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    renderActivities();
    isApplyingRemoteActivities = false;
});

// Initial Render
renderPins();
renderActivities();
renderReviews();