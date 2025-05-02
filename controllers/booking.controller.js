// import { Booking } from '../models/booking.model.js';
// import { Restaurant } from '../models/restaurant.model.js';

// // @desc    Create new booking
// // @route   POST /api/bookings
// // @access  Private
// export const createBooking = async (req, res) => {
//   try {
//     const {
//       restaurantId,
//       date,
//       time,
//       numberOfPeople,
//       specialRequests,
//       name,
//       phone,
//       email,
//     } = req.body;

//     // Check if restaurant exists
//     const restaurant = await Restaurant.findById(restaurantId);
//     if (!restaurant) {
//       return res.status(404).json({ message: 'Restaurant not found' });
//     }

//     // Check if restaurant accepts table bookings
//     if (!restaurant.features.tableBooking) {
//       return res.status(400).json({ message: 'Restaurant does not accept table bookings' });
//     }

//     // Create booking
//     const booking = await Booking.create({
//       user: req.user._id,
//       restaurant: restaurantId,
//       date,
//       time,
//       numberOfPeople,
//       specialRequests,
//       name,
//       phone,
//       email,
//     });

//     res.status(201).json(booking);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

// // @desc    Get booking by ID
// // @route   GET /api/bookings/:id
// // @access  Private
// export const getBookingById = async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id)
//       .populate('restaurant', 'name logo address contactPhone');

//     if (!booking) {
//       return res.status(404).json({ message: 'Booking not found' });
//     }

//     // Check if the booking belongs to the user
//     if (booking.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
//       return res.status(401).json({ message: 'Not authorized' });
//     }

//     res.status(200).json(booking);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

// // @desc    Get user bookings
// // @route   GET /api/bookings
// // @access  Private
// export const getUserBookings = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const query = { user: req.user._id };

//     // Filter by status if provided
//     if (req.query.status) {
//       query.status = req.query.status;
//     }

//     const bookings = await Booking.find(query)
//       .populate('restaurant', 'name logo')
//       .sort({ date: 1, time: 1 })
//       .skip(skip)
//       .limit(limit);

//     const total = await Booking.countDocuments(query);

//     res.status(200).json({
//       bookings,
//       page,
//       pages: Math.ceil(total / limit),
//       total,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

// // @desc    Cancel booking
// // @route   PUT /api/bookings/:id/cancel
// // @access  Private
// export const cancelBooking = async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id);

//     if (!booking) {
//       return res.status(404).json({ message: 'Booking not found' });
//     }

//     // Check if the booking belongs to the user
//     if (booking.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
//       return res.status(401).json({ message: 'Not authorized' });
//     }

//     // Check if booking can be cancelled
//     if (booking.status === 'cancelled') {
//       return res.status(400).json({ message: 'Booking is already cancelled' });
//     }

//     if (booking.status === 'completed') {
//       return res.status(400).json({ message: 'Completed bookings cannot be cancelled' });
//     }

//     // Update booking status
//     booking.status = 'cancelled';
//     await booking.save();

//     res.status(200).json({ message: 'Booking cancelled successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };

// // @desc    Update booking status (for admin/restaurant)
// // @route   PUT /api/bookings/:id/status
// // @access  Private/Admin/Restaurant
// export const updateBookingStatus = async (req, res) => {
//   try {
//     const { status } = req.body;

//     const booking = await Booking.findById(req.params.id);

//     if (!booking) {
//       return res.status(404).json({ message: 'Booking not found' });
//     }

//     // Check if user is admin or restaurant owner
//     const isRestaurantOwner = req.user.isRestaurantOwner && 
//       req.user.restaurantId && 
//       req.user.restaurantId.toString() === booking.restaurant.toString();
      
//     if (!req.user.isAdmin && !isRestaurantOwner) {
//       return res.status(401).json({ message: 'Not authorized' });
//     }

//     // Update booking status
//     booking.status = status;
//     await booking.save();

//     res.status(200).json({ message: 'Booking status updated successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// };
