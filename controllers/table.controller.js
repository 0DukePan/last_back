import {Table} from "../models/table.model.js"
import TableSession from "../models/table-session.model.js"

// Get all tables with status
export const getAllTables = async (req, res, next) => {
  try {
    const tables = await Table.find()
      .populate({
        path: "currentSession",
        select: "startTime orders status totalAmount",
        populate: {
          path: "orders",
          select: "items totalAmount status",
        },
      })
      .sort({ createdAt: 1 })

    // Format response - removed tableNumber
    const formattedTables = tables.map((table) => ({
      id: table._id,
      qrCode: table.qrCode,
      deviceId: table.deviceId,
      status: table.status,
      isActive: table.isActive,
      currentSession: table.currentSession
        ? {
            id: table.currentSession._id,
            startTime: table.currentSession.startTime,
            orderCount: table.currentSession.orders.length,
            totalAmount: table.currentSession.totalAmount,
            status: table.currentSession.status,
          }
        : null,
    }))

    res.status(200).json({ tables: formattedTables })
  } catch (error) {
    next(error)
  }
}

// Get table details with current session
export const getTableDetails = async (req, res, next) => {
  try {
    const { tableId } = req.params
    const { locale = "en" } = req.query

    const table = await Table.findById(tableId).populate({
      path: "currentSession",
      populate: {
        path: "orders",
        populate: {
          path: "items.foodItem",
          select: "name image isVeg",
        },
      },
    })

    if (!table) {
      return res.status(404).json({ message: "Table not found" })
    }

    // Format response - removed tableNumber
    const result = {
      id: table._id,
      qrCode: table.qrCode,
      deviceId: table.deviceId,
      status: table.status,
      isActive: table.isActive,
    }

    if (table.currentSession) {
      const session = table.currentSession
      const elapsedMinutes = Math.floor((new Date() - session.startTime) / (1000 * 60))

      result.session = {
        id: session._id,
        startTime: session.startTime,
        elapsedTime: `${Math.floor(elapsedMinutes / 60)}:${(elapsedMinutes % 60).toString().padStart(2, "0")}`,
        status: session.status,
        totalAmount: session.totalAmount,
        orders: session.orders.map((order) => ({
          id: order._id,
          items: order.items.map((item) => ({
            id: item._id,
            foodItem: {
              id: item.foodItem._id,
              name: item.foodItem.name[locale] || item.foodItem.name.en || Object.values(item.foodItem.name)[0],
              image: item.foodItem.image,
              isVeg: item.foodItem.isVeg,
            },
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
          totalAmount: order.totalAmount,
          status: order.status,
        })),
      }
    }

    res.status(200).json({ table: result })
  } catch (error) {
    next(error)
  }
}

// Update table status
export const updateTableStatus = async (req, res, next) => {
  try {
    const { tableId } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ message: "Status is required" })
    }

    const table = await Table.findById(tableId)

    if (!table) {
      return res.status(404).json({ message: "Table not found" })
    }

    // If table has an active session and status is being changed to available
    if (table.currentSession && status === "available") {
      // End the current session
      await TableSession.findByIdAndUpdate(table.currentSession, {
        status: "completed",
        endTime: new Date(),
      })
      table.currentSession = null
    }

    table.status = status
    await table.save()

    res.status(200).json({
      message: "Table status updated successfully",
      table: {
        id: table._id,
        qrCode: table.qrCode,
        deviceId: table.deviceId,
        status: table.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Create or update table
export const createOrUpdateTable = async (req, res, next) => {
  try {
    const { tableId } = req.params
    const { qrCode, deviceId, isActive } = req.body

    if (!qrCode || !deviceId) {
      return res.status(400).json({ message: "QR code and device ID are required" })
    }

    let table
    let message

    if (tableId) {
      // Update existing table
      table = await Table.findById(tableId)

      if (!table) {
        return res.status(404).json({ message: "Table not found" })
      }

      table.qrCode = qrCode
      table.deviceId = deviceId

      if (isActive !== undefined) {
        table.isActive = isActive
      }

      message = "Table updated successfully"
    } else {
      // Create new table
      table = new Table({
        qrCode,
        deviceId,
        isActive: isActive !== undefined ? isActive : false,
      })

      message = "Table created successfully"
    }

    await table.save()

    res.status(200).json({
      message,
      table: {
        id: table._id,
        qrCode: table.qrCode,
        deviceId: table.deviceId,
        status: table.status,
        isActive: table.isActive,
      },
    })
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        message: "QR code or device ID already exists. Please use unique values.",
      })
    }
    next(error)
  }
}

// Start a new table session
export const startTableSession = async (req, res, next) => {
  try {
    const { tableId } = req.params

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

    // Create a new session
    const session = new TableSession({
      table: tableId,
      startTime: new Date(),
    })

    await session.save()

    // Update table status and current session
    table.status = "occupied"
    table.currentSession = session._id
    await table.save()

    res.status(201).json({
      message: "Table session started successfully",
      session: {
        id: session._id,
        tableId: table._id,
        deviceId: table.deviceId,
        startTime: session.startTime,
        status: session.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// End a table session
export const endTableSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params

    const session = await TableSession.findById(sessionId)

    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    if (session.status !== "active") {
      return res.status(400).json({ message: "Session is not active" })
    }

    // End the session
    session.status = "completed"
    session.endTime = new Date()
    await session.save()

    // Update table status
    const table = await Table.findById(session.table)
    if (table) {
      table.status = "cleaning"
      table.currentSession = null
      await table.save()
    }

    res.status(200).json({
      message: "Table session ended successfully",
      session: {
        id: session._id,
        tableId: session.table,
        endTime: session.endTime,
        status: session.status,
        totalAmount: session.totalAmount,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get table by QR code
export const getTableByQrCode = async (req, res, next) => {
  try {
    const { qrCode } = req.params

    const table = await Table.findOne({ qrCode })

    if (!table) {
      return res.status(404).json({ message: "Table not found" })
    }

    if (!table.isActive) {
      return res.status(400).json({ message: "Table is not active" })
    }

    res.status(200).json({
      table: {
        id: table._id,
        qrCode: table.qrCode,
        deviceId: table.deviceId,
        status: table.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get table for QR code generation
export const getTableForQRCode = async (req, res, next) => {
  try {
    const { tableId } = req.params

    // If tableId is provided, get that specific table
    if (tableId) {
      const table = await Table.findById(tableId)

      if (!table) {
        return res.status(404).json({ message: "Table not found" })
      }

      return res.status(200).json({
        table: {
          id: table._id,
          deviceId: table.deviceId,
          qrCode: table.qrCode,
          status: table.status,
          isActive: table.isActive,
        },
      })
    }

    // If no tableId is provided, return an error
    return res.status(400).json({ message: "Table ID is required" })
  } catch (error) {
    next(error)
  }
}

// Get table by device ID or MAC address
export const getTableByDeviceId = async (req, res, next) => {
  try {
    const { deviceId } = req.params

    if (!deviceId) {
      return res.status(400).json({ message: "Device ID is required" })
    }

    const table = await Table.findOne({ deviceId })

    if (!table) {
      return res.status(404).json({ message: "No table found for this device" })
    }

    res.status(200).json({
      table: {
        id: table._id,
        deviceId: table.deviceId,
        qrCode: table.qrCode,
        status: table.status,
        isActive: table.isActive,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Register device with table
export const registerDeviceWithTable = async (req, res, next) => {
  // --- Start Debug Logging ---
  console.log("--- registerDeviceWithTable --- ");
  console.log("Request Body:", req.body);
  // --- End Debug Logging ---
  try {
    const { tableId } = req.body; // Get tableId from request body

    if (!tableId) {
      console.error("Registration Error: Device ID (tableId) is missing in request body.");
      // Send 400 if tableId is missing, as it's required
      return res.status(400).json({ message: "Device ID (tableId) is required in the request body" });
    }
    
    console.log(`Attempting to find/register table with tableId: ${tableId}`);

    // Check if a table with this device ID (tableId) already exists
    let table = await Table.findOne({ tableId: tableId });

    if (table) {
      console.log(`Found existing table (ID: ${table._id}) for tableId: ${tableId}. Setting isActive=true.`);
      table.isActive = true;
    } else {
      console.log(`No existing table found for tableId: ${tableId}. Creating new table.`);
      // Create new table with the provided tableId
      table = new Table({
        tableId: tableId, // Correctly use tableId from req.body
        status: "available",
        isActive: true,
        // Add other default fields if necessary according to your model
      });
      console.log("New table object created (before save):", JSON.stringify(table.toObject(), null, 2));
    }

    // --- Add try/catch specifically around save --- 
    try {
      await table.save();
      console.log(`Table saved successfully. DB ID: ${table._id}, TableId: ${table.tableId}`);
    } catch(saveError) {
       console.error("!!! Error saving table !!!");
       console.error("Table object before save attempt:", JSON.stringify(table.toObject(), null, 2));
       console.error("Mongoose Save Error:", saveError);
       // Pass the specific save error to the error handler
       return next(saveError); 
    }
    // --- End try/catch for save --- 

    // --- Session creation block REMOVED as per previous discussion --- 
    // // Check if there's already an active session for this table
    // const existingSession = await TableSession.findOne({ ... });
    // let session = existingSession;
    // if (!existingSession && table.status === "available") { ... }
    // --- End Session creation block ---

    console.log("Sending successful registration response.");
    // Respond with success and table details (excluding session)
    res.status(200).json({
      message: "Device registered successfully",
      table: {
        id: table._id, // Send the MongoDB ID
        tableId: table.tableId, // Send the identifier used
        status: table.status,
        isActive: table.isActive,
        // Include deviceId if it exists in your model and you want to return it
        // deviceId: table.deviceId, 
      },
      session: null, // Explicitly null as we are not creating sessions here
    });
  } catch (error) {
    // Catch any other errors during the process (e.g., findOne error)
    console.error("!!! Error in registerDeviceWithTable (outside save block) !!!", error);
    // Pass the error to the central error handler
    next(error); 
  }
};
