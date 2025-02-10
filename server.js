const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post("/submit", (req, res) => {
    const { name, phone, date, startTime, timeTaken, score } = req.body;

    // الحد الأقصى للدرجات بناءً على عدد الأسئلة
    const maxScore = 5; // لأن هناك 5 أسئلة وكل سؤال بدرجة واحدة

    // التأكد من أن score قيمة عددية صحيحة
    const numericScore = parseFloat(score);

    if (isNaN(numericScore) || numericScore < 0 || numericScore > maxScore) {
        return res.status(400).json({ message: "❌ Invalid score value!" });
    }

    // حساب النسبة المئوية بناءً على 5
    const percentage = ((numericScore / maxScore) * 100).toFixed(2) + "%";

    // تجهيز النص للحفظ في الملف
    const logEntry = `🧑 Name        : ${name}
📞 Phone       : ${phone}
📅 Date        : ${date}
⏰ Start Time  : ${startTime}
⏳ Time Taken  : ${timeTaken}
🏆 Score       : ${numericScore}/${maxScore} (${percentage})
-----------------------------------\n`;

    // طباعة البيانات في التيرمينال
    console.log("📥 Received Data:");
    console.log(logEntry);

    // حفظ البيانات في ملف نصي
    fs.appendFile("data.txt", logEntry, (err) => {
        if (err) {
            console.error("❌ Error saving data:", err);
            return res.status(500).json({ message: "Error saving data!" });
        }
        console.log("✅ Data saved to data.txt");
    });

    res.json({ message: "✅ Data received and saved successfully!", receivedData: { ...req.body, percentage } });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
