const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;
let serverUrl = ""; // سيتم تحديثه تلقائيًا

// ✅ تفعيل CORS للسماح لجميع المواقع بالوصول
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// 🔗 استرجاع رابط السيرفر
app.get("/ngrok-url", (req, res) => {
    if (serverUrl) {
        res.json({ serverUrl });
    } else {
        res.status(500).json({ message: "ngrok لم يتم تشغيله بعد!" });
    }
});

// 📥 استقبال البيانات وحفظها في ملف
app.post("/submit", (req, res) => {
    const { name, phone, date, startTime, timeTaken, score } = req.body;
    const maxScore = 50;
    const numericScore = parseFloat(score);

    // ✅ التحقق من صحة الدرجة
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

    console.log("📥 استلام البيانات:");
    console.log(logEntry);

    fs.appendFile("data.txt", logEntry, (err) => {
        if (err) {
            console.error("❌ خطأ أثناء حفظ البيانات:", err);
            return res.status(500).json({ message: "❌ خطأ أثناء حفظ البيانات!" });
        }
        console.log("✅ تم حفظ البيانات في data.txt");
    });

    res.json({ message: "✅ تم استلام البيانات بنجاح!", receivedData: { ...req.body, percentage } });
});

// 🚀 تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);

    // ✅ التأكد من عدم تشغيل `ngrok` مسبقًا قبل إعادة تشغيله
    exec("pgrep -f 'ngrok' && pkill -f 'ngrok'", () => {
        exec("ngrok http 3000 --log=stdout", (err, stdout, stderr) => {
            if (err) {
                console.error("❌ خطأ أثناء تشغيل ngrok:", err);
                return;
            }
            console.log("✅ ngrok يعمل بنجاح!");
        });

        // ⏳ الانتظار 5 ثوانٍ ثم جلب رابط `ngrok`
        setTimeout(() => {
            exec("curl -s http://127.0.0.1:4040/api/tunnels", (err, stdout, stderr) => {
                if (err) {
                    console.error("❌ خطأ أثناء جلب رابط ngrok:", err);
                    return;
                }

                try {
                    const tunnels = JSON.parse(stdout);
                    serverUrl = tunnels.tunnels[0]?.public_url;

                    if (serverUrl) {
                        console.log(`✅ يمكنك الوصول إلى السيرفر عبر: 🔗 ${serverUrl}`);

                        // 🔄 حفظ الرابط في ملف JSON
                        fs.writeFileSync("serverUrl.json", JSON.stringify({ serverUrl }));
                    } else {
                        console.log("⚠️ لم يتم العثور على رابط ngrok.");
                    }
                } catch (parseError) {
                    console.error("❌ خطأ أثناء تحليل استجابة ngrok:", parseError);
                }
            });
        }, 5000);
    });
});
