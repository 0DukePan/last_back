// import { Vonage } from '@vonage/server-sdk';
// import dotenv from 'dotenv';
// dotenv.config();

// // Initialize Vonage client
// const vonage = new Vonage({
//   apiKey: process.env.VONAGE_API_KEY,
//   apiSecret: process.env.VONAGE_API_SECRET,
// });

// export const sendOTP = async (mobileNumber, countryCode, otp) => {
//   try {
//     console.log('SMS Service Input:', { mobileNumber, countryCode, otp });
    
//     const formattedCountryCode = countryCode.replace('+', '');
//     const to = `${formattedCountryCode}${mobileNumber}`;
//     const from = process.env.VONAGE_SENDER_NAME || 'YourApp';

//     console.log('Attempting to send SMS to:', to, 'from:', from);

//     const response = await vonage.sms.send({ from, to, text: `Your verification code: ${otp}` });

//     console.log('Full Vonage Response:', JSON.stringify(response, null, 2));

//     if (!response.messages || response.messages.length === 0) {
//       console.error('Vonage returned empty messages array');
//       return {
//         success: false,
//         error: 'No response messages from Vonage API',
//         details: response
//       };
//     }

//     const message = response.messages[0];
//     if (message.status === '0') {
//       console.log(`SMS successfully sent to ${to}, ID: ${message['message-id']}`);
//       return {
//         success: true,
//         messageId: message['message-id'],
//         to: to,
//       };
//     } else {
//       console.error('Vonage delivery failed:', {
//         status: message.status,
//         error: message['error-text'],
//         to: to
//       });
//       return {
//         success: false,
//         error: message['error-text'] || 'Unknown Vonage error',
//         status: message.status,
//         to: to
//       };
//     }
//   } catch (error) {
//     console.error('Vonage API error:', {
//       message: error.message,
//       stack: error.stack,
//       code: error.code,
//       to: `${countryCode}${mobileNumber}`
//     });
//     return {
//       success: false,
//       error: error.message,
//       details: error.response?.data
//     };
//   }
// };