import Bill from "../models/bill.model.js"
import TableSession from "../models/table-session.model.js"
import {Table} from "../models/table.model.js"
import {Order} from "../models/order.model.js"

// Get bill by ID
export const getBillById = async (req, res, next) => {
  try {
    const { billId } = req.params

    const bill = await Bill.findById(billId)
      .populate("tableSessionId", "tableId startTime endTime")
      .populate("processedBy", "fullName")

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" })
    }

    res.status(200).json({ bill })
  } catch (error) {
    next(error)
  }
}

// Get bill by table session
export const getBillByTableSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params

    const bill = await Bill.findOne({ tableSessionId: sessionId })
      .populate("tableSessionId", "tableId startTime endTime")
      .populate("processedBy", "fullName")

    if (!bill) {
      return res.status(404).json({ message: "Bill not found for this session" })
    }

    res.status(200).json({ bill })
  } catch (error) {
    next(error)
  }
}

// Get all bills (admin only)
export const getAllBills = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query

    const query = {}

    if (status) {
      query.paymentStatus = status
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    const bills = await Bill.find(query)
      .populate("tableSessionId", "tableId startTime endTime")
      .populate("processedBy", "fullName")
      .sort({ createdAt: -1 })

    res.status(200).json({ bills })
  } catch (error) {
    next(error)
  }
}

// Update bill payment status
export const updateBillPaymentStatus = async (req, res, next) => {
  try {
    const { billId } = req.params
    const { paymentStatus, paymentMethod } = req.body

    if (!paymentStatus) {
      return res.status(400).json({ message: "Payment status is required" })
    }

    const bill = await Bill.findById(billId)

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" })
    }

    // Update bill
    bill.paymentStatus = paymentStatus
    if (paymentMethod) {
      bill.paymentMethod = paymentMethod
    }
    bill.processedBy = req.userId // Set by auth middleware

    await bill.save()

    // If bill is paid, update session and table status
    if (paymentStatus === "paid") {
      const session = await TableSession.findById(bill.tableSessionId)
      if (session && session.status !== "closed") {
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
      }
    }

    res.status(200).json({
      message: "Bill payment status updated successfully",
      bill: {
        id: bill._id,
        paymentStatus: bill.paymentStatus,
        paymentMethod: bill.paymentMethod,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Generate bill for session
export const generateBillForSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params

    // Check if bill already exists
    const existingBill = await Bill.findOne({ tableSessionId: sessionId })
    if (existingBill) {
      return res.status(400).json({
        message: "Bill already exists for this session",
        billId: existingBill._id,
      })
    }

    const session = await TableSession.findById(sessionId)
    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    // Get all orders for this session
    const orders = await Order.find({ _id: { $in: session.orders } })

    // Calculate total
    const total = orders.reduce((sum, order) => sum + order.total, 0)

    // Create bill
    const bill = new Bill({
      tableSessionId: sessionId,
      total,
      paymentStatus: "pending",
    })

    await bill.save()

    // Update session status
    session.status = "payment_pending"
    await session.save()

    res.status(201).json({
      message: "Bill generated successfully",
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

// End session and generate bill
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
    session.status = "payment_pending"
    await session.save()

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
