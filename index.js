const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json());

// =======================================================
// NEW: Ye aapke main page (Root URL) ke liye hai
// =======================================================
app.get('/', (req, res) => {
    res.send("Welcome to My Secure API Proxy Server! The server is running perfectly.");
});

// =======================================================
// YE AAPKA SINGLE URL HOGA JO ANDROID APP USE KAREGA
// =======================================================
app.get('/get-my-app-data', async (req, res) => {
    try {
        const weatherApi = process.env.API_KEY_1; 
        const sportsApi = process.env.API_KEY_2;

        res.json({
            status: "Success",
            message: "Single URL is working perfectly!",
            keys_loaded: {
                hasWeatherKey: weatherApi ? "Yes" : "No",
                hasSportsKey: sportsApi ? "Yes" : "No"
            }
        });

    } catch (error) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running securely on port ${PORT}`);
});
