/**
 * TikTok live-status checker.
 *
 * Uses tiktok-live-connector because TikTok's web page is protected by WAF
 * and cannot reliably be scraped with a plain HTTP request.
 *
 * @module platforms/tiktok
 */

import { TikTokLiveConnection } from "tiktok-live-connector";
import type { LiveStatus } from "../types/streamer.js";
import { validateUsername, encodeHandle } from "./validation.js";
import { parseError, ParseFailure } from "./errors.js";
import { logger } from "../utils/logger.js";

/**
 * Check whether a TikTok user is currently live.
 *
 * Uses tiktok-live-connector's composite live-status checker, which can fall
 * back from HTML scraping to TikTok's API and Euler Stream when necessary.
 */
export async function checkTikTokLive(
  username: string,
  signal?: AbortSignal,
): Promise<LiveStatus> {
  const validation = validateUsername("tiktok", username);

  if (!validation.ok) {
    return {
      platform: "tiktok",
      username,
      url: "https://www.tiktok.com/",
      isLive: false,
      error: validation.reason,
    };
  }

  const handle = validation.normalised;
  const url = `https://www.tiktok.com/@${encodeHandle(handle)}/live`;

  // Respect cancellation from the bot's poller.
  if (signal?.aborted) {
    return {
      platform: "tiktok",
      username: handle,
      url,
      isLive: false,
      error: "Check cancelled.",
    };
  }

  try {
    const connection = new TikTokLiveConnection(handle, {});

    const isLive = await connection.fetchIsLive(handle);

    if (!isLive) {
      return {
        platform: "tiktok",
        username: handle,
        url,
        isLive: false,
      };
    }

    // We already know the user is live. Fetch room information so the
    // existing Discord alert UI can keep receiving metadata.
    let roomInfo: any = undefined;

    try {
      roomInfo = await connection.fetchRoomInfo();
    } catch (error) {
      logger.debug(
        `[tiktok] room info unavailable for @${handle}: ${String(error)}`,
      );
    }

    const owner = roomInfo?.owner;
    const stats = roomInfo?.stats;
    const streamInfo = roomInfo?.stream_url;

    return {
      platform: "tiktok",
      username: owner?.unique_id ?? handle,
      url,
      isLive: true,

      displayName:
        typeof owner?.nickname === "string"
          ? owner.nickname.slice(0, 64)
          : undefined,

      followers:
        typeof owner?.follow_info?.follower_count === "number"
          ? owner.follow_info.follower_count
          : undefined,

      profileImage:
        typeof owner?.avatar_larger?.url_list?.[0] === "string"
          ? owner.avatar_larger.url_list[0]
          : undefined,

      verified:
        typeof owner?.verified === "boolean" ? owner.verified : undefined,

      bio:
        typeof owner?.bio_description === "string"
          ? owner.bio_description
          : undefined,

      title:
        typeof roomInfo?.title === "string"
          ? roomInfo.title.slice(0, 256)
          : undefined,

      viewers:
        typeof stats?.user_count === "number"
          ? stats.user_count
          : undefined,

      startedAt:
        typeof roomInfo?.create_time === "number"
          ? new Date(roomInfo.create_time * 1000).toISOString()
          : undefined,

      thumbnail:
        typeof streamInfo?.cover?.url_list?.[0] === "string"
          ? streamInfo.cover.url_list[0]
          : undefined,
    };
  } catch (error) {
    logger.debug(
      `[tiktok] check failed for @${handle}: ${String(error)}`,
    );

    return {
      platform: "tiktok",
      username: handle,
      url,
      isLive: false,
      error: parseError(
        "tiktok",
        ParseFailure.MARKUP_CHANGED,
        String(error),
      ),
    };
  }
}