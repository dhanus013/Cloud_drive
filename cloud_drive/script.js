// ── Config ──────────────────────────────────────────────────────────────────
// When running on EC2, use the real EC2 public IP or domain.
// For local dev: http://localhost:3000
const API = '';   // empty = same origin (works both locally and on EC2)

// ── Elements ─────────────────────────────────────────────────────────────────
const fileInput    = document.getElementById('fileInput');
const uploadBtn    = document.getElementById('uploadBtn');
const dropZone     = document.getElementById('dropZone');
const progressWrap = document.getElementById('progressWrap');
const progressBar  = document.getElementById('progressBar');
const statusMsg    = document.getElementById('statusMsg');
const selectedFile = document.getElementById('selectedFile');
const searchInput  = document.getElementById('searchInput');
const refreshBtn   = document.getElementById('refreshBtn');
const fileList     = document.getElementById('fileList');

let allFiles = [];

// ── File Selection ────────────────────────────────────────────────────────────
fileInput.addEventListener('change', () => {
  const f = fileInput.files[0];
  if (f) {
    selectedFile.textContent = `Selected: ${f.name}`;
    uploadBtn.disabled = false;
  }
});

// ── Drag & Drop ───────────────────────────────────────────────────────────────
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) {
    const dt = new DataTransfer();
    dt.items.add(f);
    fileInput.files = dt.files;
    selectedFile.textContent = `Selected: ${f.name}`;
    uploadBtn.disabled = false;
  }
});

// ── Upload ────────────────────────────────────────────────────────────────────
uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  setStatus('', '');
  progressWrap.hidden = false;
  uploadBtn.disabled = true;

  // Simulate progress while XHR uploads
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API}/upload`);

  xhr.upload.addEventListener('progress', e => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = pct + '%';
    }
  });

  xhr.onload = () => {
    progressWrap.hidden = true;
    progressBar.style.width = '0%';
    if (xhr.status === 200) {
      setStatus('✓ File uploaded successfully!', 'success');
      fileInput.value = '';
      selectedFile.textContent = '';
      loadFiles();
    } else {
      setStatus('✗ Upload failed. Try again.', 'error');
      uploadBtn.disabled = false;
    }
  };

  xhr.onerror = () => {
    progressWrap.hidden = true;
    setStatus('✗ Network error.', 'error');
    uploadBtn.disabled = false;
  };

  xhr.send(formData);
});

// ── Load Files ────────────────────────────────────────────────────────────────
async function loadFiles() {
  try {
    const res = await fetch(`${API}/files`);
    allFiles = await res.json();
    renderFiles(allFiles);
  } catch {
    fileList.innerHTML = '<p class="empty-msg">Could not reach server.</p>';
  }
}

function renderFiles(files) {
  if (!files.length) {
    fileList.innerHTML = '<p class="empty-msg">No files uploaded yet.</p>';
    return;
  }

  fileList.innerHTML = files.map(f => {
    const name = f.key.replace(/^\d+-/, '');           // strip timestamp prefix
    const size = formatSize(f.size);
    const date = new Date(f.lastModified).toLocaleDateString();
    const icon = fileIcon(name);
    return `
      <div class="file-item">
        <div class="file-icon">${icon}</div>
        <div class="file-meta">
          <div class="file-name" title="${name}">${name}</div>
          <div class="file-details">${size} · ${date}</div>
        </div>
        <div class="file-actions">
          <button class="btn-dl"  onclick="downloadFile('${f.key}')">⬇ Download</button>
          <button class="btn-del" onclick="deleteFile('${f.key}', this)">🗑 Delete</button>
        </div>
      </div>`;
  }).join('');
}

// ── Search ────────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  const filtered = allFiles.filter(f => f.key.toLowerCase().includes(q));
  renderFiles(filtered);
});

refreshBtn.addEventListener('click', loadFiles);

// ── Download ──────────────────────────────────────────────────────────────────
async function downloadFile(key) {
  try {
    const res = await fetch(`${API}/download/${encodeURIComponent(key)}`);
    const { url } = await res.json();
    const a = document.createElement('a');
    a.href = url;
    a.download = key.replace(/^\d+-/, '');
    a.click();
  } catch {
    alert('Download failed.');
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteFile(key, btn) {
  if (!confirm(`Delete "${key.replace(/^\d+-/, '')}"?`)) return;
  btn.disabled = true;
  btn.textContent = 'Deleting…';
  try {
    await fetch(`${API}/delete/${encodeURIComponent(key)}`, { method: 'DELETE' });
    loadFiles();
  } catch {
    alert('Delete failed.');
    btn.disabled = false;
    btn.textContent = '🗑 Delete';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg ${type}`;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = { pdf:'📄', png:'🖼', jpg:'🖼', jpeg:'🖼', gif:'🖼', webp:'🖼',
                mp4:'🎬', mov:'🎬', mp3:'🎵', wav:'🎵', zip:'🗜', rar:'🗜',
                js:'📝', ts:'📝', py:'📝', json:'📝', txt:'📝', csv:'📊',
                xlsx:'📊', docx:'📝', pptx:'📊' };
  return map[ext] || '📁';
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadFiles();
