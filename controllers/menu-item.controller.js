import MenuItem from "../models/menuItem.model.js"; // Assuming category is a String field here
// Removed: import MenuCategory from "../models/menu-category.model.js";
import { uploadImage, deleteImage } from "../services/cloudinaryService.js"; // Using the service

// Get all menu items
export const getAllMenuItems = async (req, res, next) => {
  try {
    // No population needed or possible for a string category
    const menuItems = await MenuItem.find({ isAvailable: true });

    // Format response (category is just a string)
    const formattedMenuItems = menuItems.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category, // Direct string access
      dietaryInfo: item.dietaryInfo,
      healthInfo: item.healthInfo,
      isPopular: item.isPopular,
      preparationTime: item.preparationTime,
      addons: item.addons,
    }));

    res.status(200).json({ menuItems: formattedMenuItems });
  } catch (error) {
    next(error);
  }
};

// Get menu items by category name
export const getMenuItemsByCategory = async (req, res, next) => {
  try {
    // Parameter is the category name (string)
    const { categoryName } = req.params;

     if (!categoryName) {
        return res.status(400).json({ message: "Category name parameter is required." });
    }

    // Find by the category string field
    const menuItems = await MenuItem.find({
      category: categoryName,
      isAvailable: true,
    });

    // Format response
    const formattedMenuItems = menuItems.map((item) => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category, // Direct string access
      dietaryInfo: item.dietaryInfo,
      healthInfo: item.healthInfo,
      preparationTime: item.preparationTime,
      isPopular: item.isPopular,
      addons: item.addons,
    }));

    res.status(200).json({ menuItems: formattedMenuItems });
  } catch (error) {
    next(error);
  }
};

// Get menu item details
export const getMenuItemDetails = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // No population needed
    const menuItem = await MenuItem.findById(itemId);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Format response (category is a string)
    const formattedMenuItem = {
      id: menuItem._id,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      image: menuItem.image,
      category: menuItem.category, // Direct string access
      dietaryInfo: menuItem.dietaryInfo,
      healthInfo: menuItem.healthInfo,
      preparationTime: menuItem.preparationTime,
      isPopular: menuItem.isPopular,
      addons: menuItem.addons,
    };

    res.status(200).json({ menuItem: formattedMenuItem });
  } catch (error) {
    next(error);
  }
};

// Create new menu item
export const createMenuItem = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      category, // This is now expected to be a string
      dietaryInfo,
      healthInfo,
      isAvailable,
      isPopular,
      addons,
      preparationTime,
      cfFeatures,
      matrixIndex,
    } = req.body;
    let { image } = req.body; // Can be base64 or potentially null/URL

    if (!name || !price || !category) {
      return res
        .status(400)
        .json({ message: "Name, price, and category (string) are required" });
    }

    // No validation against MenuCategory needed

    let imageUrl = null; // Default to null

    // Use the cloudinary service to upload if image data provided
    if (image && typeof image === 'string') { // Service handles base64 or existing URLs
      try {
        const uploadResult = await uploadImage(image, "hungerz_kiosk/menu_items"); //
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
         console.error("Cloudinary service upload error during create:", uploadError);
         // Pass the specific error from the service
         return next(uploadError);
      }
    }

    // Create new menu item instance
    const menuItem = new MenuItem({
      name,
      description,
      price,
      image: imageUrl, // Use the URL from service or null
      category, // Assign the string category directly
      dietaryInfo: dietaryInfo || {},
      healthInfo: healthInfo || {},
      cfFeatures,
      matrixIndex,
      addons : addons || [],
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      isPopular: isPopular !== undefined ? isPopular : false,
      addons: addons || [],
      preparationTime: preparationTime || 15,
    });

    await menuItem.save();

    // Return the created item (category is a string)
    res.status(201).json({
      message: "Menu item created successfully",
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.image,
        category: menuItem.category, // String category
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update menu item
export const updateMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const {
      name,
      description,
      price,
      category, // String category
      dietaryInfo,
      healthInfo,
      isAvailable,
      isPopular,
      addons,
      preparationTime,
    } = req.body;
    let { image } = req.body; // New image data (base64), existing URL, or null

    const menuItem = await MenuItem.findById(itemId);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const oldImageUrl = menuItem.image;
    let newImageUrl = oldImageUrl; // Assume no change initially

    // Handle image update using the service
    if (image) { // If image is provided (base64 or URL)
         try {
             const uploadResult = await uploadImage(image, "hungerz_kiosk/menu_items"); // Use service
             newImageUrl = uploadResult.secure_url; // Service handles base64 or existing URLs

             // Delete old image only if upload was successful and URL is different
             if (oldImageUrl && oldImageUrl.includes("cloudinary.com") && oldImageUrl !== newImageUrl) {
                 try {
                     await deleteImage(oldImageUrl); // Use service, passing the full URL
                     console.log(`Deleted old menu item image via service: ${oldImageUrl}`);
                 } catch (deleteError) {
                     console.error(`Service error deleting old menu item image: ${deleteError.message}`);
                     // Log error, but allow update to proceed
                 }
             }
         } catch (uploadError) {
             console.error("Cloudinary service upload error during update:", uploadError);
             return next(uploadError); // Pass error from service
         }
    } else if (image === null && oldImageUrl) {
      // Handle explicitly setting image to null (removing it)
      newImageUrl = null;
      if (oldImageUrl && oldImageUrl.includes("cloudinary.com")) {
          try {
              await deleteImage(oldImageUrl); // Use service
              console.log(`Deleted old menu item image via service (set to null): ${oldImageUrl}`);
          } catch (deleteError) {
              console.error(`Service error deleting old menu item image: ${deleteError.message}`);
          }
      }
    }

    // Update image field if it changed
    if (newImageUrl !== oldImageUrl) {
        menuItem.image = newImageUrl;
    }

    // No category validation needed against MenuCategory model
    if (category) menuItem.category = category;

    // Update other fields
    if (name) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (price !== undefined) menuItem.price = price;
    if (dietaryInfo) menuItem.dietaryInfo = dietaryInfo;
    if (healthInfo) menuItem.healthInfo = healthInfo;
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable;
    if (isPopular !== undefined) menuItem.isPopular = isPopular;
    if (addons) menuItem.addons = addons;
    if (preparationTime !== undefined) menuItem.preparationTime = preparationTime;

    await menuItem.save();

    res.status(200).json({
      message: "Menu item updated successfully",
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.image,
        category: menuItem.category, // String category
        isAvailable: menuItem.isAvailable,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete menu item
export const deleteMenuItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const menuItem = await MenuItem.findById(itemId);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Attempt to delete image from Cloudinary using the service
    if (menuItem.image && menuItem.image.includes("cloudinary.com")) {
      try {
        // Call service's deleteImage with the full URL
        const result = await deleteImage(menuItem.image);
        console.log(`Attempted deletion via service for image: ${menuItem.image} - Result: ${result.result}`);
      } catch (deleteError) {
        console.error(`Service error deleting menu item image: ${deleteError.message}`);
        // Log error, but continue with item deletion
      }
    }

    // Delete the menu item from the database
    await MenuItem.findByIdAndDelete(itemId);

    res.status(200).json({
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get popular menu items
export const getPopularMenuItems = async (req, res, next) => {
  try {
    // No population needed
    const popularItems = await MenuItem.find({ isPopular: true, isAvailable: true })
      .limit(10);

     // Format response (category is a string)
    const formattedMenuItems = popularItems.map((item) => ({
        id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        category: item.category, // Direct string access
        dietaryInfo: item.dietaryInfo,
        healthInfo: item.healthInfo,
        isPopular: item.isPopular,
        preparationTime: item.preparationTime,
        addons: item.addons,
    }));

    res.status(200).json({ menuItems: formattedMenuItems });
  } catch (error) {
    next(error);
  }
};

// Search menu items
export const searchMenuItems = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // No population needed
    const menuItems = await MenuItem.find({
      $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } } // Search category string
        ],
      isAvailable: true,
    });

    // Format response (category is a string)
    const formattedMenuItems = menuItems.map((item) => ({
        id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        category: item.category, // Direct string access
        dietaryInfo: item.dietaryInfo,
        healthInfo: item.healthInfo,
        isPopular: item.isPopular,
        preparationTime: item.preparationTime,
        addons: item.addons,
    }));

    res.status(200).json({ menuItems: formattedMenuItems });
  } catch (error) {
    next(error);
  }
};

// Get menu items by dietary preferences
export const getMenuItemsByDietary = async (req, res, next) => {
  try {
    const { preference } = req.params;
    const validPreferences = ["vegetarian", "vegan", "glutenFree", "lactoseFree"];

    if (!validPreferences.includes(preference)) {
      return res.status(400).json({ message: "Invalid dietary preference" });
    }

    const query = { isAvailable: true };
    query[`dietaryInfo.${preference}`] = true;


    const menuItems = await MenuItem.find(query);

  
    const formattedMenuItems = menuItems.map((item) => ({
        id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        category: item.category, 
        dietaryInfo: item.dietaryInfo,
        healthInfo: item.healthInfo,
        isPopular: item.isPopular,
        preparationTime: item.preparationTime,
        addons: item.addons,
    }));

    res.status(200).json({ menuItems: formattedMenuItems });
  } catch (error) {
    next(error);
  }
};


export const getMenuItemsByHealth = async (req, res, next) => {
  try {
    const { preference } = req.params;
    const validPreferences = ["low_carb", "low_fat", "low_sugar", "low_sodium"];

    if (!validPreferences.includes(preference)) {
      return res.status(400).json({ message: "Invalid health preference" });
    }

    const query = { isAvailable: true };
    query[`healthInfo.${preference}`] = true;

    // No population needed
    const menuItems = await MenuItem.find(query);

     // Format response (category is a string)
    const formattedMenuItems = menuItems.map((item) => ({
        id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        category: item.category, // Direct string access
        dietaryInfo: item.dietaryInfo,
        healthInfo: item.healthInfo,
        isPopular: item.isPopular,
        preparationTime: item.preparationTime,
        addons: item.addons,
    }));

    res.status(200).json({ menuItems: formattedMenuItems });
  } catch (error) {
    next(error);
  }
};

