import mongoose from "mongoose";


const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String },
    category: {
      type: String, 
      required: true,
    },
    dietaryInfo: {
      vegetarian: Boolean,
      vegan: Boolean,
      glutenFree: Boolean,
      lactoseFree: Boolean,
    },
    healthInfo: {
      low_carb: Boolean,
      low_fat: Boolean,
      low_sugar: Boolean,
      low_sodium: Boolean,
    },
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    preparationTime: { type: Number }, 
    matrixIndex: { type: Number, unique: true, sparse: true },
    cfFeatures: { 
      type: [Number], 
      default: () => Array(10).fill(0).map(() => Math.random())
    },
    
  },
  {
    timestamps: true,
  },
);

const MenuItem = mongoose.model("MenuItem", menuItemSchema);

export default MenuItem;