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

let nikScoreModified = false;
let leiScoreModified = false;

const STORAGE_KEY = 'bubweb-activities';
const PIN_STORAGE_KEY = 'bubweb-pin-board';
const DEFAULT_ALBUM_URL = 'https://photos.app.goo.gl/ZpFHXuDFiwuU2qzXA';

let activities = loadActivities();
let activeActivityId = null;

// --- Firebase Config & Setup ---
const firebaseConfig = {
    apiKey: "AIzaSyBxkrNYSVqVf2_7wyHl6sA7i6MQ_OY69cg",
    authDomain: "guide-to-the-outside.firebaseapp.com",
    databaseURL: "https://guide-to-the-outside-default-rtdb.firebaseio.com",
    projectId: "guide-to-the-outside",
    storageBucket: "guide-to-the-outside.firebasestorage.app",
    messagingSenderId: "242577301245",
    appId: "1:242577301245:web:17387fc6b1df7fa456e894",
    measurementId: "G-YB4TQN6S6Q"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const pinsRef = db.ref('pinBoardEntries');
const activitiesRef = db.ref('activities');
const letterboxdDismissedRef = db.ref('letterboxdDismissed');

let isAuthorized = false;
let isApplyingRemotePins = false;
let isApplyingRemoteActivities = false;
let pinsSyncReady = false;
let activitiesSyncReady = false;

const DEFAULT_PIN_BOARD = [
    {
        id: 'wishlist',
        title: 'Hike & Picnic!',
        details: 'Next weekend in the mountains',
        tag: 'Next Wishlist Item',
        type: 'next-up',
        completed: false,
        review: '',
        albumUrl: DEFAULT_ALBUM_URL,
        images: [],
        nikScore: null,
        leiScore: null,
        rating: null,
        liked: false
    }
];

let pinBoardEntries = loadPins();
let activePinId = null;
let currentPinImages = [];
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

    let images = [];
    if (Array.isArray(pin?.images)) {
        images = pin.images;
    } else if (pin?.image) {
        images = [pin.image];
    }

    return {
        id: pin.id || `pin-${Date.now()}`,
        title: pin.title || 'Untitled Adventure',
        details: pin.details || '',
        tag: pin.tag || (pin.type === 'memory' ? 'Latest Memory' : (pin.type === 'event' ? 'Upcoming Event' : 'Next Wishlist Item')),
        type: pin.type || 'next-up',
        completed: !!pin.completed,
        review: pin.review || '',
        albumUrl: pin.albumUrl || DEFAULT_ALBUM_URL,
        images: images,
        nikScore: nik,
        leiScore: lei,
        rating: computedRating,
        liked: !!pin.liked,
        category: ['film', 'food'].includes(pin.category) ? pin.category : 'adventure',
        filmYear: pin.filmYear || '',
        posterUrl: pin.posterUrl || '',
        letterboxdUrl: pin.letterboxdUrl || '',
        foodPlace: pin.foodPlace || '',
        foodDish: pin.foodDish || '',
        foodPrice: pin.foodPrice || '',
        mapUrl: pin.mapUrl || '',
        letterboxdKey: pin.letterboxdKey || '',
        ticketImage: pin.ticketImage || '',
        customTitle: pin.customTitle || '',
        filmLookupDone: !!pin.filmLookupDone,
        showDate: /^\d{4}-\d{2}-\d{2}$/.test(pin.showDate || '') ? pin.showDate : '',
        showTime: /^\d{2}:\d{2}/.test(pin.showTime || '') ? pin.showTime.slice(0, 5) : '',
        lat: Number.isFinite(Number(pin.lat)) && pin.lat !== null && pin.lat !== '' ? Number(pin.lat) : null,
        lng: Number.isFinite(Number(pin.lng)) && pin.lng !== null && pin.lng !== '' ? Number(pin.lng) : null
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
    if (isAuthorized && activitiesSyncReady && !isApplyingRemoteActivities) {
        activitiesRef.set(activities).catch((error) => {
            console.error('Could not sync activities to Firebase:', error);
            alert('Your change is saved on this device, but could not sync to Firebase. Check your connection or sign-in.');
        });
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
    if (isAuthorized && pinsSyncReady && !isApplyingRemotePins) {
        pinsRef.set(pinBoardEntries).catch((error) => {
            console.error('Could not sync pin board to Firebase:', error);
            alert('Your change is saved on this device, but could not sync to Firebase. Check your connection or sign-in.');
        });
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Only allow http(s) links (and our own compressed photos) into src/href attributes
function safeUrl(value) {
    const url = String(value || '').trim();
    if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url)) return escapeHtml(url);
    return '';
}

// Films show our own name if we gave one, otherwise the official title
function displayTitle(pin) {
    return (pin.category === 'film' && pin.customTitle) ? pin.customTitle : pin.title;
}

const CATEGORY_LABELS = { adventure: 'BubAdventure', film: 'BubFilm', food: 'BubFood' };

// --- Render Pin Board (Landing Overview + Dedicated Category Pages) ---
const pinBoard = document.getElementById('pin-board');

function getCurrentCategoryView() {
    const hash = window.location.hash.replace('#', '');
    if (['memories', 'upcoming', 'wishlist'].includes(hash)) return hash;
    return 'home';
}

function buildPinCardHtml(pin) {
    const photos = pin.images && pin.images.length ? pin.images : (pin.image ? [pin.image] : []);
    let galleryHtml = '';
    if (photos.length > 0) {
        galleryHtml = `
            <div class="polaroid-gallery">
                ${photos.slice(0, 3).map(src => `<div class="polaroid-preview-card"><img src="${src}" alt="Memory"></div>`).join('')}
            </div>
        `;
    } else if (pin.category === 'film' && safeUrl(pin.posterUrl)) {
        galleryHtml = `
            <div class="polaroid-gallery">
                <div class="polaroid-preview-card"><img src="${safeUrl(pin.posterUrl)}" alt="Poster"></div>
            </div>
        `;
    }

    const scoreText = pin.rating !== null ? `Rating: ${pin.rating.toFixed(1)}/10` : 'Unrated';
    const albumBtn = pin.albumUrl
        ? `<a href="${pin.albumUrl}" target="_blank" rel="noopener noreferrer" class="ghost-btn album-chip" onclick="event.stopPropagation()">Google Photos</a>`
        : '';

    return `
        <div class="pin-card post-it ${pin.type} ${pin.completed ? 'done' : ''}" data-id="${pin.id}" tabindex="0">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="bubble-tag">${pin.category !== 'adventure' ? CATEGORY_LABELS[pin.category] + ' · ' : ''}${escapeHtml(pin.tag)}</span>
                ${albumBtn}
            </div>
            ${galleryHtml}
            <h3>${escapeHtml(displayTitle(pin))}</h3>
            <p>${escapeHtml(pin.details)}</p>
            <div class="pin-meta">
                <span>${pin.liked ? 'Favorited' : 'Not favorited'}</span>
                <span>${scoreText}</span>
                <span>${pin.completed ? 'Completed' : 'Planned'}</span>
            </div>
        </div>
    `;
}

// --- Movie day: on the day (and the day before) the film's ticket is front and centre ---
function localDateKey(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatShowtime(pin) {
    const date = new Date(`${pin.showDate}T12:00:00`);
    const day = date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
    return pin.showTime ? `${day} · ${pin.showTime}` : day;
}

function renderMovieDay() {
    const banner = document.getElementById('movie-day');
    if (!banner) return;
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const todayKey = localDateKey(today);
    const tomorrowKey = localDateKey(tomorrow);

    const pin = pinBoardEntries
        .filter(p => p.category === 'film' && (p.showDate === todayKey || p.showDate === tomorrowKey))
        .sort((a, b) => `${a.showDate} ${a.showTime}`.localeCompare(`${b.showDate} ${b.showTime}`))[0];

    if (!pin || document.body.dataset.view !== 'home') {
        banner.classList.add('hidden');
        banner.innerHTML = '';
        return;
    }

    const when = pin.showDate === todayKey ? 'Movie day!' : 'Movie date tomorrow';
    const poster = safeUrl(pin.posterUrl);
    const ticket = safeUrl(pin.ticketImage);
    const letterboxd = safeUrl(pin.letterboxdUrl);
    banner.innerHTML = `
        ${poster ? `<img class="movie-day-poster" src="${poster}" alt="${escapeHtml(pin.title)} poster">` : ''}
        <div class="movie-day-body">
            <span class="bubble-tag">${when}</span>
            <h2>${escapeHtml(displayTitle(pin))}</h2>
            ${pin.customTitle ? `<p class="official-title">${escapeHtml(pin.title)}</p>` : ''}
            <p>${escapeHtml(formatShowtime(pin))}${pin.details ? ` · ${escapeHtml(pin.details)}` : ''}</p>
            ${ticket
                ? `<button type="button" class="ticket-stub movie-day-ticket" data-ticket-pin="${escapeHtml(pin.id)}" aria-label="Show ticket full screen">
                       <span class="ticket-label">ADMIT TWO · tap to show</span>
                       <img src="${ticket}" alt="Ticket">
                   </button>`
                : `<p class="movie-day-note">No ticket saved yet. Open the film and add a photo of it.</p>`}
            <div class="movie-day-actions">
                ${letterboxd ? `<a class="ghost-btn" href="${letterboxd}" target="_blank" rel="noopener noreferrer">Letterboxd</a>` : ''}
                <button type="button" class="ghost-btn" data-open-pin="${escapeHtml(pin.id)}">Open</button>
            </div>
        </div>
    `;
    banner.classList.remove('hidden');
}

const ticketViewer = document.getElementById('ticket-viewer');
const ticketViewerImg = document.getElementById('ticket-viewer-img');

function showTicketFullScreen(pinId) {
    const pin = pinBoardEntries.find(p => p.id === pinId);
    if (!pin || !safeUrl(pin.ticketImage) || !ticketViewer) return;
    ticketViewerImg.src = pin.ticketImage;
    ticketViewer.classList.remove('hidden');
}

if (ticketViewer) {
    ticketViewer.addEventListener('click', () => ticketViewer.classList.add('hidden'));
}

document.addEventListener('click', (e) => {
    const ticketBtn = e.target.closest('[data-ticket-pin]');
    if (ticketBtn) {
        e.stopPropagation();
        showTicketFullScreen(ticketBtn.dataset.ticketPin);
        return;
    }
    const openBtn = e.target.closest('[data-open-pin]');
    if (openBtn) openPinModal(openBtn.dataset.openPin);
});

// Check again at midnight-ish if the page is left open
setInterval(renderMovieDay, 15 * 60 * 1000);

function renderPins() {
    if (!pinBoard) return;

    const view = getCurrentCategoryView();
    document.body.dataset.view = view;
    const memories = pinBoardEntries.filter(p => p.type === 'memory' || p.completed);
    const upcoming = pinBoardEntries.filter(p => p.type === 'event' && !p.completed);
    const wishlist = pinBoardEntries.filter(p => p.type === 'next-up' && !p.completed);

    // Toggle the bottom planner/tabs so category pages feel like clean, dedicated pages
    const pageNav = document.querySelector('.page-nav');
    const mainContent = document.querySelector('.main-content');
    if (pageNav && mainContent) {
        const isHome = view === 'home';
        pageNav.classList.toggle('hidden', !isHome);
        mainContent.classList.toggle('hidden', !isHome);
    }

    if (view === 'home') {
        // LANDING PAGE: 2 from each category + 3 scrap paper links
        pinBoard.className = ''; // Remove single-grid class on home view
        pinBoard.innerHTML = `
            <div class="pin-board-columns">
                <div class="board-column">
                    <h2 class="board-col-title">Past Memories</h2>
                    ${memories.slice(0, 2).map(buildPinCardHtml).join('') || '<p class="empty-state" style="color:white;">No memories yet</p>'}
                </div>
                <div class="board-column">
                    <h2 class="board-col-title">Upcoming</h2>
                    ${upcoming.slice(0, 2).map(buildPinCardHtml).join('') || '<p class="empty-state" style="color:white;">Nothing upcoming</p>'}
                </div>
                <div class="board-column">
                    <h2 class="board-col-title">Wishlist</h2>
                    ${wishlist.slice(0, 2).map(buildPinCardHtml).join('') || '<p class="empty-state" style="color:white;">Wishlist is empty</p>'}
                </div>
            </div>

            <div class="scrap-nav">
                <a href="#memories" class="scrap-link">All Past Memories (${memories.length}) →</a>
                <a href="#upcoming" class="scrap-link">All Upcoming (${upcoming.length}) →</a>
                <a href="#wishlist" class="scrap-link">All Wishlist (${wishlist.length}) →</a>
            </div>
        `;
    } else {
        // DEDICATED CATEGORY PAGE: Full endless scroll for the chosen category
        const config = {
            memories: { title: 'All Past Memories', items: memories },
            upcoming: { title: 'All Upcoming Adventures', items: upcoming },
            wishlist: { title: 'The Full Wishlist', items: wishlist }
        }[view];

        pinBoard.className = '';
        pinBoard.innerHTML = `
            <div class="category-view-header">
                <a href="#home" class="scrap-link" style="font-size: 20px; padding: 8px 16px;">← Back to Board</a>
                <h2 class="board-col-title" style="margin: 0;">${config.title}</h2>
                <div style="width: 120px;"></div>
            </div>
            <div class="pin-board">
                ${config.items.map(buildPinCardHtml).join('') || '<p class="empty-state" style="color:white;">Nothing here yet!</p>'}
            </div>
        `;
    }

    renderMovieDay();

    // Re-attach click listeners to open the Edit Modal
    pinBoard.querySelectorAll('.pin-card').forEach(card => {
        card.addEventListener('click', () => {
            openPinModal(card.dataset.id);
        });
    });

    
}

// Re-render automatically when clicking scrap paper links or browser Back/Forward
window.addEventListener('hashchange', renderPins);

// --- Render Reviews Wall ---
const reviewList = document.getElementById('review-list');

function renderReviews() {
    renderCategoryPages();
    if (!reviewList) return;
    const completed = pinBoardEntries.filter(p => p.completed || p.review || (p.images && p.images.length));

    if (!completed.length) {
        reviewList.innerHTML = '<p class="empty-state">No reviewed adventures in the vault yet.</p>';
        return;
    }

    reviewList.innerHTML = completed.map(pin => {
        const photos = pin.images && pin.images.length ? pin.images : (pin.image ? [pin.image] : []);
        const galleryHtml = photos.length > 0 
            ? `<div class="polaroid-gallery" style="margin-bottom: 10px;">${photos.map(src => `<div class="polaroid-preview-card"><img src="${src}"></div>`).join('')}</div>`
            : '';

        const nikDisplay = pin.nikScore !== null ? `${pin.nikScore.toFixed(1)}/10` : '—';
        const leiDisplay = pin.leiScore !== null ? `${pin.leiScore.toFixed(1)}/10` : '—';
        const avgDisplay = pin.rating !== null ? `${pin.rating.toFixed(1)}/10` : '—';

        const albumLinkBtn = pin.albumUrl
            ? `<a href="${pin.albumUrl}" target="_blank" rel="noopener noreferrer" class="ghost-btn" style="text-decoration:none; font-size:12px;">Open Google Photos Album</a>`
            : '';

        return `
            <article class="review-card">
                <div class="review-meta">
                    <span>${escapeHtml(pin.tag)}</span>
                    <span>BubScore: ${avgDisplay}</span>
                </div>
                ${galleryHtml}
                <h4 style="font-size: 18px; margin: 6px 0;">${escapeHtml(displayTitle(pin))}</h4>
                <p style="color: #444444;">${escapeHtml(pin.review || pin.details)}</p>
                <p style="font-size: 12.5px; font-weight: 700; margin-top: 8px; color: #333333;">
                    Nik: ${nikDisplay} | Lei: ${leiDisplay} | ${pin.liked ? 'Favorited' : 'Not favorited'}
                </p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                    ${albumLinkBtn}
                    <button type="button" class="ghost-btn edit-review-btn" data-id="${pin.id}">Edit adventure</button>
                </div>
            </article>
        `;
    }).join('');
}

// --- BubFilms & BubFood pages ---
const filmList = document.getElementById('film-list');
const foodList = document.getElementById('food-list');
const foodWantList = document.getElementById('food-want-list');
const foodMapEl = document.getElementById('food-map');
const foodMapNote = document.getElementById('food-map-note');
const JOBURG = [-26.15, 28.05];
let foodMap = null;
let foodMapLayer = null;
let foodTileLayer = null;
let foodMapFilter = 'all';
const foodSuggestedList = document.getElementById('food-suggested-list');

// Hand-picked, well-reviewed spots to investigate (researched Nov 2026).
// Ratings change, so we link to the live Google reviews instead of storing them.
const SUGGESTED_SPOTS = [
    { name: 'The Station', area: 'Parkhurst', note: 'Relaxed and mid-priced, a strong first pick', lat: -26.1402, lng: 28.0174, placeId: 'ChIJr4p9KtcLlR4RO4m0S-V5G5U' },
    { name: 'Pera', area: 'Rosebank', note: 'Small and special, save for a celebration', lat: -26.1456, lng: 28.0402, placeId: 'ChIJXUMmKgQNlR4RVQEjjujMI3Y' },
    { name: 'Marble', area: 'Rosebank', note: 'Fire-grill cooking and rooftop views, book ahead', lat: -26.1436, lng: 28.0362, placeId: 'ChIJLyxCKJIMlR4RzTlmSOyw4h4' },
    { name: 'Kolonaki Greek Kouzina', area: 'Parkhurst', note: 'Lively Greek, great for sharing plates', lat: -26.1412, lng: 28.0173, placeId: 'ChIJ1UhIIgALlR4RkSBQh_MuaTY' },
    { name: 'Yamitsuki Sushi', area: 'Bedfordview', note: 'Sushi, teppanyaki and dim sum, worth the drive', lat: -26.1792, lng: 28.1365, placeId: 'ChIJjw3jByASlR4RaPuTDzrJ73w' },
    { name: 'Artistry JHB', area: 'Sandown', note: 'Restaurant inside an art gallery', lat: -26.1045, lng: 28.0509, placeId: 'ChIJ5ZCGA3BzlR4RhmAZLQmfX1A' },
    { name: 'SINN', area: 'Sandton', note: 'Stylish spot for a dressier evening', lat: -26.1143, lng: 28.0514, placeId: 'ChIJi8rOHEQNlR4RA0G2AC4WxsU' },
    { name: 'Salvation Cafe', area: 'Milpark', note: 'Courtyard brunch, minutes from Wits', lat: -26.1855, lng: 28.0190, placeId: 'ChIJOXJYhgoMlR4RIuddWGMlcbM' },
    { name: 'Breezeblock Cafe', area: 'Brixton', note: 'Cheap and cosy coffee date near campus', lat: -26.1934, lng: 28.0040, placeId: 'ChIJ_QZpVe4LlR4RZ6hBkF0fAfc' },
    { name: 'La Parada', area: 'Rosebank', note: 'Spanish tapas, fun for a double date', lat: -26.1438, lng: 28.0422, placeId: 'ChIJSzJ4kqENlR4RdTdN2CwQNTw' },
    { name: 'Dosa Hut', area: 'Fordsburg', note: 'Cheap, proper South Indian dosas', lat: -26.2053, lng: 28.0220, placeId: 'ChIJJcctUaoOlR4R1zV-O4TT1pg' }
];

function reviewsUrl(spot) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.name}, ${spot.area}`)}&query_place_id=${spot.placeId}`;
}

// Hide suggestions once they're already one of our food pins
function openSuggestions() {
    const ours = pinBoardEntries.filter(p => p.category === 'food')
        .map(p => `${p.foodPlace} ${p.title}`.toLowerCase());
    return SUGGESTED_SPOTS.filter(spot => !ours.some(text => text.includes(spot.name.toLowerCase())));
}

function addSuggestionToWishlist(spot) {
    const id = `pin-${Date.now()}`;
    pinBoardEntries.unshift(normalizePin({
        id,
        category: 'food',
        type: 'next-up',
        title: spot.name,
        details: `${spot.area} · ${spot.note}`,
        foodPlace: `${spot.name}, ${spot.area}`,
        mapUrl: reviewsUrl(spot),
        lat: spot.lat,
        lng: spot.lng
    }));
    savePins();
    renderPins();
    renderReviews();
}

function renderSuggestedList() {
    if (!foodSuggestedList) return;
    const spots = openSuggestions();
    foodSuggestedList.innerHTML = spots.map(spot => `
        <div class="suggested-row">
            <div>
                <strong>${escapeHtml(spot.name)}</strong> <span class="category-sub">${escapeHtml(spot.area)}</span>
                <div class="category-sub">${escapeHtml(spot.note)}</div>
            </div>
            <div class="suggested-actions">
                <a class="ghost-btn category-link" href="${safeUrl(reviewsUrl(spot))}" target="_blank" rel="noopener noreferrer">Reviews</a>
                <button type="button" class="save-btn suggested-add" data-place-id="${escapeHtml(spot.placeId)}">Add to Want to try</button>
            </div>
        </div>
    `).join('') || '<p class="empty-state">You\'ve added every suggestion. Nice!</p>';
}

if (foodSuggestedList) {
    foodSuggestedList.addEventListener('click', (e) => {
        const btn = e.target.closest('.suggested-add');
        if (!btn) return;
        const spot = SUGGESTED_SPOTS.find(s => s.placeId === btn.dataset.placeId);
        if (spot) addSuggestionToWishlist(spot);
    });
}

function scoreLine(pin) {
    const nik = pin.nikScore !== null ? `${pin.nikScore.toFixed(1)}` : '—';
    const lei = pin.leiScore !== null ? `${pin.leiScore.toFixed(1)}` : '—';
    const avg = pin.rating !== null ? `${pin.rating.toFixed(1)}/10` : 'Unrated';
    return `<p class="category-scores"><strong>BubScore ${avg}</strong> · Nik ${nik} · Lei ${lei}${pin.liked ? ' · ♥' : ''}</p>`;
}

function buildFilmCardHtml(pin) {
    const poster = safeUrl(pin.posterUrl) || (pin.images && pin.images[0] ? safeUrl(pin.images[0]) : '');
    const letterboxd = safeUrl(pin.letterboxdUrl);
    return `
        <article class="category-card film-card" data-id="${escapeHtml(pin.id)}" tabindex="0">
            ${poster ? `<img class="film-poster" src="${poster}" alt="${escapeHtml(pin.title)} poster">` : '<div class="film-poster film-poster-empty">🎬</div>'}
            <div class="category-card-body">
                <h4>${escapeHtml(displayTitle(pin))}${pin.filmYear ? ` <span class="film-year">(${escapeHtml(pin.filmYear)})</span>` : ''}</h4>
                ${pin.customTitle ? `<p class="official-title">${escapeHtml(pin.title)}</p>` : ''}
                <p class="category-sub">${escapeHtml(pin.details)}</p>
                ${pin.showDate ? `<p class="showtime-badge">🎟️ ${escapeHtml(formatShowtime(pin))}</p>` : ''}
                ${scoreLine(pin)}
                ${pin.review ? `<p class="category-review">${escapeHtml(pin.review)}</p>` : ''}
                ${safeUrl(pin.ticketImage) ? `
                    <div class="ticket-stub" data-ticket-pin="${escapeHtml(pin.id)}" aria-label="Ticket stub, tap to show full screen">
                        <span class="ticket-label">ADMIT TWO</span>
                        <img src="${safeUrl(pin.ticketImage)}" alt="Our ticket for ${escapeHtml(pin.title)}">
                    </div>` : ''}
                ${letterboxd ? `<a class="ghost-btn category-link" href="${letterboxd}" target="_blank" rel="noopener noreferrer">Letterboxd</a>` : ''}
            </div>
        </article>
    `;
}

function isFoodVisited(pin) {
    return pin.type === 'memory' || pin.completed;
}

function buildFoodCardHtml(pin) {
    const photo = pin.images && pin.images[0] ? safeUrl(pin.images[0]) : '';
    const map = safeUrl(pin.mapUrl);
    const sub = [pin.foodPlace, pin.foodDish, pin.foodPrice].filter(Boolean).map(escapeHtml).join(' · ');
    return `
        <article class="category-card food-card" data-id="${escapeHtml(pin.id)}" tabindex="0">
            ${photo ? `<img class="food-photo" src="${photo}" alt="${escapeHtml(pin.title)}">` : ''}
            <div class="category-card-body">
                <h4>${escapeHtml(pin.title)}</h4>
                <p class="category-sub">${sub || escapeHtml(pin.details)}</p>
                ${scoreLine(pin)}
                ${pin.review ? `<p class="category-review">${escapeHtml(pin.review)}</p>` : ''}
                ${pin.lat === null ? '<p class="category-sub">Not on the map yet</p>' : ''}
                ${map ? `<a class="ghost-btn category-link" href="${map}" target="_blank" rel="noopener noreferrer">Directions</a>` : ''}
            </div>
        </article>
    `;
}

function renderCategoryPages() {
    const films = pinBoardEntries.filter(p => p.category === 'film');
    const foods = pinBoardEntries.filter(p => p.category === 'food');
    const been = foods.filter(isFoodVisited);
    const want = foods.filter(p => !isFoodVisited(p));
    if (filmList) {
        filmList.innerHTML = films.map(buildFilmCardHtml).join('') || '<p class="empty-state">No BubFilms yet. Add your first movie date!</p>';
    }
    if (foodList) {
        foodList.innerHTML = been.map(buildFoodCardHtml).join('') || '<p class="empty-state">No food dates yet. Add your first one!</p>';
    }
    if (foodWantList) {
        foodWantList.innerHTML = want.map(buildFoodCardHtml).join('') || '<p class="empty-state">Nothing on the list. Add a spot you want to try (pick "Wishlist Item").</p>';
    }
    renderSuggestedList();
    renderFoodMap();
}

// --- BubFood map (Leaflet + OpenStreetMap, no API key needed) ---

// Standard OpenStreetMap tiles: free, no key or account. Night mode is a CSS filter on the tiles.
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function renderFoodMap() {
    if (!foodMapEl || typeof L === 'undefined') return;
    const page = document.getElementById('food-page');
    if (!page || page.classList.contains('hidden')) return; // Leaflet needs a visible box

    if (!foodMap) {
        foodMap = L.map(foodMapEl, { scrollWheelZoom: false }).setView(JOBURG, 11);
        foodMapLayer = L.layerGroup().addTo(foodMap);
    }
    if (!foodTileLayer) {
        foodTileLayer = L.tileLayer(OSM_TILES, {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(foodMap);
    }
    foodMapEl.classList.toggle('night', document.body.classList.contains('theme-night'));
    foodMap.invalidateSize();
    foodMapLayer.clearLayers();

    const spots = foodMapFilter === 'suggested' ? [] : pinBoardEntries
        .filter(p => p.category === 'food' && p.lat !== null && p.lng !== null)
        .filter(p => foodMapFilter === 'all' || (foodMapFilter === 'been') === isFoodVisited(p));
    const suggestions = ['all', 'suggested'].includes(foodMapFilter) ? openSuggestions() : [];

    suggestions.forEach(spot => {
        const marker = L.marker([spot.lat, spot.lng], {
            title: spot.name,
            icon: L.divIcon({
                className: '',
                html: '<div class="food-marker suggested"><span>★</span></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -28]
            })
        });
        const popup = document.createElement('div');
        popup.className = 'food-popup';
        const title = document.createElement('strong');
        title.textContent = spot.name;
        const sub = document.createElement('div');
        sub.textContent = `${spot.area} · ${spot.note}`;
        const reviews = document.createElement('a');
        reviews.className = 'ghost-btn';
        reviews.href = reviewsUrl(spot);
        reviews.target = '_blank';
        reviews.rel = 'noopener noreferrer';
        reviews.textContent = 'Google reviews';
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'save-btn';
        add.textContent = 'Add to Want to try';
        add.addEventListener('click', () => {
            foodMap.closePopup();
            addSuggestionToWishlist(spot);
        });
        popup.append(title, sub, reviews, add);
        marker.bindPopup(popup);
        marker.addTo(foodMapLayer);
    });

    spots.forEach(pin => {
        const visited = isFoodVisited(pin);
        const label = visited && pin.rating !== null ? pin.rating.toFixed(1) : (visited ? '✓' : '♡');
        const marker = L.marker([pin.lat, pin.lng], {
            title: pin.title,
            icon: L.divIcon({
                className: '',
                html: `<div class="food-marker ${visited ? 'been' : 'want'}"><span>${escapeHtml(label)}</span></div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 36],
                popupAnchor: [0, -34]
            })
        });
        const popup = document.createElement('div');
        popup.className = 'food-popup';
        const title = document.createElement('strong');
        title.textContent = pin.title;
        const sub = document.createElement('div');
        sub.textContent = [pin.foodPlace, visited ? (pin.rating !== null ? `BubScore ${pin.rating.toFixed(1)}/10` : 'Been there') : 'Want to try'].filter(Boolean).join(' · ');
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'ghost-btn';
        open.textContent = 'Open';
        open.addEventListener('click', () => openPinModal(pin.id));
        popup.append(title, sub, open);
        marker.bindPopup(popup);
        marker.addTo(foodMapLayer);
    });

    const unplaced = pinBoardEntries.filter(p => p.category === 'food' && p.lat === null).length;
    if (foodMapNote) {
        foodMapNote.textContent = unplaced
            ? `${unplaced} spot${unplaced === 1 ? '' : 's'} not on the map yet. Open one and tap "Find on map".`
            : '';
    }
    const points = [...spots.map(p => [p.lat, p.lng]), ...suggestions.map(s => [s.lat, s.lng])];
    if (points.length) {
        foodMap.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom: 15, animate: false });
    }
}

document.querySelectorAll('.map-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.map-filter').forEach(b => b.classList.toggle('active', b === btn));
        foodMapFilter = btn.dataset.filter;
        renderFoodMap();
    });
});

[filmList, foodList].forEach(list => {
    if (!list) return;
    list.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('[data-ticket-pin]')) return;
        const card = e.target.closest('.category-card');
        if (card) openPinModal(card.dataset.id);
    });
});

if (reviewList) {
    reviewList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-review-btn');
        if (editBtn) openPinModal(editBtn.dataset.id);
    });
}

// --- Image Compression Helper ---
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 550;
            canvas.width = Math.min(img.width, MAX_WIDTH);
            canvas.height = Math.min(img.height * (canvas.width / img.width), 420);

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.70));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- Modal Image Previews ---
function renderModalPhotoPreviews() {
    pinPhotoStatus.textContent = currentPinImages.length 
        ? `${currentPinImages.length} thumbnail${currentPinImages.length > 1 ? 's' : ''} saved` 
        : 'No thumbnails selected';

    pinPhotoPreviewWrap.innerHTML = currentPinImages.map((src, index) => `
        <div class="photo-thumb-container">
            <img src="${src}" alt="Snapshot">
            <button type="button" class="photo-delete-badge" data-index="${index}">&times;</button>
        </div>
    `).join('');

    pinPhotoPreviewWrap.querySelectorAll('.photo-delete-badge').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.index);
            currentPinImages.splice(idx, 1);
            renderModalPhotoPreviews();
        });
    });
}

// --- Pin Modal & Rating Logic ---
const pinModal = document.getElementById('pin-modal');
const pinTitleInput = document.getElementById('pin-title-input');
const pinDetailsInput = document.getElementById('pin-details-input');
const pinTypeInput = document.getElementById('pin-type-input');
const pinAlbumUrlInput = document.getElementById('pin-album-url');
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
const pinCategoryInput = document.getElementById('pin-category-input');
const pinFilmFields = document.getElementById('pin-film-fields');
const pinFoodFields = document.getElementById('pin-food-fields');
const pinFilmYear = document.getElementById('pin-film-year');
const pinFilmLetterboxd = document.getElementById('pin-film-letterboxd');
const pinFilmPoster = document.getElementById('pin-film-poster');
const pinFoodPlace = document.getElementById('pin-food-place');
const pinFoodDish = document.getElementById('pin-food-dish');
const pinFoodPrice = document.getElementById('pin-food-price');
const pinFoodMap = document.getElementById('pin-food-map');

const pinTicketInput = document.getElementById('pin-ticket-input');
const pinTicketTrigger = document.getElementById('pin-ticket-trigger-btn');
const pinTicketRemove = document.getElementById('pin-ticket-remove-btn');
const pinTicketPreview = document.getElementById('pin-ticket-preview');
const pinFoodLocateBtn = document.getElementById('pin-food-locate-btn');
const pinFoodUnlocateBtn = document.getElementById('pin-food-unlocate-btn');
const pinFoodLocateStatus = document.getElementById('pin-food-locate-status');
let currentTicketImage = '';
const pinFilmShowDate = document.getElementById('pin-film-show-date');
const pinFilmCustomTitle = document.getElementById('pin-film-custom-title');
const pinFilmShowTime = document.getElementById('pin-film-show-time');
const pinFilmFindPoster = document.getElementById('pin-film-find-poster');
const pinFilmPosterStatus = document.getElementById('pin-film-poster-status');

// Wikipedia's free API has film posters and allows browser requests (no key)
// Wikidata (free, no key) knows each film's Letterboxd page and release date
async function filmDetailsFromWikidata(qid) {
    const details = { letterboxdSlug: '', year: '' };
    if (!qid) return details;
    try {
        const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`;
        const claims = (await (await fetch(url)).json()).entities[qid].claims || {};
        details.letterboxdSlug = claims.P6127?.[0]?.mainsnak?.datavalue?.value || '';
        const released = claims.P577?.[0]?.mainsnak?.datavalue?.value?.time || '';
        details.year = (released.match(/\d{4}/) || [''])[0];
    } catch (err) { /* poster and year still work without it */ }
    return details;
}

// Fill only what's empty, so anything typed by hand always wins
async function autoFillFilm(pin) {
    if (pin.category !== 'film' || (pin.posterUrl && pin.letterboxdUrl && pin.filmYear)) return false;
    const found = await findFilmOnWikipedia(pin.title, pin.filmYear, pin.letterboxdUrl);
    pin.filmLookupDone = true;
    if (!found) return true;
    if (found.title && found.title !== pin.title) pin.title = found.title;
    if (!pin.posterUrl) pin.posterUrl = found.poster;
    if (!pin.letterboxdUrl && found.letterboxdUrl) pin.letterboxdUrl = found.letterboxdUrl;
    if (!pin.filmYear && found.year) pin.filmYear = found.year;
    return true;
}

// Films added from either phone get their details the next time anyone opens BubWeb
let filmAutoFillStarted = false;
async function autoFillMissingFilms() {
    if (filmAutoFillStarted || !isAuthorized || !pinsSyncReady) return;
    filmAutoFillStarted = true;
    const todo = pinBoardEntries
        .filter(p => p.category === 'film' && !p.filmLookupDone && (!p.posterUrl || !p.letterboxdUrl || !p.filmYear))
        .slice(0, 8);
    let changed = false;
    for (const pin of todo) {
        changed = (await autoFillFilm(pin)) || changed;
    }
    if (changed) {
        savePins();
        renderPins();
        renderReviews();
    }
}

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

function letterboxdSlug(url) {
    return (String(url || '').match(/letterboxd\.com\/(?:[^/]+\/)?film\/([^/?#]+)/i) || [])[1] || '';
}

const normaliseTitle = t => String(t || '').toLowerCase()
    .replace(/\s*\((?:\d{4} )?(?:[\w-]+ )?film\)$/i, '')
    .replace(/[^a-z0-9]/g, '');

// The poster comes from the page summary (search results leave film posters out)
async function filmFromWikipediaPage(pageTitle) {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`);
    if (!res.ok) return null;
    const page = await res.json();
    const image = (page.originalimage || page.thumbnail || {}).source;
    if (page.type !== 'standard' || !/film|movie/i.test(page.description || '') || !image) return null;
    const extra = await filmDetailsFromWikidata(page.wikibase_item);
    return {
        title: page.title.replace(/\s*\((?:\d{4} )?(?:[\w-]+ )?film\)$/i, ''),
        poster: image.split('?')[0],
        year: ((page.description || '').match(/\b(19|20)\d{2}\b/) || [''])[0] || extra.year,
        letterboxdUrl: extra.letterboxdSlug ? `https://letterboxd.com/film/${extra.letterboxdSlug}/` : '',
        pageUrl: page.content_urls?.desktop?.page || ''
    };
}

// A Letterboxd link points at one exact film: Wikidata maps it to its Wikipedia page
async function wikipediaTitleForLetterboxd(slug) {
    try {
        const search = await (await fetch(`${WIKIDATA_API}?action=query&list=search&srsearch=${encodeURIComponent(`haswbstatement:P6127=${slug}`)}&format=json&origin=*`)).json();
        const qid = search.query?.search?.[0]?.title;
        if (!qid) return '';
        const entity = await (await fetch(`${WIKIDATA_API}?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`)).json();
        return entity.entities?.[qid]?.sitelinks?.enwiki?.title || '';
    } catch (err) {
        return '';
    }
}

// Real Wikipedia search, so typos and vague titles still find the film
async function searchWikipediaFilms(title, year) {
    const query = `${title} ${year || ''} film`.replace(/\s+/g, ' ').trim();
    const url = `${WIKI_API}?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=description&format=json&origin=*`;
    const pages = Object.values((await (await fetch(url)).json()).query?.pages || {}).sort((a, b) => a.index - b.index);
    const thisYear = new Date().getFullYear();
    const recent = new RegExp(`upcoming|${thisYear}|${thisYear + 1}`, 'i');
    return pages
        .filter(p => /film|movie/i.test(p.description || '') && !/^list of/i.test(p.title))
        .map(p => {
            let score = -p.index * 0.1;
            if (normaliseTitle(p.title) === normaliseTitle(title)) score += 3;
            const text = `${p.title} ${p.description}`;
            if (year && text.includes(String(year))) score += 2;
            if (!year && recent.test(text)) score += 1; // watchlists are mostly new films
            return { title: p.title, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(p => p.title);
}

async function findFilmOnWikipedia(title, year, letterboxdUrl) {
    try {
        const slug = letterboxdSlug(letterboxdUrl);
        if (slug) {
            const exact = await wikipediaTitleForLetterboxd(slug);
            const found = exact && await filmFromWikipediaPage(exact);
            if (found) return { ...found, letterboxdUrl: found.letterboxdUrl || `https://letterboxd.com/film/${slug}/` };
            // Not linked on Wikidata yet: search using the words in the link
            if (!title) title = slug.replace(/-\d{4}$/, '').replace(/-/g, ' ');
        }
        if (!title) return null;
        for (const pageTitle of (await searchWikipediaFilms(title, year)).slice(0, 3)) {
            const found = await filmFromWikipediaPage(pageTitle);
            if (found) return found;
        }
    } catch (err) { /* offline or blocked: caller shows a message */ }
    return null;
}

async function runFindPoster() {
    const title = pinTitleInput.value.trim();
    const link = pinFilmLetterboxd.value.trim();
    if (!title && !link) {
        pinFilmPosterStatus.textContent = 'Add the film title or its Letterboxd link first';
        return;
    }
    pinFilmPosterStatus.textContent = 'Looking…';
    const found = await findFilmOnWikipedia(title, pinFilmYear.value.trim(), link);
    if (!found) {
        pinFilmPosterStatus.textContent = /boxd\.it/i.test(link)
            ? 'Short boxd.it links can\'t be read. Open it and paste the full letterboxd.com/film/… link, or check the title.'
            : 'No poster found. Check the title (or add the year), or paste a poster link.';
        return;
    }
    pinFilmPoster.value = found.poster;
    if (found.title) pinTitleInput.value = found.title;
    if (found.year && (!pinFilmYear.value || letterboxdSlug(link))) pinFilmYear.value = found.year;
    if (found.letterboxdUrl && (!link || /boxd\.it/i.test(link))) pinFilmLetterboxd.value = found.letterboxdUrl;
    pinFilmPosterStatus.innerHTML = `<img class="poster-preview" src="${safeUrl(found.poster)}" alt="Poster"> Found ${escapeHtml(found.title)}${found.year ? ` (${escapeHtml(found.year)})` : ''}. Tap Save Changes`;
}

pinFilmFindPoster.addEventListener('click', runFindPoster);

// Pasting a Letterboxd link fills in the poster straight away
pinFilmLetterboxd.addEventListener('change', () => {
    if (letterboxdSlug(pinFilmLetterboxd.value) && !pinFilmPoster.value.trim()) runFindPoster();
});
let currentFoodLocation = null;

function renderTicketPreview() {
    const src = safeUrl(currentTicketImage);
    pinTicketPreview.innerHTML = src ? `<img src="${src}" alt="Ticket stub">` : '';
    pinTicketPreview.classList.toggle('hidden', !src);
    pinTicketRemove.classList.toggle('hidden', !src);
    pinTicketTrigger.textContent = src ? 'Replace ticket photo' : 'Add ticket photo';
}

pinTicketTrigger.addEventListener('click', () => pinTicketInput.click());
// Keeps the ticket's proportions and enough detail for the QR code to scan at the cinema
function loadTicketImage(file, onDone, onError) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        onDone(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        onError();
    };
    img.src = url;
}

pinTicketInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    pinTicketInput.value = '';
    if (!file) return;
    pinTicketTrigger.textContent = 'Loading ticket…';
    loadTicketImage(file, (dataUrl) => {
        currentTicketImage = dataUrl;
        renderTicketPreview();
        pinTicketTrigger.textContent = 'Ticket added. Tap Save Changes';
    }, () => {
        renderTicketPreview();
        alert('That photo couldn\'t be read here (often an iPhone HEIC photo on a computer). Try a screenshot of the ticket, or a JPG/PNG.');
    });
});
pinTicketRemove.addEventListener('click', () => {
    currentTicketImage = '';
    renderTicketPreview();
});

function renderLocateStatus(text) {
    pinFoodLocateStatus.textContent = text || (currentFoodLocation
        ? `On the map (${currentFoodLocation.lat.toFixed(4)}, ${currentFoodLocation.lng.toFixed(4)})`
        : 'Not on the map yet');
    pinFoodUnlocateBtn.classList.toggle('hidden', !currentFoodLocation);
}

// Google Maps links that include coordinates (long links, not maps.app.goo.gl short links)
function coordsFromMapLink(link) {
    const m = String(link || '').match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
        || String(link || '').match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
        || String(link || '').match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}

pinFoodLocateBtn.addEventListener('click', async () => {
    const fromLink = coordsFromMapLink(pinFoodMap.value);
    if (fromLink) {
        currentFoodLocation = fromLink;
        renderLocateStatus();
        return;
    }
    const place = pinFoodPlace.value.trim() || pinTitleInput.value.trim();
    if (!place) {
        renderLocateStatus('Type the place name first');
        return;
    }
    renderLocateStatus('Searching…');
    try {
        const query = /johannesburg|joburg|gauteng|pretoria|durban|cape town|south africa/i.test(place) ? place : `${place}, Gauteng`;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=za&q=${encodeURIComponent(query)}`, {
            headers: { 'Accept-Language': 'en' }
        });
        const [hit] = await res.json();
        if (!hit) {
            renderLocateStatus('Couldn\'t find it. Try adding the suburb, e.g. "Miyako Sushi, Rosebank"');
            return;
        }
        currentFoodLocation = { lat: Number(hit.lat), lng: Number(hit.lon) };
        renderLocateStatus(`Found: ${hit.display_name.split(',').slice(0, 3).join(',')}`);
        pinFoodUnlocateBtn.classList.remove('hidden');
    } catch (err) {
        renderLocateStatus('Map search failed. Check your connection and try again.');
    }
});
pinFoodUnlocateBtn.addEventListener('click', () => {
    currentFoodLocation = null;
    renderLocateStatus();
});

function toggleCategoryFields() {
    pinFilmFields.classList.toggle('hidden', pinCategoryInput.value !== 'film');
    pinFoodFields.classList.toggle('hidden', pinCategoryInput.value !== 'food');
}
pinCategoryInput.addEventListener('change', toggleCategoryFields);

pinPhotoTriggerBtn.addEventListener('click', () => pinPhotoInput.click());

pinPhotoInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
        compressImage(file, (base64) => {
            currentPinImages.push(base64);
            renderModalPhotoPreviews();
        });
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
    pinCategoryInput.value = pin.category || 'adventure';
    pinFilmYear.value = pin.filmYear || '';
    pinFilmLetterboxd.value = pin.letterboxdUrl || '';
    pinFilmPoster.value = pin.posterUrl || '';
    pinFoodPlace.value = pin.foodPlace || '';
    pinFoodDish.value = pin.foodDish || '';
    pinFoodPrice.value = pin.foodPrice || '';
    pinFoodMap.value = pin.mapUrl || '';
    currentTicketImage = pin.ticketImage || '';
    renderTicketPreview();
    pinFilmShowDate.value = pin.showDate || '';
    pinFilmCustomTitle.value = pin.customTitle || '';
    pinFilmShowTime.value = pin.showTime || '';
    pinFilmPosterStatus.textContent = '';
    currentFoodLocation = pin.lat !== null && pin.lng !== null ? { lat: pin.lat, lng: pin.lng } : null;
    renderLocateStatus();
    toggleCategoryFields();
    pinAlbumUrlInput.value = pin.albumUrl || DEFAULT_ALBUM_URL;
    pinReviewInput.value = pin.review || '';
    
    pinNikRatingValue.dataset.original = pin.nikScore !== null ? String(pin.nikScore) : 'null';
    pinLeiRatingValue.dataset.original = pin.leiScore !== null ? String(pin.leiScore) : 'null';
    
    pinNikRatingInput.value = pin.nikScore !== null ? pin.nikScore : 5.0;
    pinLeiRatingInput.value = pin.leiScore !== null ? pin.leiScore : 5.0;
    
    pinNikRatingModified = false;
    pinLeiRatingModified = false;

    currentPinImages = pin.images ? [...pin.images] : (pin.image ? [pin.image] : []);
    renderModalPhotoPreviews();

    pinLikeButton.dataset.liked = pin.liked ? 'true' : 'false';
    pinLikeButton.textContent = pin.liked ? 'Favorited' : 'Favorite';

    updatePinScoreLabels();
    pinModal.classList.remove('hidden');
}

function closePinModal() {
    pinModal.classList.add('hidden');
    activePinId = null;
    currentPinImages = [];
    pinPhotoInput.value = '';
}

document.getElementById('pin-modal-close').addEventListener('click', closePinModal);
document.querySelector('[data-close="true"]').addEventListener('click', closePinModal);

pinLikeButton.addEventListener('click', () => {
    const current = pinLikeButton.dataset.liked === 'true';
    pinLikeButton.dataset.liked = String(!current);
    pinLikeButton.textContent = !current ? 'Favorited' : 'Favorite';
});

pinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = pinBoardEntries.find(p => p.id === activePinId);
    if (!pin) return;

    pin.title = pinTitleInput.value.trim();
    pin.details = pinDetailsInput.value.trim();
    pin.type = pinTypeInput.value;
    pin.albumUrl = pinAlbumUrlInput.value.trim() || DEFAULT_ALBUM_URL;
    pin.tag = pin.type === 'memory' ? 'Latest Memory' : (pin.type === 'event' ? 'Upcoming Event' : 'Next Wishlist Item');
    pin.review = pinReviewInput.value.trim();
    pin.images = currentPinImages;
    pin.category = pinCategoryInput.value;
    pin.filmYear = pinFilmYear.value.trim();
    pin.letterboxdUrl = pinFilmLetterboxd.value.trim();
    pin.posterUrl = pinFilmPoster.value.trim();
    pin.foodPlace = pinFoodPlace.value.trim();
    pin.foodDish = pinFoodDish.value.trim();
    pin.foodPrice = pinFoodPrice.value;
    pin.mapUrl = pinFoodMap.value.trim();
    pin.ticketImage = currentTicketImage;
    pin.showDate = pinFilmShowDate.value;
    pin.customTitle = pinFilmCustomTitle.value.trim();
    if (pin.category === 'film' && (!pin.posterUrl || !pin.letterboxdUrl || !pin.filmYear)) {
        pin.filmLookupDone = false;
        autoFillFilm(pin).then(changed => {
            if (changed) {
                savePins();
                renderPins();
                renderReviews();
            }
        });
    }
    pin.showTime = pinFilmShowTime.value;
    pin.lat = currentFoodLocation ? currentFoodLocation.lat : null;
    pin.lng = currentFoodLocation ? currentFoodLocation.lng : null;

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
    if (pin.review || (pin.images && pin.images.length) || pin.rating !== null || pin.type === 'memory') {
        pin.completed = true;
    }

    savePins();
    renderPins();
    renderReviews();
    closePinModal();

});

pinRemoveButton.addEventListener('click', () => {
    if (!activePinId) return;
    if (confirm('Remove this adventure from the pin board?')) {
        const removed = pinBoardEntries.find(p => p.id === activePinId);
        if (removed && removed.letterboxdKey) {
            // Remember it, so the Letterboxd sync doesn't bring it back
            letterboxdDismissedRef.child(removed.letterboxdKey).set(true).catch(() => {});
        }
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
const newPinAlbum = document.getElementById('new-pin-album');
const newPinCategory = document.getElementById('new-pin-category');
const addPinModalTitle = document.getElementById('add-pin-modal-title');

function openAddPinModal(category = 'adventure') {
    newPinCategory.value = category;
    addPinModalTitle.textContent = `Create a new ${CATEGORY_LABELS[category]}`;
    addPinModal.classList.remove('hidden');
}
newPinCategory.addEventListener('change', () => {
    addPinModalTitle.textContent = `Create a new ${CATEGORY_LABELS[newPinCategory.value]}`;
});

document.getElementById('add-pin-btn').addEventListener('click', () => openAddPinModal('adventure'));
document.querySelectorAll('.add-category-btn').forEach(btn => {
    btn.addEventListener('click', () => openAddPinModal(btn.dataset.category));
});
document.getElementById('add-pin-modal-close').addEventListener('click', () => addPinModal.classList.add('hidden'));
document.getElementById('add-pin-cancel').addEventListener('click', () => addPinModal.classList.add('hidden'));
document.querySelector('[data-close-add="true"]').addEventListener('click', () => addPinModal.classList.add('hidden'));

addPinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = newPinTitle.value.trim();
    const details = newPinDetails.value.trim();
    const type = newPinType.value;
    const albumUrl = (newPinAlbum?.value || '').trim() || DEFAULT_ALBUM_URL;
    const category = newPinCategory.value;
    if (!title || !details) return;

    const newId = `pin-${Date.now()}`;
    pinBoardEntries.unshift(normalizePin({
        id: newId,
        category,
        title,
        details,
        albumUrl,
        tag: type === 'memory' ? 'Latest Memory' : (type === 'event' ? 'Upcoming Event' : 'Next Wishlist Item'),
        type,
        completed: type === 'memory',
        review: '',
        images: [],
        nikScore: null,
        leiScore: null,
        rating: null,
        liked: false
    }));

    savePins();
    renderPins();
    renderReviews();
    addPinForm.reset();
    addPinModal.classList.add('hidden');
    // Films and food have extra details (poster, place...), so open the full editor straight away
    if (category === 'film') {
        const pin = pinBoardEntries.find(p => p.id === newId);
        autoFillFilm(pin).then(changed => {
            if (changed) {
                savePins();
                renderPins();
                renderReviews();
            }
            openPinModal(newId);
            pinFilmPosterStatus.textContent = pin.posterUrl
                ? `Found ${pin.title}${pin.filmYear ? ` (${pin.filmYear})` : ''}. Wrong film? Fix the title or year and tap Find poster.`
                : 'Couldn\'t find this film automatically. Check the title and tap Find poster.';
        });
    } else if (category !== 'adventure') {
        openPinModal(newId);
    }
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
                    <p style="font-size: 13px; color: #666666;">${act.date} at ${act.time}</p>
                    <div style="font-size: 12px; margin-top: 6px; color: #444444;">
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

        document.querySelectorAll('.main-content > .page-content').forEach(page => {
            page.classList.toggle('hidden', page.id !== btn.dataset.page);
        });
        if (btn.dataset.page !== 'list-page') renderReviews();
        if (btn.dataset.page === 'food-page') setTimeout(renderFoodMap, 0);
    });
});

// --- Auth UI & State Listener ---
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorText = document.getElementById('login-error');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
const addPinButton = document.getElementById('add-pin-btn');
const authPrompt = document.getElementById('auth-prompt');
const ACCOUNT_ALIASES = {
    'ramharakhnikeel@gmail.com': { name: 'Nik', theme: 'nik-theme' },
    'nikeel.ramharakh@gmail.com': { name: 'Nik', theme: 'nik-theme' },
    'nikeelramharakh@gmail.com': { name: 'Nik', theme: 'nik-theme' },
    'leia.singh01@gmail.com': { name: 'Lei', theme: 'lei-theme' },
    'leiasingh01@gmail.com': { name: 'Lei', theme: 'lei-theme' }
};
let databaseListenersAttached = false;
const authPersistenceReady = auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginErrorText.textContent = '';
        loginErrorText.hidden = true;
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'Signing in...';

        try {
            await authPersistenceReady;
            await auth.signInWithEmailAndPassword(
                loginEmailInput.value.trim(),
                loginPasswordInput.value
            );
            loginForm.reset();
        } catch (error) {
            console.error('Email/password sign-in failed:', error);
            loginErrorText.textContent = error.message || 'Unable to sign in. Check your email and password.';
            loginErrorText.hidden = false;
        } finally {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = 'Sign In';
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut().catch((error) => {
            alert('Sign-out error: ' + error.message);
        });
    });
}

authPersistenceReady.then(() => auth.onAuthStateChanged((user) => {
    if (user) {
        console.info('Firebase Auth signed in:', user.email || user.uid);
        const account = ACCOUNT_ALIASES[(user.email || '').trim().toLowerCase()];
        isAuthorized = true;
        if (userDisplay) {
            userDisplay.textContent = account ? account.name : (user.displayName || user.email);
            userDisplay.classList.remove('nik-theme', 'lei-theme');
            if (account) userDisplay.classList.add(account.theme);
            userDisplay.style.display = 'inline-block';
        }
        if (addPinButton) {
            addPinButton.classList.remove('nik-theme', 'lei-theme');
            if (account) addPinButton.classList.add(account.theme);
        }
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (authPrompt) authPrompt.classList.add('hidden');

        attachDatabaseListeners();
    } else {
        isAuthorized = false;
        if (userDisplay) {
            userDisplay.style.display = 'none';
            userDisplay.classList.remove('nik-theme', 'lei-theme');
        }
        if (addPinButton) addPinButton.classList.remove('nik-theme', 'lei-theme');
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (authPrompt) authPrompt.classList.remove('hidden');
        pinsSyncReady = false;
        activitiesSyncReady = false;
        detachDatabaseListeners();
        console.info('No Firebase Auth user is signed in.');
    }
}, (error) => {
    console.error('Firebase Auth state error:', error);
})).catch((error) => {
    console.error('Unable to enable persistent Firebase Auth sessions:', error);
    if (authPrompt) authPrompt.classList.remove('hidden');
    alert('Unable to initialize sign-in: ' + error.message);
});

function attachDatabaseListeners() {
    if (databaseListenersAttached) return;
    databaseListenersAttached = true;
    pinsRef.on('value', handleRemotePins, (error) => {
        console.error('Unable to read pin board data:', error);
    });
    activitiesRef.on('value', handleRemoteActivities, (error) => {
        console.error('Unable to read activity data:', error);
    });
}

function detachDatabaseListeners() {
    if (!databaseListenersAttached) return;
    pinsRef.off('value', handleRemotePins);
    activitiesRef.off('value', handleRemoteActivities);
    databaseListenersAttached = false;
}

// --- Letterboxd sync ---
// A GitHub Action saves both diary feeds to data/letterboxd.json every few hours.
// When Nik and Lei both log the same film within a week, it becomes one BubFilm pin.
const LETTERBOXD_MATCH_DAYS = 7;
let letterboxdImportStarted = false;

function letterboxdFilmKey(entry) {
    const base = entry.tmdbId || `${entry.filmTitle}-${entry.filmYear}`;
    return String(base).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

function groupLetterboxdWatches(entries) {
    const byFilm = new Map();
    [...entries]
        .sort((a, b) => a.watchedDate.localeCompare(b.watchedDate))
        .forEach(entry => {
            const filmKey = letterboxdFilmKey(entry);
            const watches = byFilm.get(filmKey) || [];
            let watch = watches[watches.length - 1];
            const daysApart = watch
                ? (new Date(entry.watchedDate) - new Date(watch.date)) / 86400000
                : Infinity;
            if (!watch || daysApart > LETTERBOXD_MATCH_DAYS) {
                watch = { key: `${filmKey}-${entry.watchedDate}`, date: entry.watchedDate, film: entry, nik: null, lei: null };
                watches.push(watch);
            }
            if (entry.who === 'nik' || entry.who === 'lei') watch[entry.who] = entry;
            byFilm.set(filmKey, watches);
        });
    return [...byFilm.values()].flat();
}

async function importLetterboxd() {
    if (letterboxdImportStarted || !isAuthorized || !pinsSyncReady) return;
    letterboxdImportStarted = true;

    let entries = [];
    try {
        const res = await fetch('data/letterboxd.json', { cache: 'no-store' });
        if (!res.ok) return;
        entries = (await res.json()).entries || [];
    } catch (e) {
        return;
    }
    if (!entries.length) return;

    let dismissed = {};
    try {
        dismissed = (await letterboxdDismissedRef.once('value')).val() || {};
    } catch (e) { /* carry on without it */ }

    let changed = false;
    groupLetterboxdWatches(entries).forEach(watch => {
        if (!watch.nik || !watch.lei || dismissed[watch.key]) return;

        let pin = pinBoardEntries.find(p => p.letterboxdKey === watch.key);
        if (!pin) {
            // A film we already added by hand: link it rather than making a duplicate
            const sameTitle = t => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            pin = pinBoardEntries.find(p => !p.letterboxdKey
                && (p.category === 'film' || p.type === 'memory')
                && sameTitle(p.title) === sameTitle(watch.nik.filmTitle));
            if (pin) {
                const film = watch.nik.poster ? watch.nik : watch.lei;
                pin.letterboxdKey = watch.key;
                pin.category = 'film';
                if (!pin.posterUrl) pin.posterUrl = film.poster;
                if (!pin.letterboxdUrl) pin.letterboxdUrl = film.filmUrl;
                if (!pin.filmYear) pin.filmYear = film.filmYear;
                changed = true;
            }
        }
        if (!pin) {
            const film = watch.nik.poster ? watch.nik : watch.lei;
            const watched = new Date(`${watch.date}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
            pin = normalizePin({
                id: `pin-lb-${watch.key}`,
                letterboxdKey: watch.key,
                category: 'film',
                type: 'memory',
                completed: true,
                title: film.filmTitle,
                details: `Movie date · ${watched}`,
                filmYear: film.filmYear,
                posterUrl: film.poster,
                letterboxdUrl: film.filmUrl,
                liked: watch.nik.liked && watch.lei.liked
            });
            pinBoardEntries.unshift(pin);
            changed = true;
        }

        // Only fill what's still empty, so edits made in BubWeb always win
        if (pin.nikScore === null && watch.nik.rating) { pin.nikScore = watch.nik.rating * 2; changed = true; }
        if (pin.leiScore === null && watch.lei.rating) { pin.leiScore = watch.lei.rating * 2; changed = true; }
        if (!pin.review) {
            const review = [
                watch.nik.review ? `Nik: ${watch.nik.review}` : '',
                watch.lei.review ? `Lei: ${watch.lei.review}` : ''
            ].filter(Boolean).join('\n\n');
            if (review) { pin.review = review; changed = true; }
        }
        Object.assign(pin, normalizePin(pin));
    });

    if (changed) {
        savePins();
        renderPins();
        renderReviews();
    }
}

function handleRemotePins(snap) {
    const data = snap.val();
    if (!data) {
        pinsSyncReady = true;
        if (isAuthorized && pinBoardEntries.length) {
            isApplyingRemotePins = true;
            pinsRef.set(pinBoardEntries).catch((error) => {
                console.error('Could not initialize pin board in Firebase:', error);
                alert('Firebase could not initialize the shared pin board. Check the database rules and connection.');
            }).finally(() => {
                isApplyingRemotePins = false;
            });
        }
        return;
    }
    isApplyingRemotePins = true;
    try {
        pinBoardEntries = (Array.isArray(data) ? data : Object.values(data)).map(normalizePin);
        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinBoardEntries));
        pinsSyncReady = true;
        renderPins();
        renderReviews();
    } finally {
        isApplyingRemotePins = false;
    }
    importLetterboxd();
    autoFillMissingFilms();
}

function handleRemoteActivities(snap) {
    const data = snap.val();
    if (!data) {
        activitiesSyncReady = true;
        if (isAuthorized) {
            isApplyingRemoteActivities = true;
            activitiesRef.set(activities).catch((error) => {
                console.error('Could not initialize activities in Firebase:', error);
                alert('Firebase could not initialize the shared activity list. Check the database rules and connection.');
            }).finally(() => {
                isApplyingRemoteActivities = false;
            });
        }
        return;
    }
    isApplyingRemoteActivities = true;
    try {
        activities = Array.isArray(data) ? data : Object.values(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
        activitiesSyncReady = true;
        renderActivities();
    } finally {
        isApplyingRemoteActivities = false;
    }
}

function setWeatherTheme(theme) {
    document.body.classList.remove('theme-day', 'theme-rain', 'theme-night', 'theme-afternoon');
    document.body.classList.add(`theme-${theme}`);
}

async function syncWeatherTheme() {
    try {
        // Coordinates set for Johannesburg (change if needed)
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=-26.2041&longitude=28.0473&current=weather_code,is_day,wind_speed_10m';
        const res = await fetch(url);
        const { current } = await res.json();

        const hour = new Date().getHours();
        const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(current.weather_code);

        if (current.is_day === 0) {
            setWeatherTheme('night');
        } else if (isRain) {
            setWeatherTheme('rain');
        } else if (hour >= 15 && hour < 19 || current.wind_speed_10m > 20) {
            setWeatherTheme('afternoon');
        } else {
            setWeatherTheme('day');
        }
    } catch (e) {
        setWeatherTheme('night'); // Safe fallback
    }
}
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyAutoTheme() {
    if (darkModeQuery.matches) {
        // Device/browser is in dark mode -> force your custom night palette
        setWeatherTheme('night');
    } else {
        // Device/browser is in light mode -> let live weather & time decide
        syncWeatherTheme();
    }
}

// Automatically switch if you toggle dark mode while the page is open
darkModeQuery.addEventListener('change', applyAutoTheme);

// Run on page load
applyAutoTheme();


renderPins();
renderActivities();
renderCategoryPages();
renderReviews();