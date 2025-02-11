const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post("/submit", (req, res) => {
    const { name, phone, date, startTime, timeTaken, score } = req.body;

    const maxScore = 50;
    const numericScore = parseFloat(score);

    if (isNaN(numericScore) || numericScore < 0 || numericScore > maxScore) {
        return res.status(400).json({ message: "❌ Invalid score value!" });
    }

    const percentage = ((numericScore / maxScore) * 100).toFixed(2) + "%";

    const logEntry = `🧑 Name        : ${name}
📞 Phone       : ${phone}
📅 Date        : ${date}
⏰ Start Time  : ${startTime}
⏳ Time Taken  : ${timeTaken}
🏆 Score       : ${numericScore}/${maxScore} (${percentage})
-----------------------------------\n`;

    console.log("📥 Received Data:");
    console.log(logEntry);

    fs.appendFile("data.txt", logEntry, (err) => {
        if (err) {
            console.error("❌ Error saving data:", err);
            return res.status(500).json({ message: "Error saving data!" });
        }
        console.log("✅ Data saved to data.txt");
    });

    res.json({ message: "✅ Data received and saved successfully!", receivedData: { ...req.body, percentage } });
});

// تشغيل السيرفر ثم تشغيل ngrok تلقائيًا وجلب الرابط
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);

    exec("ngrok http 3000", (err, stdout, stderr) => {
        if (err) {
            console.error("❌ Error starting ngrok:", err);
            return;
        }
        console.log("✅ ngrok started successfully!");
    });

    setTimeout(() => {
        exec("curl -s http://127.0.0.1:4040/api/tunnels", (err, stdout, stderr) => {
            if (err) {
                console.error("❌ Error fetching ngrok URL:", err);
                return;
            }

            try {
                const tunnels = JSON.parse(stdout);
                const publicUrl = tunnels.tunnels[0]?.public_url;

                if (publicUrl) {
                    console.log(`✅ يمكنك الآن الوصول إلى السيرفر المحلي الخاص بك عبر الرابط التالي:`);
                    console.log(`🔗 ${publicUrl}`);
                } else {
                    console.log("⚠️ لم يتم العثور على رابط ngrok.");
                }
            } catch (parseError) {
                console.error("❌ Error parsing ngrok response:", parseError);
            }
        });
    }, 3000); // الانتظار حتى يتم تشغيل ngrok
});
