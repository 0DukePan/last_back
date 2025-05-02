import { User } from "../models/user.model.js"
import { Notification } from "../models/notification.model.js"
import { sendPushNotification, sendUserNotification } from "../services/notificationService.js"

// @desc    Update device token
// @route   PUT /api/notifications/device-token
// @access  Private
export const updateDeviceToken = async (req, res) => {
  try {
    const { deviceToken } = req.body

    if (!deviceToken) {
      return res.status(400).json({ message: "Device token is required" })
    }

    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.deviceToken = deviceToken
    await user.save()

    res.status(200).json({
      success: true,
      message: "Device token updated successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Send test notification
// @route   POST /api/notifications/test
// @access  Private
export const sendTestNotification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (!user.deviceToken) {
      return res.status(400).json({ message: "No device token found for this user" })
    }

    const notification = {
      title: "Test Notification",
      body: "This is a test notification from the food delivery app",
    }

    const data = {
      type: "test",
      timestamp: Date.now().toString(),
    }

    const result = await sendPushNotification(user.deviceToken, notification, data)

    // Create notification record
    await Notification.create({
      user: req.user._id,
      title: notification.title,
      body: notification.body,
      data,
      type: "system",
    })

    res.status(200).json({
      success: true,
      message: "Test notification sent",
      result,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Send notification to a specific user (Admin only)
// @route   POST /api/notifications/user/:userId
// @access  Private (Admin only)
export const sendUserNotificationByAdmin = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized" })
    }

    const { title, body, data } = req.body
    const userId = req.params.userId

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" })
    }

    const targetUser = await User.findById(userId)

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" })
    }

    const result = await sendUserNotification(userId, title, body, data || {})

    // Create notification record
    await Notification.create({
      user: userId,
      title,
      body,
      data: data || {},
      type: "system",
    })

    res.status(200).json({
      success: true,
      message: "Notification sent to user",
      result,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Send promotional notification to all users (Admin only)
// @route   POST /api/notifications/promotional
// @access  Private (Admin only)
export const sendPromotionalNotificationByAdmin = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized" })
    }

    const { title, body, data } = req.body

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" })
    }

    // Import to avoid circular dependency
    const { sendPromotionalNotification } = await import("../services/notificationService.js")

    const result = await sendPromotionalNotification(title, body, data || {})

    // Create notification records for all users
    const users = await User.find({
      "settings.notifications.promotions": { $ne: false },
    }).select("_id")

    // Bulk insert notifications
    if (users.length > 0) {
      const notifications = users.map((user) => ({
        user: user._id,
        title,
        body,
        data: data || {},
        type: "promotion",
      }))

      await Notification.insertMany(notifications)
    }

    res.status(200).json({
      success: true,
      message: "Promotional notification sent",
      result,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Update notification settings
// @route   PUT /api/notifications/settings
// @access  Private
export const updateNotificationSettings = async (req, res) => {
  try {
    const { push, email, sms, orderUpdates, promotions } = req.body

    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Initialize settings if they don't exist
    if (!user.settings) {
      user.settings = {}
    }

    // Initialize notifications if they don't exist
    if (!user.settings.notifications) {
      user.settings.notifications = {}
    }

    // Update notification settings
    if (push !== undefined) user.settings.notifications.push = push
    if (email !== undefined) user.settings.notifications.email = email
    if (sms !== undefined) user.settings.notifications.sms = sms
    if (orderUpdates !== undefined) user.settings.notifications.orderUpdates = orderUpdates
    if (promotions !== undefined) user.settings.notifications.promotions = promotions

    await user.save()

    res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      settings: user.settings.notifications,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Get notification settings
// @route   GET /api/notifications/settings
// @access  Private
export const getNotificationSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Initialize settings if they don't exist
    if (!user.settings || !user.settings.notifications) {
      return res.status(200).json({
        settings: {
          push: true,
          email: true,
          sms: true,
          orderUpdates: true,
          promotions: true,
        },
      })
    }

    res.status(200).json({
      settings: user.settings.notifications,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}
export const getUserNotifications = async (req, res) => {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query
  
      const query = { user: req.user._id }
  
      if (unreadOnly === "true") {
        query.isRead = false
      }
  
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
  
      const count = await Notification.countDocuments(query)
      const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false })
  
      res.status(200).json({
        notifications,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalCount: count,
        unreadCount,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server Error" })
    }
  }

  export const deleteNotification = async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id)
  
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" })
      }
  
      // Check if the notification belongs to the user
      if (notification.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: "Not authorized" })
      }
  
      await notification.deleteOne()
  
      res.status(200).json({
        success: true,
        message: "Notification deleted",
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server Error" })
    }
  }
  
  // @desc    Delete all notifications
  // @route   DELETE /api/notifications/delete-all
  // @access  Private
  export const deleteAllNotifications = async (req, res) => {
    try {
      await Notification.deleteMany({ user: req.user._id })
  
      res.status(200).json({
        success: true,
        message: "All notifications deleted",
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server Error" })
    }
  }
  export const markAllNotificationsAsRead = async (req, res) => {
    try {
      await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true })
  
      res.status(200).json({
        success: true,
        message: "All notifications marked as read",
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server Error" })
    }
  }
  
  export const markNotificationAsRead = async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id)
  
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" })
      }
  
      // Check if the notification belongs to the user
      if (notification.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: "Not authorized" })
      }
  
      notification.isRead = true
      await notification.save()
  
      res.status(200).json({
        success: true,
        message: "Notification marked as read",
        notification,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server Error" })
    }
  }