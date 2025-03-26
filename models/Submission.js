const mongoose = require("mongoose");

// Define the Submissions schema
const submissionSchema = new mongoose.Schema({
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  submitted_at: {
    type: Date,
    default: Date.now, // Automatically sets the submission time
  },
  document: {
    type: String,
    required: true, // URL of the uploaded document
  },
  feedback: {
    type: [{ type: String }],
    default: [], // Stores feedback IDs related to the submission
  },
  user_upvotes: {
    type: [{ type: String }],
    default: [], // List of user IDs who upvoted
  },
  expert_upvotes: {
    type: [{ type: String }],
    default: [], // List of expert IDs who upvoted
  },
});

// Create the Submissions model

module.exports = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);