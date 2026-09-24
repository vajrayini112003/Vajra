const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  collegeName: { type: String, required: true, trim: true },
  topic: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  noOfDays: { type: Number, default: 1 },
  studentsTrained: { type: Number, default: 0 },
  visitDate: { type: Date, default: Date.now },
  photos: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('College', collegeSchema);
