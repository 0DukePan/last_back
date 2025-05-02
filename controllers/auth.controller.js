import jwt from "jsonwebtoken"
import crypto from "crypto"
import { User } from "../models/user.model.js"
import VerificationToken from "../models/verificationToken.model.js"
import { generateOTP } from "../lib/utils/helper.js"
import winstonLogger from "../middlewares/logger.middleware.js"
import { OAuth2Client } from "google-auth-library"
import dotenv from "dotenv"
import { sendOTP as sendOTPService } from "../services/mailtrap/emailService.js"
import { sendVerificationEmail } from "../services/mailtrap/emails.js"
dotenv.config()


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)


const generateTokens = (user) => {
  // Generate access token
  const accessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })

  // Generate refresh token
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d" },
  )

  return { accessToken, refreshToken }
}

/**
 * Format user response object
 * @param {Object} user - User document
 * @returns {Object} - Formatted user object
 */
const formatUserResponse = (user) => {
  return {
    _id: user._id,
    fullName: user.fullName || "",
    email: user.email || "",
    profileImage: user.profileImage || "",
    isVerified: user.isVerified || false,
    isEmailVerified: user.isEmailVerified || false,
    profileComplete: !!user.fullName,
    walletBalance: user.wallet?.balance || 0,
    favoriteRestaurants: user.favorites || [],
    savedAddresses: user.addresses || [],
    deviceToken: user.deviceToken,
    lastLogin: new Date(),
  }
}

/**
 * @desc    Send OTP to email
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOTP = async (req, res, next) => {
  try {
    // Recevoir aussi userId (optionnel)
    const { mobileNumber, countryCode, email,  userId } = req.body

    if (!mobileNumber) {
      return res.status(400).json({ success: false, error: "Numéro de mobile manquant." })
    }

    if (!email) {
      return res.status(400).json({ success: false, error: "Email manquant." })
    }

    const otp = generateOTP(6)
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    let user
    if (userId) {
   
      user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ success: false, error: "Utilisateur non trouvé pour l'ID fourni." })
      }
      
      user.mobileNumber = mobileNumber
      user.countryCode = countryCode || user.countryCode 
      user.email = email
      user.isMobileVerified = false 
      user.isVerified = false 

      await user.save()
      console.log(`Utilisateur ${userId} trouvé, numéro mis à jour: ${mobileNumber}, email mis à jour: ${email}`)
    } else {
      
      user = await User.findOneAndUpdate(
        { mobileNumber },
        {
          $set: {
            countryCode,
            email,
          }, 
          
          $setOnInsert: {
            mobileNumber: mobileNumber, 
            isVerified: false,
            isMobileVerified: false,
            wallet: { balance: 0 },
            favorites: [],
            addresses: [],
            recommandations: [],
            dietaryProfile: {},
            healthProfile: {},
            cfParams: {},
          },
        
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      console.log(`Utilisateur trouvé/créé par numéro: ${mobileNumber}, ID=${user._id}`)
    }

    
    await VerificationToken.findOneAndUpdate(
      { userId: user._id },
      {
        token: otp,
        expiresAt: otpExpiry,
        attempts: 0,
        lastSent: new Date(),
        mobileNumber: mobileNumber, 
        email: email, 
      },
      { upsert: true, new: true }, 
    )

    console.log(`OTP généré pour ${mobileNumber} (${email}): ${otp}`)

    
    const emailResult = { success: false }
    try {
      await sendVerificationEmail(email, otp)
      emailResult.success = true
      console.log(`Email envoyé avec succès à ${email}`)
    } catch (emailError) {
      console.error("Erreur envoi Email:", emailError)
    }

    
    return res.json({
      success: true,
      message: emailResult.success
        ? "OTP envoyé avec succès (vérifiez votre email)."
        : "OTP généré mais l'envoi de l'email a échoué. Vérifiez les logs ou réessayez.",
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
      expiresAt: otpExpiry,
      userId: user._id, 
    })
  } catch (error) {
    winstonLogger.error("Send OTP error:", { error: error.message, stack: error.stack })
    next(error)
  }
}



export const verifyOTP = async (req, res, next) => {
  try {
    const { mobileNumber, otp, deviceToken, deviceInfo } = req.body;

    // --- Optional: Log raw request body if needed ---
    // winstonLogger.debug('VerifyOTP Request Body:', req.body);

    if (!mobileNumber || !otp) {
      winstonLogger.warn("VerifyOTP validation failed: Missing mobileNumber or OTP"); // Log validation failure
      return res.status(400).json({
        success: false,
        error: "Mobile number and OTP are required"
      });
    }

    // Find user by mobile number
    const user = await User.findOne({ mobileNumber });
    if (!user) {
      winstonLogger.warn(`VerifyOTP failed: User not found for mobileNumber: ${mobileNumber}`); // Log user not found
      return res.status(404).json({
        success: false,
        error: "User not found for this number"
      });
    }

    // --- Log the exact parameters BEFORE the query ---
    winstonLogger.debug('--- Verifying OTP ---');
    winstonLogger.debug('User ID found:', { userId: user._id });
    winstonLogger.debug('Querying VerificationToken with:', {
        userId: user._id,
        token: otp, // OTP from request
        mobileNumber: mobileNumber, // Mobile number from request (potentially sanitized by middleware)
        expiresAtCondition: { $gt: new Date() }
    });
    // --- End logging before query ---

    // Find verification token
    const verification = await VerificationToken.findOne({
      userId: user._id,
      token: otp,
      mobileNumber: mobileNumber, // Uses the potentially sanitized number
      expiresAt: { $gt: new Date() },
    });

    // --- Log the result AFTER the query ---
    winstonLogger.debug('Verification FindOne Result:', verification); // Check if null or document
    // --- End logging after query ---

    if (!verification) {
      // Log the reason why the query failed
      winstonLogger.warn(`VerificationToken lookup failed for query details logged above. Result was null.`);
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP" // This is the error you are getting
      });
    }

    // Increment attempts
    verification.attempts += 1;
    await verification.save();
    winstonLogger.debug(`Verification attempt incremented to: ${verification.attempts}`, { verificationId: verification._id });

    // Check max attempts
    if (verification.attempts > 5) {
      await VerificationToken.deleteOne({ _id: verification._id });
      winstonLogger.warn(`Max OTP attempts exceeded for verificationId: ${verification._id}, userId: ${user._id}`);
      return res.status(400).json({
        success: false,
        error: "Too many failed attempts. Please request a new OTP."
      });
    }

    // Verify OTP (This check is redundant if findOne succeeded, but safe to leave)
    if (verification.token !== otp) {
       winstonLogger.warn(`OTP mismatch after findOne (should not happen): verification.token=${verification.token}, request.otp=${otp}`, { verificationId: verification._id });
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
        attemptsLeft: 5 - verification.attempts
      });
    }

    // --- Succès OTP ---
    winstonLogger.info(`OTP verification successful for user ${user._id}`);

    // Update user
    user.isVerified = true;
    user.isMobileVerified = true;
    user.lastLogin = new Date();
    await user.save();

    // Delete verification token
    await VerificationToken.deleteOne({ _id: verification._id });
    winstonLogger.debug(`VerificationToken deleted successfully`, { verificationId: verification._id });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token hash
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    user.refreshToken = refreshTokenHash;
    await user.save();

    // Set cookie etc...

    // Return response
    res.json({
      success: true,
      message: "OTP verified successfully. User logged in.", 
      token: accessToken, 
      refreshToken: refreshToken, 
      user: formatUserResponse(user) 
    });

  } catch (error) {
    // Log the caught error
    winstonLogger.error("Verify OTP controller caught error:", {
       error: error.message,
       stack: error.stack,
       requestBody: req.body // Log body on error
    });
    next(error); // Pass error to global error handler
  }
};
/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required",
      })
    }

    // Verify refresh token
    let decoded
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET)
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired refresh token",
      })
    }

    // Hash the provided refresh token
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")

    // Find user with matching refresh token hash
    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken: refreshTokenHash,
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      })
    }

    // Generate new tokens
    const tokens = generateTokens(user)

    // Update refresh token hash
    const newRefreshTokenHash = crypto.createHash("sha256").update(tokens.refreshToken).digest("hex")

    user.refreshToken = newRefreshTokenHash
    user.lastLogin = new Date()
    await user.save()

    // Set refresh token as HTTP-only cookie
    if (process.env.NODE_ENV === "production") {
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
    }

    // Return response
    res.json({
      success: true,
      token: tokens.accessToken,
      refreshToken: process.env.NODE_ENV !== "production" ? tokens.refreshToken : undefined,
    })
  } catch (error) {
    winstonLogger.error("Refresh token error:", { error: error.message, stack: error.stack })
    next(error)
  }
}

// --- SOCIAL LOGIN MODIFIÉ ---
export const socialLogin = async (req, res, next) => {
  // On attend 'idToken' de Flutter au lieu de 'accessToken' pour Google
  const { provider, idToken } = req.body;

  // Gérer uniquement Google pour cette logique spécifique
  // (Adaptez si vous voulez un flux similaire pour Facebook)
  if (provider !== "google") {
    return res.status(400).json({ success: false, error: "Seul Google est supporté pour ce flux actuellement." });
  }
  if (!idToken) {
    return res.status(400).json({ success: false, error: "Le 'idToken' Google est manquant." });
  }

  try {
    // --- Vérification idToken Google ---
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      if (!payload) throw new Error("Payload Google vide.");
    } catch (googleError) {
      console.error("Erreur de vérification Google Token:", googleError);
      return res.status(401).json({ success: false, error: "Token Google invalide ou expiré." });
    }
    // --- Fin Vérification ---

    const providerId = payload['sub'];
    const email = payload['email']?.toLowerCase();
    const name = payload['name'];
    const profileImage = payload['picture'];

    if (!providerId || !email) {
      return res.status(400).json({ success: false, error: "Infos Google (ID ou email) manquantes." });
    }

    // --- Trouver ou Créer l'utilisateur ---
    const user = await User.findOneAndUpdate(
      { $or: [{ 'social.google.id': providerId }, { email: email }] },
      {
        $set: {
          email: email,
          // Mettre à jour fullName seulement s'il n'est pas déjà défini ou si différent ?
          // Option 1: Toujours mettre à jour avec le nom Google
          fullName: name,
          // Option 2: Mettre à jour seulement si le nom actuel est vide
          // fullName: this.fullName || name, // Nécessite d'abord un find() séparé
          profileImage: profileImage, // Mettre à jour l'image
          'social.google': { id: providerId, email: email, name: name },
          // Assurer que les flags de vérification ne sont PAS mis à true ici
        },
        $setOnInsert: { // Valeurs pour NOUVEAU utilisateur
          mobileNumber: null,
          countryCode: '+213', // Votre défaut
          isVerified: false,
          isMobileVerified: false,
          isAdmin: false,
          isRestaurantOwner: false,
          language: 'fr', // ou payload['locale']
          wallet: { balance: 0, transactions: [] },
          favorites: [], // Assurez-vous que le type est correct (ObjectId[] ou String[])
          addresses: [],
          recommandations: [], // Assurez-vous que le type est correct
          dietaryProfile: {},
          healthProfile: {},
          cfParams: {},
          // Timestamps gérés par Mongoose
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Utilisateur trouvé/créé via Google: ID=${user._id}`);

    // --- Réponse : Succès simple + ID + Indication Tel Requis ---
    res.status(200).json({
      success: true,
      message: "Liaison Google réussie. Numéro de téléphone requis.",
      userId: user._id,
     
      mobileRequired: !user.isMobileVerified
    });

  } catch (error) {
    console.error("Erreur interne dans socialLogin:", error);
    next(error);
  }
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { fullName, email, mobileNumber, countryCode, deviceToken, deviceInfo } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email && email !== "" ? email : null },
        { mobileNumber },
      ].filter(Boolean),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.email === email 
          ? "Email already in use" 
          : "Mobile number already in use",
      });
    }

    // Create new user
    const user = await User.create({
      fullName,
      email,
      mobileNumber,
      countryCode,
      isVerified: false,
      wallet: { balance: 0 },
      favorites: [],
      addresses: [],
      deviceToken,
      createdAt: new Date(),
    });

    // Generate OTP for verification
    const otp = generateOTP(6);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await VerificationToken.create({
      userId: user._id,
      token: otp,
      expiresAt: otpExpiry,
      attempts: 0,
      lastSent: new Date(),
      mobileNumber: mobileNumber
    });

    // Try to send SMS
    let smsResult = { success: false };
    try {
      smsResult = await sendOTPService(mobileNumber, countryCode, otp);
      
      if (!smsResult.success) {
        winstonLogger.warn(`SMS failed to send to ${mobileNumber}: ${JSON.stringify(smsResult.error)}`);
      } else {
        winstonLogger.info(`SMS sent successfully to ${smsResult.to}`);
      }
    } catch (smsError) {
      winstonLogger.error("SMS sending error:", { error: smsError.message, stack: smsError.stack });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Log registration
    winstonLogger.info("New user registered", { 
      userId: user._id, 
      email, 
      mobileNumber 
    });

    // Return response
    res.status(201).json({
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: formatUserResponse(user),
      otpSent: smsResult.success,
      // Only include OTP in non-production environments
      ...(process.env.NODE_ENV !== "production" && { otp }),
      expiresAt: otpExpiry,
    });
  } catch (error) {
    winstonLogger.error("Registration error:", { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    // Clear refresh token
    const user = await User.findById(req.user._id)
    if (user) {
      user.refreshToken = undefined
      await user.save()
    }

    // Clear cookie
    res.clearCookie("refreshToken")

    res.json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error) {
    winstonLogger.error("Logout error:", { error: error.message, stack: error.stack })
    next(error)
  }
}

export const getMyProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Not authorized",
      })
    }
    const user = req.user
    res.status(200).json({
      success: true,
      user: formatUserResponse(user),
    })
  } catch (error) {
    winstonLogger.error("Get my profile error:", { error: error.message, stack: error.stack })
    next(error)
  }
}

export const authenticate = async (req, res, next) => {
  let accessToken

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    accessToken = req.headers.authorization.split(" ")[1]
  }

  if (!accessToken) {
    winstonLogger.warn("Authentication attempt failed: Token missing")
    return res.status(401).json({
      success: false,
      message: "Not authorized, token missing",
    })
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decoded.userId).select("-refreshToken")
    if (!user) {
      winstonLogger.warn(`Authentication failed: User ${decoded.userId} not found for valid token.`)
      return res.status(401).json({ success: false, message: "User not found" })
    }

    req.user = user
    winstonLogger.info(`Access token valid for user ${user._id}`)
    return next()
  } catch (error) {
    winstonLogger.warn(`Access token verification failed: ${error.message}`)

    if (error instanceof jwt.TokenExpiredError) {
      winstonLogger.info("Access token expired, attempting refresh...")

      const incomingRefreshToken = req.cookies?.refreshToken

      if (!incomingRefreshToken) {
        winstonLogger.warn("Refresh attempt failed: Refresh token missing from cookie")
        return res.status(401).json({
          success: false,
          message: "Access token expired, refresh token missing",
        })
      }

      try {
        const decodedRefresh = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET,
        )

        const incomingRefreshTokenHash = crypto.createHash("sha256").update(incomingRefreshToken).digest("hex")

        const user = await User.findOne({
          _id: decodedRefresh.userId,
          refreshToken: incomingRefreshTokenHash,
        })

        if (!user) {
          winstonLogger.warn(`Refresh token invalid or user/token mismatch for userId ${decodedRefresh.userId}`)

          res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          })
          return res.status(401).json({
            success: false,
            message: "Invalid refresh token",
          })
        }

        const newTokens = generateTokens(user)

        const newRefreshTokenHash = crypto.createHash("sha256").update(newTokens.refreshToken).digest("hex")
        user.refreshToken = newRefreshTokenHash
        user.lastLogin = new Date()
        await user.save()

        res.cookie("refreshToken", newTokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: (Number.parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN) || 30) * 24 * 60 * 60 * 1000,
        })

        res.setHeader("X-Access-Token", newTokens.accessToken)
        winstonLogger.info(`Token refreshed successfully via header for user ${user._id}`)

        req.user = user.toObject()
        delete req.user.refreshToken

        return next()
      } catch (refreshError) {
        winstonLogger.error(`Refresh token validation failed: ${refreshError.message}`)

        res.clearCookie("refreshToken", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        })
        return res.status(401).json({
          success: false,
          message: "Refresh token invalid or expired",
        })
      }
    } else {
      winstonLogger.warn(`Authentication failed: Access token invalid (reason: ${error.message})`)
      return res.status(401).json({
        success: false,
        message: "Token is invalid",
      })
    }
  }
}
