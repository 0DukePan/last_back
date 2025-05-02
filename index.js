import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from 'http'; // Import Node.js http module
import { Server } from 'socket.io'; // Import Socket.IO Server
import { setupSocketIO } from './socket.js'; // Import your setup function
import authRoutes from "./routes/auth.routes.js"
// import userRoutes from "./routes/user.routes.js"
import orderRoutes from "./routes/order.routes.js"
import paymentRoutes from "./routes/payment.routes.js"
import menuItemRoutes from "./routes/menu-item.route.js"

import billRoutes from "./routes/bill.route.js"
import kitchenRoutes from "./routes/kitchen.route.js"
import tableRoutes from "./routes/table.route.js"
import tableSessionRoutes from "./routes/table-session.route.js"
import reservationRoutes from "./routes/reservation.route.js"
import { errorHandler, notFound } from "./middlewares/error.middleware.js"
import { apiRateLimiter } from "./middlewares/rateLimiter.js"

// Add imports for fs and path
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { connectDB } from "./lib/DB.js"

dotenv.config()

// Add this after dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const app = express();
const PORT = process.env.PORT || 5000;

// --- Create HTTP Server and Socket.IO Instance ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now, restrict in production
    methods: ["GET", "POST"]
  }
});

// --- Setup Socket.IO Event Handlers ---
setupSocketIO(io); // Pass the io instance to your setup function

// --- Middleware Setup ---
// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());

// Apply JSON and URL-encoded limits GLOBALLY *before* routes
// These will apply to all routes EXCEPT the ones that specifically use a different body parser (like the Stripe webhook below)
app.use(express.json({ limit: '10mb' })); // Apply increased limit for JSON
app.use(express.urlencoded({ limit: '10mb', extended: true })); // Apply increased limit for URL-encoded

// Apply rate limiter (can usually come after body parsers)
// Keep your webhook exclusion logic here if needed for rate limiting
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payments/webhook") {
    next();
  } else {
    apiRateLimiter(req, res, next);
  }
});

// --- Add Request Logger Middleware ---
app.use((req, res, next) => {
  console.log(`>>> Request Received: ${req.method} ${req.originalUrl}`);
  next(); // Pass control to the next middleware/router
});
// -----------------------------------


// --- Routes ---

// Stripe Webhook Route - Use express.raw specifically here BEFORE other payment routes might use express.json
// Make sure this route definition comes *before* the main '/api/payments' mount if it uses the same base path
app.post('/api/payments/webhook', express.raw({type: 'application/json'}), (req, res, next) => {
    
    console.log("Raw webhook processing route hit"); 
   
    res.status(200).send("Webhook handled placeholder"); 
});


// Mount other routes (these will use the global express.json with the 10mb limit)
app.use("/api/auth", authRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use("/api/payments", paymentRoutes); // Ensure this doesn't clash with the specific webhook route above
app.use("/api/orders", orderRoutes);

app.use("/api/kitchen", kitchenRoutes)
app.use("/api/bills", billRoutes)
app.use("/api/tables", tableRoutes)
app.use("/api/table-sessions", tableSessionRoutes)
app.use("/api/reservations", reservationRoutes)


app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Error handling middleware (comes last)
app.use(notFound);
app.use(errorHandler);

// --- Start Server --- 
// Use server.listen instead of app.listen
// Explicitly bind to 0.0.0.0 to accept connections from any interface
server.listen(PORT, '0.0.0.0', () => {
  connectDB();
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO listening on port ${PORT}`);
});

// Export the server or app if needed for testing, but listen starts it
// export default server; // Or export app
