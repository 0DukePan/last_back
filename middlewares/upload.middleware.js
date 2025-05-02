import multer from "multer"
import path from "path"

// Set up storage for temporary file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

// File filter to only allow certain file types
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|webp/
  const mimetype = filetypes.test(file.mimetype)
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

  if (mimetype && extname) {
    return cb(null, true)
  }
  cb(new Error("Only image files are allowed!"))
}

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  fileFilter: fileFilter,
})

export const uploadSingle = upload.single("image")
export const uploadMultiple = upload.array("images", 5) // Max 5 images

// Middleware to handle multer errors
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Max size is 5MB." })
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` })
  } else if (err) {
    return res.status(400).json({ message: err.message })
  }
  next()
}
