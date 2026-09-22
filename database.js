const path = require('path');
const fs = require('fs');

/**
 * SQLite Database Service for User Economy, Leveling, and Media Post Tracking.
 * Uses better-sqlite3 with an automatic fallback mechanism if the native module is not yet compiled.
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.isNative = false;
    this.memoryStore = {
      users: new Map(),
      posts: []
    };
    this.init();
  }

  init() {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'bot_database.sqlite');

    try {
      const Database = require('better-sqlite3');
      this.db = new Database(dbPath);
      this.isNative = true;

      // Enable WAL mode for high concurrency and performance
      this.db.pragma('journal_mode = WAL');

      this.createTables();
      console.log('[Database] SQLite connected successfully via better-sqlite3.');
    } catch (err) {
      console.warn('[Database] Native better-sqlite3 not available or not yet installed. Running in-memory database fallback mode.');
      console.warn(`[Database] Reason: ${err.message}`);
    }
  }

  createTables() {
    if (!this.isNative) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        balance INTEGER DEFAULT 0,
        last_xp_at INTEGER DEFAULT 0,
        last_daily_at INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
      );

      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        media_url TEXT,
        description TEXT,
        upvotes INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_xp ON users(guild_id, xp DESC);
      CREATE INDEX IF NOT EXISTS idx_users_balance ON users(guild_id, balance DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_guild ON posts(guild_id, created_at DESC);
    `);
  }

  /**
   * Retrieves or initializes a user record in the guild.
   */
  getUser(userId, guildId) {
    if (this.isNative) {
      const stmt = this.db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?');
      let user = stmt.get(userId, guildId);

      if (!user) {
        const insert = this.db.prepare(`
          INSERT INTO users (user_id, guild_id, xp, level, balance, last_xp_at, last_daily_at)
          VALUES (?, ?, 0, 1, 0, 0, 0)
        `);
        insert.run(userId, guildId);
        user = stmt.get(userId, guildId);
      }
      return user;
    } else {
      const key = `${guildId}:${userId}`;
      if (!this.memoryStore.users.has(key)) {
        this.memoryStore.users.set(key, {
          user_id: userId,
          guild_id: guildId,
          xp: 0,
          level: 1,
          balance: 0,
          last_xp_at: 0,
          last_daily_at: 0
        });
      }
      return this.memoryStore.users.get(key);
    }
  }

  /**
   * Calculates XP required to advance past a given level.
   * Standard formula: 100 * (level ^ 1.5)
   */
  getXpForNextLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Awards XP to a user with cooldown verification.
   * Returns whether a level-up occurred and current user state.
   */
  addXp(userId, guildId, amount, cooldownSeconds = 60) {
    const now = Math.floor(Date.now() / 1000);
    const user = this.getUser(userId, guildId);

    // Check cooldown
    if (user.last_xp_at && now - user.last_xp_at < cooldownSeconds) {
      return { added: false, onCooldown: true, remaining: cooldownSeconds - (now - user.last_xp_at) };
    }

    const oldLevel = user.level;
    let newXp = user.xp + amount;
    let newLevel = oldLevel;

    // Check for level ups
    while (newXp >= this.getXpForNextLevel(newLevel)) {
      newXp -= this.getXpForNextLevel(newLevel);
      newLevel += 1;
    }

    const leveledUp = newLevel > oldLevel;

    if (this.isNative) {
      const stmt = this.db.prepare(`
        UPDATE users
        SET xp = ?, level = ?, last_xp_at = ?
        WHERE user_id = ? AND guild_id = ?
      `);
      stmt.run(newXp, newLevel, now, userId, guildId);
    } else {
      user.xp = newXp;
      user.level = newLevel;
      user.last_xp_at = now;
    }

    return {
      added: true,
      leveledUp,
      oldLevel,
      newLevel,
      currentXp: newXp,
      xpNeeded: this.getXpForNextLevel(newLevel)
    };
  }

  /**
   * Claims daily economy reward (24-hour cooldown).
   */
  claimDaily(userId, guildId, rewardAmount) {
    const now = Math.floor(Date.now() / 1000);
    const user = this.getUser(userId, guildId);
    const dayInSeconds = 24 * 60 * 60;

    if (user.last_daily_at && now - user.last_daily_at < dayInSeconds) {
      const waitTime = dayInSeconds - (now - user.last_daily_at);
      return {
        success: false,
        cooldown: true,
        remainingSeconds: waitTime
      };
    }

    const newBalance = user.balance + rewardAmount;

    if (this.isNative) {
      const stmt = this.db.prepare(`
        UPDATE users
        SET balance = ?, last_daily_at = ?
        WHERE user_id = ? AND guild_id = ?
      `);
      stmt.run(newBalance, now, userId, guildId);
    } else {
      user.balance = newBalance;
      user.last_daily_at = now;
    }

    return {
      success: true,
      balance: newBalance,
      reward: rewardAmount
    };
  }

  /**
   * Fetch top users by XP or Balance for a guild leaderboard.
   */
  getLeaderboard(guildId, type = 'xp', limit = 10) {
    const field = type === 'balance' ? 'balance' : 'xp';

    if (this.isNative) {
      const stmt = this.db.prepare(`
        SELECT user_id, xp, level, balance
        FROM users
        WHERE guild_id = ?
        ORDER BY ${field} DESC, level DESC
        LIMIT ?
      `);
      return stmt.all(guildId, limit);
    } else {
      const list = [];
      for (const [key, user] of this.memoryStore.users.entries()) {
        if (user.guild_id === guildId) {
          list.push({ ...user });
        }
      }
      list.sort((a, b) => b[field] - a[field]);
      return list.slice(0, limit);
    }
  }

  /**
   * Get user's server rank position by XP.
   */
  getUserRank(userId, guildId) {
    if (this.isNative) {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM users
        WHERE guild_id = ? AND (xp > (SELECT xp FROM users WHERE user_id = ? AND guild_id = ?)
          OR (xp = (SELECT xp FROM users WHERE user_id = ? AND guild_id = ?) AND level > (SELECT level FROM users WHERE user_id = ? AND guild_id = ?)))
      `);
      const res = stmt.get(guildId, userId, guildId, userId, guildId, userId, guildId);
      return res ? res.rank : 1;
    } else {
      const list = this.getLeaderboard(guildId, 'xp', 1000);
      const index = list.findIndex(u => u.user_id === userId);
      return index >= 0 ? index + 1 : 1;
    }
  }

  /**
   * Records a user media post in the database.
   */
  createPost(data) {
    const now = Math.floor(Date.now() / 1000);
    const postRecord = {
      user_id: data.userId,
      guild_id: data.guildId,
      channel_id: data.channelId,
      message_id: data.messageId,
      title: data.title,
      category: data.category,
      media_url: data.mediaUrl || null,
      description: data.description || null,
      upvotes: 0,
      created_at: now
    };

    if (this.isNative) {
      const stmt = this.db.prepare(`
        INSERT INTO posts (user_id, guild_id, channel_id, message_id, title, category, media_url, description, upvotes, created_at)
        VALUES (@user_id, @guild_id, @channel_id, @message_id, @title, @category, @media_url, @description, @upvotes, @created_at)
      `);
      const info = stmt.run(postRecord);
      return { id: info.lastInsertRowid, ...postRecord };
    } else {
      const id = this.memoryStore.posts.length + 1;
      const record = { id, ...postRecord };
      this.memoryStore.posts.push(record);
      return record;
    }
  }
}

// Export singleton instance
module.exports = new DatabaseService();
