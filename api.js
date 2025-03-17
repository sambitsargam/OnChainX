const express = require("express");
const axios = require("axios");
const twilio = require("twilio");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());
const port = 3000;
require('dotenv').config();

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.use(express.json());
  // Parse URL-encoded bodies (as sent by HTML forms)
  app.use(bodyParser.urlencoded({ extended: true }));

  // Parse JSON bodies (as sent by API clients)
  app.use(bodyParser.json());

app.post("/api/send-whatsapp", async (req, res) => {
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

    const from = req.body.From; // The sender's phone number
    const body = req.body.Body; // Message content

    console.log("Received WhatsApp message from", from, "with body:", body);

    try {
        // Forward the message to the service on port 7378
        const response = await axios.post("http://localhost:7378", { message: body });

        console.log("Response from port 7378:", response);

        // Send the response back to WhatsApp
        const message = await twilioClient.messages.create({
            to: `${from}`,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            body: response.data.reply || "No response received."
        });

        res.json({ success: true, message: "WhatsApp message sent.", sid: message.sid });
    } catch (error) {
        console.error("Error processing request:", error);

        await twilioClient.messages.create({
            to: `${from}`,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            body: "Sorry, I'm currently unable to process your request. Please try again later."
        });

        res.status(500).json({ success: false, message: "Failed to process WhatsApp message." });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
