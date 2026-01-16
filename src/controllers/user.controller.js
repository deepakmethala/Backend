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
     const incomingrefreshToken = req.cookies?.refreshToken || req.body.refreshToken
     if(!incomingrefreshToken){
      throw new ApiError(400,"invalid refreshtoken")
     }

try {
       const decodedToken = jwt.verify(incomingrefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
       const user = await User.findById(decodedToken?._id)
  
       if(!user){
        throw new ApiError(400,"invalid user authorization")
       }
       
      if(user?.refreshToken !== incomingrefreshToken){
        throw new ApiError(400,"refresh token mismatch")
      }
  
      const options = {
        httpOnly:true,
        secure:true
      }
  
      const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
   
      return res.status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken:refreshToken
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

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
      throw new ApiError(500,"Something went wrong while registering a user")
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

  const userLoggedIn = await User.findById(userExisted._id).select("-password -refreshToken")

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
            refreshToken: undefined
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
.clearCookie("accessToken", options)
.clearCookie("refreshToken", options)
.json(new ApiResponse(200, {}, "User logged out successfully"))
})

const changeCurrentPassword  = asyncHandler(async function(req,res){
   const {oldPassword,newPassword} = req.body
   if(!oldPassword || !newPassword){
    throw new ApiError(400,"All Fields are required")
   }
   const user = await User.findById(req.user?._id)

   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
    throw new ApiError(400,"Old Password You Entered is incorrect")
   }

   user.password = newPassword
   await user.save({validateBeforeSave:false})

   return res
   .status(200)
   .json(
    new ApiResponse(200,{},"Password Updated Successfully")
   )
})

const changeUserDetails = asyncHandler(async function(req,res){
  const {fullname,email} = req.body
  if(!(fullname || email)){
    throw new ApiError(400,"Please Enter details properly")
  }

   const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        email:email,
        fullname
      }
    },{
      new:true
    }
   ).select("-password")

   return res
   .status(201)
   .json(
    new ApiResponse(201,user,"User Details Updated")
   )

})

const getCurrentUser = asyncHandler(async function(req,res){
  return res
  .status(200)
  .json(
    new ApiResponse(200,req.user,"Current User Fetched Successfully")
  )
})

const avatarUpdate = asyncHandler(async function(req,res){
   const avatarlocalpath = req.file?.path

   if(!avatarlocalpath){
    throw new ApiError(400,"Avatar  is required")
   }

   const avatar = await uploadOnCloudinary(avatarlocalpath)

   if(!avatar){
    throw new ApiError(400,"Avatar  is required")
   }
  
   const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar:avatar.url
      }
    },{
      new:true
    }
   ).select("-password")

   return res
   .status(201)
   .json(
    new ApiResponse(201,user,"Avatar is Updated")
   )

})

const coverImageUpdate = asyncHandler(async function(req,res){
   const coverImagelocalpath = req.file?.path

   if(!coverImagelocalpath){
    throw new ApiError(400,"coverImage  is required")
   }

   const coverImage = await uploadOnCloudinary(coverImagelocalpath)

   if(!coverImage){
    throw new ApiError(400,"coverImage  is required")
   }
  
   const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverimage:coverImage.url
      }
    },{
      new:true
    }
   ).select("-password")

   return res
   .status(201)
   .json(
    new ApiResponse(201,user,"coverImage is Updated")
   )

})

export  {userRegister,userLogin,userLogout,refreshAccessToken,changeCurrentPassword,getCurrentUser,changeUserDetails,avatarUpdate,coverImageUpdate}