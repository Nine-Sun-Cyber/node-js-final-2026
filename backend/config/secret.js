module.exports ={
    jwtSecret: process.env.JWT_SECRET || "nodework666",
    jwtExpiresDay: process.env.JWT_EXPIRES_DAY || "30d",
};