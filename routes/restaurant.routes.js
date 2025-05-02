import express from "express"
import {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  getNearbyRestaurants,
} from "../controllers/restaurant.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = express.Router()

// Public routes
router.get("/", getRestaurants)
router.get("/nearby", getNearbyRestaurants)
router.get("/:id", getRestaurantById)

// Protected routes
router.post("/", protect, createRestaurant)
router.put("/:id", protect, updateRestaurant)
router.delete("/:id", protect, deleteRestaurant)

export default router
