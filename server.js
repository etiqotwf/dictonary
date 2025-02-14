const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;
let serverUrl = ""; // سيتم تحديثه تلقائيًا

// ✅ جلب التوكن من المتغيرات البيئية
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.error("❌ لم يتم العثور على GitHub Token في البيئة!");
    process.exit(1);
}

// ✅ تمكين CORS لجميع المصادر
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

// 📥 استلام البيانات وتخزينها في ملف
app.post("/submit", (req, res) => {
    const { name, phone, date, startTime, timeTaken, score } = req.body;
    const maxScore = 50;
    const numericScore = parseFloat(score);

    // ✅ التحقق من صحة القيمة
    if (isNaN(numericScore) || numericScore < 0 || numericScore > maxScore) {
        return res.status(400).json({ message: "❌ قيمة الدرجة غير صحيحة!" });
    }

    const percentage = ((numericScore / maxScore) * 100).toFixed(2) + "%";
    const logEntry = `🧑 الاسم        : ${name}\n📞 الهاتف       : ${phone}\n📅 التاريخ      : ${date}\n⏰ وقت البدء    : ${startTime}\n⏳ المدة        : ${timeTaken}\n🏆 النتيجة      : ${numericScore}/${maxScore} (${percentage})\n-----------------------------------\n`;

    console.log("📥 تم استلام البيانات:");
    console.log(logEntry);

    fs.appendFile("data.txt", logEntry, (err) => {
        if (err) {
            console.error("❌ خطأ أثناء حفظ البيانات:", err);
            return res.status(500).json({ message: "❌ فشل في حفظ البيانات!" });
        }
        console.log("✅ تم حفظ البيانات بنجاح في data.txt");
    });

    res.json({ message: "✅ تم استلام البيانات بنجاح!", receivedData: { ...req.body, percentage } });
});

// 🚀 تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على: http://localhost:${PORT}`);

    // ✅ تأكد من إيقاف `ngrok` قبل تشغيله مجددًا
    exec("taskkill /F /IM ngrok.exe", () => {
        exec("start ngrok http 3000", (err, stdout, stderr) => {
            if (err) {
                console.error("❌ خطأ أثناء تشغيل ngrok:", err);
                return;
            }
            console.log("✅ تم تشغيل ngrok بنجاح!");
        });

        // ⏳ انتظر 5 ثوانٍ ثم احصل على رابط `ngrok`
        setTimeout(fetchNgrokUrl, 5000);
    });
});

function fetchNgrokUrl() {
    exec("curl -s http://127.0.0.1:4040/api/tunnels", (err, stdout, stderr) => {
        if (err || !stdout) {
            console.log("⚠️ فشل جلب رابط ngrok باستخدام curl. تجربة Invoke-WebRequest.");
            exec("powershell -Command \"(Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels' -UseBasicParsing).Content\"", (psErr, psStdout, psStderr) => {
                if (psErr || !psStdout) {
                    console.error("❌ خطأ أثناء جلب رابط ngrok:", psErr || psStderr);
                    return;
                }
                processNgrokResponse(psStdout);
            });
        } else {
            processNgrokResponse(stdout);
        }
    });
}

function processNgrokResponse(response) {
    try {
        const tunnels = JSON.parse(response);
        serverUrl = tunnels.tunnels[0]?.public_url;

        if (serverUrl) {
            console.log(`✅ السيرفر متاح على: 🔗 ${serverUrl}`);
            fs.writeFileSync("serverUrl.json", JSON.stringify({ serverUrl }));

            // 📤 تحديث الملف على GitHub تلقائيًا
            const gitCommands = `
                git config --global user.name "GitHub Actions" &&
                git config --global user.email "actions@github.com" &&
                git add serverUrl.json &&
                git commit -m "🔄 تحديث تلقائي لرابط السيرفر" &&
                git push https://etiqotwf:${GITHUB_TOKEN}@github.com/etiqotwf/dictonary.git main
            `;

            // 🏁 تنفيذ أوامر Git تلقائيًا
            exec(gitCommands, (gitErr, gitStdout, gitStderr) => {
                if (gitErr) {
                    console.error("❌ خطأ أثناء رفع serverUrl.json إلى GitHub:", gitErr);
                    return;
                }
                console.log("✅ تم رفع serverUrl.json إلى GitHub بنجاح!");
            });

        } else {
            console.log("⚠️ لم يتم العثور على رابط ngrok.");
        }
    } catch (parseError) {
        console.error("❌ خطأ أثناء تحليل استجابة ngrok:", parseError);
    }
}
