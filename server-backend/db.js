import mysql from 'mysql2'
import dotenv from 'dotenv'
dotenv.config()
const db=mysql.createConnection({
   host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

db.connect((err)=>{
    if (err) {
    console.log("DB Connection Error:", err);
  } else {
    console.log("MySQL Connected Successfully");
  }
})
export default db;
