import db from '../db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

export const regUser = (req, res) => {
  const { name, email, password } = req.body;
  console.log("BODY RECEIVED:", req.body);

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Fill all fields" });
  }

  const checkSql = "SELECT * FROM users WHERE email = ?";
  db.query(checkSql, [name,email], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    if (result.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const sql = "INSERT INTO users (name,email,password) VALUES (?,?,?)";
    const hashPassword = bcrypt.hashSync(password, 10);

    db.query(sql, [name, email, hashPassword], (err) => {
      if (err) return res.status(500).json({ error: err });
      res.status(200).json({ message: "User registered successfully" });
    });
  });
};

export const logUser = (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email=?";
  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(400).json({ message: "User not found" });

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successfully",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  });
};

export const getUser = (req,res)=>{
    const sql="SELECT id, name, email FROM users"; 
    db.query(sql,(err,result)=>{
        if(err) return res.status(500).json({error:err});
        res.status(200).json(result);
    });
}
