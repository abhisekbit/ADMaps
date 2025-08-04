const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const { authenticateToken, ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET } = require('./middleware/auth');
const { getConfig } = require('./config.js');

const app = express();
const PORT = process.env.PORT || 4001;

let openai;
let GOOGLE_MAPS_API_KEY;

// Initialize configuration
async function initializeConfig() {
  try {
    const config = await getConfig();
    
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    if (!config.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }
    
    openai = new OpenAI({ 
      apiKey: config.OPENAI_API_KEY,
      baseURL: config.OPENAI_BASE_URL,
      defaultQuery: { 'api-version': config.OPENAI_API_VERSION },
      defaultHeaders: { 'api-key': config.OPENAI_API_KEY }
    });
    GOOGLE_MAPS_API_KEY = config.GOOGLE_MAPS_API_KEY;
    
    console.log('Configuration loaded successfully');
  } catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1);
  }
}

app.use(cors());
app.use(express.json());

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test endpoint for location debugging (no auth required)
app.post('/test-location', async (req, res) => {
  const { query, userLocation } = req.body;
  console.log('Test location request:', { query, userLocation });
  
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    // Get current configuration
    const config = await getConfig();
    
    // Use OpenAI to extract place type and location
    const prompt = `Extract the type of place and location from this search: "${query}". 
    If the query mentions a specific location (like "coffee shops in Singapore" or "restaurants in New York"), use that location.
    If the query doesn't mention a specific location (like "coffee shops" or "gas stations"), respond with location: "nearby".
    Respond as JSON with 'type' and 'location'.`;
    
    const aiResp = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const aiText = aiResp.choices[0].message.content;
    let parsed;
    try {
      parsed = extractJSONFromResponse(aiText);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response', aiText });
    }
    
    // Determine search location
    let searchLocation;
    if (parsed.location && parsed.location.toLowerCase() !== 'nearby') {
      // Use the specific location mentioned in the query
      searchLocation = parsed.location;
    } else if (userLocation && userLocation.lat && userLocation.lng) {
      // Use user's current location for nearby searches
      searchLocation = `${userLocation.lat},${userLocation.lng}`;
    } else {
      // Fallback to a default location if no user location available
      searchLocation = 'Singapore';
    }
    
    // Build search query
    let searchQuery;
    if (parsed.location && parsed.location.toLowerCase() !== 'nearby') {
      // Specific location mentioned
      searchQuery = encodeURIComponent(`${parsed.type} in ${parsed.location}`);
    } else {
      // Nearby search using user's location
      searchQuery = encodeURIComponent(`${parsed.type} near ${searchLocation}`);
    }
    
    // Call Google Places API
    let url;
    if (parsed.location && parsed.location.toLowerCase() !== 'nearby') {
      // Use Text Search for specific locations
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${GOOGLE_MAPS_API_KEY}`;
      // Add location bias if user location is available
      if (userLocation && userLocation.lat && userLocation.lng) {
        url += `&location=${userLocation.lat},${userLocation.lng}&radius=50000`;
      }
    } else {
      // Use Nearby Search for user's current location
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchLocation}&radius=5000&type=cafe&keyword=${encodeURIComponent(parsed.type)}&key=${GOOGLE_MAPS_API_KEY}`;
    }
    console.log('Test Search URL:', url);
    const placesResp = await fetch(url);
    const placesData = await placesResp.json();
    console.log('Test Google Places API response:', JSON.stringify(placesData, null, 2));
    res.json({ parsed, aiText, places: placesData.results || [], searchLocation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.post('/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { username, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful for user:', username);
    res.json({ 
      token, 
      message: 'Welcome to PitStopPal! Login successful',
      expiresIn: '24h'
    });
  } else {
    console.log('Login failed for user:', username);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to extract JSON from OpenAI responses that might be wrapped in markdown
function extractJSONFromResponse(responseText) {
  try {
    // First try to parse as pure JSON
    return JSON.parse(responseText);
  } catch (e) {
    // If that fails, try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {
        console.error('Failed to parse JSON from markdown block:', e2);
        throw e2;
      }
    }
    // If no markdown block found, try to find JSON object in the text
    const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]);
      } catch (e3) {
        console.error('Failed to parse JSON object from text:', e3);
        throw e3;
      }
    }
    throw new Error('No valid JSON found in response');
  }
}

app.post('/search', authenticateToken, async (req, res) => {
  const { query, userLocation, useIntelligentSearch } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  console.log('Search request:', { query, userLocation, useIntelligentSearch });

  try {
    // Get current configuration
    const config = await getConfig();
    // Determine search location
    let searchLocation;
    if (userLocation && userLocation.lat && userLocation.lng) {
      // Use user's current location
      searchLocation = `${userLocation.lat},${userLocation.lng}`;
    } else {
      // Fallback to a default location if no user location available
      searchLocation = '1.3521,103.8198'; // Singapore coordinates
    }
    
    // Call Google Places API directly with the search query
    const searchQuery = encodeURIComponent(query);
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${GOOGLE_MAPS_API_KEY}`;
    
    // Add location bias if user location is available
    if (userLocation && userLocation.lat && userLocation.lng) {
      url += `&location=${userLocation.lat},${userLocation.lng}&radius=10000`;
    }
    
    console.log('Search URL:', url);
    const placesResp = await fetch(url);
    const placesData = await placesResp.json();
    
    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', placesData);
      return res.status(500).json({ error: placesData.error_message || 'Places API error' });
    }
    
    let places = placesData.results || [];
    
    // Use intelligent search if flag is set or if no places found
    if (useIntelligentSearch || places.length === 0 || placesData.status === 'ZERO_RESULTS') {
      console.log('No direct results found, trying intelligent search with OpenAI...');
      
      try {
        // Use OpenAI to parse the query and extract searchable location information
        const intelligentSearchPrompt = `You are a location search assistant. The user searched for: "${query}"

If this query refers to a specific place, landmark, or location concept, extract the actual place name that should be searched on Google Places.

Examples:
- "Capital of India" → "New Delhi, India"
- "Highest mountain in the world" → "Mount Everest, Nepal"
- "Largest city in USA" → "New York City, USA"
- "Famous tower in Paris" → "Eiffel Tower, Paris"
- "Statue of Liberty location" → "Statue of Liberty, New York"
- "Best pizza place" → "pizza restaurant" (keep generic food searches as is)
- "Coffee shops nearby" → "coffee shop" (keep generic business searches as is)

Rules:
1. If the query refers to a specific well-known location, landmark, or geographical feature, return the actual place name
2. If it's a generic business/service search, return the simplified search term
3. If it's already a place name, return it as is
4. Always include country/region context when helpful

Respond with only the optimized search term, nothing else.`;

        const aiResponse = await openai.chat.completions.create({
          model: config.OPENAI_MODEL,
          messages: [{ role: 'user', content: intelligentSearchPrompt }],
          temperature: 0.1,
          max_tokens: 100
        });

        const optimizedQuery = aiResponse.choices[0].message.content.trim();
        console.log('OpenAI suggested search term:', optimizedQuery);

        // Search again with the optimized query
        if (optimizedQuery && optimizedQuery !== query) {
          const optimizedSearchQuery = encodeURIComponent(optimizedQuery);
          let optimizedUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${optimizedSearchQuery}&key=${GOOGLE_MAPS_API_KEY}`;
          
          // Add location bias if user location is available
          if (userLocation && userLocation.lat && userLocation.lng) {
            optimizedUrl += `&location=${userLocation.lat},${userLocation.lng}&radius=10000`;
          }
          
          console.log('Optimized search URL:', optimizedUrl);
          const optimizedResp = await fetch(optimizedUrl);
          const optimizedData = await optimizedResp.json();
          
          if (optimizedData.status === 'OK' && optimizedData.results && optimizedData.results.length > 0) {
            places = optimizedData.results;
            console.log(`Found ${places.length} results with optimized search`);
          }
        }
      } catch (aiError) {
        console.error('OpenAI intelligent search failed:', aiError);
        // Continue with empty results if AI fails
      }
    }
    
    // Process each place to get detailed information including reviews
    const processedPlaces = await Promise.all(places.slice(0, 10).map(async (place) => {
      try {
        // Get place details including reviews
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,geometry,rating,user_ratings_total,photos,reviews&key=${GOOGLE_MAPS_API_KEY}`;
        const detailsResp = await fetch(detailsUrl);
        const detailsData = await detailsResp.json();
        
        if (detailsData.status === 'OK' && detailsData.result) {
          const placeDetails = detailsData.result;
          
          // Process reviews with OpenAI if available
          let overviewReview = '';
          let sentimentScore = 0;
          
          if (placeDetails.reviews && placeDetails.reviews.length > 0) {
            const topReviews = placeDetails.reviews.slice(0, 10);
            const reviewsText = topReviews.map(review => review.text).join('\n\n');
            
            try {
              // Use OpenAI to summarize reviews and analyze sentiment
              const reviewPrompt = `Analyze the recent reviews for a place and provide:
1. A concise overview (max 400 characters) summarizing the key points
2. A sentiment score from -1 to 1 (negative to positive)

Reviews:
${reviewsText}

Respond as JSON: {"overview": "summary", "sentiment": number}`;
              
              const aiResp = await openai.chat.completions.create({
                model: config.OPENAI_MODEL,
                messages: [{ role: 'user', content: reviewPrompt }],
                temperature: 0.3,
              });
              
              const aiText = aiResp.choices[0].message.content;
              try {
                const reviewAnalysis = extractJSONFromResponse(aiText);
                overviewReview = reviewAnalysis.overview || '';
                sentimentScore = reviewAnalysis.sentiment || 0;
              } catch (e) {
                console.error('Failed to parse review analysis:', e);
                overviewReview = 'Reviews available but analysis failed';
                sentimentScore = 0;
              }
            } catch (aiError) {
              console.error('OpenAI review analysis failed:', aiError);
              overviewReview = 'Reviews available but analysis failed';
              sentimentScore = 0;
            }
          }
          
          return {
            ...place,
            ...placeDetails,
            overviewReview,
            sentimentScore
          };
        }
        
        return place;
      } catch (error) {
        console.error('Error processing place details:', error);
        return place;
      }
    }));
    
    // Apply enhanced ranking with sentiment analysis
    const rankedPlaces = rankSearchResultsWithSentiment(processedPlaces, searchLocation);
    
    res.json({ 
      places: rankedPlaces, 
      searchLocation,
      totalResults: places.length,
      intelligentSearchUsed: useIntelligentSearch || (placesData.results?.length === 0 && places.length > 0)
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Google Places Autocomplete API endpoint
app.post('/autocomplete', authenticateToken, async (req, res) => {
  const { input, userLocation } = req.body;
  if (!input || input.trim().length < 2) {
    return res.json({ predictions: [] });
  }

  console.log('Autocomplete request:', { input, userLocation });

  try {
    // Build autocomplete URL with location bias if user location is available
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&types=establishment`;
    
    // Add location bias if user location is available
    if (userLocation && userLocation.lat && userLocation.lng) {
      url += `&location=${userLocation.lat},${userLocation.lng}&radius=50000`;
    }
    
    console.log('Autocomplete URL:', url);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places Autocomplete API error:', data);
      return res.status(500).json({ error: data.error_message || 'Autocomplete API error' });
    }
    
    console.log('Autocomplete response:', JSON.stringify(data, null, 2));
    res.json({ predictions: data.predictions || [] });
  } catch (err) {
    console.error('Autocomplete error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/directions', authenticateToken, async (req, res) => {
  const { origin, destination } = req.body;
  if (!origin || !destination) return res.status(400).json({ error: 'Missing origin or destination' });
  try {
    // origin and destination can be { lat, lng } or address string
    const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&key=${GOOGLE_MAPS_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    //console.log('Directions API response:', JSON.stringify(data, null, 2));
    if (data.status !== 'OK') return res.status(500).json({ error: data.error_message || data.status });
    const route = data.routes[0];
    res.json({ polyline: route.overview_polyline, legs: route.legs, route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/add-stop', authenticateToken, async (req, res) => {
  const { routePolyline, currentLocation, stopQuery } = req.body;
  console.log('Add stop request received:', { 
    routePolyline: routePolyline ? 'present' : 'missing',
    currentLocation, 
    currentLocationType: typeof currentLocation,
    stopQuery 
  });
  
  if (!routePolyline || !currentLocation || !stopQuery) {
    return res.status(400).json({ error: 'Missing routePolyline, currentLocation, or stopQuery' });
  }
  
  // Validate that currentLocation is proper coordinates
  if (typeof currentLocation !== 'object' || 
      typeof currentLocation.lat !== 'number' || 
      typeof currentLocation.lng !== 'number') {
    return res.status(400).json({ 
      error: 'Invalid currentLocation format. Expected coordinates object with lat/lng numbers.',
      received: currentLocation
    });
  }
  
  // currentLocation here will be the starting position (if defined) or current location from frontend

  try {
    // Get current configuration
    const config = await getConfig();
    
    // Use OpenAI to parse the stop query
    const prompt = `Parse this stop request along a route: "${stopQuery}". 
    Extract:
    - type: The type of place/business (e.g., "restaurant", "gas station", "coffee shop")
    - timing: Time constraint in hours from start (e.g., "2" for "after 2hrs", null if no timing)
    - distance: Distance constraint in kilometers from start (e.g., "300" for "after 300km", null if no distance)
    - location: Specific location mentioned (e.g., "Kolaghat", "Durgapur", null if no location)
    - detourPreference: preference for detour ("minimal", "moderate", "any")
    
    Examples:
    - "Breakfast after 2hrs" → {"type": "breakfast restaurant", "timing": 2, "distance": null, "location": null, "detourPreference": "minimal"}
    - "Gas station in 1 hour" → {"type": "gas station", "timing": 1, "distance": null, "location": null, "detourPreference": "minimal"}
    - "Fuel stop after 300 km" → {"type": "gas station", "timing": null, "distance": 300, "location": null, "detourPreference": "minimal"}
    - "Restaurant after 150 kilometers" → {"type": "restaurant", "timing": null, "distance": 150, "location": null, "detourPreference": "minimal"}
    - "Coffee shop nearby" → {"type": "coffee shop", "timing": null, "distance": null, "location": null, "detourPreference": "minimal"}
    - "Breakfast near Kolaghat" → {"type": "breakfast restaurant", "timing": null, "distance": null, "location": "Kolaghat", "detourPreference": "minimal"}
    - "Lunch in Durgapur after 3hrs" → {"type": "lunch restaurant", "timing": 3, "distance": null, "location": "Durgapur", "detourPreference": "minimal"}
    - "Gas station after 200km near Durgapur" → {"type": "gas station", "timing": null, "distance": 200, "location": "Durgapur", "detourPreference": "minimal"}
    - "Find a coffee shop with outdoor seating 10 minutes off my route." → {"type": "coffee shop", "timing": null, "distance": null, "location": null, "detourPreference": "moderate", "features": ["outdoor seating"]}
    - "Show me gas stations with clean restrooms along my drive to Kuala Lumpur." → {"type": "gas station", "timing": null, "distance": null, "location": "Kuala Lumpur", "detourPreference": "minimal", "features": ["clean restrooms"]}
    - "Where can I stop for a quick meal between Singapore and Johor Bahru?" → {"type": "restaurant", "timing": null, "distance": null, "location": "between Singapore and Johor Bahru", "detourPreference": "minimal", "features": ["quick meal"]}
    - "Any scenic viewpoints or nature trails near my route?" → {"type": "scenic stop", "timing": null, "distance": null, "location": null, "detourPreference": "minimal", "features": ["viewpoint", "nature trail"]}
    - "Suggest a quiet park to relax halfway through my trip." → {"type": "park", "timing": "halfway", "distance": null, "location": null, "detourPreference": "minimal", "features": ["quiet", "relax"]}
    - "Find a lake or beach I can detour to for 30 minutes." → {"type": "lake or beach", "timing": null, "distance": null, "location": null, "detourPreference": "moderate", "duration": 30}
    - "Show vegetarian restaurants with parking near my route." → {"type": "vegetarian restaurant", "timing": null, "distance": null, "location": null, "detourPreference": "minimal", "features": ["parking"]}
    - "Find a kid-friendly restaurant with a play area on the way." → {"type": "restaurant", "timing": null, "distance": null, "location": null, "detourPreference": "minimal", "features": ["kid-friendly", "play area"]}
    - "Any halal food options close to my current path?" → {"type": "halal restaurant", "timing": null, "distance": null, "location": null, "detourPreference": "minimal"}
    - "Where can I stop for groceries or snacks on this route?" → {"type": "grocery or convenience store", "timing": null, "distance": null, "location": null, "detourPreference": "minimal"}
    - "Find a pharmacy near my route that's open now." → {"type": "pharmacy", "timing": "now", "distance": null, "location": null, "detourPreference": "minimal", "features": ["open now"]}
    - "Any shopping malls I can visit without a big detour?" → {"type": "shopping mall", "timing": null, "distance": null, "location": null, "detourPreference": "minimal"}
    - "Suggest budget hotels near my route for an overnight stay." → {"type": "budget hotel", "timing": "overnight", "distance": null, "location": null, "detourPreference": "minimal"}
    - "Find a rest stop with sleeping pods or lounges." → {"type": "rest stop", "timing": null, "distance": null, "location": null, "detourPreference": "minimal", "features": ["sleeping pods", "lounges"]}
    - "Any motels with EV charging stations on the way?" → {"type": "motel", "timing": null, "distance": null, "location": null, "detourPreference": "minimal", "features": ["EV charging"]}
    - "Show me interesting places I can visit with a 15-minute detour." → {"type": "point of interest", "timing": null, "distance": null, "location": null, "detourPreference": "15-minute"}
    - "Find stops that won't add more than 10 minutes to my trip." → {"type": "any", "timing": null, "distance": null, "location": null, "detourPreference": "10-minute max"}
    - "What's the best place to take a break halfway through my journey?" → {"type": "rest stop", "timing": "halfway", "distance": null, "location": null, "detourPreference": "minimal"}
    - "Find wheelchair-accessible restrooms along my route." → {"type": "restroom", "timing": null, "distance": null, "location": null, "detourPreference": "minimal", "features": ["wheelchair-accessible"]}
    - "Any baby-changing stations or family-friendly stops nearby?" → {"type": "family stop", "timing": null, "distance": null, "location": null, "detourPreference": "minimal", "features": ["baby-changing", "family-friendly"]}
    - "Suggest a pet-friendly café on the way."  → {"type": "café", "timing": null, "distance": null, "location": null, "detourPreference": "minimal", "features": ["pet-friendly"]}
    Respond only with valid JSON.`;
    
    const aiResp = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const aiText = aiResp.choices[0].message.content;
    let parsed;
    try {
      parsed = extractJSONFromResponse(aiText);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse AI response', aiText });
    }

    // Decode the route polyline to get route points
    const routePoints = decodePolyline(routePolyline);
    console.log(`Decoded ${routePoints.length} route points from polyline`);
    if (routePoints.length > 0) {
      console.log(`First route point: ${routePoints[0].lat}, ${routePoints[0].lng}`);
      console.log(`Last route point: ${routePoints[routePoints.length-1].lat}, ${routePoints[routePoints.length-1].lng}`);
    }
    
    // Determine search location based on constraints
    let searchLocation = currentLocation;
    const averageSpeedKmh = 70; // Average highway speed
    
    // If a specific location is mentioned, find it along the route first
    if (parsed.location && parsed.location.trim()) {
      console.log(`Looking for location "${parsed.location}" along the route`);
      
      // Search for the mentioned location using Google Places API
      const locationQuery = encodeURIComponent(parsed.location);
      const locationUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${locationQuery}&key=${GOOGLE_MAPS_API_KEY}`;
      
      try {
        const locationResp = await fetch(locationUrl);
        const locationData = await locationResp.json();
        
        if (locationData.status === 'OK' && locationData.results.length > 0) {
          // Find the location result that's closest to the route
          let bestLocationMatch = null;
          let minDistanceToRoute = Infinity;
          
          for (const locationResult of locationData.results.slice(0, 5)) {
            if (locationResult.geometry && locationResult.geometry.location) {
              const locationPoint = locationResult.geometry.location;
              
              // Find minimum distance from this location to any point on the route
              let minDistanceToRoutePoint = Infinity;
              let closestRoutePoint = null;
              
              for (const routePoint of routePoints) {
                const distance = calculateDistance(
                  locationPoint.lat, locationPoint.lng,
                  routePoint.lat, routePoint.lng
                );
                if (distance < minDistanceToRoutePoint) {
                  minDistanceToRoutePoint = distance;
                  closestRoutePoint = routePoint;
                }
              }
              
              // If this location is closer to the route than previous candidates
              if (minDistanceToRoutePoint < minDistanceToRoute && minDistanceToRoutePoint < 50) { // Within 50km of route
                minDistanceToRoute = minDistanceToRoutePoint;
                bestLocationMatch = {
                  location: locationResult,
                  routePoint: closestRoutePoint,
                  distanceToRoute: minDistanceToRoutePoint
                };
              }
            }
          }
          
          if (bestLocationMatch) {
            // Use the closest route point to the found location as search center
            searchLocation = bestLocationMatch.routePoint;
            console.log(`Found "${parsed.location}" at ${bestLocationMatch.location.geometry.location.lat}, ${bestLocationMatch.location.geometry.location.lng}`);
            console.log(`Using closest route point: ${searchLocation.lat}, ${searchLocation.lng} (${bestLocationMatch.distanceToRoute.toFixed(1)}km from location)`);
          } else {
            console.log(`"${parsed.location}" not found near the route, using fallback search`);
          }
        } else {
          console.log(`Location "${parsed.location}" not found, using fallback search`);
        }
      } catch (locationError) {
        console.error(`Error searching for location "${parsed.location}":`, locationError);
      }
    }
    
    // Apply distance constraint if specified and no location was found
    if (parsed.distance && parsed.distance > 0 && (!parsed.location || !parsed.location.trim())) {
      console.log(`Searching for ${parsed.type} after ${parsed.distance}km from start`);
      console.log(`Route has ${routePoints.length} points`);
      console.log(`Starting from currentLocation:`, currentLocation);
      
      // Find the point along the route that's approximately this distance from start
      let accumulatedDistance = 0;
      let targetPoint = currentLocation; // Start from the actual navigation origin
      let foundTargetPoint = false;
      
      // First, add distance from navigation origin to first route point
      if (routePoints.length > 0) {
        const initialDistance = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          routePoints[0].lat, routePoints[0].lng
        );
        console.log(`Initial distance from start to first route point: ${initialDistance.toFixed(2)}km`);
        accumulatedDistance += initialDistance;
        
        if (accumulatedDistance >= parsed.distance) {
          // Target point is between navigation origin and first route point
          const ratio = parsed.distance / initialDistance;
          targetPoint = {
            lat: currentLocation.lat + (routePoints[0].lat - currentLocation.lat) * ratio,
            lng: currentLocation.lng + (routePoints[0].lng - currentLocation.lng) * ratio
          };
          console.log(`Target found between start and first route point at: ${targetPoint.lat}, ${targetPoint.lng}`);
          foundTargetPoint = true;
        }
      }
      
      // If not found yet, continue along the route
      if (!foundTargetPoint) {
        for (let i = 1; i < routePoints.length && !foundTargetPoint; i++) {
          const prevPoint = routePoints[i - 1];
          const currPoint = routePoints[i];
          const segmentDistance = calculateDistance(
            prevPoint.lat, prevPoint.lng,
            currPoint.lat, currPoint.lng
          );
          
          const newAccumulatedDistance = accumulatedDistance + segmentDistance;
          
          if (newAccumulatedDistance >= parsed.distance) {
            // Interpolate between previous and current point for more accuracy
            const remainingDistance = parsed.distance - accumulatedDistance;
            const segmentRatio = remainingDistance / segmentDistance;
            
            targetPoint = {
              lat: prevPoint.lat + (currPoint.lat - prevPoint.lat) * segmentRatio,
              lng: prevPoint.lng + (currPoint.lng - prevPoint.lng) * segmentRatio
            };
            console.log(`Found target point at segment ${i}: ${targetPoint.lat}, ${targetPoint.lng} (distance: ${newAccumulatedDistance.toFixed(1)}km)`);
            foundTargetPoint = true;
          } else {
            accumulatedDistance = newAccumulatedDistance;
            targetPoint = currPoint; // Update to current point
            if (i % 10 === 0) { // Log every 10th point to avoid spam
              console.log(`Segment ${i}: accumulated ${accumulatedDistance.toFixed(1)}km (need ${parsed.distance}km)`);
            }
          }
        }
      }
      
      if (!foundTargetPoint) {
        console.log(`Warning: Reached end of route without finding ${parsed.distance}km point. Route total: ${accumulatedDistance.toFixed(1)}km`);
        console.log(`Using last route point as target: ${targetPoint.lat}, ${targetPoint.lng}`);
      }
      
      searchLocation = targetPoint;
      console.log(`Target point found at: ${targetPoint.lat}, ${targetPoint.lng} after ${accumulatedDistance.toFixed(1)}km`);
    }
    // Apply timing constraint if no specific location was found and timing is specified
    else if (parsed.timing && parsed.timing > 0 && (!parsed.location || !parsed.location.trim())) {
      // Calculate the point along route after specified hours of travel
      const targetDistanceKm = parsed.timing * averageSpeedKmh;
      console.log(`Searching for ${parsed.type} after ${parsed.timing} hours (~${targetDistanceKm}km from start)`);
      
      // Find the point along the route that's approximately this distance from start
      let accumulatedDistance = 0;
      let targetPoint = currentLocation; // Start from the actual navigation origin
      let foundTargetPoint = false;
      
      // First, add distance from navigation origin to first route point
      if (routePoints.length > 0) {
        const initialDistance = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          routePoints[0].lat, routePoints[0].lng
        );
        accumulatedDistance += initialDistance;
        
        // Check if target is between origin and first route point
        if (accumulatedDistance >= targetDistanceKm) {
          const ratio = targetDistanceKm / initialDistance;
          targetPoint = {
            lat: currentLocation.lat + (routePoints[0].lat - currentLocation.lat) * ratio,
            lng: currentLocation.lng + (routePoints[0].lng - currentLocation.lng) * ratio
          };
          foundTargetPoint = true;
        }
      }
      
      // Continue along route points if target not found yet
      if (!foundTargetPoint) {
        for (let i = 1; i < routePoints.length && !foundTargetPoint; i++) {
          const prevPoint = routePoints[i - 1];
          const currPoint = routePoints[i];
          
          const segmentDistance = calculateDistance(prevPoint.lat, prevPoint.lng, currPoint.lat, currPoint.lng);
          const newAccumulatedDistance = accumulatedDistance + segmentDistance;
          
          if (newAccumulatedDistance >= targetDistanceKm) {
            // Interpolate between previous and current point for more accuracy
            const remainingDistance = targetDistanceKm - accumulatedDistance;
            const segmentRatio = remainingDistance / segmentDistance;
            
            targetPoint = {
              lat: prevPoint.lat + (currPoint.lat - prevPoint.lat) * segmentRatio,
              lng: prevPoint.lng + (currPoint.lng - prevPoint.lng) * segmentRatio
            };
            foundTargetPoint = true;
          } else {
            accumulatedDistance = newAccumulatedDistance;
            targetPoint = currPoint; // Update to current point
          }
        }
      }
      
      searchLocation = targetPoint;
      console.log(`Target point found at: ${targetPoint.lat}, ${targetPoint.lng} after ${accumulatedDistance.toFixed(1)}km`);
    } else if ((parsed.timing && parsed.timing > 0) && parsed.location && parsed.location.trim()) {
      // Both location and timing specified - find timing-based point near the specified location
      console.log(`Combining location "${parsed.location}" with timing constraint of ${parsed.timing} hours`);
      // The location-based search already set searchLocation to the closest route point to the location
      // No additional timing adjustment needed as the location takes precedence
    } else if ((parsed.distance && parsed.distance > 0) && parsed.location && parsed.location.trim()) {
      // Both location and distance specified - find distance-based point near the specified location
      console.log(`Combining location "${parsed.location}" with distance constraint of ${parsed.distance} km`);
      // The location-based search already set searchLocation to the closest route point to the location
      // No additional distance adjustment needed as the location takes precedence
    } else if (!parsed.location || !parsed.location.trim()) {
      // No location and no timing/distance constraint, use middle point of route for better coverage
      const midRouteIndex = Math.floor(routePoints.length / 2);
      searchLocation = routePoints.length > 0 ? routePoints[midRouteIndex] : currentLocation;
    }
    // If only location was specified, searchLocation was already set by the location search above
    
    // Find places along the route with feature-based search
    let searchQuery = `${parsed.type}`;
    
    // Add features to the search query if available
    if (parsed.features && parsed.features.length > 0) {
      const featureKeywords = parsed.features.join(' ');
      searchQuery += ` ${featureKeywords}`;
      console.log(`Enhanced search query with features: "${searchQuery}"`);
    }
    
    const encodedSearchQuery = encodeURIComponent(searchQuery);
    console.log(`Final search location: ${searchLocation.lat}, ${searchLocation.lng}`);
    console.log(`Navigation origin was: ${currentLocation.lat}, ${currentLocation.lng}`);
    console.log(`Search query: "${searchQuery}"`);
    
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedSearchQuery}&location=${searchLocation.lat},${searchLocation.lng}&radius=8000&key=${GOOGLE_MAPS_API_KEY}`;
    const placesResp = await fetch(url);
    const placesData = await placesResp.json();
    
    if (placesData.status !== 'OK') {
      return res.status(500).json({ error: 'Failed to fetch places', placesData });
    }

    // Filter and rank places based on route proximity and constraints
    const rankedPlaces = [];
    for (const place of placesData.results.slice(0, 10)) {
      if (place.geometry && place.geometry.location) {
        // Calculate distance from route (distance to nearest route point)
        const placeLocation = place.geometry.location;
        let minDistanceKm = Infinity;
        for (const routePoint of routePoints) {
          const distanceKm = calculateDistance(
            placeLocation.lat, placeLocation.lng,
            routePoint.lat, routePoint.lng
          );
          if (distanceKm < minDistanceKm) {
            minDistanceKm = distanceKm;
          }
        }
        
        // Calculate distance from navigation origin
        const distanceFromOriginKm = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          placeLocation.lat, placeLocation.lng
        );
        
        // Calculate time from origin in a readable format
        const timeInMinutes = Math.round(distanceFromOriginKm / 50 * 60);
        const hours = Math.floor(timeInMinutes / 60);
        const minutes = timeInMinutes % 60;
        let timeDisplay;
        if (hours > 0) {
          timeDisplay = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        } else {
          timeDisplay = `${minutes}m`;
        }
        
        // Only include places that are reasonably close to the route
        if (minDistanceKm < 5) { // Within 5km of route
          rankedPlaces.push({
            ...place,
            distanceFromRoute: minDistanceKm,
            distanceFromOrigin: distanceFromOriginKm,
            estimatedTimeFromOrigin: timeInMinutes, // Keep as minutes for calculations
            timeDisplayFromOrigin: timeDisplay, // Human readable format
            suitable: minDistanceKm < 2 // Within 2km of route is considered "suitable"
          });
        }
      }
    }

    // Sort by suitability and distance
    rankedPlaces.sort((a, b) => {
      if (a.suitable && !b.suitable) return -1;
      if (!a.suitable && b.suitable) return 1;
      return a.distanceFromRoute - b.distanceFromRoute;
    });

    // Apply feature-based filtering if features are specified
    let filteredPlaces = rankedPlaces;
    if (parsed.features && parsed.features.length > 0) {
      console.log(`Applying feature-based filtering for: ${parsed.features.join(', ')}`);
      
      // Get more places for feature filtering (up to 20 instead of 10)
      const extendedPlaces = rankedPlaces.slice(0, 20);
      
      // Filter places based on features
      filteredPlaces = extendedPlaces.filter(place => {
        const placeName = place.name.toLowerCase();
        const placeTypes = place.types ? place.types.map(t => t.toLowerCase()) : [];
        
        // Check if any of the features are mentioned in the place name or types
        return parsed.features.some(feature => {
          const featureLower = feature.toLowerCase();
          return placeName.includes(featureLower) || 
                 placeTypes.some(type => type.includes(featureLower));
        });
      });
      
      console.log(`Feature filtering: ${rankedPlaces.length} places → ${filteredPlaces.length} places`);
      
      // If no places match features, fall back to original results
      if (filteredPlaces.length === 0) {
        console.log('No places matched features, using original results');
        filteredPlaces = rankedPlaces.slice(0, 5);
      }
    }

    // Get top 5 places and enhance with review summaries
    const topPlaces = filteredPlaces.slice(0, 5);
    
    // Enhance places with detailed information including reviews
    for (const place of topPlaces) {
      try {
        // Fetch detailed place information including reviews and types
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=reviews,photos,formatted_address,rating,user_ratings_total,types,website,formatted_phone_number&key=${GOOGLE_MAPS_API_KEY}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.status === 'OK' && detailsData.result) {
          const placeDetails = detailsData.result;
          
          // Add detailed information to place
          if (placeDetails.photos) place.photos = placeDetails.photos;
          if (placeDetails.formatted_address) place.formatted_address = placeDetails.formatted_address;
          if (placeDetails.rating) place.rating = placeDetails.rating;
          if (placeDetails.user_ratings_total) place.user_ratings_total = placeDetails.user_ratings_total;
          if (placeDetails.types) place.types = placeDetails.types;
          if (placeDetails.website) place.website = placeDetails.website;
          if (placeDetails.formatted_phone_number) place.formatted_phone_number = placeDetails.formatted_phone_number;
          
          // Enhanced feature matching with place details
          if (parsed.features && parsed.features.length > 0) {
            const placeName = place.name.toLowerCase();
            const placeTypes = placeDetails.types ? placeDetails.types.map(t => t.toLowerCase()) : [];
            const placeAddress = placeDetails.formatted_address ? placeDetails.formatted_address.toLowerCase() : '';
            
            // Check feature match score
            let featureMatchScore = 0;
            const matchedFeatures = [];
            
            parsed.features.forEach(feature => {
              const featureLower = feature.toLowerCase();
              if (placeName.includes(featureLower)) {
                featureMatchScore += 2; // High score for name match
                matchedFeatures.push(feature);
              } else if (placeTypes.some(type => type.includes(featureLower))) {
                featureMatchScore += 1; // Medium score for type match
                matchedFeatures.push(feature);
              } else if (placeAddress.includes(featureLower)) {
                featureMatchScore += 0.5; // Low score for address match
                matchedFeatures.push(feature);
              }
            });
            
            place.featureMatchScore = featureMatchScore;
            place.matchedFeatures = matchedFeatures;
            console.log(`Place "${place.name}" - Feature match score: ${featureMatchScore}, Matched features: ${matchedFeatures.join(', ')}`);
          }
          
          // Calculate distance from start
          place.distanceFromStart = calculateDistance(
            currentLocation.lat, currentLocation.lng,
            place.geometry.location.lat, place.geometry.location.lng
          );
          
          // Calculate estimated time from start (using average speed)
          const timeInMinutes = Math.round(place.distanceFromStart / averageSpeedKmh * 60);
          const hours = Math.floor(timeInMinutes / 60);
          const minutes = timeInMinutes % 60;
          place.timeFromStart = hours > 0 ? `${hours}hr ${minutes}min` : `${minutes}min`;
          
          // Process reviews for summarization
          if (placeDetails.reviews && placeDetails.reviews.length > 0) {
            const topReviews = placeDetails.reviews.slice(0, 10);
            const reviewTexts = topReviews.map(review => review.text).join('\n\n');
            
            try {
              // Get review summary and sentiment from OpenAI
              const reviewPrompt = `Analyze these Google reviews for a business and provide:
              1. A 400-character summary capturing the overall experience and key highlights
              2. A sentiment score from -1 (very negative) to 1 (very positive)
              
              Reviews:
              ${reviewTexts}
              
              Please respond in JSON format:
              {
                "summary": "400-character summary here",
                "sentiment": 0.7
              }`;
              
              const reviewCompletion = await openai.chat.completions.create({
                model: config.OPENAI_MODEL,
                messages: [{ role: "user", content: reviewPrompt }],
                max_tokens: 300,
                temperature: 0.3,
              });
              
              const reviewResponse = reviewCompletion.choices[0].message.content.trim();
              
              try {
                const reviewAnalysis = extractJSONFromResponse(reviewResponse);
                place.overviewReview = reviewAnalysis.summary;
                // Convert sentiment from -1 to 1 scale to 0 to 100 percentage
                place.sentimentScore = Math.round((reviewAnalysis.sentiment + 1) * 50);
              } catch (parseError) {
                console.error('Error parsing review analysis JSON:', parseError);
                // Fallback to basic summary
                place.overviewReview = `Based on ${topReviews.length} reviews. Average rating: ${place.rating || 'Not available'}.`;
                place.sentimentScore = 50; // Neutral (50%)
              }
            } catch (openaiError) {
              console.error('Error getting review summary from OpenAI:', openaiError);
              // Fallback summary
              place.overviewReview = `Based on ${topReviews.length} reviews. Average rating: ${place.rating || 'Not available'}.`;
              place.sentimentScore = 50; // Neutral (50%)
            }
          }
        }
      } catch (detailsError) {
        console.error('Error fetching place details:', detailsError);
        // Continue with basic place information
      }
    }

    // Final sorting based on feature match scores if features were specified
    if (parsed.features && parsed.features.length > 0) {
      console.log('Applying final feature-based sorting...');
      topPlaces.sort((a, b) => {
        const scoreA = a.featureMatchScore || 0;
        const scoreB = b.featureMatchScore || 0;
        
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
        
        // If feature scores are equal, sort by distance from route
        return a.distanceFromRoute - b.distanceFromRoute;
      });
      
      console.log('Final sorted places by feature match:');
      topPlaces.forEach((place, index) => {
        console.log(`${index + 1}. "${place.name}" - Feature score: ${place.featureMatchScore || 0}, Distance: ${place.distanceFromRoute?.toFixed(2)}km`);
      });
    }

    res.json({
      parsed,
      aiText,
      suggestedStops: topPlaces,
      searchLocation: searchLocation,
      searchInfo: {
        timing: parsed.timing,
        distance: parsed.distance,
        location: parsed.location,
        estimatedDistanceKm: parsed.timing ? parsed.timing * averageSpeedKmh : parsed.distance,
        searchRadius: 8,
        averageSpeed: averageSpeedKmh,
        searchLocation: searchLocation,
        searchType: (() => {
          if (parsed.location && parsed.location.trim()) {
            if (parsed.timing && parsed.distance) return 'location-time-and-distance-based';
            if (parsed.timing) return 'location-and-time-based';
            if (parsed.distance) return 'location-and-distance-based';
            return 'location-based';
          } else {
            if (parsed.timing && parsed.distance) return 'time-and-distance-based';
            if (parsed.timing) return 'time-based';
            if (parsed.distance) return 'distance-based';
            return 'route-midpoint';
          }
        })()
      },
      routePoints: routePoints.slice(0, 10) // First 10 points for reference
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/add-stop-to-route', authenticateToken, async (req, res) => {
  const { origin, destination, stop } = req.body;
  if (!origin || !destination || !stop) {
    return res.status(400).json({ error: 'Missing origin, destination, or stop' });
  }

  console.log('Add stop request received:', { origin, destination, stop: stop.name });

  try {
    // Validate origin coordinates
    let originStr;
    if (typeof origin === 'string') {
      originStr = origin;
    } else if (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number') {
      originStr = `${origin.lat},${origin.lng}`;
    } else {
      console.error('Invalid origin coordinates:', origin);
      return res.status(400).json({ error: 'Invalid origin coordinates. Please ensure navigation is started properly.' });
    }

    // Validate destination coordinates
    let destStr;
    if (typeof destination === 'string') {
      destStr = destination;
    } else if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      destStr = `${destination.lat},${destination.lng}`;
    } else {
      console.error('Invalid destination coordinates:', destination);
      return res.status(400).json({ error: 'Invalid destination coordinates' });
    }

    // Validate stop coordinates
    if (!stop.geometry?.location?.lat || !stop.geometry?.location?.lng) {
      console.error('Invalid stop coordinates:', stop.geometry?.location);
      return res.status(400).json({ error: 'Invalid stop coordinates' });
    }
    const stopStr = `${stop.geometry.location.lat},${stop.geometry.location.lng}`;
    
    console.log('Coordinate strings:', { originStr, destStr, stopStr });
    
    // Get route with waypoint
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&waypoints=${encodeURIComponent(stopStr)}&key=${GOOGLE_MAPS_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    
    if (data.status !== 'OK') {
      return res.status(500).json({ error: data.error_message || data.status });
    }
    
    const route = data.routes[0];
    res.json({ 
      polyline: route.overview_polyline, 
      legs: route.legs, 
      route,
      addedStop: stop
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/recalculate-route', authenticateToken, async (req, res) => {
  const { origin, destination, stops } = req.body;
  if (!origin || !destination) {
    return res.status(400).json({ error: 'Missing origin or destination' });
  }

  console.log('Recalculate route request received:', { origin, destination, stopCount: stops?.length || 0 });

  try {
    // Validate origin coordinates
    let originStr;
    if (typeof origin === 'string') {
      originStr = origin;
    } else if (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number') {
      originStr = `${origin.lat},${origin.lng}`;
    } else {
      console.error('Invalid origin coordinates:', origin);
      return res.status(400).json({ error: 'Invalid origin coordinates. Please ensure navigation is started properly.' });
    }

    // Validate destination coordinates
    let destStr;
    if (typeof destination === 'string') {
      destStr = destination;
    } else if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      destStr = `${destination.lat},${destination.lng}`;
    } else {
      console.error('Invalid destination coordinates:', destination);
      return res.status(400).json({ error: 'Invalid destination coordinates' });
    }
    
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`;
    
    // Add waypoints if there are stops
    if (stops && stops.length > 0) {
      const waypoints = stops.map(stop => `${stop.geometry.location.lat},${stop.geometry.location.lng}`).join('|');
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    
    url += `&key=${GOOGLE_MAPS_API_KEY}`;
    
    const resp = await fetch(url);
    const data = await resp.json();
    
    if (data.status !== 'OK') {
      return res.status(500).json({ error: data.error_message || data.status });
    }
    
    const route = data.routes[0];
    res.json({ 
      polyline: route.overview_polyline, 
      legs: route.legs, 
      route
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Helper function to rank search results based on reviews and distance
function rankSearchResults(places, searchLocation) {
  if (!places || places.length === 0) return [];
  
  // Parse search location
  const [searchLat, searchLng] = searchLocation.split(',').map(Number);
  
  return places.map(place => {
    // Calculate distance from search location
    const distance = calculateDistance(
      searchLat, 
      searchLng, 
      place.geometry.location.lat, 
      place.geometry.location.lng
    );
    
    // Calculate review score (0-100)
    const reviewScore = place.rating ? (place.rating / 5) * 100 : 0;
    const reviewCount = place.user_ratings_total || 0;
    
    // Weighted scoring system
    // Distance weight: 40% (closer is better)
    // Rating weight: 40% (higher rating is better)
    // Review count weight: 20% (more reviews = more reliable)
    
    const distanceScore = Math.max(0, 100 - (distance * 10)); // 10km = 0 score, 0km = 100 score
    const ratingScore = reviewScore;
    const reviewCountScore = Math.min(100, (reviewCount / 100) * 100); // Cap at 100 reviews
    
    const totalScore = (distanceScore * 0.4) + (ratingScore * 0.4) + (reviewCountScore * 0.2);
    
    return {
      ...place,
      _ranking: {
        totalScore: Math.round(totalScore * 100) / 100,
        distanceScore: Math.round(distanceScore * 100) / 100,
        ratingScore: Math.round(ratingScore * 100) / 100,
        reviewCountScore: Math.round(reviewCountScore * 100) / 100,
        distance: Math.round(distance * 100) / 100
      }
    };
  }).sort((a, b) => b._ranking.totalScore - a._ranking.totalScore);
}

// Enhanced ranking function with sentiment analysis
function rankSearchResultsWithSentiment(places, searchLocation) {
  if (!places || places.length === 0) return [];
  
  // Parse search location
  const [searchLat, searchLng] = searchLocation.split(',').map(Number);
  
  return places.map(place => {
    // Calculate distance from search location
    const distance = calculateDistance(
      searchLat, 
      searchLng, 
      place.geometry.location.lat, 
      place.geometry.location.lng
    );
    
    // Calculate review score (0-100)
    const reviewScore = place.rating ? (place.rating / 5) * 100 : 0;
    const reviewCount = place.user_ratings_total || 0;
    
    // Enhanced scoring system with sentiment analysis
    // Distance weight: 30% (closer is better)
    // Rating weight: 30% (higher rating is better)
    // Review count weight: 15% (more reviews = more reliable)
    // Sentiment weight: 25% (positive sentiment is better)
    
    const distanceScore = Math.max(0, 100 - (distance * 10)); // 10km = 0 score, 0km = 100 score
    const ratingScore = reviewScore;
    const reviewCountScore = Math.min(100, (reviewCount / 100) * 100); // Cap at 100 reviews
    
    // Convert sentiment score from -1 to 1 range to 0 to 100 range
    const sentimentScore = place.sentimentScore ? ((place.sentimentScore + 1) / 2) * 100 : 50; // Default to neutral if no sentiment
    
    const totalScore = (distanceScore * 0.3) + (ratingScore * 0.3) + (reviewCountScore * 0.15) + (sentimentScore * 0.25);
    
    return {
      ...place,
      _ranking: {
        totalScore: Math.round(totalScore * 100) / 100,
        distanceScore: Math.round(distanceScore * 100) / 100,
        ratingScore: Math.round(ratingScore * 100) / 100,
        reviewCountScore: Math.round(reviewCountScore * 100) / 100,
        sentimentScore: Math.round(sentimentScore * 100) / 100,
        distance: Math.round(distance * 100) / 100
      }
    };
  }).sort((a, b) => b._ranking.totalScore - a._ranking.totalScore);
}

// Helper function to decode polyline (same as frontend)
function decodePolyline(encoded) {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// Serve React app for any non-API routes
app.use((req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/health') || req.path.startsWith('/login') || req.path.startsWith('/search') || req.path.startsWith('/recalculate-route')) {
    return next();
  }
  
  // Serve index.html for all other routes
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize configuration and start server
initializeConfig().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log('Loaded endpoints: /health, /search');
    console.log('Serving frontend from /public directory');
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 