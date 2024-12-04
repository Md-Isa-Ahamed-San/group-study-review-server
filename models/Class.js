const mongoose = require('mongoose');

// Schema for the Class collection
const classSchema = new mongoose.Schema({
  class_name: { type: String, required: true },        // Name of the class
  description: { type: String, required: true },      // Description of the class
  class_code: { type: String, required: true, unique: true }, // Unique class code
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, // ID of the user who created the class
  created_at: { type: Date, default: Date.now },      // Date the class was created
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of member IDs
  experts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of member IDs
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of member IDs
  tasks: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], default: [] }, // Array of task IDs
  invites: { type: [String], default: [] },           // Array of invite codes
});

// Compile the model
const Class = mongoose.model('Class', classSchema);

module.exports = Class;
