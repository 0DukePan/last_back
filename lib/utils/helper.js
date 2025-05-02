import jwt from "jsonwebtoken"

/**
 * Generates a random OTP of specified length
 * @param {number} length - Length of OTP
 * @returns {string} - Generated OTP
 */
export const generateOTP = (length = 6) => {
  let otp = ""
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10)
  }
  return otp
}

/**
 * Generates a JWT token
 * @param {Object} payload - Token payload
 * @param {string} secret - JWT secret
 * @param {Object} options - JWT options
 * @returns {string} - Generated JWT token
 */
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  })
}

/**
 * Formats a phone number
 * @param {string} countryCode - Country code
 * @param {string} phoneNumber - Phone number
 * @returns {string} - Formatted phone number
 */
// Optional: Adjust for Vonage compatibility
export const formatPhoneNumber = (countryCode, phoneNumber) => {
  const cleanCountryCode = countryCode.replace(/\D/g, "").replace(/^\+/, "");
  const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");
  return `${cleanCountryCode}${cleanPhoneNumber}`; // Returns "213657615331"
};