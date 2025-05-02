import express from "express"
import { getKitchenOrders } from "../controllers/order.controller.js"
import { protect } from "../middlewares/auth.middleware.js"

const router = express.Router()

// Get all active kitchen orders
router.get("/orders", getKitchenOrders)

// Mark order as preparing
router.put("/orders/:orderId/preparing", protect, async (req, res, next) => {
  try {
    const { orderId } = req.params

    // Update order status to preparing
    req.body.status = "preparing"

    // Forward to the updateOrderStatus controller
    return require("../controllers/order.controller.js").updateOrderStatus(req, res, next)
  } catch (error) {
    next(error)
  }
})

// Mark order as ready
router.put("/orders/:orderId/ready", protect, async (req, res, next) => {
  try {
    const { orderId } = req.params

    // Update order status to ready
    req.body.status = "ready"

    // Forward to the updateOrderStatus controller
    return require("../controllers/order.controller.js").updateOrderStatus(req, res, next)
  } catch (error) {
    next(error)
  }
})

// Mark order as delivered/completed
router.put("/orders/:orderId/completed", protect, async (req, res, next) => {
  try {
    const { orderId } = req.params

    // Update order status to delivered
    req.body.status = "delivered"

    // Forward to the updateOrderStatus controller
    return require("../controllers/order.controller.js").updateOrderStatus(req, res, next)
  } catch (error) {
    next(error)
  }
})

export default router
