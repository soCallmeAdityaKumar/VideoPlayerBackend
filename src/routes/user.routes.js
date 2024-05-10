import {Router} from 'express'
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loggedOutUser, loginUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from '../controllers/user.controller.js'
import {upload} from '../middlewares/multer.middlewares.js'
import { verifyJWT } from '../middlewares/auth.middlewares.js'
const router=Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

//securedRoutes
router.route("/logout").post(verifyJWT,loggedOutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/changePassword").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(getCurrentUser)
router.route("/update_account").patch(verifyJWT,updateAccountDetails)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,update.single("coverImage"),updateUserCoverImage)
router.route("/channel/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history").get(verifyJWT,getWatchHistory)


export default router