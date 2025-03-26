const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  }, // The class the user is invited to
  invited_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // User who sent the invitation
  invited_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // User who is invited
  email: {
    type: String,
    required: true,
    match: /.+\@.+\..+/,
  }, // Email of the invited user (optional in case they aren't registered yet)
  status: {
    type: String,
    enum: ["pending", "accepted", "declined", "expired"],
    default: "pending",
  }, // Status of the invitation
  token: {
    type: String,
    required: true,
    unique: true,
  }, // Unique token for verifying the invitation
  expires_at: {
    type: Date,
    required: true,
  }, // Expiration date for the invitation
  created_at: {
    type: Date,
    default: Date.now,
  }, // Timestamp when the invitation was created
});

// Compile the model
module.exports = mongoose.models.Invitation || mongoose.model("Invitation", invitationSchema);