const mongoose = require("mongoose");

// Schema for the Task collection
const taskSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Class",
  }, // The class this task belongs to
  title: {
    type: String,
    required: true,
  }, // Title of the task
  description: {
    type: String,
    required: true,
  }, // Description of the task
  created_by: {
    type: String,
    required: true,
  }, // ID of the user who created the task
  created_at: {
    type: Date,
    default: Date.now,
  }, // Creation timestamp
  due_date: {
    type: Date,
    required: true,
  }, // Due date of the task
  status: {
    type: String,
    required: true,
    enum: ["ongoing", "completed"],
    default: "ongoing",
  }, // Task status
  submissions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission", // Reference to the Submission model
    },
  ], // Array of submission IDs
  document: {
    type: String,
    default: null,
  }, // Optional task-related document
});

// Compile the model
const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
