import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectInstance = await mongoose.connect(`${process.env.DATABASE_URI}/${DB_NAME}`)
        console.log(`\n Mongo DB Connected !! DB HOST:${connectInstance.connection.host}`);
    } catch (error) {
        console.log("Mongo Db Error : ", error);
        process.exit(1);
    }
}

export default connectDB