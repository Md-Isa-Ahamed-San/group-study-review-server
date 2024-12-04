const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  profile_picture: { type: String, default: null },
  joined_classes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }], default: [] },
  submissions: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }], default: [] },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
