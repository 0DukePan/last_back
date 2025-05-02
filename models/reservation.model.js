import mongoose from "mongoose";

const ReservationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Table",
        required: true,
    },
    reservationTime: { type: Date, required: true },
    status: {
        type: String,
        enum: ["confirmed", "cancelled", "completed", "no-show"],
        default: "confirmed",
    },
    preSelectedMenu: [
        {
            menuItemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "MenuItem",
                required: true,
            },
            quantity: { type: Number, default: 1 },
            specialInstructions: { type: String },
        },
    ],
}, { timestamps: true });

const Reservation = mongoose.model("Reservation", ReservationSchema);

export default Reservation;