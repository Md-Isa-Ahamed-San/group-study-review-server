const jwt = require("jsonwebtoken");

// Generate Access Token
function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email }, // Payload
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION }
  );
}

// Generate Refresh Token
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRATION }
  );
}

// Verify Access Token Middleware
function verifyAccessToken(req, res, next) {
  // console.log("req: ", req.header);
  const token = req.header("Authorization")?.replace("Bearer ", "");
console.log("token: ",token)
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied. No Token Provided." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log("verified: ",verified)
    req.user = verified; // Attach user details to the request
    console.log("Valid Token Verified:", verified); // Log for valid token
    next();
  } catch (error) {
    console.log("Invalid or Expired Token:", error.message); // Log for invalid token
    res.status(403).json({ message: "Invalid or Expired Token." });
  }
}


module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
};
