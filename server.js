const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;
let serverUrl = ""; // Will be updated dynamically

// ✅ Fetch GitHub token from environment variable
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.error("❌ GitHub token not found in environment variables!");
    process.exit(1);
}

// ✅ Enable CORS for all origins
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// 🔗 Retrieve server URL
app.get("/ngrok-url", (req, res) => {
    if (serverUrl) {
        res.json({ serverUrl });
    } else {
        res.status(500).json({ message: "ngrok has not started yet!" });
    }
});

// 📥 Receive data and save to CSV file
app.post("/submit", (req, res) => {
    const { name, phone, date, startTime, timeTaken, score } = req.body;
    const maxScore = 50;
    const numericScore = parseFloat(score);

    // ✅ Validate score value
    if (isNaN(numericScore) || numericScore < 0 || numericScore > maxScore) {
        return res.status(400).json({ message: "❌ Invalid score value!" });
    }

    const percentage = ((numericScore / maxScore) * 100).toFixed(2) + "%";

    // 🎨 Create the log entry
    const logEntry = {
        name,
        phone,
        date,
        startTime,
        timeTaken,
        score: `${numericScore}/${maxScore}`,
        percentage
    };

    console.log("📥 Data received:");
    console.log(logEntry);

    // ✅ Save data in CSV format
    const csvHeader = "Name,Phone,Date,Start Time,Time Taken,Score,Percentage\n";
    const csvRow = `${logEntry.name},${logEntry.phone},${logEntry.date},${logEntry.startTime},${logEntry.timeTaken},${logEntry.score},${logEntry.percentage}\n`;

    // Check if file exists, if not, write header and data
    fs.exists("data.csv", (exists) => {
        if (!exists) {
            fs.writeFile("data.csv", csvHeader + csvRow, (err) => {
                if (err) {
                    console.error("❌ Error saving data:", err);
                    return res.status(500).json({ message: "❌ Error saving data!" });
                }
                console.log("✅ Data saved to data.csv");
            });
        } else {
            fs.appendFile("data.csv", csvRow, (err) => {
                if (err) {
                    console.error("❌ Error saving data:", err);
                    return res.status(500).json({ message: "❌ Error saving data!" });
                }
                console.log("✅ Data appended to data.csv");
            });
        }
    });

    res.json({ message: "✅ Data received successfully!", receivedData: logEntry });
});

// 🚀 Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);

    // ✅ Ensure ngrok is not already running before restarting it
    exec("pgrep -f 'ngrok' && pkill -f 'ngrok'", () => {
        exec("ngrok http 3000 --log=stdout", (err, stdout, stderr) => {
            if (err) {
                console.error("❌ Error starting ngrok:", err);
                return;
            }
            console.log("✅ ngrok started successfully!");
        });

        // ⏳ Wait 5 seconds then fetch ngrok URL
        setTimeout(() => {
            exec("curl -s http://127.0.0.1:4040/api/tunnels", (err, stdout, stderr) => {
                if (err || !stdout) {
                    console.log("⚠️ Failed to fetch ngrok URL using curl. Trying PowerShell.");
                    exec("powershell -Command \"(Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels' -UseBasicParsing).Content\"", (psErr, psStdout, psStderr) => {
                        if (psErr || !psStdout) {
                            console.error("❌ Error fetching ngrok URL:", psErr || psStderr);
                            return;
                        }
                        processNgrokResponse(psStdout);
                    });
                } else {
                    processNgrokResponse(stdout);
                }
            });
        }, 5000);
    });
});

function processNgrokResponse(response) {
    try {
        const tunnels = JSON.parse(response);
        serverUrl = tunnels.tunnels[0]?.public_url;

        if (serverUrl) {
            console.log(`✅ Server is available at: 🔗 ${serverUrl}`);
            fs.writeFileSync("serverUrl.json", JSON.stringify({ serverUrl }));

            // 📤 Automatically push `serverUrl.json` to GitHub
            pushToGitHub();

        } else {
            console.log("⚠️ No ngrok URL found.");
        }
    } catch (parseError) {
        console.error("❌ Error parsing ngrok response:", parseError);
    }
}

function pushToGitHub() {
    console.log("📤 Pushing updates to GitHub...");

    exec("git add .", (err, stdout, stderr) => {
        if (err) return console.error("❌ Error in git add:", err);

        exec('git commit -m "Auto update"', (err, stdout, stderr) => {
            if (err) return console.error("❌ Error in git commit:", err);

            exec(`git push https://etiqotwf:${GITHUB_TOKEN}@github.com/etiqotwf/dictonary.git main`, (err, stdout, stderr) => {
                if (err) return console.error("❌ Error in git push:", err);
                console.log("✅ All changes successfully pushed to GitHub!");
            });
        });
    });
}
