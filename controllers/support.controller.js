import { Support } from "../models/support.model.js"
import { User } from "../models/user.model.js"

// @desc    Create support ticket
// @route   POST /api/support
// @access  Private
export const createSupportTicket = async (req, res) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ message: "Message is required" })
    }

    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const ticket = await Support.create({
      user: req.user._id,
      message,
      phone: user.phone,
      status: "open",
    })

    res.status(201).json({
      message: "Support ticket created successfully",
      ticket,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Get user support tickets
// @route   GET /api/support
// @access  Private
export const getUserTickets = async (req, res) => {
  try {
    const tickets = await Support.find({ user: req.user._id }).sort({ createdAt: -1 })

    res.status(200).json(tickets)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Get support ticket by ID
// @route   GET /api/support/:id
// @access  Private
export const getTicketById = async (req, res) => {
  try {
    const ticket = await Support.findById(req.params.id)

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    // Check if the ticket belongs to the user
    if (ticket.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: "Not authorized" })
    }

    res.status(200).json(ticket)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Add reply to support ticket
// @route   POST /api/support/:id/reply
// @access  Private
export const addReply = async (req, res) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ message: "Message is required" })
    }

    const ticket = await Support.findById(req.params.id)

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    // Check if the ticket belongs to the user
    if (ticket.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: "Not authorized" })
    }

    ticket.replies.push({
      message,
      isAdmin: req.user.isAdmin,
      user: req.user._id,
    })

    // Update status if admin replies
    if (req.user.isAdmin) {
      ticket.status = "responded"
    } else {
      ticket.status = "open"
    }

    await ticket.save()

    res.status(200).json({
      message: "Reply added successfully",
      ticket,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Close support ticket
// @route   PUT /api/support/:id/close
// @access  Private
export const closeTicket = async (req, res) => {
  try {
    const ticket = await Support.findById(req.params.id)

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    // Check if the ticket belongs to the user
    if (ticket.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: "Not authorized" })
    }

    ticket.status = "closed"
    await ticket.save()

    res.status(200).json({
      message: "Ticket closed successfully",
      ticket,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}
