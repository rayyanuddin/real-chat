import express from 'express'
import { getUser, logUser, regUser } from '../Controller/userController.js'
import { auth } from './../middleware/auth.js';
const router=express.Router()
router.post("/register",regUser)
router.post("/login",logUser)
router.get("/",auth,getUser)
export default router;