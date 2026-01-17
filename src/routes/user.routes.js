import { Router } from "express";
import {changeCurrentPassword, getCurrentUser, getUserChannel, getWatchHistory, refreshAccessToken, userLogin, userLogout, userRegister,avatarUpdate,coverImageUpdate,changeUserDetails} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js"
const router = Router()

router.route("/register").post(upload.fields([
    {
        name:"avatar",
        maxCount:1
    },
    {
        name:"coverimage",
        maxCount:1
    }
]),userRegister)
router.route("/login").post(userLogin)


// secured routes
router.route("/logout").post(verifyJWT,userLogout)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/get-current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account-details").patch(verifyJWT,changeUserDetails)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),avatarUpdate)
router.route("/coverimage").patch(verifyJWT,upload.single("coverimage"),coverImageUpdate)
router.route("/c/:username").get(verifyJWT,getUserChannel)
router.route("/history").get(verifyJWT,getWatchHistory)

export default router