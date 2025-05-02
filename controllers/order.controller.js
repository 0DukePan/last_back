import { Table } from "../models/table.model.js"
import { Order } from "../models/order.model.js"
import MenuItem from "../models/menuItem.model.js"
import TableSession from "../models/table-session.model.js"
import { User } from "../models/user.model.js"

// Create a new order
export const createOrder = async (req, res, next) => {
  try {
    const { userId, items, deliveryAddress, deliveryInstructions, paymentMethod, sessionId, tableId, orderType } =
      req.body

    if (!items || !items.length || !orderType) {
      return res.status(400).json({ message: "Items and order type are required" })
    }
     // Validate user if userId is provided
     if (userId) {
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
    }

    // Calculate order details
    let subtotal = 0
    const orderItems = []

    for (const item of items) {
      const { menuItemId, quantity, specialInstructions } = item

      if (!menuItemId || !quantity) {
        return res.status(400).json({ message: "Menu item ID and quantity are required for each item" })
      }

      const menuItem = await MenuItem.findById(menuItemId)
      if (!menuItem) {
        return res.status(404).json({ message: `Menu item with ID ${menuItemId} not found` })
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({ message: `Menu item ${menuItem.name} is not available` })
      }

      // Calculate item total
      const itemPrice = menuItem.price
      const total = itemPrice * quantity
      subtotal += total

      orderItems.push({
        menuItem: menuItemId,
        name: menuItem.name,
        price: itemPrice,
        quantity,
        total,
        specialInstructions: specialInstructions || "",
         // Add productId here to match Flutter model expectations
         productId: `prod_${menuItem.name}`,
      })
    }

    // Set delivery fee based on order type
    const deliveryFee = orderType === "Delivery" ? 2.0 : 0
    const total = subtotal + deliveryFee

    // Find table by tableId if provided
    let tableDbId = null
    if (tableId) {
      const table = await Table.findOne({ tableId: tableId })
      if (table) {
        tableDbId = table._id
      }
    }

    // Create the order
    const order = new Order({
      user: userId,
      items: orderItems,
      TableId: tableDbId,
      subtotal,
      deliveryFee,
      total,
      orderType,
      paymentStatus: "pending",
      paymentMethod: paymentMethod || "cash",
      deliveryAddress: deliveryAddress || {
        address: orderType === "Dine In" ? "Dine-in" : "Pick up at restaurant",
        apartment: "",
        landmark: "",
        latitude: 0,
        longitude: 0,
      },
      deliveryInstructions: deliveryInstructions || "",
    })

    await order.save()

    // If session ID is provided, add order to the session
    if (sessionId) {
      const session = await TableSession.findById(sessionId)
      if (!session) {
        return res.status(404).json({ message: "Session not found" })
      }

      session.orders.push(order._id)
      await session.save()

      // Notify connected clients via Socket.IO
      if (req.io) {
        req.io.to(`table_${tableId}`).emit("new_order", {
          sessionId: session._id,
          orderId: order._id,
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })),
          total: order.total,
          status: order.status,
        })
      }
    }

    // Notify kitchen app about the new order
    if (req.io) {
      // Fetch complete order details with menu item information
      const populatedOrder = await Order.findById(order._id).populate({
        path: "items.menuItem",
        select: "name image category",
      })

      // Emit to all connected kitchen clients with original tableId key
      req.io.to("kitchen").emit("new_kitchen_order", {
        id: order._id,
        orderNumber: order._id.toString().slice(-6).toUpperCase(),
        items: populatedOrder.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
          category: item.menuItem ? item.menuItem.category : null,
          // Include productId here as well for consistency
          productId: `prod_${item.name}`,
        })),
        orderType: order.orderType,
        tableId: tableId,
        status: order.status,
        createdAt: order.createdAt,
      })
    }

    res.status(201).json({
      message: "Order created successfully",
      order: {
        id: order._id,
        items: order.items,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        orderType: order.orderType,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get order details
export const getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params

    const order = await Order.findById(orderId).populate({
      path: "items.menuItem",
      select: "name image price",
    })

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.status(200).json({ order })
  } catch (error) {
    next(error)
  }
}

// Update order status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ message: "Status is required" })
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Update order status
    order.status = status
    await order.save()

    // Notify kitchen about status update
    if (req.io) {
      req.io.to("kitchen").emit("order_status_updated", {
        orderId: order._id,
        status: order.status,
        updatedAt: new Date(),
      })
    }

    res.status(200).json({
      message: "Order status updated successfully",
      order: {
        id: order._id,
        status: order.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get orders by user
export const getOrdersByUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { status } = req.query

    const query = { user: userId }
    if (status) {
      query.status = status
    }

    const orders = await Order.find(query)
      .populate("restaurant", "name logo")
      .select("items subtotal total status createdAt")
      .sort({ createdAt: -1 })

    res.status(200).json({ orders })
  } catch (error) {
    next(error)
  }
}

// Get orders by session
export const getOrdersBySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params

    const session = await TableSession.findById(sessionId)
    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    const orders = await Order.find({ _id: { $in: session.orders } })
      .populate({
        path: "items.menuItem",
        select: "name image isVeg",
      })
      .sort({ createdAt: -1 })

    // Calculate session total
    const sessionTotal = orders.reduce((total, order) => total + order.total, 0)

    res.status(200).json({
      sessionId: session._id,
      tableId: session.tableId,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      orders,
      sessionTotal,
    })
  } catch (error) {
    next(error)
  }
}

// Get all active kitchen orders
export const getKitchenOrders = async (req, res, next) => {
  try {
    // Get orders that are pending, confirmed, or preparing
    const orders = await Order.find({
      status: { $in: ["pending", "confirmed", "preparing"] },
    })
      .populate({
        path: "items.menuItem",
        select: "name image category",
      })
      .populate("TableId", "tableNumber") // Changed from tableId to TableId
      .sort({ createdAt: 1 }) // Oldest first

    // Format orders for kitchen display
    const formattedOrders = await Promise.all(
      orders.map(async (order) => {
        // Calculate elapsed time in minutes
        const elapsedMinutes = Math.floor((new Date() - order.createdAt) / (1000 * 60))

        // Get table identifier (use tableId directly if stored, else tableNumber)
        let tableIdentifier = null
        if (order.TableId && order.TableId.tableNumber) { // Check if populated and has number
            tableIdentifier = order.TableId.tableNumber;
        } else if (order.TableId) { // Fallback: Look up if not populated
            const table = await Table.findById(order.TableId);
            if (table) {
                tableIdentifier = table.tableNumber; // Or table.tableId if needed
          }
        }

        return {
          id: order._id,
          orderNumber: order._id.toString().slice(-6).toUpperCase(), // Last 6 chars of ID
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
            category: item.menuItem ? item.menuItem.category : null,
             // Include productId here to match Flutter model expectations
             productId: `prod_${item.name}`,
          })),
          orderType: order.orderType,
          tableIdentifier: tableIdentifier, // Renamed for clarity
          status: order.status,
          createdAt: order.createdAt,
          elapsedTime: `${Math.floor(elapsedMinutes / 60)}:${(elapsedMinutes % 60).toString().padStart(2, "0")}`,
        }
      }),
    )

    res.status(200).json({ orders: formattedOrders })
  } catch (error) {
    next(error)
  }
}

// Get Completed Kitchen Orders
export const getCompletedKitchenOrders = async (req, res, next) => {
  console.log("--- GET /api/orders/kitchen/completed CONTROLLER HIT ---");
  try {
    // Define completed statuses (adjust as needed for your workflow)
    const completedStatuses = ["ready_for_pickup"];
    const limit = parseInt(req.query.limit || '50'); // Limit results, default 50

    const orders = await Order.find({
      status: { $in: completedStatuses },
    })
      .populate({
        path: "items.menuItem",
        select: "name image category", // Select fields needed for display
      })
      // .populate("TableId", "tableNumber") // Optionally populate table info if needed
      .sort({ updatedAt: -1 }) // Sort by last updated time (descending)
      .limit(limit);

    // Format orders for display (similar structure to active orders)
    const formattedOrders = orders.map(order => ({
      id: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
        category: item.menuItem ? item.menuItem.category : null,
        productId: `prod_${item.name}`, // Consistent productId
      })),
      orderType: order.orderType,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt, // Include completion time (last update)
      // tableIdentifier: order.TableId ? order.TableId.tableNumber : null, // If populated
    }));

    res.status(200).json({ orders: formattedOrders });

  } catch (error) {
    console.error("Error fetching completed kitchen orders:", error);
    next(error); // Pass error to global error handler
  }
};

// Update payment status
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params
    const { paymentStatus, paymentId } = req.body

    if (!paymentStatus) {
      return res.status(400).json({ message: "Payment status is required" })
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Update payment status
    order.paymentStatus = paymentStatus
    if (paymentId) {
      order.paymentId = paymentId
    }
    await order.save()

    // If this order is part of a session and all orders are paid, update session status
    const session = await TableSession.findOne({ orders: orderId })
    if (session && session.status === "payment_pending") {
      const unpaidOrders = await Order.countDocuments({
        _id: { $in: session.orders },
        paymentStatus: { $ne: "paid" },
      })

      if (unpaidOrders === 0) {
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
      message: "Payment status updated successfully",
      order: {
        id: order._id,
        paymentStatus: order.paymentStatus,
        paymentId: order.paymentId,
      },
    })
  } catch (error) {
    next(error)
  }
}
