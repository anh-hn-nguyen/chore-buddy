import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";
configDotenv();

const PRIVATE_KEY = process.env.AUTH_PRIVATE_KEY;
function verifyToken(req, res, next) {

    const token = req.header("Authorization");

    jwt.verify(token, PRIVATE_KEY, function(err, decoded) {
        if (err) {
            return res.status(401).json({
                error: "Invalid token"
            })
        }
        // in case no error
        req.userId = decoded._id;
        next();
    })
    
}

export { verifyToken };