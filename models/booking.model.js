// booking.model.js (Updated)
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }, // <-- REMOVED
    date: { type: Date, required: true },
    time: { type: String, required: true },
    numberOfPeople: { type: Number, required: true },
    specialRequests: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending'
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

export const Booking = mongoose.model('Booking', bookingSchema);