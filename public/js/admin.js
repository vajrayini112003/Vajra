function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

let editingId = null;       // null = "add new" mode, otherwise the college _id being edited
let removedPhotos = [];     // existing photo paths marked for removal while editing

async function checkAuth() {
  const res = await fetch('/api/admin/check');
  const data = await res.json();
  if (data.isAdmin) {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('admin-view').style.display = 'block';
    loadList();
    loadProfile();
  } else {
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('admin-view').style.display = 'none';
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('login-msg');
  msg.textContent = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    checkAuth();
  } catch (err) {
    msg.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  location.href = '/index.html'; // back to the home page
});

// ---- profile picture ----
async function loadProfile() {
  const avatar = document.getElementById('admin-avatar');

  // Hide image until the current photo is loaded
  avatar.style.visibility = 'hidden';

  const res = await fetch('/api/colleges/profile');
  const p = await res.json();

  avatar.onload = () => {
    avatar.style.visibility = 'visible';
  };

  avatar.onerror = () => {
    avatar.style.visibility = 'visible';
  };

  avatar.src = p.photo;

  document.getElementById('admin-name').textContent = p.name;
}
document.getElementById('edit-pic-btn').addEventListener('click', () => document.getElementById('pic-input').click());
document.getElementById('pic-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const msg = document.getElementById('pic-msg');
  if (!file) return;
  msg.className = 'msg'; msg.textContent = 'Uploading…';
  const fd = new FormData();
  fd.append('photo', file);
  try {
    const res = await fetch('/api/admin/profile', { method: 'PUT', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    document.getElementById('admin-avatar').src = data.photo;
    msg.textContent = 'Profile picture updated.'; msg.classList.add('ok');
  } catch (err) {
    msg.textContent = err.message; msg.classList.add('err');
  }
  e.target.value = '';
});

// ---- new-photo live thumbnail preview ----
document.getElementById('v-photos').addEventListener('change', (e) => {
  const preview = document.getElementById('new-photo-preview');
  preview.innerHTML = '';
  [...e.target.files].forEach(file => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    const wrap = document.createElement('div');
    wrap.className = 'thumb';
    wrap.appendChild(img);
    preview.appendChild(wrap);
  });
});

function renderExistingPhotos(photos) {
  const preview = document.getElementById('existing-photo-preview');
  preview.innerHTML = '';
  photos.forEach(p => {
    const wrap = document.createElement('div');
    wrap.className = 'thumb';
    const img = document.createElement('img');
    img.src = p;
    img.style.opacity = removedPhotos.includes(p) ? '0.3' : '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'remove-x';
    btn.textContent = removedPhotos.includes(p) ? '+' : '×';
    btn.title = removedPhotos.includes(p) ? 'Keep this photo' : 'Remove this photo';
    btn.addEventListener('click', () => {
      if (removedPhotos.includes(p)) {
        removedPhotos = removedPhotos.filter(x => x !== p);
      } else {
        removedPhotos.push(p);
      }
      renderExistingPhotos(photos);
    });
    wrap.appendChild(img);
    wrap.appendChild(btn);
    preview.appendChild(wrap);
  });
}

function resetFormToAddMode() {
  editingId = null;
  removedPhotos = [];
  document.getElementById('visit-form').reset();
  document.getElementById('new-photo-preview').innerHTML = '';
  document.getElementById('existing-photo-preview').innerHTML = '';
  document.getElementById('edit-banner').style.display = 'none';
  document.getElementById('form-title').textContent = 'Post a new class visit';
  document.getElementById('submit-btn').textContent = 'Post';
  document.getElementById('visit-msg').textContent = '';
}

document.getElementById('cancel-edit-btn').addEventListener('click', resetFormToAddMode);

async function loadForEdit(id) {
  const res = await fetch('/api/admin/colleges/' + id);
  if (!res.ok) return;
  const c = await res.json();

  editingId = id;
  removedPhotos = [];

  document.getElementById('v-college').value = c.collegeName || '';
  document.getElementById('v-topic').value = c.topic || '';
  document.getElementById('v-days').value = c.noOfDays || 1;
  document.getElementById('v-students').value = c.studentsTrained || 0;
  document.getElementById('v-desc').value = c.description || '';
  document.getElementById('v-date').value = c.visitDate ? c.visitDate.slice(0, 10) : '';
  document.getElementById('new-photo-preview').innerHTML = '';
  document.getElementById('v-photos').value = '';
  renderExistingPhotos(c.photos || []);

  document.getElementById('edit-banner').style.display = 'flex';
  document.getElementById('form-title').textContent = 'Edit class visit';
  document.getElementById('submit-btn').textContent = 'Save changes';
  document.getElementById('visit-msg').textContent = '';

  document.getElementById('visit-form').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('visit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('visit-msg');
  msg.textContent = '';
  msg.className = 'msg';

  const fd = new FormData();
  fd.append('collegeName', document.getElementById('v-college').value.trim());
  fd.append('topic', document.getElementById('v-topic').value.trim());
  fd.append('noOfDays', document.getElementById('v-days').value);
  fd.append('studentsTrained', document.getElementById('v-students').value);
  fd.append('description', document.getElementById('v-desc').value.trim());
  const dateVal = document.getElementById('v-date').value;
  if (dateVal) fd.append('visitDate', dateVal);
  [...document.getElementById('v-photos').files].forEach(f => fd.append('photos', f));
  if (editingId) fd.append('removePhotos', JSON.stringify(removedPhotos));

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;

  try {
    const url = editingId ? '/api/admin/colleges/' + editingId : '/api/admin/colleges';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    msg.textContent = editingId ? 'Changes saved.' : 'Posted.';
    msg.classList.add('ok');
    resetFormToAddMode();
    loadList();
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('err');
  } finally {
    btn.disabled = false;
  }
});

async function loadList() {
  const res = await fetch('/api/colleges');
  const colleges = await res.json();
  const el = document.getElementById('admin-list');
  if (!colleges.length) {
    el.innerHTML = '<div class="empty-state">Nothing posted yet.</div>';
    return;
  }
  el.innerHTML = colleges.map(c => `
    <div class="admin-list-row">
      <span>${escapeHtml(c.collegeName)} — ${escapeHtml(c.topic)} (${c.feedbacks ? c.feedbacks.length : 0} feedback)</span>
      <span>
        <a class="link-btn" href="/college.html?id=${c._id}">view</a>
        <button class="link-btn" data-edit="${c._id}">edit</button>
        <button class="link-btn danger" data-delete="${c._id}">delete</button>
      </span>
    </div>
  `).join('');

  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => loadForEdit(btn.dataset.edit));
  });
  el.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this college visit AND its student feedback? This cannot be undone. (Editing never touches feedback.)')) return;
      await fetch('/api/admin/colleges/' + btn.dataset.delete, { method: 'DELETE' });
      if (editingId === btn.dataset.delete) resetFormToAddMode();
      loadList();
    });
  });
}

checkAuth();
