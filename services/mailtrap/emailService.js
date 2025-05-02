
import { sendVerificationEmail } from "./emails.js"
import winstonLogger from "../../middlewares/logger.middleware.js"

/**
 * Send OTP via email
 * @param {string} email - Recipient email address
 * @param {string} otp - One-time password to send
 * @returns {Promise<Object>} - Result of the operation
 */
export const sendOTP = async (email, otp) => {
  try {
    winstonLogger.info(`Attempting to send OTP email to: ${email}`)

    await sendVerificationEmail(email, otp)

    winstonLogger.info(`Email OTP successfully sent to ${email}`)
    return {
      success: true,
      to: email,
    }
  } catch (error) {
    winstonLogger.error("Email sending error:", {
      message: error.message,
      stack: error.stack,
      to: email,
    })

    return {
      success: false,
      error: error.message,
      details: error.response?.data,
    }
  }
}
