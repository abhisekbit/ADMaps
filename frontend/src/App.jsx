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
import Divider from '@mui/material/Divider';
import { GlobalStyles } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import ImageIcon from '@mui/icons-material/Image';
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#007aff', // Apple blue
    },
    secondary: {
      main: '#e5e5ea', // Apple gray
    },
    background: {
      default: '#f8f8f8',
      paper: '#fff',
    },
    text: {
      primary: '#111',
      secondary: '#6e6e73',
    },
  },
  typography: {
    fontFamily: [
      'SF Pro Display',
      'San Francisco',
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: { fontWeight: 700, fontSize: '2.2rem', letterSpacing: '-0.5px' },
    h6: { fontWeight: 600, fontSize: '1.1rem' },
    body1: { fontSize: '1.05rem' },
  },
  shape: {
    borderRadius: 18,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: 'none',
          transition: 'background 0.2s, color 0.2s',
        },
        outlined: {
          borderColor: '#e5e5ea',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          background: '#f4f4f7',
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          background: '#f8f8f8',
          borderRadius: 14,
        },
      },
    },
  },
});

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapContainerStyle = { width: '100%', height: '100%' };
const singaporeCenter = { lat: 1.29027, lng: 103.851959 };

// Helper to get Google Places photo URL
const getPlacePhotoUrl = (photoRef, maxWidth = 80) =>
  photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoRef}&key=${MAPS_API_KEY}`
    : null;

function App() {
  const [search, setSearch] = React.useState("");
  const [places, setPlaces] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [mapCenter, setMapCenter] = React.useState(singaporeCenter);
  const [selectedPlace, setSelectedPlace] = React.useState(null);
  const [routePolyline, setRoutePolyline] = React.useState(null);
  const [navigating, setNavigating] = React.useState(false);
  const [routeSteps, setRouteSteps] = React.useState([]);
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
    setRouteSteps([]);
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
      console.log('Directions response:', data);
      if (data.error) throw new Error(data.error);
      setRoutePolyline(decodePolyline(data.polyline.points));
      setMapCenter(destination);
      setRouteSteps(data.legs && data.legs[0] ? data.legs[0].steps : []);
    } catch (err) {
      setError(err.message || "Failed to get directions");
    } finally {
      setNavigating(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{
        html: { width: '100vw', height: '100vh', margin: 0, padding: 0, overflowX: 'hidden' },
        body: { width: '100vw', height: '100vh', margin: 0, padding: 0, overflowX: 'hidden' },
        '#root': { width: '100vw', height: '100vh', margin: 0, padding: 0, overflowX: 'hidden' },
      }} />
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: (theme) =>
            `linear-gradient(90deg, ${alpha('#eaf1fb', 0.85)} 0%, ${alpha('#f8f8f8', 0.85)} 100%)`,
          backdropFilter: 'blur(18px)',
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)',
          color: '#111',
          border: 'none',
          minHeight: 80,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Toolbar sx={{ minHeight: 80, display: 'flex', justifyContent: 'center', alignItems: 'center', px: 0 }}>
          <Typography
            variant="h4"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 800,
              letterSpacing: '-1px',
              color: '#111',
              textAlign: 'center',
              fontSize: { xs: '1.5rem', md: '2.2rem' },
              lineHeight: 1.1,
              userSelect: 'none',
            }}
          >
            ADMaps
          </Typography>
        </Toolbar>
      </AppBar>
      <Container disableGutters sx={{ width: '100vw', maxWidth: '100vw', mt: 0, mb: 0, px: 0, position: 'relative', height: 'calc(100vh - 64px)', minHeight: 0 }}>
        <Paper elevation={6} sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, borderRadius: 0, bgcolor: 'background.paper', boxShadow: 6, m: 0, p: 0 }}>
          {/* Left Panel: Search, Results, Steps */}
          <Box sx={{ width: { xs: '100%', md: '40%' }, p: { xs: 3, sm: 5 }, display: 'flex', flexDirection: 'column', height: { md: '100%' }, minWidth: 0, bgcolor: '#f8f8f8' }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
              Welcome to ADMaps
            </Typography>
            <Typography variant="body1" gutterBottom sx={{ mb: 3, color: 'text.secondary' }}>
              Search for places, get directions, and explore with a modern Material 3 expressive design.
            </Typography>
            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 32, marginTop: 16 }}>
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
                  sx: { borderRadius: 3, bgcolor: '#f4f4f7', fontSize: '1.1rem' }
                }}
                sx={{ fontSize: '1.1rem' }}
              />
              <Button type="submit" variant="contained" color="primary" disabled={loading || !search} sx={{ height: 56, px: 4, fontWeight: 600, borderRadius: 12 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
              </Button>
            </form>
            {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
            {places.length > 0 && (
              <Paper elevation={1} sx={{ mb: 2, p: 2, borderRadius: 0, bgcolor: '#fff', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Results</Typography>
                <List sx={{ maxHeight: 320, overflowY: 'auto', bgcolor: '#f8f8f8', borderRadius: 0, boxShadow: 'none' }}>
                  {places.slice(0, 5).map((place, idx) => (
                    <React.Fragment key={place.place_id || idx}>
                      <ListItem
                        alignItems="flex-start"
                        sx={{ cursor: 'pointer', bgcolor: selectedPlace && selectedPlace.place_id === place.place_id ? '#EADDFF' : undefined, borderRadius: 0 }}
                        onClick={() => handleNavigate(place)}
                        selected={selectedPlace && selectedPlace.place_id === place.place_id}
                      >
                        {/* Place photo thumbnail */}
                        {place.photos && place.photos.length > 0 ? (
                          <Avatar
                            variant="square"
                            src={getPlacePhotoUrl(place.photos[0].photo_reference)}
                            alt={place.name}
                            sx={{ width: 64, height: 64, mr: 2, borderRadius: 2, bgcolor: '#e5e5ea' }}
                          />
                        ) : (
                          <Avatar variant="square" sx={{ width: 64, height: 64, mr: 2, borderRadius: 2, bgcolor: '#e5e5ea' }}>
                            <ImageIcon color="disabled" />
                          </Avatar>
                        )}
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
                      {idx < places.slice(0, 5).length - 1 && <Divider component="li" sx={{ my: 0 }} />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            )}
            {/* Route Steps */}
            {routeSteps.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: '#111' }}>Route Steps</Typography>
                <List sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: '#f4f4f7', borderRadius: 2, boxShadow: 'none' }}>
                  {routeSteps.map((step, idx) => (
                    <ListItem key={idx} sx={{ alignItems: 'flex-start' }}>
                      <ListItemText
                        primary={<span dangerouslySetInnerHTML={{ __html: step.html_instructions }} />}
                        secondary={step.distance && step.duration ? `${step.distance.text} • ${step.duration.text}` : ''}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
          {/* Right Panel: Map */}
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
          <Box sx={{ flex: 1, minWidth: 0, height: { xs: 400, md: '100%' }, width: { xs: '100%', md: '60%' }, p: 0, m: 0, bgcolor: '#f8f8f8' }}>
            <Paper elevation={3} sx={{ height: '100%', borderRadius: 0, overflow: 'hidden', boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)', m: 0, p: 0 }}>
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%', borderRadius: 24 }}
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
          </Box>
        </Paper>
        {/* Floating Action Button */}
        <Fab color="secondary" aria-label="add" sx={{ position: 'absolute', bottom: 32, right: 32, boxShadow: 2, bgcolor: '#fff', color: 'primary.main', border: '1px solid #e5e5ea', '&:hover': { bgcolor: alpha('#007aff', 0.08) } }}>
          <AddLocationAltIcon />
        </Fab>
      </Container>
    </ThemeProvider>
  );
}

export default App;
