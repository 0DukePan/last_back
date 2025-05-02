import express from "express"
import {
  createReservation,
  getReservationById,
  getUserReservations,
  updateReservationStatus,
  getTableReservations,
  getAllReservations,
} from "../controllers/reservation.controller.js"
import {protect , isAdmin  } from "../middlewares/auth.middleware.js"

const router = express.Router()

// User routes
router.post("/", protect, createReservation)
router.get("/user", protect, getUserReservations)
router.get("/:reservationId", protect, getReservationById)

// Admin routes
router.get("/", protect, isAdmin, getAllReservations)
router.get("/table/:tableId", protect, isAdmin, getTableReservations)
router.put("/:reservationId/status", protect, updateReservationStatus)

export default router
