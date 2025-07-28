const express = require('express');
const cors = require('cors');
require('dotenv').config();

const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const { authenticateToken, ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET } = require('./middleware/auth');

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

// Login endpoint
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

app.post('/search', authenticateToken, async (req, res) => {
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
    console.log(url);
    const placesResp = await fetch(url);
    const placesData = await placesResp.json();
    console.log('Google Places API response:', JSON.stringify(placesData, null, 2));
    res.json({ parsed, aiText, places: placesData.results || [] });
  } catch (err) {
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
  if (!routePolyline || !currentLocation || !stopQuery) {
    return res.status(400).json({ error: 'Missing routePolyline, currentLocation, or stopQuery' });
  }
  
  // currentLocation here will be the starting position (if defined) or current location from frontend

  try {
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
    
    Respond only with valid JSON.`;
    
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

    // Decode the route polyline to get route points
    const routePoints = decodePolyline(routePolyline);
    
    // Determine search location based on constraints
    let searchLocation = currentLocation;
    const averageSpeedKmh = 50; // Conservative average speed
    
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
        
        if (accumulatedDistance >= parsed.distance) {
          // Target point is between navigation origin and first route point
          const ratio = parsed.distance / initialDistance;
          targetPoint = {
            lat: currentLocation.lat + (routePoints[0].lat - currentLocation.lat) * ratio,
            lng: currentLocation.lng + (routePoints[0].lng - currentLocation.lng) * ratio
          };
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
            foundTargetPoint = true;
          } else {
            accumulatedDistance = newAccumulatedDistance;
            targetPoint = currPoint; // Update to current point
          }
        }
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
    
    // Find places along the route
    const searchQuery = encodeURIComponent(`${parsed.type}`);
    console.log(`Final search location: ${searchLocation.lat}, ${searchLocation.lng}`);
    console.log(`Navigation origin was: ${currentLocation.lat}, ${currentLocation.lng}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&location=${searchLocation.lat},${searchLocation.lng}&radius=8000&key=${GOOGLE_MAPS_API_KEY}`;
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

    res.json({
      parsed,
      aiText,
      suggestedStops: rankedPlaces.slice(0, 5),
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

  try {
    const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;
    const stopStr = `${stop.geometry.location.lat},${stop.geometry.location.lng}`;
    
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

  try {
    const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;
    
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('Loaded endpoints: /health, /search');
}); 