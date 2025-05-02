import express from "express"
import {
  getUserProfile,
  updateUserProfile,
  updateDietaryPreferences,
  updateHealthPreferences,
  addAddress,
  updateAddress,
  deleteAddress,
  getAddresses,
  getWallet,
  addWalletTransaction,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getRecommendations,
  getAllUsers,
  getUserById,
  updateUserAdminStatus,
  logout,
} from "../controllers/user.controller.js"
import { protect , isAdmin} from "../middlewares/auth.middleware.js"

const router = express.Router()


router.post("/logout", protect, logout)

// Profile routes
router.get("/profile", protect, getUserProfile)
router.put("/profile", protect, updateUserProfile)
router.put("/dietary-preferences", protect, updateDietaryPreferences)
router.put("/health-preferences", protect, updateHealthPreferences)

// Address routes
router.get("/addresses", protect, getAddresses)
router.post("/addresses", protect, addAddress)
router.put("/addresses/:addressId", protect, updateAddress)
router.delete("/addresses/:addressId", protect, deleteAddress)

// Wallet routes
router.get("/wallet", protect, getWallet)
router.post("/wallet/transaction", protect, isAdmin, addWalletTransaction)

// Favorites routes
router.get("/favorites", protect, getFavorites)
router.post("/favorites", protect, addToFavorites)
router.delete("/favorites/:menuItemId", protect, removeFromFavorites)

// Recommendations routes
router.get("/recommendations", protect, getRecommendations)

// Admin routes
router.get("/admin/users", protect, isAdmin, getAllUsers)
router.get("/admin/users/:userId", protect, isAdmin, getUserById)
router.put("/admin/users/:userId", protect, isAdmin, updateUserAdminStatus)

export default router
