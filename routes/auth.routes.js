

import express from 'express';


import {
  sendOTP,
  verifyOTP,
  register,
  socialLogin,
  refreshToken,   
  logout,
  getMyProfile,   
  authenticate    
} from '../controllers/auth.controller.js'


import {
  validateSendOTP,
  validateVerifyOTP,
  validateRegister,
  validateSocialLogin,
  validateRefreshToken
} from '../middlewares/auth.validator.js'

import { loggerMiddleware } from '../middlewares/logger.middleware.js'
import { otpRateLimiter, apiRateLimiter } from '../middlewares/rateLimiter.js'; 
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply logger middleware to all auth routes
router.use(loggerMiddleware);

// Apply general rate limiter to all auth routes
router.use(apiRateLimiter);



/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to mobile number
 * @access  Public
 */
router.post('/send-otp', otpRateLimiter, validateSendOTP, sendOTP); //

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and authenticate user
 * @access  Public
 */
router.post('/verify-otp', validateVerifyOTP, verifyOTP); //

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRegister, register); //

/**
 * @route   POST /api/auth/social-login
 * @desc    Authenticate with social providers (Google)
 * @access  Public
 */
router.post('/social-login', validateSocialLogin, socialLogin); //

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', validateRefreshToken, refreshToken); //




/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate tokens
 * @access  Private
 */
// Changed 'protect' to 'authenticate'
router.post('/logout', protect, logout); //

/**
 * @route   GET /api/auth/me
 * @desc    Get my profile
 * @access  Private
 */

router.get('/me', authenticate, getMyProfile); //



export default router;