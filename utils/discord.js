import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function notifyDiscord(message, isSuccess = true) {
  if (!process.env.DISCORD_WEBHOOK_URL) return;

  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      embeds: [
        {
          title: isSuccess ? '✅ Content Agent Update' : '❌ Content Agent Error',
          description: message,
          color: isSuccess ? 0x00ff00 : 0xff0000,
          timestamp: new Date().toISOString(),
          footer: { text: 'Umair Content Pipeline' },
        },
      ],
    });
  } catch (error) {
    console.warn('⚠️ Discord notify failed:', error.message);
  }
}
