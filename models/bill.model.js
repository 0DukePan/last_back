import mongoose from "mongoose"

const BillSchema = new mongoose.Schema({
  tableSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TableSession",
    required: true,
  },
  total: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "mobile_payment"],
  },

  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }, // cashier ID
})

const Bill = mongoose.model("Bill", BillSchema)

export default Bill
