export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`)
    res.status(404)
    next(error)
  }
  
  export const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode
    let message = err.message
  
    // Handle specific social login errors
    if (err.name === "SocialLoginError") {
      statusCode = err.statusCode || 400
      message = err.message
    }
  
    // Handle Axios errors from social provider APIs
    if (err.isAxiosError) {
      statusCode = err.response?.status || 503
      message = err.response?.data?.error?.message || "Failed to communicate with social provider"
    }
  
    // Handle JWT errors
    if (err.name === "JsonWebTokenError") {
      statusCode = 401
      message = "Invalid token"
    }
  
    // Handle validation errors
    if (err.name === "ValidationError") {
      statusCode = 400
      message = Object.values(err.errors)
        .map((val) => val.message)
        .join(", ")
    }
  
    res.status(statusCode).json({
      success: false,
      message,
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
      ...(process.env.NODE_ENV !== "production" && {
        type: err.name,
        ...(err.response?.data && { providerError: err.response.data }),
      }),
    })
  }
  