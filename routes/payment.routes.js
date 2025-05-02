import express from "express"
import {
  createPaymentIntent,
  processPaymentSuccess,
  processWalletPayment,
  processCOD,
  addToWallet,
  confirmWalletTopup,
  getWallet,
  stripeWebhook,
  sendToBank,
} from "../controllers/payment.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = express.Router()

// Payment intent routes
router.post("/create-payment-intent", protect, createPaymentIntent)
router.post("/success", protect, processPaymentSuccess)

// Wallet routes
router.post("/wallet", protect, processWalletPayment)
router.get("/wallet", protect, getWallet)
router.post("/add-to-wallet", protect, addToWallet)
router.post("/confirm-wallet-topup", protect, confirmWalletTopup)
router.post("/send-to-bank", protect, sendToBank)

// COD route
router.post("/cod", protect, processCOD)

// Stripe webhook
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook)

export default router
