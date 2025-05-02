import express from "express"
import {
  createOrder,
  getOrderDetails,
  updateOrderStatus,
  getOrdersByUser,
  getOrdersBySession,
  getKitchenOrders,
  updatePaymentStatus,
  getCompletedKitchenOrders
} from '../controllers/order.controller.js';
import { protect , isAdmin } from "../middlewares/auth.middleware.js"

const router = express.Router()
// Define specific routes BEFORE parameterized routes
router.get("/kitchen/completed", /* verifyToken, verifyAdmin, */ getCompletedKitchenOrders);
router.get("/kitchenn/active", protect, isAdmin, getKitchenOrders);

// General & Parameterized Routes
router.post("/", createOrder); // Removed protect for kiosk app
router.get("/:orderId", protect, getOrderDetails); // Matches specific order IDs
router.put("/:orderId/status",  updateOrderStatus); // Only admin can update status?
router.put("/:orderId/payment", protect, updatePaymentStatus);
router.get("/user/:userId", protect, getOrdersByUser); // Matches /user/some-user-id
router.get("/session/:sessionId", getOrdersBySession); // Matches /session/some-session-id // Removed protect for kiosk app?

// --- Old position of completed route (removed) ---
// router.get("/completed", /* verifyToken, verifyAdmin, */ getCompletedKitchenOrders);

export default router; 