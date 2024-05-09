import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js"
import {upload_on_cloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const registerUser=asyncHandler(async(req,res)=>{
     

    const {fullname,email,username,password}=req.body;

    if(
        [fullname,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already existed")
    }

    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImageLocalPath=req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }


    const avatar=await upload_on_cloudinary(avatarLocalPath)
    const coverimage=await upload_on_cloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }
    const user= await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverimage?.url||"",
        email,
        password,
        username:username.toLowerCase()        
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )


})


const generateAccessAndRefreshToken=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken;
        await user.save({validateBeforesSave:false})
        return {accessToken,refreshToken}

    }catch(error){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}


const loginUser=asyncHandler(async(req,res)=>{

    const {email,username,password}=req.body;
    if((!username && !email)){
        throw new ApiError(400,"username or email is required")
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User doesnot exist")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

    const loggedinuser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedinuser,accessToken,refreshToken
        },
        "User logged in Successfully"
        )
    )

})


const loggedOutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken:undefined
        }
    },{
        new:true
    })

    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json( new ApiResponse(200,{},"User Logged Out"))
})


const refreshAccessToken= asyncHandler(async(req,res)=>{
    try{
        const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken

        if(!incomingRefreshToken){
            throw new ApiError(401,"Unauthorize Request")
        }

        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

        const user=await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401,"Invalid refresh Token")
        }

        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh Token is Expired or used")
        }

        const options={
            httpOnly:true,
            secure:true
        }

        const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(new ApiResponse(200,{
            accessToken,refreshToken
        },"Access token refresh"))

    }catch(error){
        new ApiError(401,error?.message||"Invalid Access Token")
    }
})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await User.findById(req.user?._id)

    const isPasswordCorrect=user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old Password")
    }

    user.password=newPassword

    await user.save({validateBeforeSave:true})


    return res.status(200).json(new ApiResponse(200,{},"Password changed Successfully"))

})


const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(200,req.user,"Current user fetched Successfully")
})


const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body;

    if(!fullName||!email){
        throw new ApiError(400,"All fields are required")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"Account Details Updated Successfully"))

})


const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalFile=req.file?.path

    if(!avatarLocalFile){
        throw new ApiError(400,"Avatar file is Missing")
    }

    const avatar=await upload_on_cloudinary(avatarLocalFile)

    if(!avatar.url){
        throw new ApiError(400,"Error while updating Avatar")
    }

    const user=await User.findByIdAndUpdate(req.user._id,{$set:{avatar:avatar.url}},{new:true}).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"Avater updated Successfully")
    )
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalFile=req.file?.path

    if(!coverImageLocalFile){
        throw new ApiError(400,"CoverImage file is Missing")
    }

    const coverImage=await upload_on_cloudinary(coverImageLocalFile)

    if(!coverImage.url){
        throw new ApiError(400,"Error while updating CoverImage")
    }

    const user=await User.findByIdAndUpdate(req.user._id,{$set:{coverImage:coverImage.url}},{new:true}).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"CoverImage updated Successfully")
    )
})


export {registerUser,loginUser,loggedOutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage}