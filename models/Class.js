const mongoose = require('mongoose');

// Schema for the Class collection
const classSchema = new mongoose.Schema({
  class_name: { type: String, required: true },
  description: { type: String, required: true },
  class_code: { type: String, required: true, unique: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Email of the user who created the class
  created_at: { type: Date, default: Date.now },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // References User collection
  experts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // References User collection
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],  // References User collection
  tasks: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], default: [] },
  invites: { type: [String], default: [] },
});


// Compile the model
module.exports = mongoose.models.Class || mongoose.model("Class", classSchema);