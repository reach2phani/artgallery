// ============================================
//  DEVANSHI'S ART GALLERY — upload.js v2
//
//  SECURITY LAYERS:
//  1. Password gate — only family can see form
//  2. File type validation (client + Cloudinary)
//  3. File size limit (10 MB)
//  4. XSS prevention on all text inputs
//  5. Rate limiting — max 5 uploads / 10 min
//  6. Supabase RLS — DB enforces insert policy
// ============================================

// ─────────────────────────────────────────────
//  🔑 YOUR KEYS — fill these in
// ─────────────────────────────────────────────
const SUPABASE_URL      = 'https://supabase.com/dashboard/project/uckmsrzxdgrgbrzfyjlo';
const SUPABASE_ANON_KEY = 'sb_publishable_CHAdpej3qa2VCrvEHhJb3A_vtswSy2a';

const CLOUDINARY_CLOUD_NAME    = 'dyjhmbfk2';
const CLOUDINARY_UPLOAD_PRESET = 'Art Gallery';

// ─────────────────────────────────────────────
//  🔐 UPLOAD PASSWORD
//  Change this to whatever you want!
//  Keep it simple — something your family
//  can remember. e.g. 'devanshi2024'
// ─────────────────────────────────────────────
const UPLOAD_PASSWORD = 'devanshi2016';

// ─────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────
const TABLE        = 'drawings';
const MAX_MB       = 10;
const MAX_BYTES    = MAX_MB * 1024 * 1024;
const ALLOWED_TYPES= ['image/jpeg','image/png','image/gif','image/webp'];
const RATE_KEY     = 'dg_upload_log';  // sessionStorage key
const RATE_LIMIT   = 5;               // max uploads
const RATE_WINDOW  = 10 * 60 * 1000;  // per 10 minutes

// ─────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────
let selectedFile = null;

// ─────────────────────────────────────────────
//  Init
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupDropZone();

  // Allow Enter key on password input
  document.getElementById('gate-password')
    .addEventListener('keydown', e => { if (e.key === 'Enter') checkPassword(); });
});

// ─────────────────────────────────────────────
//  PASSWORD GATE
// ─────────────────────────────────────────────
function checkPassword() {
  const val     = document.getElementById('gate-password').value;
  const errEl   = document.getElementById('gate-error');

  if (!UPLOAD_PASSWORD || UPLOAD_PASSWORD === 'ADD_YOUR_PASSWORD_HERE') {
    // Dev mode: password not set yet, let through with a warning
    console.warn('Set UPLOAD_PASSWORD in upload.js before going live!');
    showUploadSection();
    return;
  }

  if (val === UPLOAD_PASSWORD) {
    errEl.style.display = 'none';
    showUploadSection();
  } else {
    errEl.style.display = 'block';
    document.getElementById('gate-password').value = '';
    document.getElementById('gate-password').focus();
  }
}

function showUploadSection() {
  document.getElementById('password-gate').style.display   = 'none';
  document.getElementById('upload-section').style.display  = 'block';
}

// ─────────────────────────────────────────────
//  DROP ZONE
// ─────────────────────────────────────────────
function setupDropZone() {
  const zone  = document.getElementById('drop-zone');
  const input = document.getElementById('file-input');

  input.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

// ─────────────────────────────────────────────
//  FILE VALIDATION
// ─────────────────────────────────────────────
function handleFile(file) {
  // 1. Type check
  if (!ALLOWED_TYPES.includes(file.type)) {
    showUploadError('Only JPG, PNG, GIF or WEBP images are allowed.');
    return;
  }

  // 2. Size check
  if (file.size > MAX_BYTES) {
    showUploadError(`File is ${(file.size/1024/1024).toFixed(1)} MB — max is ${MAX_MB} MB.`);
    return;
  }

  // 3. Double-check extension (belt-and-suspenders)
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['jpg','jpeg','png','gif','webp'].includes(ext)) {
    showUploadError('Unexpected file extension. Please use JPG, PNG, GIF or WEBP.');
    return;
  }

  selectedFile = file;
  hideUploadError();
  showPreview(file);
}

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('image-preview').src = e.target.result;
    document.getElementById('drop-content').style.display  = 'none';
    document.getElementById('preview-wrap').style.display  = 'flex';
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  selectedFile = null;
  document.getElementById('file-input').value        = '';
  document.getElementById('image-preview').src       = '';
  document.getElementById('preview-wrap').style.display  = 'none';
  document.getElementById('drop-content').style.display  = 'block';
}

// ─────────────────────────────────────────────
//  RATE LIMITING (client-side, session-based)
//  Prevents someone from rapidly spamming uploads
// ─────────────────────────────────────────────
function checkRateLimit() {
  const now  = Date.now();
  const raw  = sessionStorage.getItem(RATE_KEY);
  let   log  = raw ? JSON.parse(raw) : [];

  // Remove entries older than the window
  log = log.filter(ts => now - ts < RATE_WINDOW);

  if (log.length >= RATE_LIMIT) {
    const oldest   = log[0];
    const waitMins = Math.ceil((RATE_WINDOW - (now - oldest)) / 60000);
    return { ok: false, waitMins };
  }

  log.push(now);
  sessionStorage.setItem(RATE_KEY, JSON.stringify(log));
  return { ok: true };
}

// ─────────────────────────────────────────────
//  MAIN UPLOAD HANDLER
// ─────────────────────────────────────────────
async function handleUpload() {
  const title      = sanitize(document.getElementById('drawing-title').value.trim());
  const artistName = sanitize(document.getElementById('artist-name').value.trim());
  const btn        = document.getElementById('submit-btn');
  const btnText    = document.getElementById('btn-text');
  const btnLoading = document.getElementById('btn-loading');

  // Validate
  if (!selectedFile) { showUploadError('Please choose a drawing first! 🖼️'); return; }
  if (!title)         { showUploadError('Please give the drawing a title! ✏️'); return; }
  if (title.length > 100) { showUploadError('Title is too long (max 100 characters).'); return; }

  // Rate limit check
  const rate = checkRateLimit();
  if (!rate.ok) {
    showUploadError(`Too many uploads! Please wait ${rate.waitMins} minute(s) and try again.`);
    return;
  }

  // Keys configured?
  if (CLOUDINARY_CLOUD_NAME.includes('ADD_YOUR')) {
    showUploadError('Cloudinary keys not set yet! Check upload.js.');
    return;
  }
  if (SUPABASE_URL.includes('ADD_YOUR')) {
    showUploadError('Supabase keys not set yet! Check upload.js.');
    return;
  }

  hideUploadError();
  btn.disabled           = true;
  btnText.style.display  = 'none';
  btnLoading.style.display = 'inline';

  try {
    // Step 1 — Upload image to Cloudinary
    const imageUrl = await uploadToCloudinary(selectedFile);

    // Step 2 — Save metadata to Supabase
    await saveToSupabase(title, artistName || null, imageUrl);

    // Step 3 — Show success
    document.getElementById('upload-form').style.display = 'none';
    document.getElementById('success-msg').style.display = 'block';

  } catch (err) {
    console.error('Upload error:', err);
    showUploadError('Upload failed: ' + err.message);
    btn.disabled           = false;
    btnText.style.display  = 'inline';
    btnLoading.style.display = 'none';
  }
}

// ─────────────────────────────────────────────
//  CLOUDINARY UPLOAD
// ─────────────────────────────────────────────
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  fd.append('folder', 'devanshi-art-gallery');

  // Restrict what Cloudinary will accept
  fd.append('allowed_formats', 'jpg,png,gif,webp');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Cloudinary error ${res.status}`);
  }

  const data = await res.json();
  return data.secure_url;
}

// ─────────────────────────────────────────────
//  SUPABASE INSERT
// ─────────────────────────────────────────────
async function saveToSupabase(title, artistName, imageUrl) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}`,
    {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ title, artist_name: artistName, image_url: imageUrl }),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Database error ${res.status}: ${body}`);
  }
}

// ─────────────────────────────────────────────
//  RESET (for "Upload Another" button)
// ─────────────────────────────────────────────
function resetForm() {
  selectedFile = null;
  document.getElementById('upload-form').style.display   = 'flex';
  document.getElementById('success-msg').style.display   = 'none';
  document.getElementById('upload-form').style.display   = 'block';
  document.getElementById('drawing-title').value         = '';
  document.getElementById('artist-name').value           = 'Devanshi';
  document.getElementById('file-input').value            = '';
  document.getElementById('image-preview').src           = '';
  document.getElementById('preview-wrap').style.display  = 'none';
  document.getElementById('drop-content').style.display  = 'block';
  document.getElementById('submit-btn').disabled         = false;
  document.getElementById('btn-text').style.display      = 'inline';
  document.getElementById('btn-loading').style.display   = 'none';
  hideUploadError();
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function showUploadError(msg) {
  const el = document.getElementById('upload-error');
  document.getElementById('upload-error-text').textContent = msg;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideUploadError() {
  document.getElementById('upload-error').style.display = 'none';
}

// Sanitize text input — strip HTML tags
function sanitize(str) {
  return str.replace(/<[^>]*>/g, '').trim();
}
