# Vajrayini — Technical Trainer Portfolio

Tracks every college you visit as a trainer: college name, topic, description,
number of days, and class photos — with a public feedback form students can
fill in (name, department, year, star rating, comment), stored in MongoDB and
shown as a rotating strip under each college's entry on the home page.

## What changed in this version
- **Home page** now shows only the most recent college (photo slideshow, name, title, description, date, days).
  Header has the profile picture, name, and stats: colleges visited, students trained, average feedback rating.
- **Month & year bar** (top right): change it to see the college visited in that month.
- **Colleges button** (bottom right): lists every college in the database; pick one to view it.
- **Photos** rotate every 5 seconds (change `SLIDE_MS` in `public/js/home.js`).
- **Feedback** is submitted on the home page and appears instantly; ratings update live.
- **Admin** (small "admin" link at the bottom of the home page): new "Students trained" field,
  "edit profile pic" button, scrollable list of posted colleges to edit. Editing a college never
  touches its feedback (feedback is a separate collection). Deleting a college also deletes its feedback.
- Log out returns to the home page.

## What's included
- **Home page** (`/index.html`) — your profile + a "visit register" listing every
  college, with a small ticker under each row that rotates through that
  college's feedback one at a time.
- **College detail page** (`/college.html?id=...`) — full photos + feedback
  form + full feedback list. **This is the page you share with students** —
  copy its link (or make a QR code of it) and send it to the class after a
  session so they can leave feedback. No login needed on their end.
- **Admin page** (`/admin.html`) — password-protected.
  - Post a new class visit (college name, topic, description, number of
    days, date, photos).
  - **Edit** any past entry: click "edit" next to it in the "Posted visits"
    list, the form above fills in with its current details — change
    anything, remove old photos (click a photo to mark it for removal,
    click again to keep it), add new ones, then "Save changes". Click
    "cancel" to go back to posting a new entry instead.
  - Delete an entry entirely.

## 1. Install prerequisites
- [Node.js](https://nodejs.org) (v18+)
- MongoDB — either:
  - installed locally ([community edition](https://www.mongodb.com/try/download/community)), or
  - a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (cloud, no install)

## 2. Set up the project
```bash
cd techtrainer
npm install
cp .env.example .env
```
Open `.env` and fill in:
- `MONGO_URI` — your local or Atlas connection string
- `ADMIN_PASSWORD` — the password you'll use to log into `/admin.html`
- `SESSION_SECRET` — any random string

## 3. Run it
```bash
npm start
```
Then open:
- `http://localhost:3000/index.html` — public home page
- `http://localhost:3000/admin.html` — admin login + posting/editing

## 4. Using it
1. Go to `/admin.html`, log in with `ADMIN_PASSWORD`.
2. Fill in the college name, topic, number of days, description, and upload
   class photos, then **Post**.
3. Copy that college's detail-page link from "Posted visits" → **view**, and
   share it with the students from that session. They fill in the feedback
   form — no login needed.
4. Feedback appears instantly on that college's detail page, and rotates
   through the ticker on the home page row.
5. Need to fix a typo or add more photos later? Go back to `/admin.html` and
   click **edit** on that entry.

## Deploying so it's live on the internet
Right now this only runs on your own computer. To make it reachable from
anywhere (so you can share a real link with students), deploy the
`techtrainer` folder to a Node hosting service (e.g. Render, Railway, or a
VPS) and point `MONGO_URI` at an Atlas cluster instead of a local database.
Ask me when you're ready and I can walk you through it.

## Project structure
```
techtrainer/
  server.js            entry point
  models/               College.js, Feedback.js (Mongoose schemas)
  routes/                public.js (student-facing), admin.js (admin-only)
  middleware/auth.js     admin session check
  public/                 all front-end HTML/CSS/JS
  uploads/                 uploaded class photos (created automatically)
```
