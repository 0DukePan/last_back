import express from 'express';
import {
  createBooking,
  getBookingById,
  getUserBookings,
  cancelBooking,
  updateBookingStatus,
} from '../controllers/booking.controller.js';
import { protect} from '../middlewares/auth.middleware.js';

const router = express.Router();

// Protected routes
router.post('/', protect, createBooking);
router.get('/', protect, getUserBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id/cancel', protect, cancelBooking);

// Admin/Restaurant routes
router.put('/:id/status', protect, updateBookingStatus);

export default router;
