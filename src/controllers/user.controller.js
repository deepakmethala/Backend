import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import ApiResponse from "../utils/ApiResponse.js"
import uploadOnCloudinary from "../utils/Cloudinary.js"
import asyncHandler from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (id) => {
    try{
      const user = await User.findById(id)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
      await user.save({validateBeforeSave:false})

      return {accessToken,refreshToken}      
    }
    catch(error){
      throw new ApiError(500,"Something went wrong while generating access and refresh tokens")
    }
}

const refreshAccessToken = asyncHandler(async function(req,res){
     const incomingrefreshToken = req.cookies?.refreshToken || req.body.refreshtoken
     if(!incomingrefreshToken){
      throw new ApiError(400,"invalid refreshtoken")
     }

try {
       const decodedToken = jwt.verify(incomingrefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
       const user = await User.findById(decodedToken?._id)
  
       if(!user){
        throw new ApiError(400,"invalid user authorization")
       }
       
      if(user?.refreshtoken !== incomingrefreshToken){
        throw new ApiError(400,"refresh token mismatch")
      }
  
      const options = {
        httpOnly:true,
        secure:true
      }
  
      const {accessToken,newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
   
      return res.status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",newrefreshToken,options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken:newrefreshToken
          },
          "Access Token Refreshed Successfully"
        )
      )
} catch (error) {
  throw new ApiError(401,"refreshaccesstoken error",error)
}

})

const userRegister = asyncHandler(async function(req,res){
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
})

const userLogin  = asyncHandler(async function(req,res){
  // req.body - data
  // validate the data
  // find the user based on username or email
  // password check
  // generate access and refresh token
  // send cookie

  const {username,email,password} = req.body;

  if(!(username || email)){
    throw new ApiError(400,"username or email is required")
  }

  const userExisted = await User.findOne({
    $or:[{username},{email}]
  })

  if(!userExisted){
    throw new ApiError(404,"User Does Not Exist")
  }

  const isPasswordValid = await userExisted.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401,"Invalid User Credentials")
  }

  const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(userExisted._id)

  const userLoggedIn = await User.findById(userExisted._id).select("-password -refreshtoken")

  console.log(userLoggedIn);
  
  const options = {
    httpOnly:true,
    secure:true
  }

  return res.status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,
      {
        user: userLoggedIn,accessToken,refreshToken
      },
      "User Loggedin successfully"
    )
  )

})

const userLogout = asyncHandler( async function(req,res){
      await User.findByIdAndUpdate(req.user._id,
        {
          $set:{
            refreshtoken: undefined
          }
        },{
          new:true
        }
      )
    const options = {
    httpOnly:true,
    secure:true
    }
    return res.status(200)
    .cookie("accessToken",options)
    .cookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out successfully"))
})


export  {userRegister,userLogin,userLogout,refreshAccessToken}