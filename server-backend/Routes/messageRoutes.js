import express from "express";
import { sendMessage, getMessage, deleteMessage } from "../Controller/messageController.js";
import { upload } from "../middleware/upload.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.post("/send", auth, upload.single("file"), sendMessage);
router.get("/:receiverId", auth, getMessage);
router.delete("/delete/:id", auth, deleteMessage);

export default router;