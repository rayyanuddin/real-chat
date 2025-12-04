import db from "../db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SEND MESSAGE
export const sendMessage = (req, res) => {
  const { senderId, receiverId, message } = req.body;
  const file = req.file ? req.file.filename : null;

  const sql = "INSERT INTO messages (senderId, receiverId, message, file) VALUES (?, ?, ?, ?)";
  db.query(sql, [senderId, receiverId, message || "", file], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    const savedMessage = {
      id: result.insertId,
      senderId,
      receiverId,
      message,
      file: file ? `/uploads/${file}` : null,
      isDeleted: 0,
      createdAt: new Date(),
    };

    const io = req.app.get("io");
    if (io) io.emit("receiveMessage", savedMessage);

    res.status(200).json(savedMessage);
  });
};

// GET MESSAGES
export const getMessage = (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.receiverId;

  const sql = `
    SELECT id, senderId, receiverId, message, file, isDeleted, createdAt
    FROM messages
    WHERE ((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?))
    ORDER BY createdAt ASC
  `;

  db.query(sql, [senderId, receiverId, receiverId, senderId], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    const mapped = result.map(m => ({
      ...m,
      message: m.isDeleted ? "This message was deleted" : m.message,
      file: m.file ? `/uploads/${m.file}` : null,
      isDeleted: Boolean(m.isDeleted)
    }));

    res.json(mapped);
  });
};

// DELETE MESSAGE - COMPREHENSIVE VERSION
export const deleteMessage = (req, res) => {
  const rawMessageId = req.params.id;
  const userId = req.user.id;
  
  console.log(`=== DELETE REQUEST ===`);
  console.log(`Raw messageId: "${rawMessageId}"`);
  console.log(`User ID: ${userId}`);
  
  // Try different ID formats
  const messageIdAsNumber = parseInt(rawMessageId);
  const messageIdAsString = rawMessageId.toString().trim();
  
  console.log(`Parsed as number: ${messageIdAsNumber}`);
  console.log(`As string: "${messageIdAsString}"`);
  
  // Function to try delete with a specific ID format
  const tryDelete = (idToTry, idType) => {
    return new Promise((resolve, reject) => {
      console.log(`Trying with ${idType}: ${idToTry}`);
      
      // First, check if message exists with this ID
      const sqlCheck = "SELECT id, senderId, receiverId, message FROM messages WHERE id = ?";
      db.query(sqlCheck, [idToTry], (checkErr, checkResult) => {
        if (checkErr) {
          console.error(`Check error for ${idType}:`, checkErr);
          reject({ type: idType, error: checkErr.message });
          return;
        }
        
        console.log(`Check result for ${idType}: Found ${checkResult.length} messages`);
        
        if (checkResult.length === 0) {
          resolve({ type: idType, found: false });
          return;
        }
        
        const message = checkResult[0];
        console.log(`Message found with ${idType}:`, message);
        console.log(`Ownership check: senderId=${message.senderId}, userId=${userId}, match? ${message.senderId == userId}`);
        
        // Check ownership
        if (message.senderId != userId) {
          resolve({ 
            type: idType, 
            found: true, 
            owned: false,
            owner: message.senderId 
          });
          return;
        }
        
        // Try to delete
        const sqlUpdate = "UPDATE messages SET isDeleted = 1, message = '' WHERE id = ?";
        db.query(sqlUpdate, [idToTry], (updateErr, updateResult) => {
          if (updateErr) {
            console.error(`Update error for ${idType}:`, updateErr);
            reject({ type: idType, error: updateErr.message });
            return;
          }
          
          console.log(`Update successful for ${idType}:`, {
            affectedRows: updateResult.affectedRows,
            id: idToTry
          });
          
          resolve({ 
            type: idType, 
            found: true, 
            owned: true,
            deleted: updateResult.affectedRows > 0,
            message: message 
          });
        });
      });
    });
  };
  
  // Try different ID formats
  const attempts = [];
  
  // Try as number
  if (!isNaN(messageIdAsNumber)) {
    attempts.push(tryDelete(messageIdAsNumber, 'number'));
  }
  
  // Try as string
  attempts.push(tryDelete(messageIdAsString, 'string'));
  
  // Try with CAST
  attempts.push(new Promise((resolve) => {
    const sqlCast = "SELECT id, senderId FROM messages WHERE CAST(id AS CHAR) = ?";
    db.query(sqlCast, [messageIdAsString], (err, result) => {
      if (err) {
        console.error("CAST check error:", err);
        resolve({ type: 'cast', error: err.message });
        return;
      }
      
      if (result.length === 0) {
        resolve({ type: 'cast', found: false });
        return;
      }
      
      console.log("CAST found message:", result[0]);
      resolve({ type: 'cast', found: true, message: result[0] });
    });
  }));
  
  // Execute all attempts
  Promise.allSettled(attempts).then(results => {
    console.log("All attempts completed:", results);
    
    // Check if any succeeded
    const successful = results
      .filter(r => r.status === 'fulfilled' && r.value.deleted)
      .map(r => r.value);
    
    if (successful.length > 0) {
      const success = successful[0];
      console.log(`✅ Delete successful via ${success.type}`);
      
      // Emit socket event
      const io = req.app.get("io");
      if (io) {
        io.emit("messageDeleted", {
          id: success.message.id,
          senderId: success.message.senderId,
          receiverId: success.message.receiverId,
          message: "This message was deleted",
          isDeleted: true
        });
      }
      
      return res.json({
        success: true,
        message: "Message deleted successfully",
        id: success.message.id,
        method: success.type
      });
    }
    
    // Check if message was found but not owned
    const foundNotOwned = results
      .filter(r => r.status === 'fulfilled' && r.value.found && !r.value.owned)
      .map(r => r.value);
    
    if (foundNotOwned.length > 0) {
      console.log(`❌ Permission denied`);
      return res.status(403).json({
        error: "You don't own this message",
        messageOwner: foundNotOwned[0].owner,
        requestingUser: userId
      });
    }
    
    // Message not found at all
    console.log(`❌ Message not found with any method`);
    
    // Last check: search for any message that might match
    const sqlSearch = "SELECT id, senderId FROM messages WHERE id LIKE ? OR senderId = ?";
    db.query(sqlSearch, [`%${messageIdAsString}%`, userId], (searchErr, searchResult) => {
      if (searchErr) {
        console.error("Search error:", searchErr);
      }
      
      console.log("Similar messages:", searchResult);
      
      res.status(404).json({
        error: "Message not found",
        requestedId: rawMessageId,
        yourMessages: searchResult.filter(m => m.senderId == userId),
        suggestions: searchResult.length > 0 ? 
          `Try one of these IDs: ${searchResult.map(m => m.id).join(', ')}` : 
          "No messages found in database"
      });
    });
  }).catch(error => {
    console.error("Promise error:", error);
    res.status(500).json({ error: "Internal server error", details: error });
  });
};