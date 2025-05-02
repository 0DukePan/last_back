import express from "express"
import {
  startSessionFromQRCode,
  getUserActiveSession,
  getSessionDetails,
  getActiveSessions,
  updateSessionStatus,
  initiateSessionViaSocket,
} from "../controllers/table-session.controller.js"
import { protect } from "../middlewares/auth.middleware.js"
import {Table} from "../models/table.model.js" // Import the Table model

const router = express.Router()

// Customer routes
router.post("/qr-scan", startSessionFromQRCode)
router.post("/initiate", initiateSessionViaSocket) // New route for Socket.IO initiation
router.get("/user/:userId", protect, getUserActiveSession)

// Table app routes
router.get("/:sessionId", getSessionDetails)
router.get("/", getActiveSessions)
router.put("/:sessionId/status", updateSessionStatus)

// Register device as a table and get QR code
router.post("/register-device", async (req, res, next) => {
  try {
    const { deviceId, deviceName } = req.body

    if (!deviceId) {
      return res.status(400).json({ message: "Device ID is required" })
    }

    // Check if device is already registered
    let table = await Table.findOne({ deviceId })

    if (table) {
      // Device already registered, return table info
      return res.status(200).json({
        message: "Device already registered",
        table: {
          id: table._id,
          tableNumber: table.tableNumber,
          qrCode: table.qrCode,
          status: table.status,
          isActive: table.isActive,
        },
      })
    }

    // Generate a new table number
    const lastTable = await Table.findOne().sort({ tableNumber: -1 })
    const tableNumber = lastTable ? lastTable.tableNumber + 1 : 1

    // Generate a unique QR code
    const qrCode = `TABLE_${tableNumber}_${Date.now()}`

    // Create new table
    table = new Table({
      qrCode,
      tableNumber,
      deviceId,
      status: "available",
      isActive: true,
      deviceName: deviceName || `Table ${tableNumber}`,
    })

    await table.save()

    res.status(201).json({
      message: "Device registered successfully",
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        qrCode: table.qrCode,
        status: table.status,
        isActive: table.isActive,
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
