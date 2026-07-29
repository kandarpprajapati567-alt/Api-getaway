const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json());

// =======================================================
// FIX: This replaces the index.html error. 
// It just sends a simple text response for the main page.
// =======================================================
app.get('/', (req, res) => {
    res.send("API Gateway is running successfully! No HTML needed.");
});

// =======================================================
// THIS IS YOUR SINGLE URL FOR THE ANDROID APP
// =======================================================
app.get('/get-my-app-data', async (req, res) => {
    try {
        // Fetch your keys from Render's Environment Variables
        const api1 = process.env.API_KEY_1; 
        const api2 = process.env.API_KEY_2;

        res.json({
            status: "Success",
            message: "Your keys are secure and the URL is working!",
            keys_loaded: {
                key1_found: api1 ? true : false,
                key2_found: api2 ? true : false
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// Start the server safely
const PORT = process.env.PORT || 10000; // Render often uses port 10000
app.listen(PORT, () => {
    console.log(`Server running securely on port ${PORT}`);
});
