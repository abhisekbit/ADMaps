import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import Fab from '@mui/material/Fab';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Rating from '@mui/material/Rating';
import { Marker } from '@react-google-maps/api';
//import Polyline from '@react-google-maps/api/dist/components/Polyline';
import { Polyline } from '@react-google-maps/api';
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6750A4',
    },
    secondary: {
      main: '#03DAC6',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapContainerStyle = { width: '100%', height: '100%' };
const singaporeCenter = { lat: 1.29027, lng: 103.851959 };

function App() {
  const [search, setSearch] = React.useState("");
  const [places, setPlaces] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [mapCenter, setMapCenter] = React.useState(singaporeCenter);
  const [selectedPlace, setSelectedPlace] = React.useState(null);
  const [routePolyline, setRoutePolyline] = React.useState(null);
  const [navigating, setNavigating] = React.useState(false);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY,
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPlaces([]);
    try {
      const resp = await fetch("http://localhost:4001/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: search })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setPlaces(data.places || []);
      if (data.places && data.places.length > 0) {
        const first = data.places[0].geometry.location;
        setMapCenter({ lat: first.lat, lng: first.lng });
      }
    } catch (err) {
      setError(err.message || "Failed to search");
    } finally {
      setLoading(false);
    }
  };

  // Helper to decode Google polyline
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

  const handleNavigate = async (place) => {
    setSelectedPlace(place);
    setNavigating(true);
    setRoutePolyline(null);
    setError("");
    try {
      // Use browser geolocation as origin if available
      let origin = singaporeCenter;
      if (navigator.geolocation) {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => {
              origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              resolve();
            },
            err => resolve() // fallback to singaporeCenter
          );
        });
      }
      const destination = place.geometry.location;
      const resp = await fetch("http://localhost:4001/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setRoutePolyline(decodePolyline(data.polyline.points));
      setMapCenter(destination);
    } catch (err) {
      setError(err.message || "Failed to get directions");
    } finally {
      setNavigating(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary" elevation={3}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ADMaps
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 6, mb: 6, position: 'relative' }}>
        <Paper elevation={6} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, bgcolor: 'background.paper', boxShadow: 6 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
            Welcome to ADMaps
          </Typography>
          <Typography variant="body1" gutterBottom sx={{ mb: 3, color: 'text.secondary' }}>
            Search for places, get directions, and explore with a modern Material 3 expressive design.
          </Typography>
          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32, marginTop: 16 }}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search for places"
              placeholder="e.g., Find a Coffee shop in Singapore near Marina Bay Sands"
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 3, bgcolor: '#F3EDF7' }
              }}
              sx={{ boxShadow: 2 }}
            />
            <Button type="submit" variant="contained" color="primary" disabled={loading || !search} sx={{ height: 56 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
            </Button>
          </form>
          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          {places.length > 0 && (
            <Paper elevation={2} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Results</Typography>
              <List>
                {places.map((place, idx) => (
                  <ListItem
                    key={place.place_id || idx}
                    alignItems="flex-start"
                    sx={{ mb: 1, cursor: 'pointer', bgcolor: selectedPlace && selectedPlace.place_id === place.place_id ? '#EADDFF' : undefined }}
                    onClick={() => handleNavigate(place)}
                    selected={selectedPlace && selectedPlace.place_id === place.place_id}
                  >
                    <ListItemText
                      primary={place.name}
                      secondary={<>
                        {place.formatted_address}<br/>
                        <Rating value={place.rating || 0} precision={0.1} readOnly size="small" />
                        {place.user_ratings_total ? ` (${place.user_ratings_total} ratings)` : ''}
                        <br/>
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          disabled={navigating && selectedPlace && selectedPlace.place_id === place.place_id}
                          sx={{ mt: 1 }}
                          onClick={e => { e.stopPropagation(); handleNavigate(place); }}
                        >
                          {navigating && selectedPlace && selectedPlace.place_id === place.place_id ? <CircularProgress size={16} /> : 'Navigate'}
                        </Button>
                      </>}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
          {/* Map Placeholder with Card effect */}
          <Paper elevation={3} sx={{ mt: 2, height: 400, borderRadius: 3, overflow: 'hidden', boxShadow: 4 }}>
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={13}
              >
                {places.map((place, idx) => (
                  place.geometry?.location && (
                    <Marker
                      key={place.place_id || idx}
                      position={{ lat: place.geometry.location.lat, lng: place.geometry.location.lng }}
                      title={place.name}
                      icon={selectedPlace && selectedPlace.place_id === place.place_id ? {
                        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                        scaledSize: { width: 40, height: 40 }
                      } : undefined}
                    />
                  )
                ))}
                {routePolyline && (
                  <Polyline
                    path={routePolyline}
                    options={{ strokeColor: '#6750A4', strokeWeight: 5, strokeOpacity: 0.8 }}
                  />
                )}
              </GoogleMap>
            ) : (
              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" color="primary" sx={{ opacity: 0.7 }}>
                  Loading map...
                </Typography>
              </Box>
            )}
          </Paper>
        </Paper>
        {/* Floating Action Button */}
        <Fab color="secondary" aria-label="add" sx={{ position: 'absolute', bottom: -30, right: 24, boxShadow: 4 }}>
          <AddLocationAltIcon />
        </Fab>
      </Container>
    </ThemeProvider>
  );
}

export default App;
