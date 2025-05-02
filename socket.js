import {Table} from "./models/table.model.js"
import TableSession from "./models/table-session.model.js"
import { User } from "./models/user.model.js"
import { Order } from "./models/order.model.js"
import  Bill  from "./models/bill.model.js"

export const setupSocketIO = (io) => {
  // Store connected table devices
  const connectedTables = new Map()
  // Store connected kitchen devices
  const connectedKitchens = new Map()

  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`)

    // Table app registers itself with its table ID
    socket.on("register_table", async (data) => {
      try {
        const { tableId } = data

        if (!tableId) {
          socket.emit("error", { message: "Table ID is required" })
          return
        }

        // Validate table exists
        const table = await Table.findOne({ tableId: tableId })
        if (!table) {
          socket.emit("error", { message: "Table not found" })
          return
        }

        // Join a room specific to this table
        socket.join(`table_${tableId}`)

        // Store socket ID with table ID for direct messaging
        connectedTables.set(tableId, socket.id)

        console.log(`Table ${tableId} registered with socket ID: ${socket.id}`)

        socket.emit("table_registered", {
          success: true,
          message: `Table ${tableId} registered successfully`,
          tableData: {
            id: table._id,
            tableId: table.tableId,
            status: table.status,
            isActive: table.isActive,
          },
        })
      } catch (error) {
        console.error("Error registering table:", error)
        socket.emit("error", { message: "Failed to register table" })
      }
    })

    // Kitchen app registers itself
    socket.on("register_kitchen", async (data) => {
      try {
        const { kitchenId, stationName } = data

        // Join the kitchen room
        socket.join("kitchen")

        // Store kitchen socket info if needed
        if (kitchenId) {
          connectedKitchens.set(kitchenId, socket.id)
        }

        console.log(`Kitchen ${stationName || kitchenId || "station"} registered with socket ID: ${socket.id}`)

        // Fetch and send active orders
        try {
          const activeOrders = await Order.find({
            status: { $in: ["pending", "confirmed", "preparing"] },
          })
            .populate({
              path: "items.menuItem",
              select: "name image category", // Only necessary fields
            })
            .sort({ createdAt: 1 }) // Oldest first

          // Format orders payload (similar to new_kitchen_order payload)
          const formattedOrders = activeOrders.map(order => ({
              id: order._id,
              orderNumber: order._id.toString().slice(-6).toUpperCase(),
              items: order.items.map(item => ({
                  name: item.name,
                  quantity: item.quantity,
                  specialInstructions: item.specialInstructions,
                  // Include productId if needed by Flutter model
                  productId: `prod_${item.name}`, // Assuming this matches Flutter logic
                  // Category might not be populated here depending on populate above
                  category: item.menuItem ? item.menuItem.category : null,
                  // addons: item.addons || [], // Include if addons are stored
              })),
              orderType: order.orderType,
              // Resolve tableId from order.TableId if needed
              // tableId: await getTableIdentifier(order.TableId), // Example helper
              status: order.status,
              createdAt: order.createdAt,
          }));

          // Emit specifically to the registering kitchen socket
          socket.emit("initial_active_orders", formattedOrders);
          console.log(`Sent ${formattedOrders.length} active orders to kitchen ${socket.id}`);

        } catch (fetchError) {
            console.error("Error fetching/sending active orders:", fetchError);
            // Optionally emit an error back to the kitchen
            socket.emit("error", { message: "Failed to retrieve active orders." });
        }

        // Emit confirmation (keep existing confirmation)
        socket.emit("kitchen_registered", {
          success: true,
          message: `Kitchen ${stationName || "station"} registered successfully`,
          // Note: Removed activeOrders from here as they are sent separately
        })

      } catch (error) {
        console.error("Error registering kitchen:", error)
        socket.emit("error", { message: "Failed to register kitchen" })
      }
    })

    // Customer app initiates a session after scanning QR code
    socket.on("initiate_session", async (data) => {
      try {
        const { tableId, userId } = data

        if (!tableId || !userId) {
          socket.emit("error", { message: "Table ID and User ID are required" })
          return
        }

        // Validate table
        const table = await Table.findOne({ tableId: tableId })
        if (!table) {
          socket.emit("error", { message: "Table not found" })
          return
        }

        if (!table.isActive) {
          socket.emit("error", { message: "Table is not active" })
          return
        }

        if (table.status !== "available") {
          socket.emit("error", { message: "Table is not available" })
          return
        }

        // Validate user
        const user = await User.findById(userId)
        if (!user) {
          socket.emit("error", { message: "User not found" })
          return
        }

        // Check if there's an existing active session for this user
        const existingUserSession = await TableSession.findOne({
          clientId: userId,
          status: "active",
        })

        if (existingUserSession) {
          socket.emit("error", {
            message: "You already have an active session at another table",
            sessionId: existingUserSession._id,
            tableId: existingUserSession.tableId,
          })
          return
        }

        // Create a new session
        const session = new TableSession({
          tableId: table._id, // Use the MongoDB _id
          clientId: userId,
          startTime: new Date(),
          status: "active",
        })

        await session.save()

        // Update table status
        table.status = "occupied"
        table.currentSession = session._id
        await table.save()

        // Notify the table app to open the session
        io.to(`table_${tableId}`).emit("session_started", {
          sessionId: session._id,
          tableId: tableId,
          clientId: session.clientId,
          startTime: session.startTime,
          status: session.status,
        })

        // Also notify the customer app
        socket.emit("session_created", {
          sessionId: session._id,
          tableId: tableId,
          startTime: session.startTime,
          status: session.status,
        })

        console.log(`Session started for table ${tableId} by user ${userId}`)
      } catch (error) {
        console.error("Error initiating session:", error)
        socket.emit("error", { message: "Failed to initiate session" })
      }
    })

    // Customer app scans QR code
    socket.on("scan_qr_code", async (data) => {
      try {
        const { tableId, userId } = data

        if (!tableId || !userId) {
          socket.emit("error", { message: "Table ID and User ID are required" })
          return
        }

        // Validate table
        const table = await Table.findOne({ tableId: tableId })
        if (!table) {
          socket.emit("error", { message: "Table not found" })
          return
        }

        if (!table.isActive) {
          socket.emit("error", { message: "Table is not active" })
          return
        }

        if (table.status !== "available") {
          socket.emit("error", { message: "Table is not available" })
          return
        }

        // Validate user
        const user = await User.findById(userId)
        if (!user) {
          socket.emit("error", { message: "User not found" })
          return
        }

        // Check if there's an existing active session for this user
        const existingUserSession = await TableSession.findOne({
          clientId: userId,
          status: "active",
        })

        if (existingUserSession) {
          socket.emit("error", {
            message: "You already have an active session at another table",
            sessionId: existingUserSession._id,
            tableId: existingUserSession.tableId,
          })
          return
        }

        // Create a new session
        const session = new TableSession({
          tableId: table._id, // Use the MongoDB _id
          clientId: userId,
          startTime: new Date(),
          status: "active",
        })

        await session.save()

        // Update table status
        table.status = "occupied"
        table.currentSession = session._id
        await table.save()

        // Notify the table app to open the session
        io.to(`table_${tableId}`).emit("session_started", {
          sessionId: session._id,
          tableId: tableId,
          clientId: session.clientId,
          startTime: session.startTime,
          status: session.status,
          customerName: user.fullName || "Customer",
        })

        // Also notify the customer app
        socket.emit("session_created", {
          sessionId: session._id,
          tableId: tableId,
          startTime: session.startTime,
          status: session.status,
        })

        console.log(`Session started for table ${tableId} by user ${userId} via QR scan`)
      } catch (error) {
        console.error("Error processing QR code scan:", error)
        socket.emit("error", { message: "Failed to process QR code scan" })
      }
    })

    // Handle order updates to notify table app
    socket.on("order_placed", async (data) => {
      try {
        const { sessionId, orderId, tableId } = data

        if (!orderId) {
          socket.emit("error", { message: "Order ID is required" })
          return
        }

        // Get the order details
        const order = await Order.findById(orderId).populate({
          path: "items.menuItem",
          select: "name image category",
        })

        if (!order) {
          socket.emit("error", { message: "Order not found" })
          return
        }

        // Get table ID if available
        let orderTableId = null
        if (order.TableId) {
          // Find the table with this ID
          const table = await Table.findById(order.TableId)
          if (table) {
            orderTableId = table.tableId
          }
        }

        // Calculate preparation time (for countdown display)
        // const preparationTime = new Date()
        // preparationTime.setMinutes(preparationTime.getMinutes() + 15) // Default 15 min prep time

        // Emit to all connected kitchen clients
        // NOTE: This emission is already handled in the createOrder controller
        // We might only need to emit updates here, not the full new order
        /*
        io.to("kitchen").emit("new_kitchen_order", {
          orderId: order._id,
          orderNumber: order._id.toString().slice(-6).toUpperCase(), // Last 6 chars of ID
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
            category: item.menuItem ? item.menuItem.category : null,
            productId: `prod_${item.name}`,
          })),
          orderType: order.orderType,
          tableId: orderTableId,
          status: order.status,
          createdAt: order.createdAt,
          // preparationTime: preparationTime,
        })
        */

        // If sessionId is provided, notify the table app
        if (sessionId && tableId) {
          io.to(`table_${tableId}`).emit("new_order", {
            sessionId,
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

        console.log(`Order ${orderId} notification sent to table app (kitchen notified via controller)`)
      } catch (error) {
        console.error("Error handling order placed:", error)
        socket.emit("error", { message: "Failed to notify about order" })
      }
    })

    // Handle session end request
    socket.on("end_session", async (data) => {
      try {
        const { sessionId, tableId } = data

        if (!sessionId) {
          socket.emit("error", { message: "Session ID is required" })
          return
        }

        // Find the session
        const session = await TableSession.findById(sessionId)
        if (!session) {
          socket.emit("error", { message: "Session not found" })
          return
        }

        if (session.status === "closed") {
          socket.emit("error", { message: "Session is already closed" })
          return
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

        // Notify both table app and customer app
        const effectiveTableId = tableId || (table ? table.tableId : null);
        if(effectiveTableId) {
          io.to(`table_${effectiveTableId}`).emit("session_ended", {
            sessionId,
            bill: {
              id: bill._id,
              total: bill.total,
              paymentStatus: bill.paymentStatus,
            },
          })
        }

        // Also emit back to the caller (e.g., Kiosk app)
        socket.emit("session_ended_confirmation", {
          sessionId,
          bill: {
            id: bill._id,
            total: bill.total,
            paymentStatus: bill.paymentStatus,
          },
        })

        console.log(`Session ${sessionId} ended and bill created`)
      } catch (error) {
        console.error("Error ending session:", error)
        socket.emit("error", { message: "Failed to end session" })
      }
    })

    // Handle bill creation notification
    socket.on("bill_created", async (data) => {
      try {
        const { billId, sessionId, tableId } = data

        if (!billId || !sessionId) {
          socket.emit("error", { message: "Bill ID and Session ID are required" })
          return
        }

        // Notify the table app about the bill
        io.to(`table_${tableId}`).emit("bill_ready", {
          billId,
          sessionId,
        })

        console.log(`Bill ${billId} notification sent to table ${tableId}`)
      } catch (error) {
        console.error("Error handling bill creation:", error)
        socket.emit("error", { message: "Failed to notify about bill" })
      }
    })

    // Handle reservation events
    socket.on("make_reservation", async (data) => {
      try {
        const { userId, tableId, reservationTime } = data

        if (!userId || !tableId || !reservationTime) {
          socket.emit("error", { message: "User ID, Table ID, and reservation time are required" })
          return
        }

        // Notify admin about new reservation request
        io.emit("new_reservation_request", {
          userId,
          tableId,
          reservationTime,
        })

        console.log(`New reservation request from user ${userId} for table ${tableId}`)
      } catch (error) {
        console.error("Error handling reservation request:", error)
        socket.emit("error", { message: "Failed to process reservation request" })
      }
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      // Remove from connected tables if this was a table app
      for (const [tableId, socketId] of connectedTables.entries()) {
        if (socketId === socket.id) {
          connectedTables.delete(tableId)
          console.log(`Table with ID ${tableId} disconnected`)
          break
        }
      }

      // Remove from connected kitchens if this was a kitchen app
      for (const [kitchenId, socketId] of connectedKitchens.entries()) {
        if (socketId === socket.id) {
          connectedKitchens.delete(kitchenId)
          console.log(`Kitchen with ID ${kitchenId} disconnected`)
          break
        }
      }

      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  return io
}
