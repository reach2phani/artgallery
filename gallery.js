// ============================================
//  DEVANSHI'S ART GALLERY — gallery.js v3
//  Gallery + Reactions + Comments
// ============================================

// ── YOUR KEYS ──
const SUPABASE_URL      = 'ADD_YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'ADD_YOUR_SUPABASE_ANON_KEY_HERE';

const TABLE    = 'drawings';
const STRIPES  = ['pink','yellow','purple','teal','orange','green'];

// Store all drawings so cards can reference by index
let drawings = [];

// Rotating confidence booster messages shown in modal
const BOOSTS = [
  '🌟 Wow, this is truly incredible artwork!',
  '🎨 You have the eye of a real artist, Devanshi!',
  '💫 This drawing made everyone smile today!',
  '🏆 Museum-worthy! This belongs in a gallery!',
  '🌈 Your colours are absolutely magical!',
  '✨ Every detail shows how talented you are!',
  '🦋 This is breathtakingly beautiful!',
  '🎉 You should be SO proud of this masterpiece!',
];

// Track which drawing is open in the modal
let activeDrawing = null;

// ── Boot ──
document.addEventListener('DOMContentLoaded', loadGallery);

// ============================================
//  LOAD GALLERY
// ============================================
async function loadGallery() {
  const grid    = document.getElementById('gallery-grid');
  const loading = document.getElementById('loading');
  const empty   = document.getElementById('empty-state');
  const errEl   = document.getElementById('error-state');
  const errTxt  = document.getElementById('error-detail');
  const count   = document.getElementById('drawing-count');
  const reactEl = document.getElementById('total-reactions');

  if (SUPABASE_URL.includes('ADD_YOUR')) {
    loading.style.display = 'none';
    errEl.style.display   = 'block';
    errTxt.textContent    = 'Add your Supabase keys to gallery.js first!';
    return;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?order=created_at.desc&select=*`,
      {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) throw new Error(`Supabase ${res.status}`);

    const data = await res.json();
    drawings = data;
    loading.style.display = 'none';

    if (!drawings.length) { empty.style.display = 'block'; count.textContent = '0'; return; }

    // Total reactions across all drawings
    let totalR = 0;
    drawings.forEach(d => {
      const r = d.reactions || {};
      totalR += (r.heart||0) + (r.clap||0) + (r.star||0) + (r.fire||0);
    });
    count.textContent   = drawings.length;
    reactEl.textContent = totalR || '0';

    grid.style.display = 'grid';
    drawings.forEach((d, i) => grid.appendChild(buildCard(d, i)));

  } catch (err) {
    console.error(err);
    loading.style.display = 'none';
    errEl.style.display   = 'block';
    errTxt.textContent    = err.name === 'TimeoutError' ? 'Request timed out.' : err.message;
  }
}

// ============================================
//  BUILD CARD
// ============================================
function buildCard(drawing, index) {
  const stripe = STRIPES[index % STRIPES.length];
  const date   = new Date(drawing.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const r      = drawing.reactions || { heart:0, clap:0, star:0, fire:0 };

  const card = document.createElement('article');
  card.className = `drawing-card stripe-${stripe}`;

  card.innerHTML = `
    <div class="card-img-wrap" onclick="openModal(drawings[${index}])">
      <img src="${safe(drawing.image_url)}" alt="${safe(drawing.title)}" loading="lazy"
        onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px;\\'>🖼️</div>'"/>
    </div>
    <div class="card-body" onclick="openModal(drawings[${index}])">
      <div class="card-title">${safe(drawing.title)}</div>
      <div class="card-footer">
        ${drawing.artist_name ? `<span class="card-artist">✏️ ${safe(drawing.artist_name)}</span>` : '<span></span>'}
        <span class="card-date">${date}</span>
      </div>
    </div>
    <div class="card-reactions">
      <button class="card-react-btn" id="card-heart-${drawing.id}" onclick="cardReact(event, ${index}, 'heart')">
        <span class="card-react-emoji">❤️</span>
        <span class="card-react-count" id="card-count-heart-${drawing.id}">${r.heart||0}</span>
      </button>
      <button class="card-react-btn" id="card-clap-${drawing.id}" onclick="cardReact(event, ${index}, 'clap')">
        <span class="card-react-emoji">👏</span>
        <span class="card-react-count" id="card-count-clap-${drawing.id}">${r.clap||0}</span>
      </button>
      <button class="card-react-btn" id="card-star-${drawing.id}" onclick="cardReact(event, ${index}, 'star')">
        <span class="card-react-emoji">⭐</span>
        <span class="card-react-count" id="card-count-star-${drawing.id}">${r.star||0}</span>
      </button>
      <button class="card-react-btn" id="card-fire-${drawing.id}" onclick="cardReact(event, ${index}, 'fire')">
        <span class="card-react-emoji">🔥</span>
        <span class="card-react-count" id="card-count-fire-${drawing.id}">${r.fire||0}</span>
      </button>
    </div>
    <div class="card-tag">${index + 1}</div>
  `;
  return card;
}

// ============================================
//  MODAL — open
// ============================================
function openModal(drawing) {
  activeDrawing = drawing;
  const r = drawing.reactions || { heart:0, clap:0, star:0, fire:0 };

  document.getElementById('modal-img').src         = drawing.image_url;
  document.getElementById('modal-title').textContent = drawing.title;
  document.getElementById('modal-date').textContent  = new Date(drawing.created_at)
    .toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  const artist = document.getElementById('modal-artist');
  artist.textContent = drawing.artist_name ? `✏️ ${drawing.artist_name}` : '';

  // Random confidence booster
  document.getElementById('boost-msg').textContent =
    BOOSTS[Math.floor(Math.random() * BOOSTS.length)];

  // Set reaction counts
  document.getElementById('count-heart').textContent = r.heart || 0;
  document.getElementById('count-clap').textContent  = r.clap  || 0;
  document.getElementById('count-star').textContent  = r.star  || 0;
  document.getElementById('count-fire').textContent  = r.fire  || 0;

  // Reset reacted state
  ['heart','clap','star','fire'].forEach(k =>
    document.getElementById(`btn-${k}`).classList.remove('reacted')
  );

  // Load comments
  loadComments(drawing.id);

  document.getElementById('modal-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// Close when clicking outside modal card
function closeModal(e) {
  if (e.target.id === 'modal-overlay') {
    document.getElementById('modal-overlay').style.display = 'none';
    document.body.style.overflow = '';
  }
}

// ============================================
//  CARD REACT — react directly from grid
//  (stops click propagating to open modal)
// ============================================
async function cardReact(event, drawingIndex, type) {
  event.stopPropagation(); // don't open modal
  const drawing = drawings[drawingIndex];
  if (!drawing) return;

  const btn      = document.getElementById(`card-${type}-${drawing.id}`);
  const countEl  = document.getElementById(`card-count-${type}-${drawing.id}`);
  const alreadyReacted = btn.classList.contains('reacted');
  const delta    = alreadyReacted ? -1 : 1;

  // Optimistic UI
  btn.classList.toggle('reacted', !alreadyReacted);
  const newCount = Math.max(0, parseInt(countEl.textContent) + delta);
  countEl.textContent = newCount;

  // Animate
  const emoji = btn.querySelector('.card-react-emoji');
  emoji.style.transform = 'scale(1.5)';
  setTimeout(() => emoji.style.transform = '', 250);

  // Save to Supabase
  try {
    const current = drawing.reactions || { heart:0, clap:0, star:0, fire:0 };
    current[type] = Math.max(0, (current[type] || 0) + delta);
    drawing.reactions = current;

    await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${drawing.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ reactions: current }),
    });

    // Update total reactions in stats bar
    let totalR = 0;
    drawings.forEach(d => {
      const r = d.reactions || {};
      totalR += (r.heart||0)+(r.clap||0)+(r.star||0)+(r.fire||0);
    });
    document.getElementById('total-reactions').textContent = totalR;

  } catch(err) {
    console.error('Card react failed:', err);
    btn.classList.toggle('reacted', alreadyReacted);
    countEl.textContent = parseInt(countEl.textContent) - delta;
  }
}

// ============================================
//  MODAL REACTIONS — react from inside modal
// ============================================
async function react(type) {
  if (!activeDrawing) return;

  const btn = document.getElementById(`btn-${type}`);
  const countEl = document.getElementById(`count-${type}`);

  // Toggle: if already reacted, undo
  const alreadyReacted = btn.classList.contains('reacted');
  const delta = alreadyReacted ? -1 : 1;

  // Optimistic UI update
  btn.classList.toggle('reacted', !alreadyReacted);
  const newCount = Math.max(0, parseInt(countEl.textContent) + delta);
  countEl.textContent = newCount;

  // Animate emoji
  const emoji = btn.querySelector('.reaction-emoji');
  emoji.style.transform = 'scale(1.6)';
  setTimeout(() => emoji.style.transform = '', 300);

  // Update in Supabase
  try {
    const current = activeDrawing.reactions || { heart:0, clap:0, star:0, fire:0 };
    current[type] = Math.max(0, (current[type] || 0) + delta);
    activeDrawing.reactions = current;

    await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${activeDrawing.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ reactions: current }),
    });

    // Refresh total reactions in stats bar
    const reactEl = document.getElementById('total-reactions');
    const r = activeDrawing.reactions;
    const total = (r.heart||0)+(r.clap||0)+(r.star||0)+(r.fire||0);
    reactEl.textContent = total;

  } catch(err) {
    console.error('Reaction save failed:', err);
    // Rollback UI
    btn.classList.toggle('reacted', alreadyReacted);
    countEl.textContent = parseInt(countEl.textContent) - delta;
  }
}

// ============================================
//  COMMENTS — load
// ============================================
async function loadComments(drawingId) {
  const list = document.getElementById('comments-list');
  list.innerHTML = '<p class="no-comments">Loading messages...</p>';

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/comments?drawing_id=eq.${drawingId}&order=created_at.asc`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );

    if (!res.ok) throw new Error('Could not load comments');
    const comments = await res.json();

    if (!comments.length) {
      list.innerHTML = '<p class="no-comments">No messages yet — be the first! 🌟</p>';
      return;
    }

    list.innerHTML = comments.map(c => `
      <div class="comment-bubble">
        <div class="comment-name">${safe(c.author_name)}</div>
        <div class="comment-text">${safe(c.message)}</div>
        <div class="comment-time">${new Date(c.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
      </div>
    `).join('');

  } catch(err) {
    list.innerHTML = '<p class="no-comments">Could not load messages. Make sure the comments table exists!</p>';
  }
}

// ============================================
//  COMMENTS — submit
// ============================================
async function submitComment() {
  if (!activeDrawing) return;

  const name    = sanitize(document.getElementById('comment-name').value.trim());
  const message = sanitize(document.getElementById('comment-text').value.trim());
  const btn     = document.querySelector('.btn-comment');

  if (!name)    { alert('Please enter your name! 😊'); return; }
  if (!message) { alert('Please write a message! 💬'); return; }

  btn.disabled     = true;
  btn.textContent  = 'Sending... 💌';

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ drawing_id: activeDrawing.id, author_name: name, message }),
    });

    if (!res.ok) throw new Error('Could not save comment');

    // Clear form
    document.getElementById('comment-name').value = '';
    document.getElementById('comment-text').value = '';

    // Reload comments
    await loadComments(activeDrawing.id);

  } catch(err) {
    alert('Could not send message: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Send message 💌';
  }
}

// ============================================
//  HELPERS
// ============================================
function safe(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

function sanitize(str) { return str.replace(/<[^>]*>/g,'').trim(); }
