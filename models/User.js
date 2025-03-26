const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
  created_at: { type: Date, default: Date.now },
  profile_picture: { type: String, default: null },
  joined_classes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }], default: [] },
  submissions: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }], default: [] },
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
