const $ = id => document.getElementById(id);

const esc = s =>
  String(s || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));

const stars = n =>
  '★'.repeat(Math.round(n)) +
  '☆'.repeat(5 - Math.round(n));

const fmt = d =>
  new Date(d).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });

const monthKey = d => {
  const x = new Date(d);

  return (
    x.getUTCFullYear() +
    '-' +
    String(x.getUTCMonth() + 1).padStart(2, '0')
  );
};

const monthLabel = k =>
  new Date(k + '-01T00:00:00Z').toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

let colleges = [];
let current = null;
let timer = null;
let rating = 0;

const SLIDE_MS = 5000;


// =========================================================
// PROFILE
// =========================================================

async function loadProfile() {
  const avatar = $('avatar');

  avatar.style.visibility = 'hidden';

  const res = await fetch('/api/colleges/profile');
  const p = await res.json();

  const img = new Image();

  img.onload = () => {
    avatar.src = p.photo;
    avatar.style.visibility = 'visible';
  };

  img.onerror = () => {
    avatar.src = '/img/vajrayini.png';
    avatar.style.visibility = 'visible';
  };

  img.src = p.photo;

  $('p-name').textContent = p.name;
  $('p-title').textContent = p.title;
}


// =========================================================
// STATS
// =========================================================

async function loadStats() {
  const s =
    await (await fetch('/api/colleges/stats')).json();

  $('stat-colleges').textContent =
    s.colleges;

  $('stat-students').textContent =
    s.students;

  $('stat-rating').innerHTML =
    s.feedbackCount
      ? `${s.avgRating} <span class="stars">★</span>`
      : '—';
}


// =========================================================
// COLLEGES
// =========================================================

async function loadColleges() {
  colleges =
    await (await fetch('/api/colleges')).json();
}


// =========================================================
// PHOTO SLIDESHOW
// =========================================================

function startSlides(photos) {
  clearInterval(timer);

  const imgs =
    document.querySelectorAll('.slide');

  const dots =
    document.querySelectorAll('.dot');

  if (!imgs.length) return;

  let i = 0;

  const go = n => {
    i = n;

    imgs.forEach((e, k) => {
      e.classList.toggle(
        'on',
        k === i
      );
    });

    dots.forEach((e, k) => {
      e.classList.toggle(
        'on',
        k === i
      );
    });
  };

  dots.forEach((d, k) => {

    d.addEventListener('click', () => {

      go(k);

      startSlides(photos);

    });

  });

  if (imgs.length > 1) {

    timer = setInterval(() => {

      go((i + 1) % imgs.length);

    }, SLIDE_MS);

  }
}


// =========================================================
// SHOW COLLEGE
// =========================================================

function show(c) {

  current = c;

  if (!c) {

    clearInterval(timer);

    $('feedback-card').style.display =
      'none';

    $('feedback-list').innerHTML =
      '';

    return;
  }


  const ph = c.photos || [];


  const dateText =
    c.startDate && c.endDate
      ? `${fmt(c.startDate)} – ${fmt(c.endDate)}`
      : c.startDate
        ? fmt(c.startDate)
        : '';


  const departmentYear = [
    c.department,
    c.year
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');


  // =======================================================
  // COLLEGE PAGE LAYOUT
  // Name + Date
  // Photo
  // Department + Year / Days + Students
  // Course
  // Description
  // =======================================================

  $('college-view').innerHTML = `

    <!-- COLLEGE NAME + DATE -->
    <div class="college-title-row">

      <h2>
        ${esc(c.collegeName)}
      </h2>

      <div class="college-dates">
        ${dateText}
      </div>

    </div>


    <!-- COLLEGE PHOTO -->
    <div class="hero">

      ${
        ph.length

          ? ph.map((p, k) => `
              <img
                class="slide${k ? '' : ' on'}"
                src="${p}"
                alt="${esc(c.collegeName)}"
                loading="${k === 0 ? 'eager' : 'lazy'}"
                decoding="async"
              >
            `).join('')

            +

            (
              ph.length > 1

                ? `
                  <div class="dots">

                    ${ph.map((_, k) => `
                      <span
                        class="dot${k ? '' : ' on'}"
                      ></span>
                    `).join('')}

                  </div>
                `

                : ''
            )

          : '<div class="hero-empty">No photos yet</div>'
      }

    </div>


    <!-- COLLEGE DETAILS -->
    <div class="college-details">


      <!-- DEPARTMENT + YEAR / DAYS + STUDENTS -->

      <div class="department-training-row">

        ${
          departmentYear

            ? `
              <div class="department-year">
                ${departmentYear}
              </div>
            `

            : ''
        }


        <div class="training-info">

          ${
            c.noOfDays

              ? `${c.noOfDays} day${c.noOfDays == 1 ? '' : 's'}`

              : ''
          }


          ${
            c.studentsTrained

              ? ` · ${c.studentsTrained} students`

              : ''
          }

        </div>

      </div>


      <!-- COURSE TITLE -->

      <div class="course-row">

        <span class="entry-topic">
          ${esc(c.topic)}
        </span>

      </div>


      <!-- DESCRIPTION -->

      ${
        c.description

          ? `
            <p class="entry-desc">
              ${esc(c.description)}
            </p>
          `

          : ''
      }


    </div>

  `;


  // =======================================================
  // MONTH PICKER
  // =======================================================

  $('month-pick').value =
    c.startDate
      ? monthKey(c.startDate)
      : '';


  // =======================================================
  // START SLIDESHOW
  // =======================================================

  startSlides(ph);


  // =======================================================
  // EXISTING FEEDBACK
  // =======================================================

  renderFeedback();


  // =======================================================
  // LEAVE FEEDBACK AFTER EXISTING FEEDBACK
  // =======================================================

  const feedbackList =
    $('feedback-list');

  const feedbackCard =
    $('feedback-card');

  feedbackCard.style.display =
    'block';

  feedbackList.insertAdjacentElement(
    'afterend',
    feedbackCard
  );

}


// =========================================================
// FEEDBACK LIST
// =========================================================

function renderFeedback() {

  const list =
    current
      ? current.feedbacks || []
      : [];


  $('feedback-list').innerHTML =
    list.length

      ? `
        <div class="feedback-section">

          <h3>Feedback</h3>

          ${list.map(f => `

            <div class="feedback-row">

              <div class="feedback-head">

                <span class="feedback-name">
                  ${esc(f.name)}
                </span>

                <span class="stars">
                  ${stars(f.rating)}
                </span>

              </div>


              <div class="feedback-comment">
                ${esc(f.comment)}
              </div>

            </div>

          `).join('')}

        </div>
      `

      : '';
}


// =========================================================
// COLLEGE MENU
// =========================================================

function renderMenu() {

  $('clg-menu').innerHTML =
    colleges.length

      ? colleges.map(c => `

          <button
            type="button"
            data-id="${c._id}"
            class="${
              current &&
              current._id === c._id
                ? 'sel'
                : ''
            }"
          >

            ${esc(c.collegeName)}

            <small>
              ${monthLabel(
                monthKey(c.startDate)
              )}
            </small>

          </button>

        `).join('')

      : `
          <div
            class="ticker-empty"
            style="padding:10px 14px"
          >
            No colleges yet
          </div>
        `;
}


// =========================================================
// COLLEGE MENU EVENTS
// =========================================================

$('clg-btn').addEventListener(
  'click',
  () => {

    renderMenu();

    $('clg-menu').hidden =
      !$('clg-menu').hidden;

  }
);


$('clg-menu').addEventListener(
  'click',
  e => {

    const b =
      e.target.closest('button');

    if (!b) return;


    show(
      colleges.find(
        c => c._id === b.dataset.id
      )
    );


    $('clg-menu').hidden =
      true;

  }
);


document.addEventListener(
  'click',
  e => {

    if (
      !$('clg-picker')
        .contains(e.target)
    ) {

      $('clg-menu').hidden =
        true;

    }

  }
);


// =========================================================
// MONTH & YEAR FILTER
// =========================================================

$('month-pick').addEventListener(
  'change',
  e => {

    const k = e.target.value;


    if (!k) {
      return show(colleges[0]);
    }


    const hit =
      colleges.find(
        c =>
          monthKey(c.startDate) === k
      );


    if (hit) {
      return show(hit);
    }


    clearInterval(timer);

    current = null;


    $('college-view').innerHTML = `

      <div class="empty-state">

        No college visit recorded in
        ${monthLabel(k)}.

      </div>

    `;


    show(null);

  }
);


// =========================================================
// STAR RATING
// =========================================================

$('star-picker').addEventListener(
  'click',
  e => {

    if (!e.target.dataset.v)
      return;


    rating =
      Number(
        e.target.dataset.v
      );


    document
      .querySelectorAll(
        '#star-picker span'
      )
      .forEach(s => {

        s.classList.toggle(
          'on',
          Number(s.dataset.v) <= rating
        );

      });

  }
);


// =========================================================
// FEEDBACK SUBMIT
// =========================================================

$('feedback-form').addEventListener(
  'submit',
  async e => {

    e.preventDefault();


    const msg =
      $('form-msg');

    msg.className =
      'msg';

    msg.textContent =
      '';


    if (!rating) {

      msg.textContent =
        'Please pick a star rating.';

      msg.classList.add(
        'err'
      );

      return;

    }


    const btn =
      e.target.querySelector(
        'button'
      );

    btn.disabled =
      true;


    try {

      const res =
        await fetch(
          `/api/colleges/${current._id}/feedback`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({

                name:
                  $('f-name')
                    .value
                    .trim(),

                rating,

                comment:
                  $('f-comment')
                    .value
                    .trim()

              })

          }
        );


      const data =
        await res.json();


      if (!res.ok) {

        throw new Error(
          data.error ||
          'Something went wrong'
        );

      }


      msg.textContent =
        'Thanks — your feedback is live.';

      msg.classList.add(
        'ok'
      );


      e.target.reset();

      rating = 0;


      document
        .querySelectorAll(
          '#star-picker span'
        )
        .forEach(s =>
          s.classList.remove('on')
        );


      // Update feedback
      // without restarting slideshow

      const id =
        current._id;


      await loadColleges();


      current =
        colleges.find(
          c => c._id === id
        );


      renderFeedback();

      loadStats();


    } catch (err) {

      msg.textContent =
        err.message;

      msg.classList.add(
        'err'
      );


    } finally {

      btn.disabled =
        false;

    }

  }
);


// =========================================================
// INITIAL LOAD
// =========================================================

(async () => {

  try {

    await Promise.all([
      loadProfile(),
      loadStats(),
      loadColleges()
    ]);


    if (colleges.length) {

      show(colleges[0]);

    } else {

      $('college-view').innerHTML =
        '<div class="empty-state">No class visits posted yet.</div>';

    }


  } catch (err) {

    $('college-view').innerHTML =
      '<div class="empty-state">Could not load data. Is the server running?</div>';

  }

})();
