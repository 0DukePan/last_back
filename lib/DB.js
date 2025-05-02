import mongoose from "mongoose";

export const connectDB = async (req , res)=> {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log(`mongo db connected ${conn.connection.host}`);
        
    } catch (error) {
        console.log('Error connecting to mongodb' ,error.message);
        process.exit(1);
    }
}