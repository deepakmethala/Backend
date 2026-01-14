import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import uploadOnCloudinary from "../utils/Cloudinary.js"




const userRegister = async function(req,res,next){
    const {username,email,fullname,password} = req.body
    if(
      [username,email,fullname,password].some((item) => item?.trim() === "" )
    ){
        throw new ApiError(400,"All Fields are required")
    }

    const existedUser = await User.findOne({
      $or:[{username},{email}]
    })

    if(existedUser){
      throw new ApiError(409,"User with email or username already exist")
    }
console.log("req.body:", req.body);
console.log("req.files:", req.files);


    const avatarlocalpath = req.files?.avatar?.[0]?.path
    let coverimagelocalpath;
    if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0){
      coverimagelocalpath = req.files.coverimage[0].path
    }

    if(!avatarlocalpath){
      throw new ApiError(400,"Avatar File is required(local)")
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath)
    const coverimage = await uploadOnCloudinary(coverimagelocalpath)

    if(!avatar){
      throw new ApiError(400,"Avatar File is required(cloudinary)")
    }
    
    const user = await User.create({
      username:username.toLowerCase(),
      email,
      fullname,
      avatar:avatar.url,
      coverimage:coverimage?.url || "",
      password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshtoken")

    if(!createdUser){
      throw new ApiError(500,"Somethig went wrong while registering a user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully") 
    )
}

export default userRegister