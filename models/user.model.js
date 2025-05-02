// user.model.js (Updated)
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  type: { type: String, enum: ["home", "office", "other"], default: "home" },
  address: { type: String, required: true },
  apartment: { type: String },
  building: { type: String },
  landmark: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  isDefault: { type: Boolean, default: false },
});

const walletTransactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    email: { type: String, lowercase: true },
    mobileNumber: { type: String, required: true },
    countryCode: { type: String, default: "+213" },
    isVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, required: true, default: false },
    deviceToken: { type: String },
    social: {
      google: {
        id: { type: String },
        email: { type: String },
        name: { type: String },
      },
      facebook: {
        id: { type: String },
        email: { type: String },
        name: { type: String },
      },
    },
    addresses: [addressSchema],
    wallet: {
      balance: { type: Number, default: 0 },
      transactions: [walletTransactionSchema],
    },
    stripeCustomerId: { type: String },

    dietaryProfile: {
      vegetarian: { type: Boolean, default: false },
      vegan: { type: Boolean, default: false },
      glutenFree: { type: Boolean, default: false },
      dairyFree: { type: Boolean, default: false },
    },
    HealthProfile:{
      low_carb: { type: Boolean, default: false },
      low_fat: { type: Boolean, default: false },
      low_sugar: { type: Boolean, default: false },
      low_sodium: { type: Boolean, default: false },
    },
    matrixIndex: { type: Number, unique: true, sparse: true },
    cfParams: {
      w: {
        type: [Number],
        default: () =>
          Array(10)
            .fill(0)
            .map(() => Math.random()),
      },
      b: { type: Number, default: 0 },
      lastTrained: Date,
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }], // <-- KEPT (MenuItem favorites)
    recommandations: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
    refreshToken: { type: String }, // Added missing refreshToken field based on auth controller usage
  },
  {
    timestamps: true,
  }
);

// Virtual for backward compatibility
userSchema.virtual("walletBalance").get(function () {
  return this.wallet.balance;
});



userSchema.virtual("savedAddresses").get(function () {
  return this.addresses;
});

export const User = mongoose.model("User", userSchema);