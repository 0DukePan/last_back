import express from "express"
import {
  createSupportTicket,
  getUserTickets,
  getTicketById,
  addReply,
  closeTicket,
} from "../controllers/support.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = express.Router()

router.post("/", protect, createSupportTicket)
router.get("/", protect, getUserTickets)
router.get("/:id", protect, getTicketById)
router.post("/:id/reply", protect, addReply)
router.put("/:id/close", protect, closeTicket)

export default router
