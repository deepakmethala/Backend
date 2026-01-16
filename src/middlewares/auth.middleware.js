import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

const verifyJWT = asyncHandler( async function(req,res,next){
try {
        const token = req.cookies?.accessToken || req.header("authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiError(400,"Token is not available")
        }
        
        const decodedToken =  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(400,"User of this token does not exist")
        }
    
        req.user = user
        next();
} catch (error) {
        throw new ApiError(500,"verifyJWT Error",error)
}

})

 export default verifyJWT