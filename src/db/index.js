import mongoose from "mongoose";
import {DB_NAME} from '../constants.js'
const connectDB = async function(){
    try {
        const connectionInstance =  await mongoose.connect(`${process.env.DATABASE_URI}/${DB_NAME}`)
        console.log("Mongo DB connected || Host : ",connectionInstance.connection.host);   
    } catch (error) {
        console.log("Error Db Connection Failed , ",error);
        process.exit(1);
    }
}

export default connectDB;