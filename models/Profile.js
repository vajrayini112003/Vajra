const mongoose = require('mongoose');

// Single document holding the trainer's public profile
const profileSchema = new mongoose.Schema({
  name: { type: String, default: 'Vajrayini' },
  title: { type: String, default: 'Technical Trainer' },
  photo: { type: String, default: '/img/vajrayini.png' }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
