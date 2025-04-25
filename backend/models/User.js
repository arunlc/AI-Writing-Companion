const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  grade: String,
  coins: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
    // Add these new fields for password reset
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
