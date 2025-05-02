

import mongoose from "mongoose";

const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: { 
    type: String,
    required: true,
  },
  mobileNumber: { 
    type: String,
  
  },
  email: { // <-- ADDED: Email associated with this OTP
    type: String,

  },
  attempts: { // <-- ADDED: Number of verification attempts
    type: Number,
    required: true,
    default: 0, // Start with 0 attempts
  },
  lastSent: { // <-- ADDED: Timestamp when this OTP was last sent
    type: Date,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,

    expires: 43200, // Automatically delete document after 12 hours (index needed)
  },
});


// Ensure the TTL index works correctly on createdAt
verificationTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 43200 });


const VerificationToken = mongoose.model("VerificationToken", verificationTokenSchema);

export default VerificationToken;