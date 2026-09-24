const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  collegeName: { type: String, required: true, trim: true },
  department: { type: String, default: '', trim: true },
  year: { type: String, default: '', trim: true },
  topic: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  noOfDays: { type: Number, default: 1 },
  studentsTrained: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: Date.now },
  photos: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('College', collegeSchema);
