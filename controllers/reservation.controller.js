import Reservation from "../models/reservation.model.js"
import { Table } from "../models/table.model.js"
// Create a new reservation
export const createReservation = async (req, res, next) => {
  try {
    const { tableId, reservationTime, preSelectedMenu } = req.body
    const userId = req.userId // Set by auth middleware

    if (!tableId || !reservationTime) {
      return res.status(400).json({ message: "Table ID and reservation time are required" })
    }

    // Validate table
    const table = await Table.findById(tableId)
    if (!table) {
      return res.status(404).json({ message: "Table not found" })
    }

    // Check if table is active
    if (!table.isActive) {
      return res.status(400).json({ message: "Table is not active" })
    }

    // Check if table is already reserved for the requested time
    const reservationDate = new Date(reservationTime)
    const startTime = new Date(reservationDate)
    startTime.setHours(startTime.getHours() - 1) // 1 hour before

    const endTime = new Date(reservationDate)
    endTime.setHours(endTime.getHours() + 2) // 2 hours after

    const existingReservation = await Reservation.findOne({
      tableId,
      reservationTime: { $gte: startTime, $lte: endTime },
      status: { $in: ["confirmed", "completed"] },
    })

    if (existingReservation) {
      return res.status(400).json({ message: "Table is already reserved for this time" })
    }

    // Create reservation
    const reservation = new Reservation({
      userId,
      tableId,
      reservationTime: reservationDate,
      preSelectedMenu: preSelectedMenu || [],
    })

    await reservation.save()

    res.status(201).json({
      message: "Reservation created successfully",
      reservation: {
        id: reservation._id,
        tableId: reservation.tableId,
        reservationTime: reservation.reservationTime,
        status: reservation.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get reservation by ID
export const getReservationById = async (req, res, next) => {
  try {
    const { reservationId } = req.params
    const userId = req.userId // Set by auth middleware

    const reservation = await Reservation.findById(reservationId).populate("tableId", "tableNumber").populate({
      path: "preSelectedMenu.menuItemId",
      select: "name price image",
    })

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" })
    }

    // Check if user is authorized to view this reservation
    if (reservation.userId.toString() !== userId && !req.isAdmin) {
      return res.status(403).json({ message: "Not authorized to view this reservation" })
    }

    res.status(200).json({ reservation })
  } catch (error) {
    next(error)
  }
}

// Get user reservations
export const getUserReservations = async (req, res, next) => {
  try {
    const userId = req.userId // Set by auth middleware
    const { status } = req.query

    const query = { userId }
    if (status) {
      query.status = status
    }

    const reservations = await Reservation.find(query).populate("tableId", "tableNumber").sort({ reservationTime: -1 })

    res.status(200).json({ reservations })
  } catch (error) {
    next(error)
  }
}

// Update reservation status
export const updateReservationStatus = async (req, res, next) => {
  try {
    const { reservationId } = req.params
    const { status } = req.body
    const userId = req.userId // Set by auth middleware

    if (!status) {
      return res.status(400).json({ message: "Status is required" })
    }

    const reservation = await Reservation.findById(reservationId)

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" })
    }

    // Check if user is authorized to update this reservation
    if (reservation.userId.toString() !== userId && !req.isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this reservation" })
    }

    // Update reservation status
    reservation.status = status
    await reservation.save()

    res.status(200).json({
      message: "Reservation status updated successfully",
      reservation: {
        id: reservation._id,
        status: reservation.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get table reservations (admin only)
export const getTableReservations = async (req, res, next) => {
  try {
    const { tableId } = req.params
    const { date } = req.query

    const query = { tableId }
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      query.reservationTime = { $gte: startDate, $lte: endDate }
    }

    const reservations = await Reservation.find(query)
      .populate("userId", "fullName mobileNumber")
      .sort({ reservationTime: 1 })

    res.status(200).json({ reservations })
  } catch (error) {
    next(error)
  }
}

// Get all reservations (admin only)
export const getAllReservations = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query

    const query = {}
    if (status) {
      query.status = status
    }

    if (startDate && endDate) {
      query.reservationTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    const reservations = await Reservation.find(query)
      .populate("userId", "fullName mobileNumber")
      .populate("tableId", "tableNumber")
      .sort({ reservationTime: -1 })

    res.status(200).json({ reservations })
  } catch (error) {
    next(error)
  }
}
