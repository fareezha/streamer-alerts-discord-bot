import { TikTokLiveConnection } from "tiktok-live-connector";

const username = "lindayoee";

const connection = new TikTokLiveConnection(username, {});

try {
  const isLive = await connection.fetchIsLive();

  console.log(`@${username} is live: ${isLive}`);
} catch (error) {
  console.error("TikTok check failed:", error);
}