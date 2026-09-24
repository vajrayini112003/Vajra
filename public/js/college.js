function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
function stars(n) {
  n = Number(n) || 0;
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const params = new URLSearchParams(location.search);
const id = params.get('id');
let currentRating = 0;

async function load() {
  if (!id) {
    document.getElementById('content').innerHTML = '<div class="empty-state">No college specified.</div>';
    return;
  }
  const res = await fetch('/api/colleges/' + id);
  if (!res.ok) {
    document.getElementById('content').innerHTML = '<div class="empty-state">Not found.</div>';
    return;
  }
  const c = await res.json();
  document.title = c.collegeName + ' — Vaju';

  const photosHtml = (c.photos && c.photos.length)
    ? `<div class="detail-photos">${c.photos.map(p => `<img src="${p}" alt="">`).join('')}</div>`
    : '';

  document.getElementById('content').innerHTML = `
    <h1>${escapeHtml(c.collegeName)}</h1>
    <div class="entry-meta" style="margin-top:6px">${formatDate(c.visitDate)} · ${c.noOfDays} day${c.noOfDays == 1 ? '' : 's'}</div>
    <span class="entry-topic" style="margin-top:10px">${escapeHtml(c.topic)}</span>
    ${c.description ? `<p class="entry-desc" style="max-width:100%">${escapeHtml(c.description)}</p>` : ''}
    ${photosHtml}
  `;

  renderFeedback(c.feedbacks || []);
}

function renderFeedback(list) {
  const el = document.getElementById('feedback-list');
  if (!list.length) {
    el.innerHTML = '<div class="empty-state">No feedback yet — be the first to leave one.</div>';
    return;
  }
  el.innerHTML = `<h3>${list.length} feedback${list.length === 1 ? '' : 's'}</h3>` +
    list.map(f => `
      <div class="feedback-row">
        <div class="feedback-head">
          <span class="feedback-name">${escapeHtml(f.name)} · ${escapeHtml(f.dept)} · ${escapeHtml(f.year)}</span>
          <span class="stars">${stars(f.rating)}</span>
        </div>
        <div style="margin-top:6px">${escapeHtml(f.comment)}</div>
      </div>
    `).join('');
}

document.getElementById('star-picker').addEventListener('click', (e) => {
  if (e.target.dataset.v) {
    currentRating = Number(e.target.dataset.v);
    document.querySelectorAll('#star-picker span').forEach(s => {
      s.classList.toggle('on', Number(s.dataset.v) <= currentRating);
    });
  }
});

document.getElementById('feedback-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('form-msg');
  msg.textContent = '';
  msg.className = 'msg';

  if (!currentRating) {
    msg.textContent = 'Please pick a star rating.';
    msg.classList.add('err');
    return;
  }

  const body = {
    name: document.getElementById('f-name').value.trim(),
    dept: document.getElementById('f-dept').value.trim(),
    year: document.getElementById('f-year').value,
    rating: currentRating,
    comment: document.getElementById('f-comment').value.trim()
  };

  const btn = e.target.querySelector('button');
  btn.disabled = true;

  try {
    const res = await fetch(`/api/colleges/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    msg.textContent = 'Thanks — your feedback was submitted.';
    msg.classList.add('ok');
    e.target.reset();
    currentRating = 0;
    document.querySelectorAll('#star-picker span').forEach(s => s.classList.remove('on'));
    load();
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('err');
  } finally {
    btn.disabled = false;
  }
});

load();
