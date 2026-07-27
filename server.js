const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Frontend Dashboard सर्व करने के लिए
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Memory Database: यहाँ आपकी App का URL और कई AI Keys स्टोर होंगी
let systemConfig = {
    appWebhookUrl: "",
    apiKeys: {
        gemini: "",
        openai: "",
        claude: ""
        // भविष्य में हम यहाँ 15-20 और AI जोड़ सकते हैं
    }
};

// डैशबोर्ड से आने वाली नई सेटिंग्स को सेव करने का रूट
app.post('/update-config', (req, res) => {
    const { url, keys } = req.body;
    
    if (url) systemConfig.appWebhookUrl = url;
    if (keys) {
        // पुरानी Keys के साथ नई Keys को मिला दें
        systemConfig.apiKeys = { ...systemConfig.apiKeys, ...keys };
    }
    
    console.log("New config saved:", systemConfig);
    res.json({ message: "Success! All API Keys and URL have been saved.", config: systemConfig });
});

// Android App के लिए कनेक्शन रूट
// अब आपकी App बता सकती है कि उसे कौन सा AI चाहिए (उदा. req.body.aiName = 'gemini')
app.post('/api-connect', (req, res) => {
    const { aiName } = req.body; // App बताएगी कि कौन सा AI यूज़ करना है

    // चेक करें कि App ने AI का नाम भेजा है या नहीं
    if (!aiName) {
        return res.status(400).json({ error: "System Error: Please specify which AI you want to use (aiName)." });
    }

    // चेक करें कि वेबसाइट पर उस AI की Key सेव है या नहीं
    const requestedAi = aiName.toLowerCase();
    if (!systemConfig.apiKeys[requestedAi]) {
        return res.status(400).json({ error: `System Error: API Key for '${aiName}' not found. Please set it on the dashboard.` });
    }

    // यहाँ हम भविष्य में असल AI API को कॉल करेंगे
    res.json({ 
        message: `App is successfully connected! Ready to use ${aiName} AI.`, 
        selectedAi: aiName,
        webhookUrl: systemConfig.appWebhookUrl 
    });
});

// Server Start करना
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running! Dashboard available at http://localhost:${PORT}`);
});
