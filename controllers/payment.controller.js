import Stripe from "stripe"
import { User } from "../models/user.model.js"
import { Order } from "../models/order.model.js"
import dotenv from "dotenv"
dotenv.config()

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "")

// @desc    Create payment intent
// @route   POST /api/payments/create-payment-intent
// @access  Private
export const createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Check if the order belongs to the user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" })
    }

    // Check if order is already paid
    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order is already paid" })
    }

    // Get or create Stripe customer
    const user = await User.findById(req.user._id)

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: user.fullName,
        phone: user.mobileNumber,
        email: user.email || undefined,
        metadata: {
          userId: user._id.toString(),
        },
      })

      user.stripeCustomerId = customer.id
      await user.save()
    }

    // Create payment intent
    const amount = Math.round(order.total * 100) // Convert to cents
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd", // Change as needed
      customer: user.stripeCustomerId,
      metadata: {
        orderId: order._id.toString(),
        userId: user._id.toString(),
      },
    })

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Process payment success
// @route   POST /api/payments/success
// @access  Private
export const processPaymentSuccess = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Check if the order belongs to the user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" })
    }

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment not successful" })
    }

    // Update order payment status
    order.paymentMethod = "card"
    order.paymentStatus = "paid"
    order.paymentId = paymentIntentId
    await order.save()

    res.status(200).json({
      message: "Payment processed successfully",
      order,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Process wallet payment
// @route   POST /api/payments/wallet
// @access  Private
export const processWalletPayment = async (req, res) => {
  try {
    const { orderId } = req.body

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Check if the order belongs to the user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" })
    }

    // Check if order is already paid
    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order is already paid" })
    }

    const user = await User.findById(req.user._id)

    if (user.wallet.balance < order.total) {
      return res.status(400).json({ message: "Insufficient wallet balance" })
    }

    // Deduct from wallet
    user.wallet.balance -= order.total
    user.wallet.transactions.push({
      amount: order.total,
      type: "debit",
      description: `Payment for order #${order._id}`,
    })

    await user.save()

    // Update order payment status
    order.paymentMethod = "wallet"
    order.paymentStatus = "paid"
    await order.save()

    res.status(200).json({
      message: "Payment processed successfully",
      order,
      walletBalance: user.wallet.balance,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Process cash on delivery
// @route   POST /api/payments/cod
// @access  Private
export const processCOD = async (req, res) => {
  try {
    const { orderId } = req.body

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Check if the order belongs to the user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" })
    }

    // Update order payment method
    order.paymentMethod = "cash"
    order.paymentStatus = "pending"
    await order.save()

    res.status(200).json({
      message: "Cash on delivery selected",
      order,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Add money to wallet using Stripe
// @route   POST /api/payments/add-to-wallet
// @access  Private
export const addToWallet = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" })
    }

    // Get or create Stripe customer
    const user = await User.findById(req.user._id)

    if (!user.stripeCustomerId && (paymentMethod === "stripe" || paymentMethod === "card")) {
      const customer = await stripe.customers.create({
        name: user.fullName,
        phone: user.mobileNumber,
        email: user.email || undefined,
        metadata: {
          userId: user._id.toString(),
        },
      })

      user.stripeCustomerId = customer.id
      await user.save()
    }

    // Create payment intent for Stripe
    if (paymentMethod === "stripe" || paymentMethod === "card") {
      const amountInCents = Math.round(amount * 100) // Convert to cents
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd", // Change as needed
        customer: user.stripeCustomerId,
        metadata: {
          type: "wallet_topup",
          userId: user._id.toString(),
          amount: amount.toString(),
        },
      })

      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        amount: amountInCents,
        paymentMethod,
      })
    }

    // For other payment methods (PayPal, etc.) - return a placeholder response
    // In a real app, you would integrate with those payment providers
    return res.status(200).json({
      message: "Payment initiated",
      amount,
      paymentMethod,
      redirectUrl: `/payment/${paymentMethod}?amount=${amount}`,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Confirm wallet top-up
// @route   POST /api/payments/confirm-wallet-topup
// @access  Private
export const confirmWalletTopup = async (req, res) => {
  try {
    const { paymentIntentId, amount, paymentMethod } = req.body

    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Verify payment intent for Stripe
    if (paymentMethod === "stripe" || paymentMethod === "card") {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ message: "Payment not successful" })
      }
    }

    // Add to wallet
    const parsedAmount = Number.parseFloat(amount)
    user.wallet.balance += parsedAmount
    user.wallet.transactions.push({
      amount: parsedAmount,
      type: "credit",
      description: `Added to wallet via ${paymentMethod}`,
    })

    await user.save()

    res.status(200).json({
      message: "Money added to wallet successfully",
      balance: user.wallet.balance,
      transaction: user.wallet.transactions[user.wallet.transactions.length - 1],
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Get wallet balance and transactions
// @route   GET /api/payments/wallet
// @access  Private
export const getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Format transactions for better display
    const formattedTransactions = user.wallet.transactions.map((transaction) => {
      return {
        _id: transaction._id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        date: transaction.date,
        formattedDate: new Date(transaction.date).toLocaleString(),
        // Add additional fields for UI display
        isDebit: transaction.type === "debit",
        isCredit: transaction.type === "credit",
        displayAmount:
          transaction.type === "debit" ? `-${transaction.amount.toFixed(2)}` : `${transaction.amount.toFixed(2)}`,
      }
    })

    res.status(200).json({
      balance: user.wallet.balance,
      formattedBalance: `${user.wallet.balance.toFixed(2)}`,
      transactions: formattedTransactions.sort((a, b) => b.date - a.date), // Sort by date descending
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

// @desc    Webhook for Stripe events
// @route   POST /api/payments/webhook
// @access  Public
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"]

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "")
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object

      // Handle wallet top-up
      if (paymentIntent.metadata.type === "wallet_topup") {
        const userId = paymentIntent.metadata.userId
        const amount = Number.parseFloat(paymentIntent.metadata.amount)

        const user = await User.findById(userId)
        if (user) {
          user.wallet.balance += amount
          user.wallet.transactions.push({
            amount,
            type: "credit",
            description: "Added to wallet via Stripe (webhook)",
          })
          await user.save()
        }
      }

      // Handle order payment
      if (paymentIntent.metadata.orderId) {
        const orderId = paymentIntent.metadata.orderId

        const order = await Order.findById(orderId)
        if (order && order.paymentStatus !== "paid") {
          order.paymentMethod = "card"
          order.paymentStatus = "paid"
          order.paymentId = paymentIntent.id
          await order.save()
        }
      }
      break

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object
      console.log(`Payment failed: ${failedPayment.id}`)
      break

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send()
}

// @desc    Send money to bank
// @route   POST /api/payments/send-to-bank
// @access  Private
export const sendToBank = async (req, res) => {
  try {
    const { amount, bankDetails } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" })
    }

    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (user.wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance" })
    }

    // Deduct from wallet
    user.wallet.balance -= amount
    user.wallet.transactions.push({
      amount,
      type: "debit",
      description: "Send to bank",
    })

    await user.save()

    // In a real app, you would integrate with a payment processor to transfer money to bank
    // This is a placeholder for demonstration

    res.status(200).json({
      message: "Money sent to bank successfully",
      balance: user.wallet.balance,
      transaction: user.wallet.transactions[user.wallet.transactions.length - 1],
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}
