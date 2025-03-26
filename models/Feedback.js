const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  submission_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Submission",
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  is_edited: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);