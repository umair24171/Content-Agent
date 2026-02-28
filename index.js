/**
 * UMAIR'S AI CONTENT PIPELINE
 * ════════════════════════════════════════
 * Researcher → Ideator → Scripter → Post
 * Runs twice daily: 7am PKT & 7pm PKT
 * Posts to: LinkedIn + Twitter + Instagram (saved)
 */

import dotenv from 'dotenv';
dotenv.config();

import { runResearcher } from './agents/researcher.js';
import { runIdeator } from './agents/ideator.js';
import { runScripter } from './agents/scripter.js';
import { runAnalyst } from './agents/analyst.js';
import { notifyDiscord } from './utils/discord.js';

// ─────────────────────────────────────────────────────────────────
// Full pipeline runner
// ─────────────────────────────────────────────────────────────────
async function runPipeline(runLabel = 'morning') {
  console.log('\n' + '█'.repeat(60));
  console.log(`  🚀 UMAIR CONTENT PIPELINE STARTING [${runLabel.toUpperCase()}]`);
  console.log(`  ${new Date().toISOString()}`);
  console.log('█'.repeat(60));

  const startTime = Date.now();

  try {
    await notifyDiscord(`🚀 **Pipeline starting [${runLabel}]** — ${new Date().toLocaleTimeString()}`);

    // Step 1: Research
    console.log('\n[1/3] RESEARCHER...');
    const topics = await runResearcher(runLabel);

    // Small delay
    await sleep(3000);

    // Step 2: Ideate
    console.log('\n[2/3] IDEATOR...');
    const ideas = await runIdeator(topics, runLabel);

    await sleep(3000);

    // Step 3: Script + Post
    console.log('\n[3/3] SCRIPTER...');
    const content = await runScripter(ideas, runLabel);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '█'.repeat(60));
    console.log(`  ✅ PIPELINE COMPLETE in ${elapsed}s`);
    console.log('█'.repeat(60));

    await notifyDiscord(`✅ **Pipeline complete [${runLabel}]** in ${elapsed}s`);

    return content;
  } catch (error) {
    console.error('\n❌ PIPELINE FAILED:', error.message);
    console.error(error.stack);
    await notifyDiscord(`❌ **Pipeline FAILED [${runLabel}]**\nError: ${error.message}`, false);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────
// Test mode - just runs pipeline once without posting
// ─────────────────────────────────────────────────────────────────
async function runTest() {
  console.log('\n🧪 TEST MODE - Will NOT post to any platform');
  process.env.POST_TO_LINKEDIN = 'false';
  process.env.POST_TO_TWITTER = 'false';
  await runPipeline('test');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────
// CLI entry point
// ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0] || 'pipeline';
const runLabel = args[1] || 'morning';

switch (command) {
  case 'pipeline':
    runPipeline(runLabel).catch(console.error);
    break;
  case 'test':
    runTest().catch(console.error);
    break;
  case 'research':
    runResearcher(runLabel).catch(console.error);
    break;
  case 'ideate':
    runIdeator(null, runLabel).catch(console.error);
    break;
  case 'script':
    runScripter(null, runLabel).catch(console.error);
    break;
  case 'analyze':
    runAnalyst().catch(console.error);
    break;
  default:
    console.log(`
Usage:
  node index.js pipeline [morning|evening]  ← Full pipeline
  node index.js test                         ← Test without posting
  node index.js research [morning|evening]  ← Just research
  node index.js ideate                       ← Just ideate
  node index.js script                       ← Just script + post
  node index.js analyze                      ← Run analyst
    `);
}
