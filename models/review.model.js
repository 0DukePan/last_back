// review.model.js (Updated)
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }, // <-- REMOVED
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String },
    images: [{ type: String }],
    foodRating: { type: Number, min: 1, max: 5 },
    serviceRating: { type: Number, min: 1, max: 5 },
    deliveryRating: { type: Number, min: 1, max: 5 },
    isVisible: { type: Boolean, default: true },
    reply: {
      text: { type: String },
      date: { type: Date }
    }
  },
  {
    timestamps: true
  }
);

export const Review = mongoose.model('Review', reviewSchema);