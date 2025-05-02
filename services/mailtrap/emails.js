import { VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplate.js"
import { mailTrapClient, sender } from "./mailtrap.config.js"

export const sendVerificationEmail = async (email, verificationToken) => {
  const recipient = [{ email }]

  try {
    const response = await mailTrapClient.send({
      from: sender,
      to: recipient,
      subject: "Verify your email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
      category: "Email Verification",
    })

    console.log("Email sent successfully", response)
    return response
  } catch (error) {
    console.error(`Error sending verification email:`, error)
    throw new Error(`Error sending verification email: ${error}`)
  }
}
