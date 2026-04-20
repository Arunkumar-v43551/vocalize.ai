import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const keyMatch = fs.readFileSync('.env.local', 'utf8').match(/GEMINI_API_KEY=(.*)/);
if (!keyMatch) {
  console.error('Could not find GEMINI_API_KEY in .env.local');
  process.exit(1);
}
const key = keyMatch[1].trim();

const ai = new GoogleGenAI({ apiKey: key });

async function check() {
  try {
    const res = await ai.models.list();
    console.log('Result structure keys:', Object.keys(res));
    
    // Check if it's an array directly or has a models property
    const models = Array.isArray(res) ? res : (res.models || []);
    
    console.log('Found', models.length, 'models');
    
    const flashModels = models.filter(m => m.name.toLowerCase().includes('flash'));
    console.log('Flash models:');
    flashModels.forEach(m => {
      console.log(`- ${m.name} (Actions: ${m.supportedActions?.join(', ') || 'none'})`);
    });

  } catch (e) {
    console.error('Error during check:', e);
  }
}

check();
