import express from 'express'
import {  deleteMessage, getMessage, sendMessage } from '../Controller/messageController.js'
import { auth } from './../middleware/auth.js';
const router=express.Router()
router.post('/send',auth,sendMessage)
router.get('/:receiverId', auth, getMessage);
router.delete('/delete/:id', auth, deleteMessage);



export default router;