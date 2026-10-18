
const express = require('express');
const multer = require('multer');
const College = require('../models/College');
const Feedback = require('../models/Feedback');
const Profile = require('../models/Profile');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ========================================
// PHOTO UPLOAD CONFIGURATION
// ========================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Return upload errors as JSON instead of an HTML error page.
function uploadPhotos(req, res, next) {
  upload.array('photos', 10)(req, res, err => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Each photo must be 3 MB or smaller.'
          : err.code === 'LIMIT_FILE_COUNT'
            ? 'You can upload a maximum of 10 photos at a time.'
            : err.message || 'Photo upload failed.';

      return res.status(400).json({ error: message });
    }

    next();
  });
}

function uploadProfilePhoto(req, res, next) {
  profileUpload.single('photo')(req, res, err => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Profile photo must be 5 MB or smaller.'
          : err.message || 'Profile photo upload failed.';

      return res.status(400).json({ error: message });
    }

    next();
  });
}

// Convert uploaded images to Base64 for MongoDB storage.
function toBase64Image(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

// ========================================
// LOGIN / LOGOUT / AUTH CHECK
// ========================================

router.post('/login', (req, res) => {
  const { password } = req.body;

  if (password && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }

  return res.status(401).json({ error: 'Wrong password' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.json({ ok: true });
  });
});

router.get('/check', (req, res) => {
  res.json({
    isAdmin: !!(req.session && req.session.isAdmin)
  });
});

// ========================================
// UPDATE PROFILE PICTURE
// ========================================

router.put(
  '/profile',
  requireAdmin,
  uploadProfilePhoto,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Please choose a photo'
        });
      }

      const profile =
        (await Profile.findOne()) || new Profile();

      profile.photo = toBase64Image(req.file);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error('Profile upload error:', err);

      res.status(500).json({
        error: 'Could not save profile photo. Please try a smaller image.'
      });
    }
  }
);

// ========================================
// CREATE COLLEGE VISIT
// ========================================

router.post(
  '/colleges',
  requireAdmin,
  uploadPhotos,
  async (req, res) => {
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

      if (
        !collegeName?.trim() ||
        !department?.trim() ||
        !year?.trim() ||
        !topic?.trim() ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          error: 'College name, department, year, topic, start date and end date are required.'
        });
      }

      if (endDate < startDate) {
        return res.status(400).json({
          error: 'End date cannot be before start date.'
        });
      }

      const photos = (req.files || []).map(toBase64Image);

      const college = await College.create({
        collegeName: collegeName.trim(),
        department: department.trim(),
        year: year.trim(),
        topic: topic.trim(),
        description: description || '',
        noOfDays: Number(noOfDays) || 1,
        studentsTrained: Number(studentsTrained) || 0,
        startDate,
        endDate,
        photos
      });

      res.status(201).json(college);
    } catch (err) {
      console.error('Create college error:', err);

      res.status(500).json({
        error: 'Could not save this visit. The photos may be too large; try fewer or smaller photos.'
      });
    }
  }
);

// ========================================
// GET ONE COLLEGE FOR EDITING
// ========================================

router.get('/colleges/:id', requireAdmin, async (req, res) => {
  try {
    const college = await College.findById(req.params.id);

    if (!college) {
      return res.status(404).json({ error: 'College visit not found.' });
    }

    res.json(college);
  } catch (err) {
    console.error('Get college error:', err);

    res.status(500).json({
      error: 'Could not load college visit.'
    });
  }
});

// ========================================
// UPDATE COLLEGE VISIT
// ========================================

router.put(
  '/colleges/:id',
  requireAdmin,
  uploadPhotos,
  async (req, res) => {
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
        return res.status(404).json({
          error: 'College visit not found.'
        });
      }

      if (
        !collegeName?.trim() ||
        !department?.trim() ||
        !year?.trim() ||
        !topic?.trim() ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          error: 'College name, department, year, topic, start date and end date are required.'
        });
      }

      if (endDate < startDate) {
        return res.status(400).json({
          error: 'End date cannot be before start date.'
        });
      }

      let photos = existing.photos || [];

      if (removePhotos) {
        let toRemove;

        try {
          toRemove = JSON.parse(removePhotos);

          if (!Array.isArray(toRemove)) {
            throw new Error('Invalid photo removal list');
          }
        } catch {
          return res.status(400).json({
            error: 'Invalid photo removal request.'
          });
        }

        photos = photos.filter(photo => !toRemove.includes(photo));
      }

      if (req.files?.length) {
        photos = photos.concat(req.files.map(toBase64Image));
      }

      existing.collegeName = collegeName.trim();
      existing.department = department.trim();
      existing.year = year.trim();
      existing.topic = topic.trim();
      existing.description = description || '';
      existing.noOfDays = Number(noOfDays) || 1;
      existing.studentsTrained = Number(studentsTrained) || 0;
      existing.startDate = startDate;
      existing.endDate = endDate;
      existing.photos = photos;

      await existing.save();

      res.json(existing);
    } catch (err) {
      console.error('Update college error:', err);

      res.status(500).json({
        error: 'Could not save changes. The total photos may exceed MongoDB storage limits; try removing or reducing photos.'
      });
    }
  }
);

// ========================================
// DELETE COLLEGE + ITS FEEDBACK
// ========================================

router.delete('/colleges/:id', requireAdmin, async (req, res) => {
  try {
    const college = await College.findByIdAndDelete(req.params.id);

    if (!college) {
      return res.status(404).json({
        error: 'College visit not found.'
      });
    }

    await Feedback.deleteMany({
      college: req.params.id
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete college error:', err);

    res.status(500).json({
      error: 'Could not delete college visit.'
    });
  }
});

module.exports = router;
