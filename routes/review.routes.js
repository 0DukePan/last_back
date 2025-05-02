import express from 'express';
import {
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  replyToReview,
} from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/:id', getReviewById);

// Protected routes
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

// Admin/Restaurant routes
router.put('/:id/reply', protect, replyToReview);

export default router;
