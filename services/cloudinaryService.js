import { v2 as cloudinary } from "cloudinary"
import dotenv from "dotenv"
dotenv.config()

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload an image to Cloudinary
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} folder - Folder to upload to
 * @returns {Promise<Object>} - Cloudinary upload response
 */
export const uploadImage = async (imageBase64, folder = "food_delivery") => {
  try {
    if (!imageBase64) {
      throw new Error("No image provided")
    }

    // If image is already a URL and from Cloudinary, return it
    if (imageBase64.startsWith("http") && imageBase64.includes("cloudinary.com")) {
      return { secure_url: imageBase64 }
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(imageBase64, {
      folder,
      resource_type: "auto",
      transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
    })

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    }
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    throw new Error(`Failed to upload image: ${error.message}`)
  }
}

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Public ID of the image
 * @returns {Promise<Object>} - Cloudinary delete response
 */
export const deleteImage = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error("No public ID provided")
    }

    // If publicId is a full URL, extract the public ID
    if (publicId.startsWith("http")) {
      const urlParts = publicId.split("/")
      const filenameWithExtension = urlParts[urlParts.length - 1]
      const filename = filenameWithExtension.split(".")[0]
      const folderPath = urlParts[urlParts.length - 2]
      publicId = `${folderPath}/${filename}`
    }

    const result = await cloudinary.uploader.destroy(publicId)
    return result
  } catch (error) {
    console.error("Cloudinary delete error:", error)
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param {Array<string>} imagesBase64 - Array of base64 encoded images
 * @param {string} folder - Folder to upload to
 * @returns {Promise<Array<Object>>} - Array of Cloudinary upload responses
 */
export const uploadMultipleImages = async (imagesBase64, folder = "food_delivery") => {
  try {
    if (!imagesBase64 || !imagesBase64.length) {
      throw new Error("No images provided")
    }

    const uploadPromises = imagesBase64.map((image) => uploadImage(image, folder))
    return await Promise.all(uploadPromises)
  } catch (error) {
    console.error("Cloudinary multiple upload error:", error)
    throw new Error(`Failed to upload images: ${error.message}`)
  }
}
