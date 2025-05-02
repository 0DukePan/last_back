import mongoose from "mongoose"

const replySchema = new mongoose.Schema({
  message: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
})

const supportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    phone: { type: String, required: true },
    status: { type: String, enum: ["open", "responded", "closed"], default: "open" },
    replies: [replySchema],
  },
  {
    timestamps: true,
  },
)

export const Support = mongoose.model("Support", supportSchema)
