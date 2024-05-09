import {v2 as cloudinary} from 'cloudinary'
import fs from "fs"
import { loadavg } from 'os';
       


const upload_on_cloudinary=async(localFilePath)=>{
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
    try{
        if(!localFilePath)return null
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        fs.unlinkSync(localFilePath)//remove the local temporary file as upload
        return response;
    }catch(error){
        fs.unlinkSync(localFilePath)//remove the local temporary file as upload
        return null
    }
}
export  {upload_on_cloudinary}