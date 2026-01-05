import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const API_KEY = process.env.VITE_GOOGLE_VISION_API_KEY;

if (!API_KEY) {
  console.error('ERROR: VITE_GOOGLE_VISION_API_KEY is not set in .env.local');
  console.error('Current API_KEY value:', API_KEY);
  console.error('Environment variables:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));
  process.exit(1);
}

app.post('/api/ocr', async (req, res) => {
  try {
    const { base64Data } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data is required' });
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Data,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Google Vision API error: ${response.status} - ${errorText}`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`OCR server running on http://localhost:${PORT}`);
});
