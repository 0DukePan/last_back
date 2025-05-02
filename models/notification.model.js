import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ["order", "promotion", "system", "payment", "other"],
      default: "other",
    },
    relatedId: { type: String }, // Order ID, payment ID, etc.
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ isRead: 1 })

export const Notification = mongoose.model("Notification", notificationSchema)
