import { body, validationResult } from "express-validator"

// Reusable validations
const mobileValidation = [
  body("mobileNumber")
    .notEmpty()
    .withMessage("Numéro de mobile est requis")
    .isString()
    .withMessage("Numéro de mobile doit être une chaîne")
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage("Doit être exactement 10 chiffres")
    .customSanitizer((value) => value.replace(/[^\d]/g, "")),
]

const emailValidation = [
  body("email")
    .notEmpty()
    .withMessage("Email est requis")
    .isEmail()
    .withMessage("Format d'email invalide")
    .normalizeEmail(),
]


// Validation middleware handler
const validate = (validations) => {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => ({
            field: err.param,
            message: err.msg,
          })),
        })
      }
      next()
    },
  ]
}

// Export validated endpoints
export const validateSendOTP = validate([...mobileValidation, ...emailValidation])

export const validateVerifyOTP = validate([
  ...mobileValidation,
  body("otp")
    .notEmpty()
    .withMessage("OTP est requis")
    .isLength({ min: 6, max: 6 })
    .withMessage("Doit être exactement 6 chiffres")
    .isNumeric()
    .withMessage("Doit contenir uniquement des chiffres"),
])

export const validateRegister = validate([
  body("fullName")
    .notEmpty()
    .withMessage("Nom complet est requis")
    .isLength({ min: 3 })
    .withMessage("Doit être au moins 3 caractères")
    .trim(),
  ...emailValidation,
  ...mobileValidation,
])

export const validateSocialLogin = validate([
  body("provider")
    .notEmpty()
    .withMessage("Provider est requis")
    .isIn(["google", "facebook"])
    .withMessage("Provider invalide"),
  body("idToken").notEmpty().withMessage("ID token est requis"),
])

export const validateRefreshToken = validate([
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token est requis")
    .isString()
    .withMessage("Refresh token doit être une chaîne")
    .trim()
    .isJWT()
    .withMessage("Format de refresh token invalide"),
])
