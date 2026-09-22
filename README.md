# ⚡ Production-Ready Multi-Purpose Discord Bot (v14)

A modular, enterprise-grade, all-in-one Discord application built on Node.js using **`discord.js` v14**. Combining high-fidelity music streaming, Google Gemini AI intelligence, an SQLite-backed leveling & economy engine, an advanced moderation suite with audit logging, and custom content publishing.

---

## 📁 Project Architecture & File Tree

```text
discord-multipurpose-bot/
├── commands/                     # Modular Slash Command Handlers
│   ├── ai/
│   │   └── ai.js                 # Google Gemini 2.5 Flash slash command
│   ├── economy/
│   │   ├── daily.js              # 24h daily reward claim
│   │   ├── leaderboard.js        # XP and currency leaderboards
│   │   └── rank.js               # Level, progress bar, & balance profile
│   ├── media/
│   │   └── post.js               # Visual showcase & resource publication
│   ├── music/
│   │   ├── play.js               # Audio search & playback
│   │   ├── queue.js              # Server playback queue display
│   │   ├── skip.js               # Skip current track
│   │   └── stop.js               # Clear queue & disconnect
│   ├── moderation/
│   │   ├── ban.js                # Ban user with message purge options
│   │   ├── kick.js               # Kick user with reason
│   │   ├── purge.js              # Bulk message purge (1-100)
│   │   └── timeout.js            # User timeout with duration parser
│   └── utility/
│       └── help.js               # Interactive command index
├── events/                       # Discord Client Event Listeners
│   ├── guildMemberAdd.js         # Member join audit & welcoming
│   ├── interactionCreate.js      # Slash command, cooldown, and button dispatcher
│   ├── messageCreate.js          # Chat XP progression & @bot mention AI trigger
│   ├── messageDelete.js          # Deleted message audit logger
│   ├── messageUpdate.js          # Message edit audit logger
│   └── ready.js                  # Presence updater & connection logger
├── handlers/                     # Dynamic Loaders
│   ├── commandHandler.js         # Recursive slash command loader
│   ├── eventHandler.js           # Client event listener registry
│   ├── playerHandler.js          # discord-player audio event visualizer
├── services/                     # Business Logic & Integrations
│   ├── database.js               # SQLite persistence (better-sqlite3)
│   └── gemini.js                 # Google GenAI SDK wrapper (gemini-2.5-flash)
├── config.json                   # Theme colors, XP progression, and defaults
├── deploy-commands.js            # Slash command REST registration script
├── package.json                  # Dependencies & execution scripts
├── .env.example                  # Environment configuration template
└── README.md                     # Comprehensive architecture & setup guide
```

---

## 🚀 Key Modules & Capabilities

### 1. 🎨 Custom Content Posting & Media Showcase (`/post`)
- **Command**: `/post <title> [attachment] [link] [category] [description] [channel]`
- **Showcase Cards**: Generates a stylized `EmbedBuilder` card with tags, creator metadata, media preview, and interactive buttons (Upvote 👍, Open Link 🔗).
- **Target Channels**: Routes posts directly to a dedicated showcase channel (`MEDIA_CHANNEL_ID`) or custom channel specified in the command.
- **Persistence**: Post metadata, author, and upvotes are recorded in SQLite.

### 2. 🎶 Music & Audio Streaming Core
- **Engine**: Powered by `@discordjs/voice` and `discord-player` with `ffmpeg-static`.
- **Commands**:
  - `/play <query>`: Plays audio or playlists from YouTube, Spotify, SoundCloud, or search terms.
  - `/skip`: Skips current track.
  - `/queue [page]`: Displays paginated server queue with total duration.
  - `/stop`: Clears queue and leaves the voice channel.
- **Rich Audio Embeds**: Automatically sends "Now Playing" cards with duration, thumbnails, artist, and requester.

### 3. 🤖 Google Gemini AI Core (`gemini-2.5-flash`)
- **Integration**: Official `@google/genai` SDK targeting `gemini-2.5-flash`.
- **Command**: `/ai <prompt> [style]` with customizable nuances (*Concise*, *Code & Technical*, *Creative*, *Detailed*).
- **Direct Mention Trigger**: Simply mention the bot (`@Bot <question>`) in any text channel to receive conversational AI answers with auto-typing indicators.
- **Discord Chunking**: Intelligently chunks responses exceeding Discord's 2000-character limit, safely maintaining code blocks across messages.

### 4. 🪙 Leveling & Economy Suite
- **Chat XP Engine**: Users earn random XP (15–25 XP) per chat message, governed by a 60-second spam cooldown.
- **Level-Up Announcements**: Sends congratulatory cards when members reach higher ranks.
- **Commands**:
  - `/rank [user]`: Visual ASCII progress bar (`▰▰▰▰▰▱▱`), server rank `#`, level, and balance.
  - `/leaderboard [category]`: Server Top 10 rankings for XP or Economy Balance.
  - `/daily`: 24-hour daily coin claim with countdown timers.

### 5. 🛡️ Moderation & Audit Logging
- **Commands**:
  - `/purge <amount>`: Bulk deletes 1–100 messages (respecting Discord's 14-day limit).
  - `/timeout <member> <duration> [reason]`: Times out members (`5m`, `1h`, `1d`, `7d`).
  - `/kick <member> [reason]`: Kicks member with role hierarchy protection.
  - `/ban <user> [reason] [delete_days]`: Bans user and purges recent messages.
- **Audit Logging**: Real-time logging of deleted messages (with attachments) and message edits (before/after diffs) to `MOD_LOG_CHANNEL_ID`.

---

## 🛠️ Prerequisites & Setup

### 1. Discord Developer Portal Setup
1. Visit the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an **Application** and navigate to the **Bot** tab.
3. Reset and copy your **Bot Token**.
4. Enable the following **Privileged Gateway Intents**:
   - ✅ **Message Content Intent** (Required for leveling XP and @bot mention AI)
   - ✅ **Server Members Intent** (Required for member tracking & welcoming)
   - ✅ **Presence Intent** (Recommended)
5. Navigate to **OAuth2 > URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (or select `Manage Messages`, `Moderate Members`, `Kick Members`, `Ban Members`, `Send Messages`, `Embed Links`, `Connect`, `Speak`).
6. Copy the generated URL to invite the bot to your server.

### 2. Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Create and copy an API key.

---

## 💻 Installation & Configuration

### Step 1: Install Dependencies
Open a terminal in the project directory:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
DISCORD_TOKEN=MTE5...YourBotToken...
CLIENT_ID=123456789012345678
GUILD_ID=123456789012345678      # Leave blank for global slash command deployment
GEMINI_API_KEY=AIzaSy...YourKey...
MEDIA_CHANNEL_ID=123456789012345678
MOD_LOG_CHANNEL_ID=123456789012345678
```

### Step 3: Register Slash Commands
Run the command registration script:
```bash
npm run deploy
```
*(Tip: Setting `GUILD_ID` during development registers commands instantly in your test server!)*

### Step 4: Start the Bot
```bash
# Production mode
npm start

# Development mode (auto-reload on file edits)
npm run dev
```

---

## ⚙️ Customization (`config.json`)

You can customize embed colors, economy values, and media categories in `config.json`:
```json
{
  "colors": {
    "primary": "#5865F2",
    "success": "#57F287",
    "error": "#ED4245",
    "warning": "#FEE75C",
    "music": "#9B59B6",
    "ai": "#1ABC9C"
  },
  "leveling": {
    "minXpPerMessage": 15,
    "maxXpPerMessage": 25,
    "xpCooldownSeconds": 60,
    "baseLevelXp": 100
  },
  "economy": {
    "dailyRewardMin": 100,
    "dailyRewardMax": 250,
    "currencySymbol": "🪙",
    "currencyName": "Coins"
  }
}
```

---

## 🛡️ Reliability & Fault-Tolerance

- **Process Crash Guards**: Built-in `unhandledRejection` and `uncaughtException` monitors safeguard the Node process from dying on network blips or unexpected Discord socket events.
- **Database Self-Healing**: Database layer runs on `better-sqlite3` with an automatic in-memory fallback, ensuring zero crashes even during local development without native compilation.
- **Audio Error Handling**: `discord-player` stream errors are isolated per guild queue, automatically notifying the channel without disturbing other servers.
