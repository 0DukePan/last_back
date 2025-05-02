import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import winstonLogger from "./logger.middleware.js";


export const protect = async (req, res, next) => {
  let token;

  // Look for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Not authorized, token missing" 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    // Find user by ID (handle both userId and id formats)
    req.user = await User.findById(decoded.userId || decoded.id)
      .select("-password") // exclude password
      .populate("favorites", "name logo cuisines rating distance location");
    
    if (!req.user) {
      winstonLogger.warn(`User not found for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    winstonLogger.info(`Authenticated user: ${req.user._id}`);
    next();
  } catch (error) {
    winstonLogger.error(`Token verification error: ${error.message}`);
    return res.status(401).json({ 
      success: false, 
      message: "Not authorized, token invalid" 
    });
  }
};



export const isAdmin = (req, res, next) => {
  // Add this line for debugging:
  console.log("DEBUG: Inside isAdmin middleware, req.user:", req.user);

  // Your existing logic likely looks something like this:
  if (req.user && req.user.isAdmin === true) { // Or maybe just req.user.isAdmin
    next();
  } else {
    res.status(403).json({ message: "Access denied - Admin only" });
  }
};
/**
 * Middleware to check if user is a restaurant owner
 * Must be used after the protect middleware
 */
export const restaurantOwner = (req, res, next) => {
  if (req.user && req.user.isRestaurantOwner) {
    next();
  } else {
    winstonLogger.warn(`Non-restaurant owner access attempt: ${req.user?._id}`);
    return res.status(403).json({ 
      success: false, 
      message: "Not authorized as restaurant owner" 
    });
  }
};

/**
 * Middleware to check if user is verified
 * Must be used after the protect middleware
 */
export const verified = (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    winstonLogger.warn(`Unverified user access attempt: ${req.user?._id}`);
    return res.status(403).json({ 
      success: false, 
      message: "Account not verified" 
    });
  }
};

/**
 * Optional auth middleware
 * Attaches user to request if token is valid, but doesn't require authentication
 */
export const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = await User.findById(decoded.userId || decoded.id).select("-password");
    
    if (req.user) {
      winstonLogger.info(`Optional auth: User ${req.user._id} authenticated`);
    }
  } catch (error) {
    winstonLogger.warn(`Optional auth: Invalid token - ${error.message}`);
    // Continue without authentication even if token is invalid
  }
  
  next();
};