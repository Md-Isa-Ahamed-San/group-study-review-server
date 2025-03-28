const mongoose = require("mongoose");

// Schema for the Task collection
const taskSchema = new mongoose.Schema(
  {
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Class",
    }, // The class this task belongs to
    title: {
      type: String,
      required: true,
      trim: true, // Remove extra spaces
    }, // Title of the task
    description: {
      type: String,
      required: true,
      trim: true,
    }, // Description of the task
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // ID of the user who created the task
    created_at: {
      type: Date,
      default: Date.now,
    }, // Creation timestamp
    dueDate: {
      type: Date,
      required: true,
      validate: {
        validator: (value) => value > Date.now(),
        message: "Due date must be in the future",
      },
    }, // Due date of the task
    status: {
      type: String,
      required: true,
      enum: ["ongoing", "completed"],
      default: "ongoing",
    }, // Task status
    submissions: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Submission", // Reference to the Submission model
        },
      ],
      default: [], // Set default as an empty array
    }, // Array of submission IDs
    document: {
      type: String,
      default: null,
      validate: {
        validator: (value) =>
          !value || /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(value),
        message: "Invalid document URL",
      },
    }, // Optional task-related document
  },
  { timestamps: true } // Adds `createdAt` and `updatedAt` automatically
);

// Compile the model
module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);