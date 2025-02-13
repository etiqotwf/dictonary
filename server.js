const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;
let serverUrl = ""; // سيتم تحديثه تلقائيًا

app.use(cors());
app.use(bodyParser.json());

// استرجاع رابط ngrok عند الطلب
app.get("/ngrok-url", (req, res) => {
    if (!serverUrl) {
        try {
            // محاولة جلب الرابط من ملف JSON
            const data = fs.readFileSync("serverUrl.json", "utf8");
            const jsonData = JSON.parse(data);
            serverUrl = jsonData.serverUrl || "";
        } catch (err) {
            console.error("❌ خطأ في قراءة ملف serverUrl.json:", err);
        }
    }

    if (serverUrl) {
        res.json({ serverUrl });
    } else {
        res.status(500).json({ message: "❌ لم يتم العثور على رابط ngrok!" });
    }
});

// استقبال البيانات وحفظها
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

// تشغيل السيرفر وngrok
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);

    exec("ngrok http 3000 --log=stdout", (err, stdout, stderr) => {
        if (err) {
            console.error("❌ Error starting ngrok:", err);
            return;
        }
        console.log("✅ ngrok started successfully!");
    });

    // الانتظار ثم جلب رابط ngrok
    setTimeout(() => {
        exec("curl -s http://127.0.0.1:4040/api/tunnels", (err, stdout, stderr) => {
            if (err) {
                console.error("❌ Error fetching ngrok URL:", err);
                return;
            }

            try {
                const tunnels = JSON.parse(stdout);
                serverUrl = tunnels.tunnels[0]?.public_url;

                if (serverUrl) {
                    console.log(`✅ يمكنك الوصول إلى السيرفر عبر: 🔗 ${serverUrl}`);

                    // حفظ الرابط في ملف JSON
                    fs.writeFileSync("serverUrl.json", JSON.stringify({ serverUrl }));
                } else {
                    console.log("⚠️ لم يتم العثور على رابط ngrok.");
                }
            } catch (parseError) {
                console.error("❌ Error parsing ngrok response:", parseError);
            }
        });
    }, 5000);
});
