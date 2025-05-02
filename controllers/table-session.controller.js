import TableSession from "../models/table-session.model.js"
import {Table} from "../models/table.model.js"
import { User } from "../models/user.model.js"
import {Order} from "../models/order.model.js"
import Bill from "../models/bill.model.js"

// Start a new table session from QR code scan
export const startSessionFromQRCode = async (req, res, next) => {
  try {
    const { tableId, userId } = req.body

    if (!tableId) {
      return res.status(400).json({ message: "Table ID is required" })
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" })
    }

    // Validate table
    const table = await Table.findById(tableId)
    if (!table) {
      return res.status(404).json({ message: "Table not found" })
    }

    if (!table.isActive) {
      return res.status(400).json({ message: "Table is not active" })
    }

    if (table.status !== "available") {
      return res.status(400).json({ message: "Table is not available" })
    }

    // Validate user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if there's an existing active session for this user
    const existingUserSession = await TableSession.findOne({
      clientId: userId,
      status: "active",
    })

    if (existingUserSession) {
      return res.status(400).json({
        message: "You already have an active session at another table",
        sessionId: existingUserSession._id,
        tableId: existingUserSession.tableId,
      })
    }

    // Create a new session
    const session = new TableSession({
      tableId,
      clientId: userId,
      startTime: new Date(),
      status: "active",
    })

    await session.save()

    // Update table status
    table.status = "occupied"
    table.currentSession = session._id
    await table.save()

    // Notify connected clients via Socket.IO if available
    if (req.io) {
      req.io.to(`table_${tableId}`).emit("session_started", {
        sessionId: session._id,
        tableId: session.tableId,
        clientId: session.clientId,
        startTime: session.startTime,
        status: session.status,
        customerName: user.fullName || "Customer", // Add customer name for display
      })
    }

    res.status(201).json({
      message: "Table session started successfully",
      session: {
        id: session._id,
        tableId: session.tableId,
        clientId: session.clientId,
        startTime: session.startTime,
        status: session.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get active session for a user
export const getUserActiveSession = async (req, res, next) => {
  try {
    const { userId } = req.params

    const session = await TableSession.findOne({
      clientId: userId,
      status: "active",
    }).populate("tableId", "tableNumber qrCode")

    if (!session) {
      return res.status(404).json({ message: "No active session found for this user" })
    }

    // Get orders for this session
    const orders = await Order.find({ _id: { $in: session.orders } })
      .populate({
        path: "items.menuItem",
        select: "name image price",
      })
      .sort({ createdAt: -1 })

    // Calculate session total
    const sessionTotal = orders.reduce((total, order) => total + order.total, 0)

    res.status(200).json({
      session: {
        id: session._id,
        table: session.tableId,
        startTime: session.startTime,
        status: session.status,
        orders,
        total: sessionTotal,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get session details
export const getSessionDetails = async (req, res, next) => {
  try {
    const { sessionId } = req.params

    const session = await TableSession.findById(sessionId)
      .populate("tableId", "qrCode tableNumber")
      .populate("clientId", "fullName email mobileNumber")
      .populate({
        path: "orders",
        select: "items subtotal tax total status paymentStatus",
        populate: {
          path: "items.menuItem",
          select: "name image price",
        },
      })

    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    // Calculate session total
    const sessionTotal = session.orders.reduce((total, order) => total + order.total, 0)

    // Check if bill exists for this session
    const bill = await Bill.findOne({ tableSessionId: sessionId })

    res.status(200).json({
      session: {
        id: session._id,
        table: session.tableId,
        client: session.clientId,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        orders: session.orders,
        total: sessionTotal,
        bill: bill
          ? {
              id: bill._id,
              total: bill.total,
              paymentStatus: bill.paymentStatus,
              paymentMethod: bill.paymentMethod,
            }
          : null,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get active sessions
export const getActiveSessions = async (req, res, next) => {
  try {
    const query = { status: { $in: ["active", "payment_pending"] } }

    const sessions = await TableSession.find(query)
      .populate("tableId", "qrCode tableNumber")
      .populate("clientId", "fullName mobileNumber")
      .sort({ startTime: -1 })

    res.status(200).json({ sessions })
  } catch (error) {
    next(error)
  }
}

// Update session status
export const updateSessionStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ message: "Status is required" })
    }

    if (!["active", "closed", "payment_pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" })
    }

    const session = await TableSession.findById(sessionId)

    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    // If closing a session, set end time
    if (status === "closed" && session.status !== "closed") {
      session.endTime = new Date()

      // Update table status
      const table = await Table.findById(session.tableId)
      if (table) {
        table.status = "cleaning"
        table.currentSession = null
        await table.save()
      }
    }

    session.status = status
    await session.save()

    // Notify connected clients via Socket.IO if available
    if (req.io) {
      req.io.to(`table_${session.tableId}`).emit("session_status_updated", {
        sessionId: session._id,
        status: session.status,
        endTime: session.endTime,
      })
    }

    res.status(200).json({
      message: "Session status updated successfully",
      session: {
        id: session._id,
        status: session.status,
        endTime: session.endTime,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Initiate session via Socket.IO (API endpoint for customer app)
export const initiateSessionViaSocket = async (req, res, next) => {
  try {
    const { tableId, userId } = req.body

    if (!tableId) {
      return res.status(400).json({ message: "Table ID is required" })
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" })
    }

    // Validate table
    const table = await Table.findById(tableId)
    if (!table) {
      return res.status(404).json({ message: "Table not found" })
    }

    if (!table.isActive) {
      return res.status(400).json({ message: "Table is not active" })
    }

    if (table.status !== "available") {
      return res.status(400).json({ message: "Table is not available" })
    }

    // Validate user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if there's an existing active session for this user
    const existingUserSession = await TableSession.findOne({
      clientId: userId,
      status: "active",
    })

    if (existingUserSession) {
      return res.status(400).json({
        message: "You already have an active session at another table",
        sessionId: existingUserSession._id,
        tableId: existingUserSession.tableId,
      })
    }

    // Use Socket.IO to notify the table app
    if (!req.io) {
      return res.status(500).json({ message: "Socket.IO is not available" })
    }

    // Emit event to the table app
    req.io.to(`table_${tableId}`).emit("initiate_session", {
      tableId,
      userId,
      timestamp: new Date(),
    })

    res.status(200).json({
      message: "Session initiation request sent to table",
      tableId,
      userId,
    })
  } catch (error) {
    next(error)
  }
}

// Add a new function to end a session and generate a bill
export const endSessionAndGenerateBill = async (req, res, next) => {
  try {
    const { sessionId } = req.params

    const session = await TableSession.findById(sessionId)
    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    if (session.status === "closed") {
      return res.status(400).json({ message: "Session is already closed" })
    }

    // Check if bill already exists
    let bill = await Bill.findOne({ tableSessionId: sessionId })

    if (!bill) {
      // Get all orders for this session
      const orders = await Order.find({ _id: { $in: session.orders } })

      // Calculate total
      const total = orders.reduce((sum, order) => sum + order.total, 0)

      // Create bill
      bill = new Bill({
        tableSessionId: sessionId,
        total,
        paymentStatus: "pending",
      })

      await bill.save()
    }

    // Update session status
    session.status = "closed"
    session.endTime = new Date()
    await session.save()

    // Update table status
    const table = await Table.findById(session.tableId)
    if (table) {
      table.status = "cleaning"
      table.currentSession = null
      await table.save()
    }

    // Notify connected clients via Socket.IO if available
    if (req.io) {
      req.io.to(`table_${session.tableId}`).emit("session_ended", {
        sessionId: session._id,
        bill: {
          id: bill._id,
          total: bill.total,
          paymentStatus: bill.paymentStatus,
        },
      })
    }

    res.status(200).json({
      message: "Session ended and bill generated successfully",
      bill: {
        id: bill._id,
        total: bill.total,
        paymentStatus: bill.paymentStatus,
      },
    })
  } catch (error) {
    next(error)
  }
}
