const express = require('express');
const multer = require('multer');
const College = require('../models/College');
const Feedback = require('../models/Feedback');
const Profile = require('../models/Profile');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
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
router.put('/profile', requireAdmin, profileUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please choose a photo' });
    }

    const profile = (await Profile.findOne()) || new Profile();

    const base64Image = req.file.buffer.toString('base64');

    profile.photo = `data:${req.file.mimetype};base64,${base64Image}`;

    await profile.save();

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/colleges', requireAdmin, upload.array('photos', 10), async (req, res) => {
  try {
    const {
      collegeName,
      department,
      year,
      topic,
      description,
      noOfDays,
      studentsTrained,
      startDate,
      endDate
    } = req.body;

    if (!collegeName || !department || !year || !topic || !startDate || !endDate) {
      return res.status(400).json({
        error: 'College name, department, year, topic, start date and end date are required'
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        error: 'End date cannot be before start date'
      });
    }

    const photos = (req.files || []).map(f =>
      `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
    );

    const college = await College.create({
      collegeName,
      department,
      year,
      topic,
      description,
      noOfDays: Number(noOfDays) || 1,
      studentsTrained: Number(studentsTrained) || 0,
      startDate,
      endDate,
      photos
    });

    res.status(201).json(college);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/colleges/:id', requireAdmin, async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ error: 'Not found' });
    res.json(college);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/colleges/:id', requireAdmin, upload.array('photos', 10), async (req, res) => {
  try {
    const {
      collegeName,
      department,
      year,
      topic,
      description,
      noOfDays,
      studentsTrained,
      startDate,
      endDate,
      removePhotos
    } = req.body;

    const existing = await College.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!collegeName || !department || !year || !topic || !startDate || !endDate) {
      return res.status(400).json({
        error: 'College name, department, year, topic, start date and end date are required'
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        error: 'End date cannot be before start date'
      });
    }

    let photos = existing.photos || [];

    if (removePhotos) {
      const toRemove = JSON.parse(removePhotos);
      photos = photos.filter(p => !toRemove.includes(p));
    }

    if (req.files && req.files.length) {
      photos = photos.concat(
        req.files.map(f =>
          `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
        )
      );
    }

    existing.collegeName = collegeName;
    existing.department = department;
    existing.year = year;
    existing.topic = topic;
    existing.description = description;
    existing.noOfDays = Number(noOfDays) || 1;
    existing.studentsTrained = Number(studentsTrained) || 0;
    existing.startDate = startDate;
    existing.endDate = endDate;
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
