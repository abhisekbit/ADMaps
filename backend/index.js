const express = require('express');
const cors = require('cors');
require('dotenv').config();

const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 4001;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Set this in backend/.env
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY; // Set this in backend/.env

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

app.post('/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    // Use OpenAI to extract place type and location
    const prompt = `Extract the type of place and location from this search: "${query}". Respond as JSON with 'type' and 'location'.`;
    const aiResp = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const aiText = aiResp.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response', aiText });
    }
    // Call Google Places API with parsed.type and parsed.location
    const searchQuery = encodeURIComponent(`${parsed.type} in ${parsed.location}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${GOOGLE_MAPS_API_KEY}`;
    const placesResp = await fetch(url);
    const placesData = await placesResp.json();
    console.log('Google Places API response:', JSON.stringify(placesData, null, 2));
    res.json({ parsed, aiText, places: placesData.results || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/directions', async (req, res) => {
  const { origin, destination } = req.body;
  if (!origin || !destination) return res.status(400).json({ error: 'Missing origin or destination' });
  try {
    // origin and destination can be { lat, lng } or address string
    const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&key=${GOOGLE_MAPS_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    console.log('Directions API response:', JSON.stringify(data, null, 2));
    if (data.status !== 'OK') return res.status(500).json({ error: data.error_message || data.status });
    const route = data.routes[0];
    res.json({ polyline: route.overview_polyline, legs: route.legs, route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('Loaded endpoints: /health, /search');
}); 