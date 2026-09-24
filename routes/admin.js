const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const College = require('../models/College');
const Feedback = require('../models/Feedback');
const Profile = require('../models/Profile');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Wrong password' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/check', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// change the profile picture
router.put('/profile', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please choose a photo' });
    const profile = (await Profile.findOne()) || new Profile();
    profile.photo = '/uploads/' + req.file.filename;
    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create a new class-visit post
router.post('/colleges', requireAdmin, upload.array('photos', 10), async (req, res) => {
  try {
    const { collegeName, topic, description, noOfDays, studentsTrained, visitDate } = req.body;
    if (!collegeName || !topic) {
      return res.status(400).json({ error: 'College name and topic are required' });
    }
    const photos = (req.files || []).map(f => '/uploads/' + f.filename);
    const college = await College.create({
      collegeName,
      topic,
      description,
      noOfDays: Number(noOfDays) || 1,
      studentsTrained: Number(studentsTrained) || 0,
      visitDate: visitDate || Date.now(),
      photos
    });
    res.status(201).json(college);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// fetch one college for editing (admin-only, includes full doc)
router.get('/colleges/:id', requireAdmin, async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ error: 'Not found' });
    res.json(college);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// edit an existing post. New photos (if any) are ADDED to the existing ones;
// removePhotos (array of paths, sent as JSON string) lets the admin drop old ones.
router.put('/colleges/:id', requireAdmin, upload.array('photos', 10), async (req, res) => {
  try {
    const { collegeName, topic, description, noOfDays, studentsTrained, visitDate, removePhotos } = req.body;
    const existing = await College.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    let photos = existing.photos || [];
    if (removePhotos) {
      const toRemove = JSON.parse(removePhotos);
      photos = photos.filter(p => !toRemove.includes(p));
    }
    if (req.files && req.files.length) {
      photos = photos.concat(req.files.map(f => '/uploads/' + f.filename));
    }

    existing.collegeName = collegeName;
    existing.topic = topic;
    existing.description = description;
    existing.noOfDays = Number(noOfDays) || 1;
    existing.studentsTrained = Number(studentsTrained) || 0;
    if (visitDate) existing.visitDate = visitDate;
    existing.photos = photos;
    await existing.save();

    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/colleges/:id', requireAdmin, async (req, res) => {
  try {
    await College.findByIdAndDelete(req.params.id);
    await Feedback.deleteMany({ college: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
