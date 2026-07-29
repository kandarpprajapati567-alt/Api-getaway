const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json());

// =======================================================
// YE AAPKA SINGLE URL HOGA -> /get-my-app-data
// =======================================================
app.get('/get-my-app-data', async (req, res) => {
    try {
        // Aapki keys jo aap Hosting website pe dalenge, wo yahan automatic aayengi
        const weatherApi = process.env.API_KEY_1; 
        const sportsApi = process.env.API_KEY_2;
        const newsApi = process.env.API_KEY_3;
        // Aise hi aap 30 keys tak read kar sakte hain

        // Yahan par hum abhi sirf ek test response bhej rahe hain aapke Android app ko
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
