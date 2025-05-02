import mongoose from "mongoose"

const tableSessionSchema = new mongoose.Schema({
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Table",
    required: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["active", "closed"],
    default: "active",
  },
  orders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  reservationid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reservation",
  },
})

const TableSession = mongoose.model("TableSession", tableSessionSchema)

export default TableSession
