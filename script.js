// --- Elements ---
const navButtons = document.querySelectorAll('.nav-btn');
const listPage = document.getElementById('list-page');
const reviewsPage = document.getElementById('reviews-page');
const activityForm = document.getElementById('activity-form');
const activityList = document.getElementById('activity-list');
const activityNameInput = document.getElementById('activity-name');
const activityDateInput = document.getElementById('activity-date');
const activityTimeInput = document.getElementById('activity-time');

// Completion form sliders & tracking
const completionForm = document.getElementById('completion-form');
const completionTitle = document.getElementById('completion-title');
const nikScoreInput = document.getElementById('nik-score');
const leiScoreInput = document.getElementById('lei-score');
const nikScoreValue = document.getElementById('nik-score-value');
const leiScoreValue = document.getElementById('lei-score-value');
const saveCompletionButton = document.getElementById('save-completion');
const cancelCompletionButton = document.getElementById('cancel-completion');

let nikScoreModified = false;
let leiScoreModified = false;

const STORAGE_KEY = 'bubweb-activities';
const PIN_STORAGE_KEY = 'bubweb-pin-board';

let activities = loadActivities();
let activeActivityId = null;

// Firebase Setup[cite: 3]
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

const DEFAULT_PIN_BOARD = [
    {
        id: 'wishlist',
        title: 'Hike & Picnic!',
        details: 'Next weekend in the mountains',
        tag: 'Next Wishlist Item',
        type: 'next-up',
        completed: false,
        review: '',
        image: '',
        nikScore: null,
        leiScore: null,
        rating: null,
        liked: false
    }
];

let pinBoardEntries = loadPins();
let activePinId = null;
let currentPinImageBase64 = null;
let pinNikRatingModified = false;
let pinLeiRatingModified = false;

function normalizePin(pin) {
    const nik = pin?.nikScore !== undefined && pin?.nikScore !== null ? Number(pin.nikScore) : null;
    const lei = pin?.leiScore !== undefined && pin?.leiScore !== null ? Number(pin.leiScore) : null;
    
    let computedRating = null;
    if (nik !== null && lei !== null) {
        computedRating = Number(((nik + lei) / 2).toFixed(1));
    } else if (nik !== null) {
        computedRating = nik;
    } else if (lei !== null) {
        computedRating = lei;
    }

    return {
        id: pin.id || `pin-${Date.now()}`,
        title: pin.title || 'Untitled Adventure',
        details: pin.details || '',
        tag: pin.tag || 'Adventure Pin',
        type: pin.type || 'next-up',
        completed: !!pin.completed,
        review: pin.review || '',
        image: pin.image || '',
        nikScore: nik,
        leiScore: lei,
        rating: computedRating,
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
    if (!isApplyingRemoteActivities) activitiesRef.set(activities);
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
    if (!isApplyingRemotePins) pinsRef.set(pinBoardEntries);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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

// --- Render Pin Board with Polaroids ---
const pinBoard = document.getElementById('pin-board');

function renderPins() {
    if (!pinBoard) return;

    pinBoard.innerHTML = pinBoardEntries.map(pin => {
        const photoPreview = pin.image 
            ? `<div class="polaroid-preview-card"><img src="${pin.image}" alt="Memory photo"></div>` 
            : '';

        const scoreText = pin.rating !== null 
            ? `★ ${pin.rating.toFixed(1)}/10` 
            : 'Unrated';

        return `
            <div class="pin-card post-it ${pin.type}" data-id="${pin.id}" tabindex="0">
                <div class="pin-head">📌</div>
                <span class="bubble-tag">${escapeHtml(pin.tag)}</span>
                ${photoPreview}
                <h3>${escapeHtml(pin.title)}</h3>
                <p>${escapeHtml(pin.details)}</p>
                <div class="pin-meta">
                    <span>${pin.liked ? '♥ Favorited' : '♡'}</span>
                    <span>${scoreText}</span>
                    <span>${pin.completed ? '✓ Done' : 'Planned'}</span>
                </div>
            </div>
        `;
    }).join('');

    pinBoard.querySelectorAll('.pin-card').forEach(card => {
        card.addEventListener('click', () => openPinModal(card.dataset.id));
    });
}

// --- Render Reviews Wall ---
const reviewList = document.getElementById('review-list');

function renderReviews() {
    if (!reviewList) return;
    const completed = pinBoardEntries.filter(p => p.completed || p.review || p.image);

    if (!completed.length) {
        reviewList.innerHTML = '<p class="empty-state">No reviewed adventures in the vault yet.</p>';
        return;
    }

    reviewList.innerHTML = completed.map(pin => {
        const photoHtml = pin.image ? `<div class="polaroid-preview-card"><img src="${pin.image}" alt="${escapeHtml(pin.title)}"></div>` : '';
        const nikDisplay = pin.nikScore !== null ? `${pin.nikScore.toFixed(1)}/10` : '—';
        const leiDisplay = pin.leiScore !== null ? `${pin.leiScore.toFixed(1)}/10` : '—';
        const avgDisplay = pin.rating !== null ? `${pin.rating.toFixed(1)}/10` : '—';

        return `
            <article class="review-card">
                <div class="review-meta">
                    <span>${escapeHtml(pin.tag)}</span>
                    <span>BubScore: ${avgDisplay}</span>
                </div>
                ${photoHtml}
                <h4 style="font-size: 18px; margin: 6px 0;">${escapeHtml(pin.title)}</h4>
                <p style="color: #4a5568;">${escapeHtml(pin.review || pin.details)}</p>
                <p style="font-size: 12.5px; font-weight: 700; margin-top: 8px; color: #2d3748;">
                    Nik: ${nikDisplay} • Lei: ${leiDisplay} • ${pin.liked ? '♥ Liked' : '♡'}
                </p>
            </article>
        `;
    }).join('');
}

// --- Image Compression Helper ---
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const scale = MAX_WIDTH / img.width;
            canvas.width = Math.min(img.width, MAX_WIDTH);
            canvas.height = Math.min(img.height * (canvas.width / img.width), 450);

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- Pin Modal & Independent Rating Logic ---
const pinModal = document.getElementById('pin-modal');
const pinTitleInput = document.getElementById('pin-title-input');
const pinDetailsInput = document.getElementById('pin-details-input');
const pinTypeInput = document.getElementById('pin-type-input');
const pinReviewInput = document.getElementById('pin-review-input');
const pinPhotoInput = document.getElementById('pin-photo-input');
const pinPhotoTriggerBtn = document.getElementById('pin-photo-trigger-btn');
const pinPhotoStatus = document.getElementById('pin-photo-status');
const pinPhotoPreviewWrap = document.getElementById('pin-photo-preview-wrap');
const pinNikRatingInput = document.getElementById('pin-nik-rating-input');
const pinLeiRatingInput = document.getElementById('pin-lei-rating-input');
const pinNikRatingValue = document.getElementById('pin-nik-rating-value');
const pinLeiRatingValue = document.getElementById('pin-lei-rating-value');
const pinAggregateScore = document.getElementById('pin-aggregate-score');
const pinLikeButton = document.getElementById('pin-like-btn');
const pinForm = document.getElementById('pin-form');
const pinRemoveButton = document.getElementById('pin-remove-btn');

pinPhotoTriggerBtn.addEventListener('click', () => pinPhotoInput.click());

pinPhotoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    pinPhotoStatus.textContent = file.name;
    compressImage(file, (base64) => {
        currentPinImageBase64 = base64;
        pinPhotoPreviewWrap.innerHTML = `<div class="polaroid-preview-card"><img src="${base64}"></div>`;
    });
});

function updatePinScoreLabels() {
    const nik = pinNikRatingModified ? Number(pinNikRatingInput.value) : (pinNikRatingValue.dataset.original !== 'null' ? Number(pinNikRatingValue.dataset.original) : null);
    const lei = pinLeiRatingModified ? Number(pinLeiRatingInput.value) : (pinLeiRatingValue.dataset.original !== 'null' ? Number(pinLeiRatingValue.dataset.original) : null);

    pinNikRatingValue.textContent = nik !== null ? nik.toFixed(1) : '— (Unset)';
    pinLeiRatingValue.textContent = lei !== null ? lei.toFixed(1) : '— (Unset)';

    if (nik !== null && lei !== null) {
        pinAggregateScore.textContent = `BubScore: ${((nik + lei) / 2).toFixed(1)} / 10.0`;
    } else if (nik !== null) {
        pinAggregateScore.textContent = `BubScore: ${nik.toFixed(1)} / 10.0 (Only Nik rated)`;
    } else if (lei !== null) {
        pinAggregateScore.textContent = `BubScore: ${lei.toFixed(1)} / 10.0 (Only Lei rated)`;
    } else {
        pinAggregateScore.textContent = 'BubScore: — / 10.0';
    }
}

pinNikRatingInput.addEventListener('input', () => {
    pinNikRatingModified = true;
    updatePinScoreLabels();
});

pinLeiRatingInput.addEventListener('input', () => {
    pinLeiRatingModified = true;
    updatePinScoreLabels();
});

function openPinModal(pinId) {
    const pin = pinBoardEntries.find(p => p.id === pinId);
    if (!pin) return;

    activePinId = pin.id;
    pinTitleInput.value = pin.title;
    pinDetailsInput.value = pin.details;
    pinTypeInput.value = pin.type;
    pinReviewInput.value = pin.review || '';
    
    // Save previous states
    pinNikRatingValue.dataset.original = pin.nikScore !== null ? String(pin.nikScore) : 'null';
    pinLeiRatingValue.dataset.original = pin.leiScore !== null ? String(pin.leiScore) : 'null';
    
    pinNikRatingInput.value = pin.nikScore !== null ? pin.nikScore : 5.0;
    pinLeiRatingInput.value = pin.leiScore !== null ? pin.leiScore : 5.0;
    
    pinNikRatingModified = false;
    pinLeiRatingModified = false;

    currentPinImageBase64 = pin.image || null;
    pinPhotoStatus.textContent = pin.image ? 'Photo attached' : 'No photo selected';
    pinPhotoPreviewWrap.innerHTML = pin.image ? `<div class="polaroid-preview-card"><img src="${pin.image}"></div>` : '';

    pinLikeButton.dataset.liked = pin.liked ? 'true' : 'false';
    pinLikeButton.textContent = pin.liked ? '♥ Favorited' : '♡ Favorite';

    updatePinScoreLabels();
    pinModal.classList.remove('hidden');
}

function closePinModal() {
    pinModal.classList.add('hidden');
    activePinId = null;
    currentPinImageBase64 = null;
    pinPhotoInput.value = '';
}

document.getElementById('pin-modal-close').addEventListener('click', closePinModal);
document.querySelector('[data-close="true"]').addEventListener('click', closePinModal);

pinLikeButton.addEventListener('click', () => {
    const current = pinLikeButton.dataset.liked === 'true';
    pinLikeButton.dataset.liked = String(!current);
    pinLikeButton.textContent = !current ? '♥ Favorited' : '♡ Favorite';
});

pinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = pinBoardEntries.find(p => p.id === activePinId);
    if (!pin) return;

    pin.title = pinTitleInput.value.trim();
    pin.details = pinDetailsInput.value.trim();
    pin.type = pinTypeInput.value;
    pin.tag = pin.type === 'memory' ? 'Latest Memory' : (pin.type === 'event' ? 'Upcoming Event' : 'Next Wishlist Item');
    pin.review = pinReviewInput.value.trim();
    pin.image = currentPinImageBase64 || pin.image;

    // Preserve the other person's score if untouched
    if (pinNikRatingModified) {
        pin.nikScore = Number(pinNikRatingInput.value);
    }
    if (pinLeiRatingModified) {
        pin.leiScore = Number(pinLeiRatingInput.value);
    }

    if (pin.nikScore !== null && pin.leiScore !== null) {
        pin.rating = Number(((pin.nikScore + pin.leiScore) / 2).toFixed(1));
    } else if (pin.nikScore !== null) {
        pin.rating = pin.nikScore;
    } else if (pin.leiScore !== null) {
        pin.rating = pin.leiScore;
    }

    pin.liked = pinLikeButton.dataset.liked === 'true';
    if (pin.review || pin.image || pin.rating !== null) {
        pin.completed = true;
    }

    savePins();
    renderPins();
    renderReviews();
    closePinModal();
    launchConfettiBurst();
});

pinRemoveButton.addEventListener('click', () => {
    if (!activePinId) return;
    if (confirm('Remove this adventure from the pin board?')) {
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

    pinBoardEntries.unshift({
        id: `pin-${Date.now()}`,
        title,
        details,
        tag: type === 'memory' ? 'Latest Memory' : (type === 'event' ? 'Upcoming Event' : 'Next Wishlist Item'),
        type,
        completed: type === 'memory',
        review: '',
        image: '',
        nikScore: null,
        leiScore: null,
        rating: null,
        liked: false
    });

    savePins();
    renderPins();
    renderReviews();
    addPinForm.reset();
    addPinModal.classList.add('hidden');
    launchConfettiBurst();
});

// --- Scheduled Activity Scoring Logic ---
function updateActivitySliderLabels() {
    nikScoreValue.textContent = nikScoreModified ? Number(nikScoreInput.value).toFixed(1) : (nikScoreValue.dataset.original !== 'null' ? Number(nikScoreValue.dataset.original).toFixed(1) : '—');
    leiScoreValue.textContent = leiScoreModified ? Number(leiScoreInput.value).toFixed(1) : (leiScoreValue.dataset.original !== 'null' ? Number(leiScoreValue.dataset.original).toFixed(1) : '—');
}

nikScoreInput.addEventListener('input', () => {
    nikScoreModified = true;
    updateActivitySliderLabels();
});

leiScoreInput.addEventListener('input', () => {
    leiScoreModified = true;
    updateActivitySliderLabels();
});

function renderActivities() {
    if (!activityList) return;
    if (!activities.length) {
        activityList.innerHTML = '<p class="empty-state">No planned activities yet.</p>';
        return;
    }

    activityList.innerHTML = activities.map(act => {
        const nikDisplay = act.nikScore !== null && act.nikScore !== undefined ? `${Number(act.nikScore).toFixed(1)}/10` : '—';
        const leiDisplay = act.leiScore !== null && act.leiScore !== undefined ? `${Number(act.leiScore).toFixed(1)}/10` : '—';
        const finalDisplay = act.finalScore !== null && act.finalScore !== undefined ? `BubScore: ${act.finalScore}/10` : 'Not fully scored';

        return `
            <article class="bubble activity-card">
                <div>
                    <h4>${escapeHtml(act.name)}</h4>
                    <p style="font-size: 13px; color: #718096;">${act.date} at ${act.time}</p>
                    <div style="font-size: 12px; margin-top: 6px; color: #4a5568;">
                        <strong>Nik:</strong> ${nikDisplay} • <strong>Lei:</strong> ${leiDisplay} • <strong>${finalDisplay}</strong>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button type="button" class="save-btn complete-btn" data-id="${act.id}">${act.completed ? 'Edit Score' : 'Score It'}</button>
                    <button type="button" class="ghost-btn delete-btn" data-id="${act.id}">×</button>
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

        nikScoreValue.dataset.original = act.nikScore !== null && act.nikScore !== undefined ? String(act.nikScore) : 'null';
        leiScoreValue.dataset.original = act.leiScore !== null && act.leiScore !== undefined ? String(act.leiScore) : 'null';

        nikScoreInput.value = act.nikScore !== null && act.nikScore !== undefined ? act.nikScore : 5.0;
        leiScoreInput.value = act.leiScore !== null && act.leiScore !== undefined ? act.leiScore : 5.0;

        nikScoreModified = false;
        leiScoreModified = false;
        updateActivitySliderLabels();
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

    if (nikScoreModified) {
        act.nikScore = Number(nikScoreInput.value);
    }
    if (leiScoreModified) {
        act.leiScore = Number(leiScoreInput.value);
    }

    if (act.nikScore !== null && act.leiScore !== null) {
        act.finalScore = Number(((act.nikScore + act.leiScore) / 2).toFixed(1));
        act.completed = true;
    } else if (act.nikScore !== null) {
        act.finalScore = act.nikScore;
    } else if (act.leiScore !== null) {
        act.finalScore = act.leiScore;
    }

    saveActivities();
    renderActivities();
    completionForm.classList.add('hidden');
});

cancelCompletionButton.addEventListener('click', () => completionForm.classList.add('hidden'));

// --- Navigation Tabs ---
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

// --- Remote Sync ---
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

renderPins();
renderActivities();
renderReviews();