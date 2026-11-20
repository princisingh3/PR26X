const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;


// User Model

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    score: {
        type: Number,
        default: 0
    },

    coins: {
        type: Number,
        default: 0
    },

    completedLevels: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

const User = mongoose.model("User", userSchema);


// Authentication Middleware

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please login first."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.userId = decoded.userId;
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
}


// Home Route

app.get("/", (req, res) => {
    res.json({
        message: "PR26X NEXORA server is running."
    });
});


// Register User

app.post("/api/auth/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        if (username.trim().length < 3) {
            return res.status(400).json({
                message: "Username must contain at least 3 characters."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters."
            });
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Account created successfully.",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Registration failed."
        });
    }
});


// Login User

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Login successful.",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                score: user.score,
                coins: user.coins
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed."
        });
    }
});


// Get Current User

app.get("/api/auth/me", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json(user);

    } catch (error) {
        res.status(500).json({
            message: "Unable to get user details."
        });
    }
});


// Save Game Score

app.post("/api/game/score", verifyToken, async (req, res) => {
    try {
        const { score, coins, completedLevels } = req.body;

        if (
            !Number.isInteger(score) ||
            !Number.isInteger(coins) ||
            !Number.isInteger(completedLevels) ||
            score < 0 ||
            coins < 0 ||
            completedLevels < 0
        ) {
            return res.status(400).json({
                message: "Invalid game progress."
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        user.score = Math.max(user.score, score);
        user.coins = Math.max(user.coins, coins);
        user.completedLevels = Math.max(
            user.completedLevels,
            completedLevels
        );

        await user.save();

        res.json({
            message: "Game progress saved.",
            score: user.score,
            coins: user.coins,
            completedLevels: user.completedLevels
        });

    } catch (error) {
        res.status(500).json({
            message: "Unable to save game progress."
        });
    }
});


// Leaderboard

app.get("/api/leaderboard", async (req, res) => {
    try {
        const players = await User.find()
            .select("username score")
            .sort({ score: -1 })
            .limit(10);

        res.json(players);

    } catch (error) {
        res.status(500).json({
            message: "Unable to load leaderboard."
        });
    }
});


// Start Server

async function startServer() {
    try {
        if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
            throw new Error("Database or JWT configuration is missing.");
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully.");

        app.listen(PORT, () => {
            console.log(`PR26X NEXORA running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
