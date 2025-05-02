import express from "express"
import {
  getAllTables,
  getTableDetails,
  updateTableStatus,
  startTableSession,
  endTableSession,
  getTableByQrCode,
  getTableForQRCode,
  getTableByDeviceId,
  registerDeviceWithTable,
} from "../controllers/table.controller.js"

const router = express.Router()

// Public routes for kiosk
router.get("/", getAllTables)
router.get("/:tableId", getTableDetails)
router.get("/qr/:qrCode", getTableByQrCode)
router.post("/:tableId/session", startTableSession)
router.put("/session/:sessionId/end", endTableSession)

// Admin routes
router.put("/:tableId/status", updateTableStatus)
router.post("/register-device-with-table", registerDeviceWithTable)

// Get table for QR code generation
router.get("/qr-code/:tableId", getTableForQRCode)

// Get table by device ID
router.get("/device/:deviceId", getTableByDeviceId)

// Register device as a table
// router.post("/register-device", registerTableDevice)

export default router
