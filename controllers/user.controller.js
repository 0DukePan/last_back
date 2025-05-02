import { User } from "../models/user.model"

export const getUserProfile = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
  
      const user = await User.findById(userId).select("-refreshToken -__v").populate("favorites", "name image price")
  
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      res.status(200).json({ user })
    } catch (error) {
      next(error)
    }
  }
  
  // Update user profile
  export const updateUserProfile = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
      const { fullName, email } = req.body
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      // Update fields if provided
      if (fullName) user.fullName = fullName
      if (email) user.email = email
  
      await user.save()
  
      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
        },
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Update dietary preferences
  export const updateDietaryPreferences = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
      const { vegetarian, vegan, glutenFree, dairyFree } = req.body
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      // Update dietary preferences
      user.dietaryProfile = {
        vegetarian: vegetarian !== undefined ? vegetarian : user.dietaryProfile.vegetarian,
        vegan: vegan !== undefined ? vegan : user.dietaryProfile.vegan,
        glutenFree: glutenFree !== undefined ? glutenFree : user.dietaryProfile.glutenFree,
        dairyFree: dairyFree !== undefined ? dairyFree : user.dietaryProfile.dairyFree,
      }
  
      await user.save()
  
      res.status(200).json({
        message: "Dietary preferences updated successfully",
        dietaryProfile: user.dietaryProfile,
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Update health preferences
  export const updateHealthPreferences = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
      const { low_carb, low_fat, low_sugar, low_sodium } = req.body
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      // Update health preferences
      user.HealthProfile = {
        low_carb: low_carb !== undefined ? low_carb : user.HealthProfile.low_carb,
        low_fat: low_fat !== undefined ? low_fat : user.HealthProfile.low_fat,
        low_sugar: low_sugar !== undefined ? low_sugar : user.HealthProfile.low_sugar,
        low_sodium: low_sodium !== undefined ? low_sodium : user.HealthProfile.low_sodium,
      }
  
      await user.save()
  
      res.status(200).json({
        message: "Health preferences updated successfully",
        healthProfile: user.HealthProfile,
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Address Management
  // Add a new address
  export const addAddress = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
      const { type, address, apartment, building, landmark, latitude, longitude, isDefault } = req.body
  
      if (!address) {
        return res.status(400).json({ message: "Address is required" })
      }
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      // Create new address
      const newAddress = {
        type: type || "home",
        address,
        apartment,
        building,
        landmark,
        latitude,
        longitude,
        isDefault: isDefault || false,
      }
  
      // If this address is set as default, unset any existing default
      if (newAddress.isDefault) {
        user.addresses.forEach((addr) => {
          addr.isDefault = false
        })
      }
  
      // Add new address
      user.addresses.push(newAddress)
      await user.save()
  
      res.status(201).json({
        message: "Address added successfully",
        address: user.addresses[user.addresses.length - 1],
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Update an address
  export const updateAddress = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
      const { addressId } = req.params
      const { type, address, apartment, building, landmark, latitude, longitude, isDefault } = req.body
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      // Find address index
      const addressIndex = user.addresses.findIndex((addr) => addr._id.toString() === addressId)
      if (addressIndex === -1) {
        return res.status(404).json({ message: "Address not found" })
      }
  
      // Update address fields
      if (type) user.addresses[addressIndex].type = type
      if (address) user.addresses[addressIndex].address = address
      if (apartment !== undefined) user.addresses[addressIndex].apartment = apartment
      if (building !== undefined) user.addresses[addressIndex].building = building
      if (landmark !== undefined) user.addresses[addressIndex].landmark = landmark
      if (latitude !== undefined) user.addresses[addressIndex].latitude = latitude
      if (longitude !== undefined) user.addresses[addressIndex].longitude = longitude
  
      // Handle default address
      if (isDefault) {
        // Unset any existing default
        user.addresses.forEach((addr, index) => {
          user.addresses[index].isDefault = index === addressIndex
        })
      }
  
      await user.save()
  
      res.status(200).json({
        message: "Address updated successfully",
        address: user.addresses[addressIndex],
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Delete an address
  export const deleteAddress = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
      const { addressId } = req.params
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      // Find address index
      const addressIndex = user.addresses.findIndex((addr) => addr._id.toString() === addressId)
      if (addressIndex === -1) {
        return res.status(404).json({ message: "Address not found" })
      }
  
      // Check if this is the default address
      const isDefault = user.addresses[addressIndex].isDefault
  
      // Remove address
      user.addresses.splice(addressIndex, 1)
  
      // If the deleted address was the default and there are other addresses, set the first one as default
      if (isDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true
      }
  
      await user.save()
  
      res.status(200).json({
        message: "Address deleted successfully",
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Get all addresses
  export const getAddresses = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
  
      const user = await User.findById(userId).select("addresses")
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      res.status(200).json({ addresses: user.addresses })
    } catch (error) {
      next(error)
    }
  }
  
  // Wallet Management
  // Get wallet balance and transactions
  export const getWallet = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
  
      const user = await User.findById(userId).select("wallet")
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      res.status(200).json({
        balance: user.wallet.balance,
        transactions: user.wallet.transactions,
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Add wallet transaction (admin only)
  export const addWalletTransaction = async (req, res, next) => {
    try {
      const { userId, amount, type, description } = req.body
  
      if (!userId || !amount || !type || !description) {
        return res.status(400).json({ message: "User ID, amount, type, and description are required" })
      }
  
      if (type !== "credit" && type !== "debit") {
        return res.status(400).json({ message: "Type must be 'credit' or 'debit'" })
      }
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      // Check if sufficient balance for debit
      if (type === "debit" && user.wallet.balance < amount) {
        return res.status(400).json({ message: "Insufficient wallet balance" })
      }
  
      // Create transaction
      const transaction = {
        amount,
        type,
        description,
        date: new Date(),
      }
  
      // Update balance
      if (type === "credit") {
        user.wallet.balance += amount
      } else {
        user.wallet.balance -= amount
      }
  
      // Add transaction to history
      user.wallet.transactions.push(transaction)
      await user.save()
  
      res.status(201).json({
        message: "Wallet transaction added successfully",
        transaction,
        newBalance: user.wallet.balance,
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Favorites Management
  // Add item to favorites
  export const addToFavorites = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
      const { menuItemId } = req.body
  
      if (!menuItemId) {
        return res.status(400).json({ message: "Menu item ID is required" })
      }
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      // Check if item is already in favorites
      if (user.favorites.includes(menuItemId)) {
        return res.status(400).json({ message: "Item is already in favorites" })
      }
  
      // Add to favorites
      user.favorites.push(menuItemId)
      await user.save()
  
      res.status(200).json({
        message: "Item added to favorites",
        favorites: user.favorites,
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Remove item from favorites
  export const removeFromFavorites = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
      const { menuItemId } = req.params
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      // Check if item is in favorites
      const index = user.favorites.indexOf(menuItemId)
      if (index === -1) {
        return res.status(400).json({ message: "Item is not in favorites" })
      }
  
      // Remove from favorites
      user.favorites.splice(index, 1)
      await user.save()
  
      res.status(200).json({
        message: "Item removed from favorites",
        favorites: user.favorites,
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Get user favorites
  export const getFavorites = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
  
      const user = await User.findById(userId)
        .select("favorites")
        .populate("favorites", "name description price image dietaryInfo")
  
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      res.status(200).json({ favorites: user.favorites })
    } catch (error) {
      next(error)
    }
  }
  
  // Get user recommendations
  export const getRecommendations = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
  
      const user = await User.findById(userId)
        .select("recommandations")
        .populate("recommandations", "name description price image dietaryInfo")
  
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      res.status(200).json({ recommendations: user.recommandations })
    } catch (error) {
      next(error)
    }
  }
  
  // Admin functions
  // Get all users (admin only)
  export const getAllUsers = async (req, res, next) => {
    try {
      const users = await User.find().select("fullName email mobileNumber isAdmin createdAt").sort({ createdAt: -1 })
  
      res.status(200).json({ users })
    } catch (error) {
      next(error)
    }
  }
  
  // Get user by ID (admin only)
  export const getUserById = async (req, res, next) => {
    try {
      const { userId } = req.params
  
      const user = await User.findById(userId).select("-refreshToken -__v").populate("favorites", "name image price")
  
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      res.status(200).json({ user })
    } catch (error) {
      next(error)
    }
  }
  
  // Update user admin status (admin only)
  export const updateUserAdminStatus = async (req, res, next) => {
    try {
      const { userId } = req.params
      const { isAdmin } = req.body
  
      if (isAdmin === undefined) {
        return res.status(400).json({ message: "isAdmin field is required" })
      }
  
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }
  
      user.isAdmin = isAdmin
      await user.save()
  
      res.status(200).json({
        message: "User admin status updated successfully",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      })
    } catch (error) {
      next(error)
    }
  }
  
  // Logout
  export const logout = async (req, res, next) => {
    try {
      const userId = req.userId // Set by auth middleware
  
      // Clear refresh token
      await User.findByIdAndUpdate(userId, { refreshToken: null })
  
      res.status(200).json({ message: "Logged out successfully" })
    } catch (error) {
      next(error)
    }
  }
  

  