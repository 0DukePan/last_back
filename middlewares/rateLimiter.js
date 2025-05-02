import rateLimit from "express-rate-limit";
import winstonLogger from "./logger.middleware.js";

/**
 * Rate limiter for OTP requests
 * Limits each IP to 3 OTP requests per 15 minutes
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 OTP requests per windowMs
  message: {
    success: false,
    message: "Too many OTP requests from this IP, please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    winstonLogger.warn(`Rate limit exceeded for OTP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

/**
 * General API rate limiter
 * Limits each IP to 100 requests per 15 minutes
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    winstonLogger.warn(`API rate limit exceeded: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

