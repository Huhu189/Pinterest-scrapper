import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());

app.get("/api/scrape", async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.json({ success: false, message: "Username required" });
    }

    const url = `https://www.pinterest.com/${username}/`;

    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--no-zygote",
                "--single-process",
            ],
        });

        const page = await browser.newPage();

        let userData = null;
        let endpointUrl = null;

        page.on("response", async (response) => {
            const rUrl = response.url();

            if (rUrl.includes("UserResource/get")) {
                endpointUrl = rUrl;
                try {
                    const json = await response.json();
                    if (json?.resource_response?.data) {
                        userData = json.resource_response.data;
                    }
                } catch (e) {}
            }
        });

        await page.goto(url, { waitUntil: "networkidle2" });
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise((resolve) => setTimeout(resolve, 2000));

        await browser.close();

        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            data: {
                endpoint_used: endpointUrl,
                username: userData.username,
                name: userData.full_name,
                bio: userData.about,
                image: userData.image_medium_url || userData.image_large_url,
                followers: userData.follower_count,
                following: userData.following_count,
                boards: userData.board_count,
                pins: userData.pin_count,
                website: userData.website_url,
            },
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// === FIX ZEABUR PORT ISSUE ===
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("API running on port " + PORT);
});
