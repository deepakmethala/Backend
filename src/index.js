import app from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";
dotenv.config({
    path:"./env"
});
connectDB()
.then(()=>{
    const port  = process.env.PORT || 8000
    app.listen(port,()=>{
        console.log(`Server is running on port ${port}`);       
    })
})
.catch((err)=>{
    console.log("DB CONNECTION FAILED :",err);
})
