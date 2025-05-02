// import { Review } from '../models/review.model.js';
// import { Order } from '../models/order.model.js';
// import { Restaurant } from '../models/restaurant.model.js';

// // @desc    Create new review
// // @route   POST /api/reviews
// // @access  Private
// export const createReview = async (req, res) => {
//   try {
//     const {
//       restaurantId,
//       orderId,
//       rating,
//       review,
//       images,
//       foodRating,
//       serviceRating,
//       deliveryRating,
//     } = req.body;

//     // Check if restaurant exists
//     const restaurant = await Restaurant.findById(restaurantId);
//     if (!restaurant) {
//       return res.status(404).json({ message: 'Restaurant not found' });
//     }

//     // Check if order exists and belongs to user
//     if (orderId) {
//       const order = await Order.findById(orderId);
      
//       if (!order) {
//         return res.status(404).json({ message: 'Order not found' });
//       }
      
//       if (order.user.toString() !== req.user._id.toString()) {
//         return res.status(401).json({ message: 'Not authorized' });
//       }
      
//       if (order.isRated) {
//         return res.status(400).json({ message: 'Order already rated' });
//       }
      
//       // Mark order as rated
//       order.isRated = true;
//       await order.save();
//     }

//     // Create review
//     const newReview = await Review.create({
//       user: req.user._id,
//       restaurant: restaurantId,
//       order: orderId,
//       rating,
//       review,
//       images,
//       foodRating,
//       serviceRating,
//       deliveryRating,
//     });

//     // Update restaurant rating
//     const reviews = await Review.find({ restaurant: restaurantId, isVisible: true });
//     const totalRating = reviews.reduce((sum, item) => sum + item.rating, 0);
//     const averageRating = totalRating / reviews.length;

//     restaurant.rating = averageRating;
//     restaurant.totalReviews = reviews.length;
//     await restaurant.save();

//     res.status(201).json(newReview);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

// // @desc    Get review by ID
// // @route   GET /api/reviews/:id
// // @access  Public
// export const getReviewById = async (req, res) => {
//   try {
//     const review = await Review.findById(req.params.id)
//       .populate('user', 'name profileImage')
//       .populate('restaurant', 'name logo');

//     if (!review) {
//       return res.status(404).json({ message: 'Review not found' });
//     }

//     res.status(200).json(review);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

// // @desc    Update review
// // @route   PUT /api/reviews/:id
// // @access  Private
// export const updateReview = async (req, res) => {
//   try {
//     const {
//       rating,
//       review,
//       images,
//       foodRating,
//       serviceRating,
//       deliveryRating,
//     } = req.body;

//     const reviewToUpdate = await Review.findById(req.params.id);

//     if (!reviewToUpdate) {
//       return res.status(404).json({ message: 'Review not found' });
//     }

//     // Check if the review belongs to the user
//     if (reviewToUpdate.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
//       return res.status(401).json({ message: 'Not authorized' });
//     }

//     // Update review
//     reviewToUpdate.rating = rating || reviewToUpdate.rating;
//     reviewToUpdate.review = review || reviewToUpdate.review;
//     reviewToUpdate.images = images || reviewToUpdate.images;
//     reviewToUpdate.foodRating = foodRating || reviewToUpdate.foodRating;
//     reviewToUpdate.serviceRating = serviceRating || reviewToUpdate.serviceRating;
//     reviewToUpdate.deliveryRating = deliveryRating || reviewToUpdate.deliveryRating;

//     const updatedReview = await reviewToUpdate.save();

//     // Update restaurant rating
//     const restaurant = await Restaurant.findById(reviewToUpdate.restaurant);
//     const reviews = await Review.find({ restaurant: reviewToUpdate.restaurant, isVisible: true });
//     const totalRating = reviews.reduce((sum, item) => sum + item.rating, 0);
//     const averageRating = totalRating / reviews.length;

//     restaurant.rating = averageRating;
//     await restaurant.save();

//     res.status(200).json(updatedReview);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

// // @desc    Delete review
// // @route   DELETE /api/reviews/:id
// // @access  Private
// export const deleteReview = async (req, res) => {
//   try {
//     const review = await Review.findById(req.params.id);

//     if (!review) {
//       return res.status(404).json({ message: 'Review not found' });
//     }

//     // Check if the review belongs to the user
//     if (review.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
//       return res.status(401).json({ message: 'Not authorized' });
//     }

//     await review.remove();

//     // Update restaurant rating
//     const restaurant = await Restaurant.findById(review.restaurant);
//     const reviews = await Review.find({ restaurant: review.restaurant, isVisible: true });
    
//     if (reviews.length === 0) {
//       restaurant.rating = 0;
//       restaurant.totalReviews = 0;
//     } else {
//       const totalRating = reviews.reduce((sum, item) => sum + item.rating, 0);
//       const averageRating = totalRating / reviews.length;
//       restaurant.rating = averageRating;
//       restaurant.totalReviews = reviews.length;
//     }
    
//     await restaurant.save();

//     res.status(200).json({ message: 'Review deleted successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

// // @desc    Reply to review (for restaurant owner)
// // @route   PUT /api/reviews/:id/reply
// // @access  Private/Admin/Restaurant
// export const replyToReview = async (req, res) => {
//   try {
//     const { text } = req.body;

//     const review = await Review.findById(req.params.id);

//     if (!review) {
//       return res.status(404).json({ message: 'Review not found' });
//     }

//     // Check if user is admin or restaurant owner
//     const isRestaurantOwner = req.user.isRestaurantOwner && 
//       req.user.restaurantId && 
//       req.user.restaurantId.toString() === review.restaurant.toString();
      
//     if (!req.user.isAdmin && !isRestaurantOwner) {
//       return res.status(401).json({ message: 'Not authorized' });
//     }

//     // Add reply
//     review.reply = {
//       text,
//       date: new Date(),
//     };
    
//     await review.save();

//     res.status(200).json({ message: 'Reply added successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };
