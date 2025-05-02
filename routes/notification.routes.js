import express from "express"
import {
  updateDeviceToken,
  sendTestNotification,
  sendUserNotificationByAdmin,
  sendPromotionalNotificationByAdmin,
  updateNotificationSettings,
  getNotificationSettings,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notification.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = express.Router()

// Device token route
router.put("/device-token", protect, updateDeviceToken)

// Test notification route
router.post("/test", protect, sendTestNotification)

// Admin routes
router.post("/user/:userId", protect, sendUserNotificationByAdmin)
router.post("/promotional", protect, sendPromotionalNotificationByAdmin)

// Settings routes
router.put("/settings", protect, updateNotificationSettings)
router.get("/settings", protect, getNotificationSettings)

// Notification management routes
router.get("/", protect, getUserNotifications)
router.put("/:id/read", protect, markNotificationAsRead)
router.put("/read-all", protect, markAllNotificationsAsRead)
router.delete("/:id", protect, deleteNotification)
router.delete("/delete-all", protect, deleteAllNotifications)

export default router
