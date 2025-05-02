import admin from "firebase-admin"
import dotenv from "dotenv"
dotenv.config()

// Initialize Firebase Admin SDK
let firebaseInitialized = false

const initializeFirebase = () => {
  if (firebaseInitialized) return

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace newlines in the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
    firebaseInitialized = true
    console.log("Firebase Admin SDK initialized successfully")
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error)
  }
}

/**
 * Send push notification to a specific device
 * @param {string} token - Device token
 * @param {Object} notification - Notification object
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} - Messaging response
 */
export const sendPushNotification = async (token, notification, data = {}) => {
  try {
    if (!firebaseInitialized) {
      initializeFirebase()
    }

    if (!token) {
      throw new Error("Device token is required")
    }

    const message = {
      token,
      notification,
      data,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          priority: "high",
          channelId: "food_delivery_channel",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    }

    const response = await admin.messaging().send(message)
    console.log("Push notification sent successfully:", response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error("Error sending push notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send push notification to multiple devices
 * @param {Array<string>} tokens - Array of device tokens
 * @param {Object} notification - Notification object
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} - Messaging response
 */
export const sendMultiplePushNotifications = async (tokens, notification, data = {}) => {
  try {
    if (!firebaseInitialized) {
      initializeFirebase()
    }

    if (!tokens || !tokens.length) {
      throw new Error("Device tokens are required")
    }

    const message = {
      tokens,
      notification,
      data,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          priority: "high",
          channelId: "food_delivery_channel",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    }

    const response = await admin.messaging().sendMulticast(message)
    console.log(
      `Push notifications sent successfully: ${response.successCount} successful, ${response.failureCount} failed`,
    )
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    }
  } catch (error) {
    console.error("Error sending multiple push notifications:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send notification to a specific user
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} - Messaging response
 */
export const sendUserNotification = async (userId, title, body, data = {}) => {
  try {
    if (!firebaseInitialized) {
      initializeFirebase()
    }

    // Import User model here to avoid circular dependencies
    const { User } = await import("../models/user.model.js")

    const user = await User.findById(userId)
    if (!user || !user.deviceToken) {
      return { success: false, error: "User not found or no device token available" }
    }

    // Check user notification preferences
    if (user.settings?.notifications?.push === false) {
      return { success: false, error: "User has disabled push notifications" }
    }

    const notification = {
      title,
      body,
    }

    return await sendPushNotification(user.deviceToken, notification, data)
  } catch (error) {
    console.error("Error sending user notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send order status update notification
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @param {string} status - Order status
 * @returns {Promise<Object>} - Messaging response
 */
export const sendOrderStatusNotification = async (userId, orderId, status) => {
  try {
    let title = "Order Update"
    let body = "Your order status has been updated."

    switch (status) {
      case "confirmed":
        body = "Your order has been confirmed and is being processed."
        break
      case "preparing":
        body = "The restaurant is preparing your order."
        break
      case "out_for_delivery":
        body = "Your order is out for delivery."
        break
      case "delivered":
        title = "Order Delivered"
        body = "Your order has been delivered. Enjoy your meal!"
        break
      case "cancelled":
        title = "Order Cancelled"
        body = "Your order has been cancelled."
        break
    }

    const data = {
      type: "order_update",
      orderId,
      status,
    }

    return await sendUserNotification(userId, title, body, data)
  } catch (error) {
    console.error("Error sending order status notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send promotional notification to all users
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} - Messaging response
 */
export const sendPromotionalNotification = async (title, body, data = {}) => {
  try {
    if (!firebaseInitialized) {
      initializeFirebase()
    }

    // Import User model here to avoid circular dependencies
    const { User } = await import("../models/user.model.js")

    // Get all users who have enabled promotional notifications
    const users = await User.find({
      deviceToken: { $exists: true, $ne: null },
      "settings.notifications.promotions": { $ne: false },
    })

    const tokens = users.map((user) => user.deviceToken).filter(Boolean)

    if (!tokens.length) {
      return { success: false, error: "No valid device tokens found" }
    }

    const notification = {
      title,
      body,
    }

    data.type = "promotion"

    return await sendMultiplePushNotifications(tokens, notification, data)
  } catch (error) {
    console.error("Error sending promotional notification:", error)
    return { success: false, error: error.message }
  }
}

export default {
  sendPushNotification,
  sendMultiplePushNotifications,
  sendUserNotification,
  sendOrderStatusNotification,
  sendPromotionalNotification,
}
