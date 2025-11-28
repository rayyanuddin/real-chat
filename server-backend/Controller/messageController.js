import db from "../db.js";

export const sendMessage = (req, res) => {
  const { senderId, receiverId, message } = req.body;

  const sql = "INSERT INTO messages (senderId, receiverId, message) VALUES (?, ?, ?)";
  
  db.query(sql, [senderId, receiverId, message], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json({ message: "Message sent" });
  });
};

export const getMessage = (req, res) => {
  const senderId = req.user.id;             // logged-in user from token
  const receiverId = req.params.receiverId; // selected user

  const sql = `
    SELECT * FROM messages 
    WHERE 
      (senderId = ? AND receiverId = ?) 
      OR 
      (senderId = ? AND receiverId = ?)
    ORDER BY createdAt ASC
  `;

  db.query(sql, [senderId, receiverId, receiverId, senderId], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
};

export const deleteMessage = (req, res) => {
  const messageId = req.params.id;

  const sql = "DELETE FROM messages WHERE id = ?";
  db.query(sql, [messageId], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json({ message: "Message deleted" });
  });
};

