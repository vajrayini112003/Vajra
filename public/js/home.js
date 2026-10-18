
const $ = id => document.getElementById(id);

const esc = value =>
  String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));

const stars = n => {
  const value = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return '★'.repeat(value) + '☆'.repeat(5 - value);
};

const fmt = date => new Date(date).toLocaleDateString(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

const monthKey = date => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = key => new Date(`${key}-01T00:00:00Z`)
  .toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

let colleges = [];
let slideTimers = [];
let selectedRating = {};
const SLIDE_MS = 5000;

async function loadProfile() {
  const avatar = $('avatar');

  try {
    const res = await fetch('/api/colleges/profile');
    if (!res.ok) throw new Error('Profile unavailable');

    const profile = await res.json();

    $('p-name').textContent = profile.name || 'Vajrayini';
    $('p-title').textContent = profile.title || 'Technical Trainer';

    const image = new Image();

    image.onload = () => {
      avatar.src = image.src;
      avatar.style.visibility = 'visible';
    };

    image.onerror = () => {
      avatar.src = '/img/vajrayini.png';
      avatar.style.visibility = 'visible';
    };

    image.src = profile.photo || '/img/vajrayini.png';
  } catch {
    avatar.src = '/img/vajrayini.png';
    avatar.style.visibility = 'visible';
  }
}

async function loadStats() {
  const res = await fetch('/api/colleges/stats');
  if (!res.ok) throw new Error('Stats unavailable');

  const stats = await res.json();

  $('stat-colleges').textContent = stats.colleges;
  $('stat-students').textContent = stats.students;

  $('stat-rating').innerHTML = stats.feedbackCount
    ? `${stats.avgRating} <span class="stars">★</span>`
    : '—';
}

async function loadColleges() {
  const res = await fetch('/api/colleges');
  if (!res.ok) throw new Error('College data unavailable');

  colleges = await res.json();
  colleges.sort((a, b) =>
    new Date(b.startDate || 0) - new Date(a.startDate || 0)
  );
}

function stopSlides() {
  slideTimers.forEach(timer => clearInterval(timer));
  slideTimers = [];
}

// Use one image element per college.
// The first saved photo is always shown first.
function startCardSlides(card, photos) {
  if (!photos || photos.length < 2) return;

  const image = card.querySelector('.college-photo');
  if (!image) return;

  let index = 0;

  const timer = setInterval(() => {
    index = (index + 1) % photos.length;
    image.src = photos[index];
  }, SLIDE_MS);

  slideTimers.push(timer);
}

function renderFeedbackItems(list) {
  if (!list.length) {
    return '<p class="feedback-empty">No feedback yet.</p>';
  }

  return list.map(item => `
    <article class="feedback-row">
      <div class="feedback-head">
        <strong class="feedback-name">${esc(item.name)}</strong>
        <span class="stars">${stars(item.rating)}</span>
      </div>
      <p class="feedback-comment">${esc(item.comment)}</p>
    </article>
  `).join('');
}

function collegeCard(c, index) {
  const photos = Array.isArray(c.photos) ? c.photos : [];
  const feedbacks = Array.isArray(c.feedbacks) ? c.feedbacks : [];

  const dates = c.startDate && c.endDate
    ? `${fmt(c.startDate)} – ${fmt(c.endDate)}`
    : c.startDate ? fmt(c.startDate) : '';

  const deptYear = [c.department, c.year]
    .filter(Boolean)
    .map(esc)
    .join(' · ');

  const training = [
    c.noOfDays ? `${c.noOfDays} day${Number(c.noOfDays) === 1 ? '' : 's'}` : '',
    c.studentsTrained != null && c.studentsTrained !== ''
      ? `${c.studentsTrained} students`
      : ''
  ].filter(Boolean).join(' · ');

  const photoMarkup = photos.length
    ? `<img
         class="college-photo"
         src="${photos[0]}"
         alt="${esc(c.collegeName)} class photo"
         loading="${index === 0 ? 'eager' : 'lazy'}"
         decoding="async"
       >`
    : '<div class="hero-empty">No photos uploaded</div>';

  return `
    <article class="college-card" id="college-${esc(c._id)}"
             data-college-id="${esc(c._id)}">

      <div class="college-title-row">
        <h2>${esc(c.collegeName)}</h2>
        <span class="college-dates">${dates}</span>
      </div>

      <div class="college-photo-wrap">
        ${photoMarkup}
      </div>

      <div class="college-details">
        <div class="department-training-row">
          <span class="department-year">${deptYear}</span>
          <span class="training-info">${training}</span>
        </div>

        <div class="course-row">
          <span class="entry-topic">${esc(c.topic)}</span>
        </div>

        ${c.description
          ? `<p class="entry-desc">${esc(c.description)}</p>`
          : ''}

        <div class="college-actions">
          <button type="button" class="btn feedback-toggle"
                  aria-expanded="false"
                  data-feedback-toggle="${esc(c._id)}">
            Feedback${feedbacks.length ? ` (${feedbacks.length})` : ''}
          </button>
        </div>

        <section class="college-feedback-panel" data-feedback-panel="${esc(c._id)}" hidden>
          ${feedbacks.length
            ? `<div class="feedback-section">
                 <h3>Student feedback</h3>
                 ${renderFeedbackItems(feedbacks)}
               </div>`
            : '<p class="feedback-empty">No feedback yet. Be the first to share your feedback.</p>'}

          <form class="college-feedback-form" data-feedback-form="${esc(c._id)}">
            <h3>Leave your feedback</h3>

            <div class="field">
              <label>Your name</label>
              <input type="text" name="name" maxlength="100" required>
            </div>

            <div class="field">
              <label>Rating</label>
              <div class="star-picker" data-rating-picker="${esc(c._id)}">
                ${[1, 2, 3, 4, 5].map(n => `
                  <button type="button" class="rating-star"
                          data-rating="${n}" aria-label="${n} star"
                          aria-pressed="false">★</button>
                `).join('')}
              </div>
            </div>

            <div class="field">
              <label>Feedback</label>
              <textarea name="comment" maxlength="2000"
                        placeholder="How was the class?" required></textarea>
            </div>

            <button class="btn" type="submit">Submit feedback</button>
            <div class="msg" data-feedback-msg="${esc(c._id)}"></div>
          </form>
        </section>
      </div>
    </article>
  `;
}

function renderColleges(list = colleges) {
  stopSlides();

  const view = $('college-view');

  if (!list.length) {
    view.innerHTML = `
      <div class="empty-state">
        No college visits recorded for this month.
      </div>
    `;
    return;
  }

  view.innerHTML = list.map(collegeCard).join('');

  view.querySelectorAll('.college-card').forEach(card => {
    const id = card.dataset.collegeId;
    const college = list.find(c => String(c._id) === id);

    if (college) {
      startCardSlides(card, college.photos || []);
    }
  });

  renderMenu();
}

function renderMenu() {
  $('clg-menu').innerHTML = colleges.length
    ? colleges.map(c => `
        <button type="button" data-jump="${esc(c._id)}">
          ${esc(c.collegeName)}
          <small>${c.startDate ? monthLabel(monthKey(c.startDate)) : ''}</small>
        </button>
      `).join('')
    : '<div class="ticker-empty">No colleges yet</div>';
}

$('clg-btn').addEventListener('click', () => {
  $('clg-menu').hidden = !$('clg-menu').hidden;
  renderMenu();
});

$('clg-menu').addEventListener('click', e => {
  const button = e.target.closest('[data-jump]');
  if (!button) return;

  const card = document.getElementById(`college-${button.dataset.jump}`);
  $('clg-menu').hidden = true;

  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.addEventListener('click', e => {
  if (!$('clg-picker').contains(e.target)) {
    $('clg-menu').hidden = true;
  }
});

// Open/close feedback only when the visitor clicks the button.
$('college-view').addEventListener('click', e => {
  const toggle = e.target.closest('[data-feedback-toggle]');
  if (toggle) {
    const id = toggle.dataset.feedbackToggle;
    const panel = $('college-view').querySelector(`[data-feedback-panel="${id}"]`);
    if (!panel) return;

    const opening = panel.hidden;
    panel.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    return;
  }

  const star = e.target.closest('[data-rating]');
  if (!star) return;

  const picker = star.closest('[data-rating-picker]');
  const id = picker.dataset.ratingPicker;
  selectedRating[id] = Number(star.dataset.rating);

  picker.querySelectorAll('[data-rating]').forEach(button => {
    const active = Number(button.dataset.rating) <= selectedRating[id];
    button.classList.toggle('on', active);
    button.setAttribute('aria-pressed', String(active));
  });
});

// Submit feedback for the specific college card.
$('college-view').addEventListener('submit', async e => {
  const form = e.target.closest('[data-feedback-form]');
  if (!form) return;

  e.preventDefault();

  const id = form.dataset.feedbackForm;
  const msg = form.querySelector(`[data-feedback-msg="${id}"]`);
  const btn = form.querySelector('button[type="submit"]');
  const rating = selectedRating[id] || 0;

  msg.textContent = '';
  msg.className = 'msg';

  if (!rating) {
    msg.textContent = 'Please select a star rating.';
    msg.classList.add('err');
    return;
  }

  btn.disabled = true;

  try {
    const data = new FormData(form);

    const res = await fetch(`/api/colleges/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(data.get('name') || '').trim(),
        rating,
        comment: String(data.get('comment') || '').trim()
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Could not submit feedback.');

    await Promise.all([loadColleges(), loadStats()]);

    const panelWasOpen = true;
    renderColleges(getFilteredColleges());

    const card = document.getElementById(`college-${id}`);
    const panel = card?.querySelector(`[data-feedback-panel="${id}"]`);
    const toggle = card?.querySelector(`[data-feedback-toggle="${id}"]`);

    if (panel && toggle && panelWasOpen) {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    }

    if (card) {
      const message = card.querySelector(`[data-feedback-msg="${id}"]`);
      if (message) {
        message.textContent = 'Thank you! Your feedback has been submitted.';
        message.classList.add('ok');
      }
    }

    delete selectedRating[id];
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('err');
  } finally {
    btn.disabled = false;
  }
});

function getFilteredColleges() {
  const key = $('month-pick').value;
  return key
    ? colleges.filter(c => c.startDate && monthKey(c.startDate) === key)
    : colleges;
}

$('month-pick').addEventListener('change', () => {
  renderColleges(getFilteredColleges());
});

(async function init() {
  try {
    await Promise.all([loadProfile(), loadStats(), loadColleges()]);
    renderColleges();
  } catch (err) {
    $('college-view').innerHTML = `
      <div class="empty-state">
        Could not load website data. Please refresh the page.
      </div>
    `;
  }
})();
