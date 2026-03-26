// ============================================
//  DEVANSHI'S ART GALLERY — gallery.js v2
//  Loads drawings from Supabase
//  Security: read-only anon key, RLS enforced
// ============================================

// ─────────────────────────────────────────────
//  🔑 YOUR KEYS — fill these in
//  These are READ-ONLY public keys. Safe to
//  put in frontend JS. Supabase RLS policies
//  ensure nobody can write via these keys.
// ─────────────────────────────────────────────
const SUPABASE_URL     = 'https://uckmsrzxdgrgbrzfyjlo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CHAdpej3qa2VCrvEHhJb3A_vtswSy2a';

const TABLE   = 'drawings';
const STRIPES = ['pink','yellow','purple','teal','orange','green'];

// ─────────────────────────────────────────────
//  Boot
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadGallery);

async function loadGallery() {
  const grid    = document.getElementById('gallery-grid');
  const loading = document.getElementById('loading');
  const empty   = document.getElementById('empty-state');
  const errEl   = document.getElementById('error-state');
  const errText = document.getElementById('error-detail');
  const count   = document.getElementById('drawing-count');

  // ── Guard: keys not yet configured ──
  if (SUPABASE_URL.includes('ADD_YOUR')) {
    loading.style.display = 'none';
    errEl.style.display   = 'block';
    errText.textContent   = 'Add your Supabase keys to gallery.js first!';
    return;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?order=created_at.desc&select=*`,
      {
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        // Abort after 10 seconds
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase returned ${res.status}: ${body}`);
    }

    const drawings = await res.json();

    loading.style.display = 'none';

    if (!drawings.length) {
      empty.style.display = 'block';
      count.textContent   = '0';
      return;
    }

    // Update stats bar count
    count.textContent = drawings.length;

    // Build grid
    grid.style.display = 'grid';
    drawings.forEach((d, i) => grid.appendChild(buildCard(d, i)));

  } catch (err) {
    console.error('Gallery load error:', err);
    loading.style.display = 'none';
    errEl.style.display   = 'block';
    if (err.name === 'TimeoutError') {
      errText.textContent = 'Request timed out — check your internet connection.';
    } else {
      errText.textContent = err.message;
    }
  }
}

// ─────────────────────────────────────────────
//  Build a card DOM element
// ─────────────────────────────────────────────
function buildCard(drawing, index) {
  const stripe = STRIPES[index % STRIPES.length];
  const date   = new Date(drawing.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const card = document.createElement('article');
  card.className = `drawing-card stripe-${stripe}`;

  // Small gallery-style number tag
  const tagNum = index + 1;

  card.innerHTML = `
    <div class="card-img-wrap">
      <img
        src="${safe(drawing.image_url)}"
        alt="${safe(drawing.title)}"
        loading="lazy"
        onerror="this.parentElement.innerHTML='<div style=\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px;color:#ccc;\'>🖼️</div>'"
      />
    </div>
    <div class="card-body">
      <div class="card-title">${safe(drawing.title)}</div>
      <div class="card-footer">
        ${drawing.artist_name
          ? `<span class="card-artist">✏️ ${safe(drawing.artist_name)}</span>`
          : '<span></span>'}
        <span class="card-date">${date}</span>
      </div>
    </div>
    <div class="card-tag">${tagNum}</div>
  `;

  return card;
}

// ─────────────────────────────────────────────
//  Escape HTML — prevents XSS
// ─────────────────────────────────────────────
function safe(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;');
}
