const express = require('express');
const College = require('../models/College');
const Feedback = require('../models/Feedback');
const Profile = require('../models/Profile');

const router = express.Router();

// Trainer profile (created on first request)
router.get('/profile', async (req, res) => {
  try {
    const profile = (await Profile.findOne()) || (await Profile.create({}));
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Overall stats: colleges visited, students trained, average feedback rating
router.get('/stats', async (req, res) => {
  try {
    const colleges = await College.find().select('_id studentsTrained').lean();
    const ids = colleges.map(c => c._id);
    const fb = await Feedback.aggregate([
      { $match: { college: { $in: ids } } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    res.json({
      colleges: colleges.length,
      students: colleges.reduce((n, c) => n + (c.studentsTrained || 0), 0),
      avgRating: fb[0] ? Math.round(fb[0].avg * 10) / 10 : 0,
      feedbackCount: fb[0] ? fb[0].count : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Home page data: every college, newest visit first, each with its feedback list
router.get('/', async (req, res) => {
  try {
    const colleges = await College.find().sort({ startDate: -1 }).lean();
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }).lean();

    const byCollege = {};
    feedbacks.forEach(f => {
      const key = String(f.college);
      if (!byCollege[key]) byCollege[key] = [];
      byCollege[key].push(f);
    });

    const result = colleges.map(c => ({
      ...c,
      feedbacks: byCollege[String(c._id)] || []
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single college + its feedback
router.get('/:id', async (req, res) => {
  try {
    const college = await College.findById(req.params.id).lean();
    if (!college) return res.status(404).json({ error: 'Not found' });
    const feedbacks = await Feedback.find({ college: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({ ...college, feedbacks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit feedback for a college
router.post('/:id/feedback', async (req, res) => {
  try {
    const { name, rating, comment } = req.body;

if (!name || !rating || !comment) {
  return res.status(400).json({ error: 'All fields are required' });
}
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ error: 'College not found' });

    const feedback = await Feedback.create({
  college: req.params.id,
  name,
  rating: Number(rating),
  comment
});
    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
