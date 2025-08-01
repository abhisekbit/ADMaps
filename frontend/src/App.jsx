import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Rating, 
  Avatar, 
  Divider, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  CircularProgress,
  InputAdornment,
  GlobalStyles,
  Snackbar,
  Alert,
  IconButton
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { 
  Search as SearchIcon, 
  Directions as DirectionsIcon, 
  MyLocation as MyLocationIcon,
  ExpandMore as ExpandMoreIcon,
  Share as ShareIcon,
  ContentCopy as ContentCopyIcon,
  LocationOn as LocationOnIcon,
  Mood as MoodIcon
} from '@mui/icons-material';
import { GoogleMap, useJsApiLoader, Marker, Polyline, TrafficLayer } from '@react-google-maps/api';
import { Autocomplete } from '@react-google-maps/api';
import { alpha } from '@mui/material/styles';
import pitStopPalIcon from './assets/image.png';
const createAppTheme = (darkMode) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: '#007aff', // Apple blue
      light: '#4da6ff',
      dark: '#0056cc',
    },
    secondary: {
      main: '#007aff', // Use blue as secondary too
    },
    background: {
      default: darkMode ? '#0a0a0a' : '#f0f8ff', // Blue tint
      paper: darkMode ? '#1a1a2e' : '#ffffff',
    },
    text: {
      primary: darkMode ? '#ffffff' : '#1a1a1a',
      secondary: darkMode ? '#8e8e93' : '#6e6e73',
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
        root: ({ theme }) => ({
          borderRadius: 18,
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 4px 24px 0 rgba(0,0,0,0.3)' 
            : '0 4px 24px 0 rgba(0,0,0,0.06)',
          backgroundColor: theme.palette.background.paper,
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: 'none',
          transition: 'background 0.2s, color 0.2s',
        }),
        outlined: ({ theme }) => ({
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.23)' : '#e5e5ea',
          color: theme.palette.text.primary,
          '&:hover': {
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.4)' : '#d1d1d6',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          },
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          borderRadius: 14,
        }),
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.08)' 
              : 'rgba(0,0,0,0.04)',
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(255,255,255,0.12)' 
            : 'rgba(0,0,0,0.08)',
        }),
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          '&:before': {
            display: 'none',
          },
        }),
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.05)' 
              : 'rgba(0,0,0,0.02)',
          },
        }),
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }),
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

// Main authenticated app component
function AuthenticatedApp() {
  console.log('🚀 AuthenticatedApp component loaded!');
  const { getAuthHeader, logout } = useAuth();

  // Helper function to handle API responses with auth error handling
  const handleApiResponse = async (response) => {
    if (response.status === 401 || response.status === 403) {
      console.log('Authentication failed, logging out...');
      logout();
      return null;
    }
    return response;
  };
  const [showSplash, setShowSplash] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [places, setPlaces] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [mapCenter, setMapCenter] = React.useState(singaporeCenter);
  const [selectedPlace, setSelectedPlace] = React.useState(null);
  const [routePolyline, setRoutePolyline] = React.useState(null);
  const [encodedPolyline, setEncodedPolyline] = React.useState(null);
  const [navigating, setNavigating] = React.useState(false);
  const [routeSteps, setRouteSteps] = React.useState([]);
  const [currentLocation, setCurrentLocation] = React.useState(singaporeCenter);
  const [stopQuery, setStopQuery] = React.useState("");
  const [suggestedStops, setSuggestedStops] = React.useState([]);
  const [searchingStops, setSearchingStops] = React.useState(false);
  const [searchInfo, setSearchInfo] = React.useState(null);
  const [routeInfo, setRouteInfo] = React.useState(null);
  const [searchMarkers, setSearchMarkers] = React.useState([]);
  const [darkMode, setDarkMode] = React.useState(false);
  const [addingStopToRoute, setAddingStopToRoute] = React.useState(false);
  const [addedStops, setAddedStops] = React.useState([]);
  const [recalculatingRoute, setRecalculatingRoute] = React.useState(false);
  const [routeKey, setRouteKey] = React.useState(0); // Add key to force re-render
  const [showStartingPointInput, setShowStartingPointInput] = React.useState(false);
  const [startingPoint, setStartingPoint] = React.useState("");
  const [routeDetailsOpen, setRouteDetailsOpen] = React.useState(false);
  const [searchAlongRouteOpen, setSearchAlongRouteOpen] = React.useState(true);
  const [autocomplete, setAutocomplete] = React.useState(null);
  const [startingPointLocation, setStartingPointLocation] = React.useState(null);
  const [navigationOrigin, setNavigationOrigin] = React.useState(null);
  const [shareSnackbarOpen, setShareSnackbarOpen] = React.useState(false);
  const [shareSnackbarMessage, setShareSnackbarMessage] = React.useState("");
  const [shareSnackbarSeverity, setShareSnackbarSeverity] = React.useState("success");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = React.useState([]);
  const [showAutocomplete, setShowAutocomplete] = React.useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = React.useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState(-1);
  const [hoveredPlace, setHoveredPlace] = React.useState(null);
  
  // Starting Point Autocomplete state
  const [startingPointAutocompleteSuggestions, setStartingPointAutocompleteSuggestions] = React.useState([]);
  const [showStartingPointAutocomplete, setShowStartingPointAutocomplete] = React.useState(false);
  const [startingPointAutocompleteLoading, setStartingPointAutocompleteLoading] = React.useState(false);
  const [selectedStartingPointSuggestionIndex, setSelectedStartingPointSuggestionIndex] = React.useState(-1);
  
  // Intelligent search feedback
  const [intelligentSearchUsed, setIntelligentSearchUsed] = React.useState(false);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY,
    libraries: ['places'],
  });
  const mapRef = useRef(null);

  // Splash screen timer
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // 2 seconds

    return () => clearTimeout(timer);
  }, []);

  // Auto-detect user location on app load
  React.useEffect(() => {
    console.log('Starting auto-location detection...');
    console.log('isSecureContext:', window.isSecureContext);
    console.log('navigator.geolocation:', !!navigator.geolocation);
    console.log('window.location.protocol:', window.location.protocol);
    console.log('window.location.hostname:', window.location.hostname);
    
    if (navigator.geolocation && window.isSecureContext) {
      console.log('Geolocation available, requesting position...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log('✅ Auto-detected user location:', userLocation);
          setCurrentLocation(userLocation);
          setMapCenter(userLocation);
        },
        (error) => {
          console.log('❌ Auto-location detection failed:', error.message);
          console.log('Error code:', error.code);
          console.log('Keeping Singapore as fallback location');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      console.log('❌ Geolocation not available or not secure context');
      console.log('isSecureContext:', window.isSecureContext);
      console.log('navigator.geolocation:', !!navigator.geolocation);
    }
  }, []);



  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPlaces([]);
    setIntelligentSearchUsed(false);
    
    // Reset map state when new search is performed
    setRoutePolyline(null);
    setEncodedPolyline(null);
    setRouteSteps([]);
    setSelectedPlace(null);
    setAddedStops([]);
    setSearchMarkers([]);
    setSuggestedStops([]);
    setSearchInfo(null);
    setRouteInfo(null);
    setRouteKey(prev => prev + 1);
    
    console.log('🔍 Search request details:');
    console.log('  Query:', search);
    console.log('  Current Location:', currentLocation);
    console.log('  Map Center:', mapCenter);
    console.log('  Location Source:', currentLocation === singaporeCenter ? 'Default (Singapore)' : 'User Location');
    
    try {
      const resp = await fetch('/search', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({ 
          query: search,
          userLocation: currentLocation // Send user's current location
        })
      });
      
      const handledResp = await handleApiResponse(resp);
      if (!handledResp) return; // Authentication failed, user logged out
      
      const data = await handledResp.json();
      if (data.error) throw new Error(data.error);
      setPlaces(data.places || []);
      setIntelligentSearchUsed(data.intelligentSearchUsed || false);
      
      // Show all search results on the map
      if (data.places && data.places.length > 0) {
        // Create markers for all search results
        const markers = data.places
          .filter(place => 
            place.geometry?.location?.lat && 
            place.geometry?.location?.lng &&
            typeof place.geometry.location.lat === 'number' &&
            typeof place.geometry.location.lng === 'number'
          )
          .map((place, index) => ({
            id: place.place_id || `search-${index}`,
            position: {
              lat: parseFloat(place.geometry.location.lat),
              lng: parseFloat(place.geometry.location.lng)
            },
            title: place.name,
            type: 'search-result'
          }));
        setSearchMarkers(markers);
        
        // Set map center to first result
        const first = data.places[0].geometry.location;
        setMapCenter({ lat: first.lat, lng: first.lng });
        
        // Fit bounds to show all results
        if (mapRef.current && data.places.length > 1) {
          setTimeout(() => {
            const bounds = new window.google.maps.LatLngBounds();
            data.places.forEach(place => {
              bounds.extend(new window.google.maps.LatLng(
                place.geometry.location.lat,
                place.geometry.location.lng
              ));
            });
            mapRef.current.fitBounds(bounds);
          }, 300);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to search");
    } finally {
      setLoading(false);
    }
  };

  // Handle autocomplete for search input
  const handleAutocomplete = async (input) => {
    if (!input || input.trim().length < 2) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    setAutocompleteLoading(true);
    try {
      const resp = await fetch('/autocomplete', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({ 
          input: input.trim(),
          userLocation: currentLocation
        })
      });
      
      const handledResp = await handleApiResponse(resp);
      if (!handledResp) return; // Authentication failed, user logged out
      
      const data = await handledResp.json();
      if (data.error) throw new Error(data.error);
      
      setAutocompleteSuggestions(data.predictions || []);
      setShowAutocomplete(data.predictions && data.predictions.length > 0);
      setSelectedSuggestionIndex(-1); // Reset selection when new suggestions arrive
    } catch (err) {
      console.error('Autocomplete error:', err);
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
    } finally {
      setAutocompleteLoading(false);
    }
  };

  // Handle autocomplete suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion.description);
    setAutocompleteSuggestions([]);
    setShowAutocomplete(false);
    setSelectedSuggestionIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < autocompleteSuggestions.length) {
          handleSuggestionSelect(autocompleteSuggestions[selectedSuggestionIndex]);
        } else {
          // Close autocomplete and submit the form if no suggestion is selected
          setShowAutocomplete(false);
          setSelectedSuggestionIndex(-1);
          handleSearch(e);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Handle click outside to close autocomplete
  const handleClickOutside = (event) => {
    if (showAutocomplete && !event.target.closest('.autocomplete-container')) {
      setShowAutocomplete(false);
      setAutocompleteSuggestions([]);
    }
    if (showStartingPointAutocomplete && !event.target.closest('.starting-point-autocomplete-container')) {
      setShowStartingPointAutocomplete(false);
      setStartingPointAutocompleteSuggestions([]);
    }
  };

  // Starting Point Autocomplete Functions
  const handleStartingPointAutocomplete = async (input) => {
    if (!input || input.trim().length < 2) {
      setStartingPointAutocompleteSuggestions([]);
      setShowStartingPointAutocomplete(false);
      return;
    }

    setStartingPointAutocompleteLoading(true);
    try {
      const resp = await fetch('/autocomplete', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({ 
          input: input.trim(),
          userLocation: currentLocation
        })
      });
      
      const handledResp = await handleApiResponse(resp);
      if (!handledResp) return; // Authentication failed, user logged out
      
      const data = await handledResp.json();
      if (data.error) throw new Error(data.error);
      
      setStartingPointAutocompleteSuggestions(data.predictions || []);
      setShowStartingPointAutocomplete(data.predictions && data.predictions.length > 0);
      setSelectedStartingPointSuggestionIndex(-1); // Reset selection when new suggestions arrive
    } catch (err) {
      console.error('Starting Point Autocomplete error:', err);
      setStartingPointAutocompleteSuggestions([]);
      setShowStartingPointAutocomplete(false);
    } finally {
      setStartingPointAutocompleteLoading(false);
    }
  };

  // Handle starting point autocomplete suggestion selection
  const handleStartingPointSuggestionSelect = (suggestion) => {
    setStartingPoint(suggestion.description);
    setStartingPointAutocompleteSuggestions([]);
    setShowStartingPointAutocomplete(false);
    setSelectedStartingPointSuggestionIndex(-1);
    
    // Also set the location for navigation
    // We'll need to geocode this or use place details API to get coordinates
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(suggestion.description)}&key=${MAPS_API_KEY}`)
      .then(response => response.json())
      .then(data => {
        if (data.results && data.results[0]) {
          const location = data.results[0].geometry.location;
          setStartingPointLocation({
            lat: location.lat,
            lng: location.lng
          });
        }
      })
      .catch(error => {
        console.error('Geocoding error:', error);
      });
  };

  // Handle starting point keyboard navigation
  const handleStartingPointKeyDown = (e) => {
    if (!showStartingPointAutocomplete || startingPointAutocompleteSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedStartingPointSuggestionIndex(prev => 
          prev < startingPointAutocompleteSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedStartingPointSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedStartingPointSuggestionIndex >= 0 && selectedStartingPointSuggestionIndex < startingPointAutocompleteSuggestions.length) {
          handleStartingPointSuggestionSelect(startingPointAutocompleteSuggestions[selectedStartingPointSuggestionIndex]);
          // Auto-start navigation after selecting a suggestion
          setTimeout(() => {
            if (selectedPlace && startingPointLocation) {
              handleConfirmNavigation();
            }
          }, 100);
        } else {
          // Close autocomplete if no suggestion is selected
          setShowStartingPointAutocomplete(false);
          setSelectedStartingPointSuggestionIndex(-1);
        }
        break;
      case 'Escape':
        setShowStartingPointAutocomplete(false);
        setSelectedStartingPointSuggestionIndex(-1);
        break;
    }
  };

  // Add click outside listener
  React.useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showAutocomplete, showStartingPointAutocomplete]);

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

  const handleNavigateClick = (place) => {
    setSelectedPlace(place);
    setShowStartingPointInput(true);
  };

  const handleConfirmNavigation = async () => {
    if (!selectedPlace) return;
    
    setNavigating(true);
    setRoutePolyline(null);
    setEncodedPolyline(null);
    setRouteSteps([]);
    setAddedStops([]); // Clear added stops for new navigation
    setRouteKey(0); // Reset route key for new navigation
    setShowStartingPointInput(false);
    setStartingPoint("");
    setStartingPointLocation(null);
    setNavigationOrigin(null);
    setRouteInfo(null);
    setSearchMarkers([]);
    setSuggestedStops([]);
    setSearchInfo(null);
    
    try {
      // Determine origin (starting point or current location)
      let origin;
      if (startingPointLocation) {
        // Use selected starting point location (coordinates)
        origin = startingPointLocation;
      } else if (startingPoint.trim()) {
        // Use provided starting point as string for Google Directions API
        origin = startingPoint.trim();
      } else {
        // Get current location with secure origin fallback
        try {
          if (navigator.geolocation && window.isSecureContext) {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
              });
            });
            
            origin = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setCurrentLocation(origin);
          } else {
            // Fallback when geolocation is not available or not secure
            console.warn('Geolocation not available or not on secure origin, using default location');
            origin = currentLocation; // Use the default Singapore location
            setError("Geolocation requires HTTPS. Using default location.");
          }
        } catch (error) {
          console.error('Geolocation error:', error);
          origin = currentLocation; // Use the default Singapore location
          if (error.code === 1) {
            setError("Location access denied. Using default location.");
          } else if (error.code === 2) {
            setError("Location unavailable. Using default location.");
          } else if (error.code === 3) {
            setError("Location request timeout. Using default location.");
          } else {
            setError("Unable to get current location. Using default location.");
          }
        }
      }
      
      // Store the navigation origin for search along route
      // For string origins, we'll get the actual coordinates from the directions response
      setNavigationOrigin(origin);
      
      // Get directions
              const resp = await fetch('/directions', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({
          origin: origin,
          destination: selectedPlace.geometry.location
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      
      const polyline = decodePolyline(data.polyline.points);
      setRoutePolyline(polyline);
      setEncodedPolyline(data.polyline.points);
      // Don't set map center here, let fitBounds handle it
      // setMapCenter(selectedPlace.geometry.location);
      setRouteSteps(data.legs.flatMap(leg => leg.steps));
      
      // Extract actual starting coordinates from the directions response
      if (data.legs && data.legs.length > 0 && data.legs[0].start_location) {
        const actualStartCoords = {
          lat: data.legs[0].start_location.lat,
          lng: data.legs[0].start_location.lng
        };
        console.log('Updating navigationOrigin with actual coordinates:', actualStartCoords);
        setNavigationOrigin(actualStartCoords);
      }
      
      // Store route information (distance and duration)
      if (data.legs && data.legs.length > 0) {
        const totalDistance = data.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
        const totalDuration = data.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);
        // Use Google's formatted text if available, otherwise format ourselves
        const formattedDistance = data.legs[0]?.distance?.text || `${Math.round(totalDistance / 1000)} km`;
        const formattedDuration = data.legs[0]?.duration?.text || formatDuration(totalDuration);
        
        setRouteInfo({
          distance: {
            text: formattedDistance,
            meters: totalDistance
          },
          duration: {
            text: formattedDuration,
            seconds: totalDuration
          }
        });
      }
      
      // Auto-zoom to fit the entire route
      if (mapRef.current && polyline.length > 0) {
        // Small delay to ensure map is ready
        setTimeout(() => {
          const bounds = new window.google.maps.LatLngBounds();
          
          // Handle origin - if it's a string address, use the first polyline point as origin
          let originLatLng = null;
          if (typeof origin === 'string') {
            // For string addresses, use the first point of the polyline as the actual start
            originLatLng = polyline.length > 0 ? polyline[0] : null;
          } else {
            originLatLng = origin;
          }
          
          if (originLatLng) {
            bounds.extend(new window.google.maps.LatLng(originLatLng.lat, originLatLng.lng));
          }
          
          // Add destination
          const destLatLng = selectedPlace.geometry.location;
          bounds.extend(new window.google.maps.LatLng(destLatLng.lat, destLatLng.lng));
          
          // Add key points from the polyline for better bounds
          const samplePoints = Math.min(8, polyline.length);
          for (let i = 0; i < samplePoints; i++) {
            const index = Math.floor((i * polyline.length) / samplePoints);
            const point = polyline[index];
            bounds.extend(new window.google.maps.LatLng(point.lat, point.lng));
          }
          
          console.log('Fitting bounds with origin:', originLatLng, 'destination:', destLatLng, 'polyline points:', polyline.length);
          
          if (mapRef.current) {
            try {
              mapRef.current.fitBounds(bounds);
              console.log('FitBounds called successfully');
            } catch (error) {
              console.error('Error calling fitBounds:', error);
            }
          } else {
            console.error('mapRef.current is null');
          }
          
          // Add padding after fitBounds
          setTimeout(() => {
            if (mapRef.current) {
              const currentZoom = mapRef.current.getZoom();
              if (currentZoom > 16) {
                mapRef.current.setZoom(Math.max(currentZoom - 1, 13));
              }
            }
          }, 150);
        }, 300);
      }
    } catch (err) {
      setError(err.message || "Failed to get directions");
    } finally {
      setNavigating(false);
    }
  };
 
  const handleRemoveStop = async (stopToRemove) => {
    const updatedStops = addedStops.filter(stop => stop.place_id !== stopToRemove.place_id);
    setAddedStops(updatedStops);
    
    // Clear the old route immediately and force re-render
    setRoutePolyline(null);
    setEncodedPolyline(null);
    setRouteSteps([]);
    setSearchMarkers([]); // Clear search markers when removing stops
    setRouteKey(prev => prev + 1);
    
    // Force a re-render by temporarily setting a different key
    setTimeout(() => {
      setRouteKey(prev => prev + 1);
    }, 50);
    
    setRecalculatingRoute(true);
    
    // Small delay to ensure old route is cleared
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Recalculate route without the removed stop
    if (selectedPlace && navigationOrigin) {
      // Validate navigationOrigin coordinates
      if (typeof navigationOrigin === 'object' && 
          (navigationOrigin.lat === undefined || navigationOrigin.lng === undefined || 
           typeof navigationOrigin.lat !== 'number' || typeof navigationOrigin.lng !== 'number')) {
        setError("Invalid starting location. Please restart navigation.");
        setRecalculatingRoute(false);
        return;
      }
      
      try {
        const resp = await fetch('/recalculate-route', {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...getAuthHeader()
          },
          body: JSON.stringify({
            origin: navigationOrigin,
            destination: selectedPlace.geometry.location,
            stops: updatedStops
          })
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        
        const newPolyline = decodePolyline(data.polyline.points);
        setRoutePolyline(newPolyline);
        setEncodedPolyline(data.polyline.points);
        setRouteSteps(data.legs.flatMap(leg => leg.steps));
        
        // Update route information
        if (data.legs && data.legs.length > 0) {
          const totalDistance = data.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
          const totalDuration = data.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);
          setRouteInfo({
            distance: {
              text: `${(totalDistance / 1000).toFixed(1)} km`,
              meters: totalDistance
            },
            duration: {
              text: formatDuration(totalDuration),
              seconds: totalDuration
            }
          });
        }
        
        // Auto-zoom to fit the entire updated route
        if (mapRef.current && newPolyline.length > 0) {
          const bounds = new window.google.maps.LatLngBounds();
          
          // Ensure navigationOrigin is in proper LatLng format
          if (navigationOrigin) {
            const originLatLng = typeof navigationOrigin === 'object' && navigationOrigin.lat !== undefined 
              ? { lat: parseFloat(navigationOrigin.lat), lng: parseFloat(navigationOrigin.lng) }
              : navigationOrigin;
            bounds.extend(originLatLng);
          }
          
          // Ensure selectedPlace coordinates are in proper LatLng format
          if (selectedPlace?.geometry?.location) {
            const destLatLng = {
              lat: parseFloat(selectedPlace.geometry.location.lat),
              lng: parseFloat(selectedPlace.geometry.location.lng)
            };
            bounds.extend(destLatLng);
          }
          
          // Add route points
          newPolyline.forEach(point => {
            const routeLatLng = {
              lat: parseFloat(point.lat),
              lng: parseFloat(point.lng)
            };
            bounds.extend(routeLatLng);
          });
          
          // Add remaining stops to bounds with proper formatting
          updatedStops.forEach(stopItem => {
            if (stopItem?.geometry?.location) {
              const stopLatLng = {
                lat: parseFloat(stopItem.geometry.location.lat),
                lng: parseFloat(stopItem.geometry.location.lng)
              };
              bounds.extend(stopLatLng);
            }
          });
          
          mapRef.current.fitBounds(bounds);
        }
      } catch (err) {
        setError(err.message || "Failed to recalculate route");
      } finally {
        setRecalculatingRoute(false);
      }
    }
  };

  const handleResetToCurrentLocation = () => {
    console.log('Manual location detection triggered...');
    console.log('isSecureContext:', window.isSecureContext);
    console.log('navigator.geolocation:', !!navigator.geolocation);
    console.log('window.location.protocol:', window.location.protocol);
    
    if (navigator.geolocation && window.isSecureContext) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log('✅ Manual location detection successful:', newLocation);
          setCurrentLocation(newLocation);
          setMapCenter(newLocation);
          setError(""); // Clear any previous errors
        },
        (error) => {
          console.error('❌ Manual location detection failed:', error);
          console.error('Error code:', error.code);
          let errorMessage = "Unable to get current location. ";
          if (error.code === 1) {
            errorMessage += "Location access denied.";
          } else if (error.code === 2) {
            errorMessage += "Location unavailable.";
          } else if (error.code === 3) {
            errorMessage += "Location request timeout.";
          }
          setError(errorMessage);
          // Fallback to Singapore center
          setMapCenter(singaporeCenter);
        }
      );
    } else {
      // Fallback when geolocation is not available or not secure
      console.error('❌ Geolocation not available for manual detection');
      setError("Geolocation requires HTTPS. Using default location.");
      setMapCenter(singaporeCenter);
    }
  };

  const handleSearchStops = async (e) => {
    e.preventDefault();
    if (!stopQuery.trim() || !encodedPolyline) return;
    
    setSearchingStops(true);
    setError(null);
    
    try {
      // Use the navigation origin (starting point of the route) for searching stops
      let searchOrigin = navigationOrigin || currentLocation;
      console.log('Search stops - navigationOrigin:', navigationOrigin);
      console.log('Search stops - currentLocation:', currentLocation);
      console.log('Search stops - searchOrigin:', searchOrigin);
      
      // Ensure searchOrigin is coordinates, not a string
      if (typeof searchOrigin === 'string') {
        // If it's a string, we need to use the actual starting point from the route
        // Try to get coordinates from startingPointLocation or fallback to currentLocation
        if (startingPointLocation && typeof startingPointLocation === 'object') {
          searchOrigin = startingPointLocation;
          console.log('Using startingPointLocation as coordinates:', searchOrigin);
        } else {
          // Fallback to current location coordinates
          searchOrigin = currentLocation;
          console.log('Fallback to currentLocation coordinates:', searchOrigin);
        }
      }
      
      // Validate that we have proper coordinates
      if (!searchOrigin || typeof searchOrigin !== 'object' || 
          typeof searchOrigin.lat !== 'number' || typeof searchOrigin.lng !== 'number') {
        throw new Error('Invalid starting coordinates. Please ensure navigation is started properly.');
      }
      
      console.log('Final searchOrigin coordinates:', searchOrigin);
      
      const resp = await fetch('/add-stop', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({
          routePolyline: encodedPolyline,
          currentLocation: searchOrigin,
          stopQuery: stopQuery
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      
      setSuggestedStops(data.suggestedStops || []);
      setSearchInfo(data.searchInfo || null);
      
      // Create markers for search results
      const markers = (data.suggestedStops || [])
        .filter(stop => 
          stop.geometry?.location?.lat && 
          stop.geometry?.location?.lng &&
          typeof stop.geometry.location.lat === 'number' &&
          typeof stop.geometry.location.lng === 'number'
        )
        .map((stop, index) => ({
          id: stop.place_id || `stop-${index}`,
          position: {
            lat: parseFloat(stop.geometry.location.lat),
            lng: parseFloat(stop.geometry.location.lng)
          },
          title: stop.name,
          type: 'search-result'
        }));
      setSearchMarkers(markers);
    } catch (err) {
      setError(err.message || "Failed to search for stops");
    } finally {
      setSearchingStops(false);
    }
  };

  const handleAddStopToRoute = async (stop) => {
    if (!selectedPlace) {
      setError("Please select a destination first");
      return;
    }
    
    if (!navigationOrigin) {
      setError("Please start navigation first before adding stops");
      return;
    }
    
    // Validate navigationOrigin coordinates
    if (typeof navigationOrigin === 'object' && 
        (navigationOrigin.lat === undefined || navigationOrigin.lng === undefined || 
         typeof navigationOrigin.lat !== 'number' || typeof navigationOrigin.lng !== 'number')) {
      setError("Invalid starting location. Please restart navigation.");
      return;
    }
    
    setAddingStopToRoute(true);
    setRecalculatingRoute(true);
    
    // Clear the old route immediately and force re-render
    setRoutePolyline(null);
    setEncodedPolyline(null);
    setRouteSteps([]);
    setSearchMarkers([]); // Clear search markers when adding stops
    setRouteKey(prev => prev + 1);
    
    // Force a re-render by temporarily setting a different key
    setTimeout(() => {
      setRouteKey(prev => prev + 1);
    }, 50);
    
    // Small delay to ensure old route is cleared
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      const resp = await fetch('/add-stop-to-route', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({
          origin: navigationOrigin,
          destination: selectedPlace.geometry.location,
          stop: stop
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      
      // Update route with new polyline
      const newPolyline = decodePolyline(data.polyline.points);
      setRoutePolyline(newPolyline);
      setEncodedPolyline(data.polyline.points);
      setRouteSteps(data.legs.flatMap(leg => leg.steps));
      
      // Update route information
      if (data.legs && data.legs.length > 0) {
        const totalDistance = data.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
        const totalDuration = data.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);
        setRouteInfo({
          distance: {
            text: `${(totalDistance / 1000).toFixed(1)} km`,
            meters: totalDistance
          },
          duration: {
            text: formatDuration(totalDuration),
            seconds: totalDuration
          }
        });
      }
      
      // Add stop to added stops list
      setAddedStops(prev => [...prev, stop]);
      
      // Clear suggested stops since one was added
      setSuggestedStops([]);
      setSearchInfo(null);
      setSearchMarkers([]); // Remove all search markers
      setStopQuery("");
      
      // Auto-zoom to fit the entire updated route
      if (mapRef.current && newPolyline.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        
        // Ensure navigationOrigin is in proper LatLng format
        if (navigationOrigin) {
          const originLatLng = typeof navigationOrigin === 'object' && navigationOrigin.lat !== undefined 
            ? { lat: parseFloat(navigationOrigin.lat), lng: parseFloat(navigationOrigin.lng) }
            : navigationOrigin;
          bounds.extend(originLatLng);
        }
        
        // Ensure selectedPlace coordinates are in proper LatLng format
        if (selectedPlace?.geometry?.location) {
          const destLatLng = {
            lat: parseFloat(selectedPlace.geometry.location.lat),
            lng: parseFloat(selectedPlace.geometry.location.lng)
          };
          bounds.extend(destLatLng);
        }
        
        // Add route points
        newPolyline.forEach(point => {
          const routeLatLng = {
            lat: parseFloat(point.lat),
            lng: parseFloat(point.lng)
          };
          bounds.extend(routeLatLng);
        });
        
        // Add all added stops to bounds with proper formatting
        [...addedStops, stop].forEach(stopItem => {
          if (stopItem?.geometry?.location) {
            const stopLatLng = {
              lat: parseFloat(stopItem.geometry.location.lat),
              lng: parseFloat(stopItem.geometry.location.lng)
            };
            bounds.extend(stopLatLng);
          }
        });
        
        mapRef.current.fitBounds(bounds);
      }
      
      // Show success message
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to add stop to route");
    } finally {
      setAddingStopToRoute(false);
      setRecalculatingRoute(false);
    }
  };

  const theme = createAppTheme(darkMode);
  
  // Helper function to format duration from seconds to hours and minutes
  const formatDuration = (seconds) => {
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  // Share route functionality - Generate Google Maps URL
  const generateShareableUrl = () => {
    if (!selectedPlace || !navigationOrigin) return null;
    
    // Format origin coordinates or address
    let originStr;
    if (typeof navigationOrigin === 'object') {
      originStr = `${navigationOrigin.lat},${navigationOrigin.lng}`;
    } else {
      originStr = encodeURIComponent(navigationOrigin);
    }
    
    // Format destination coordinates or address
    let destinationStr;
    if (selectedPlace.geometry && selectedPlace.geometry.location) {
      destinationStr = `${selectedPlace.geometry.location.lat},${selectedPlace.geometry.location.lng}`;
    } else if (selectedPlace.formatted_address) {
      destinationStr = encodeURIComponent(selectedPlace.formatted_address);
    } else {
      destinationStr = encodeURIComponent(selectedPlace.name);
    }
    
    // Build Google Maps URL
    let googleMapsUrl = `https://www.google.com/maps/dir/${originStr}`;
    
    // Add waypoints (stops) if any
    if (addedStops && addedStops.length > 0) {
      addedStops.forEach(stop => {
        let stopStr;
        if (stop.geometry && stop.geometry.location) {
          stopStr = `${stop.geometry.location.lat},${stop.geometry.location.lng}`;
        } else if (stop.formatted_address) {
          stopStr = encodeURIComponent(stop.formatted_address);
        } else {
          stopStr = encodeURIComponent(stop.name);
        }
        googleMapsUrl += `/${stopStr}`;
      });
    }
    
    // Add final destination
    googleMapsUrl += `/${destinationStr}`;
    
    // Add parameters for better mobile experience
    googleMapsUrl += '/?travelmode=driving&dir_action=navigate';
    
    console.log('Generated Google Maps URL:', googleMapsUrl);
    return googleMapsUrl;
  };

  // Simple test share function for debugging
  const testWebShare = async () => {
    console.log('Testing Web Share API...');
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Test Share',
          text: 'Testing the share functionality',
          url: 'https://www.google.com'
        });
        console.log('Test share successful!');
      } else {
        console.log('Web Share API not available');
      }
    } catch (error) {
      console.error('Test share failed:', error);
    }
  };

    const handleShareRoute = async (event) => {
    console.log('Share button clicked!'); // Debug logging
    console.log('Event:', event);
    console.log('Event type:', event?.type);
    console.log('Event isTrusted:', event?.isTrusted);
    
    // Ensure this is called from a user gesture
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const shareUrl = generateShareableUrl();
    console.log('Generated share URL:', shareUrl);
    console.log('Navigator.share available:', !!navigator.share);
    console.log('User agent:', navigator.userAgent);
    console.log('Platform:', navigator.platform);
    console.log('Is mobile:', /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    console.log('Is secure context:', window.isSecureContext);
    console.log('Protocol:', window.location.protocol);
    
    if (!shareUrl) {
      setShareSnackbarMessage("No route to share. Please navigate to a destination first.");
      setShareSnackbarSeverity("warning");
      setShareSnackbarOpen(true);
      return;
    }

    // Force Web Share API attempt on mobile devices
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (navigator.share && isMobile) {
      console.log('Mobile device detected, forcing Web Share API...');
      
      try {
        // Try simplest possible share first
        console.log('Attempting simple URL share...');
        await navigator.share({
          url: shareUrl
        });
        
        console.log('Simple share successful!');
        setShareSnackbarMessage("Google Maps route shared successfully!");
        setShareSnackbarSeverity("success");
        setShareSnackbarOpen(true);
        return;
        
      } catch (error) {
        console.error('Simple share failed:', error);
        console.log('Error name:', error.name);
        console.log('Error message:', error.message);
        
        // If user cancelled, don't show error
        if (error.name === 'AbortError') {
          console.log('User cancelled share');
          return;
        }
        
        // Try with title and text
        try {
          console.log('Trying full share data...');
          await navigator.share({
            title: `Route to ${selectedPlace.name}`,
            text: `Check out this route I planned - opens in Google Maps`,
            url: shareUrl
          });
          
          console.log('Full share successful!');
          setShareSnackbarMessage("Google Maps route shared successfully!");
          setShareSnackbarSeverity("success");
          setShareSnackbarOpen(true);
          return;
          
        } catch (error2) {
          console.error('Full share also failed:', error2);
          console.log('Falling back to clipboard');
        }
      }
    } else if (navigator.share) {
      console.log('Desktop or Web Share API available but not mobile, trying anyway...');
      
      try {
        await navigator.share({
          title: `Route to ${selectedPlace.name}`,
          text: `Check out this route I planned - opens in Google Maps`,
          url: shareUrl
        });
        
        setShareSnackbarMessage("Google Maps route shared successfully!");
        setShareSnackbarSeverity("success");
        setShareSnackbarOpen(true);
        return;
        
      } catch (error) {
        console.log('Desktop share failed:', error);
        if (error.name === 'AbortError') {
          console.log('User cancelled share');
          return;
        }
      }
    } else {
      console.log('Web Share API not available');
      console.log('navigator.share exists:', !!navigator.share);
      console.log('isSecureContext:', window.isSecureContext);
    }

    // Fallback to clipboard
    console.log('Using clipboard fallback');
    copyToClipboard(shareUrl);
  };

  // Helper function for clipboard operations with multiple fallbacks
  const copyToClipboard = (text) => {
    console.log('Attempting to copy to clipboard:', text);

    // Method 1: Modern Clipboard API (requires HTTPS)
          if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          setShareSnackbarMessage("Google Maps link copied to clipboard!");
          setShareSnackbarSeverity("success");
          setShareSnackbarOpen(true);
        }).catch(err => {
        console.log('Clipboard API failed:', err);
        fallbackCopyTextToClipboard(text);
      });
    } else {
      // Method 2: Fallback for non-HTTPS environments
      fallbackCopyTextToClipboard(text);
    }
  };

  // Fallback copy method for older browsers or non-HTTPS
  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setShareSnackbarMessage("Google Maps link copied to clipboard!");
        setShareSnackbarSeverity("success");
      } else {
        setShareSnackbarMessage(`Copy this link manually: ${text}`);
        setShareSnackbarSeverity("info");
      }
    } catch (err) {
      console.log('Fallback copy failed:', err);
      setShareSnackbarMessage(`Copy this link manually: ${text}`);
      setShareSnackbarSeverity("info");
    }
    
    document.body.removeChild(textArea);
    setShareSnackbarOpen(true);
  };

  const handleCopyRouteLink = async () => {
    const shareUrl = generateShareableUrl();
    console.log('Copy button clicked, URL:', shareUrl);
    
    if (!shareUrl) {
      setShareSnackbarMessage("No route to share. Please navigate to a destination first.");
      setShareSnackbarSeverity("warning");
      setShareSnackbarOpen(true);
      return;
    }

    copyToClipboard(shareUrl);
  };
  
  // Consistent TextField styling
  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#f4f4f7',
      fontSize: '1rem',
      minHeight: '56px',
      '& fieldset': {
        borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderRadius: 2,
      },
      '&:hover fieldset': {
        borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#007aff',
        borderWidth: '2px',
      },
    },
    '& .MuiAutocomplete-paper': {
      borderRadius: 2,
      boxShadow: darkMode 
        ? '0 12px 40px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.3)' 
        : '0 12px 40px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1)',
      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
      '& .MuiAutocomplete-option': {
        borderRadius: 1,
        margin: '1px 4px',
        '&:hover': {
          backgroundColor: darkMode ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.05)',
        },
        '&.Mui-focused': {
          backgroundColor: darkMode ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.1)',
        }
      }
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{
        html: { width: '100vw', height: '100vh', margin: 0, padding: 0 },
        body: { width: '100vw', height: '100vh', margin: 0, padding: 0 },
        '#root': { width: '100vw', height: '100vh', margin: 0, padding: 0 },
        // Allow scrolling on mobile
        '@media (max-width: 899px)': {
          html: { height: 'auto', minHeight: '100vh' },
          body: { height: 'auto', minHeight: '100vh' },
          '#root': { height: 'auto', minHeight: '100vh' }
        }
      }} />
      
      {/* Splash Screen */}
      {showSplash && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: darkMode 
            ? 'linear-gradient(135deg, rgba(30, 30, 30, 1) 0%, rgba(15, 15, 15, 1) 100%)'
            : 'linear-gradient(135deg, rgba(0, 122, 255, 1) 0%, rgba(77, 166, 255, 1) 100%)',
          zIndex: 9999,
          animation: 'fadeIn 0.5s ease-in-out'
        }}>
          <style>
            {`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
              .splash-icon {
                animation: pulse 2s ease-in-out infinite;
              }
            `}
          </style>
          
          {/* Logo */}
          <Box 
            component="img"
            src={pitStopPalIcon}
            alt="PitStopPal"
            className="splash-icon"
            sx={{
              width: { xs: '120px', sm: '150px', md: '180px' },
              height: { xs: '120px', sm: '150px', md: '180px' },
              borderRadius: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              filter: 'brightness(1.1)',
              mb: 3
            }}
          />
          
          {/* App Name */}
          <Typography variant="h2" sx={{
            fontWeight: 800,
            letterSpacing: '2px',
            fontFamily: 'Courier New, Monaco, Menlo, Consolas, monospace',
            color: 'white',
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
            mb: 1,
            textAlign: 'center'
          }}>
            PitStopPal
          </Typography>
          
          {/* Tagline */}
          <Typography variant="h6" sx={{
            fontWeight: 400,
            letterSpacing: '0.5px',
            fontFamily: '"SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
            color: 'rgba(255,255,255,0.9)',
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
            fontSize: { xs: '1rem', sm: '1.2rem', md: '1.3rem' },
            fontStyle: 'italic',
            textAlign: 'center',
            maxWidth: '600px',
            px: 2
          }}>
            Your Smart Travel Companion
          </Typography>
          
          {/* Loading indicator */}
          <Box sx={{ mt: 4 }}>
            <CircularProgress 
              size={40} 
              thickness={3}
              sx={{ 
                color: 'rgba(255,255,255,0.8)',
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round'
                }
              }} 
            />
          </Box>
        </Box>
      )}
      <Box sx={{ 
        width: '100vw', 
        height: { xs: 'auto', md: '100vh' }, 
        minHeight: '100vh',
        display: 'flex', 
        flexDirection: 'column', 
        overflow: { xs: 'visible', md: 'hidden' } 
      }}>
        {/* Professional Header */}
        <Box sx={{ 
          color: 'white', 
          py: 2, 
          px: 3, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1000,
          background: darkMode 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, #007aff 0%, #0056cc 100%)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: darkMode 
            ? '0 4px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)' 
            : '0 4px 20px rgba(0,122,255,0.2), 0 2px 8px rgba(0,122,255,0.1)',
          borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`
        }}>          
          {/* Spacer for mobile */}
          <Box sx={{ width: { xs: '32px', md: '60px' } }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box 
              component="img"
              src={pitStopPalIcon}
              alt="PitStopPal"
              sx={{
                width: { xs: '32px', sm: '36px', md: '40px' },
                height: { xs: '32px', sm: '36px', md: '40px' },
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                filter: 'brightness(1.1)',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="h3" sx={{ 
                fontWeight: 900, 
                letterSpacing: '2px',
                fontFamily: 'Courier New, Monaco, Menlo, Consolas, monospace',
                color: 'white',
                textShadow: '0 3px 6px rgba(0,0,0,0.4)',
                fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.6rem' },
                lineHeight: 1.1
              }}>
                PitStopPal
              </Typography>
              <Typography variant="caption" sx={{ 
                fontWeight: 400, 
                letterSpacing: '0.3px',
                fontFamily: '"SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
                color: 'rgba(255,255,255,0.8)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
                display: { xs: 'none', sm: 'block' }
              }}>
                Your Smart Travel Companion
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {/* Logout Button */}
            <Button
              onClick={logout}
              sx={{
                minWidth: 'auto',
                width: { xs: '36px', md: '80px' },
                height: '36px',
                borderRadius: '18px',
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                },
                fontSize: '0.8rem',
                px: { xs: 0, md: 1 },
                transition: 'all 0.2s ease'
              }}
              title="Logout"
            >
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>🚪</Box>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>Logout</Box>
            </Button>

            {/* Dark Mode Toggle */}
            <Button
              onClick={() => setDarkMode(!darkMode)}
              sx={{
                minWidth: 'auto',
                width: { xs: '36px', md: '60px' },
                height: '36px',
                borderRadius: '18px',
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                },
                fontSize: '1rem',
                transition: 'all 0.2s ease'
              }}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </Button>
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, // Normal order: content first, map last
          overflow: { xs: 'visible', md: 'hidden' },
          minHeight: { xs: 'calc(100vh - 70px)', md: 'auto' } // Account for header height
        }}>
          {/* Left Panel: Search, Results, Route Details */}
          <Box sx={{ 
            width: { xs: '100%', md: '30%' }, 
            height: { xs: 'auto', md: '100%' },
            maxHeight: { xs: 'none', md: '100%' },
            p: { xs: 2, sm: 3 }, 
            display: 'flex', 
            flexDirection: 'column', 
            minWidth: 0, 
            bgcolor: darkMode ? '#111111' : '#f8f8f8', 
            overflowY: { xs: 'visible', md: 'auto' },
            borderRight: { md: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }
          }}>
            {/* Search Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ 
                mb: 2, 
                fontWeight: 700, 
                color: theme.palette.text.primary,
                pb: 1,
                borderBottom: '2px solid #007aff',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <SearchIcon sx={{ color: 'primary.main' }} />
                Search Places
              </Typography>
              <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Box sx={{ position: 'relative' }} className="autocomplete-container">
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Search for Places in natural language"
                    placeholder="e.g., Where did India win the 2011 Cricket World Cup?"
                    value={search}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearch(value);
                      // Clear previous timeout and set new one for debouncing
                      if (window.autocompleteTimeout) {
                        clearTimeout(window.autocompleteTimeout);
                      }
                      window.autocompleteTimeout = setTimeout(() => {
                        handleAutocomplete(value);
                      }, 300);
                    }}
                    onFocus={() => {
                      if (search.trim().length >= 2) {
                        handleAutocomplete(search);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    sx={textFieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: autocompleteLoading && (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  {/* Autocomplete Suggestions */}
                  {showAutocomplete && (
                    <Paper
                      elevation={8}
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        mt: 0.5,
                        maxHeight: 300,
                        overflowY: 'auto',
                        borderRadius: 2,
                        boxShadow: darkMode 
                          ? '0 12px 40px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.3)' 
                          : '0 12px 40px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1)',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                        bgcolor: theme.palette.background.paper
                      }}
                    >
                      {autocompleteSuggestions.length > 0 ? (
                        <List sx={{ p: 0 }}>
                          {autocompleteSuggestions.map((suggestion, index) => (
                            <ListItem
                              key={suggestion.place_id || index}
                              button
                              onClick={() => handleSuggestionSelect(suggestion)}
                              sx={{
                                py: 1.5,
                                px: 2,
                                borderBottom: index < autocompleteSuggestions.length - 1 
                                  ? `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` 
                                  : 'none',
                                bgcolor: index === selectedSuggestionIndex 
                                  ? darkMode ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.1)'
                                  : 'transparent',
                                '&:hover': {
                                  bgcolor: darkMode ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.05)',
                                  transition: 'all 0.2s ease'
                                },
                                '&:last-child': {
                                  borderBottom: 'none'
                                }
                              }}
                            >
                              <ListItemText
                                primary={suggestion.structured_formatting?.main_text || suggestion.description}
                                secondary={suggestion.structured_formatting?.secondary_text || ''}
                                primaryTypographyProps={{
                                  fontSize: '0.95rem',
                                  fontWeight: 500,
                                  color: theme.palette.text.primary
                                }}
                                secondaryTypographyProps={{
                                  fontSize: '0.8rem',
                                  color: theme.palette.text.secondary
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            No suggestions found
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  )}
                </Box>
                
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={loading || !search.trim()} 
                  sx={{ height: 48, fontWeight: 600, borderRadius: 12 }}
                >
                  {loading ? <CircularProgress size={20} /> : 'Search'}
                </Button>
              </form>
            </Box>

            {/* Intelligent Search Notification */}
            {intelligentSearchUsed && places.length > 0 && (
              <Paper elevation={3} sx={{ 
                p: 2, 
                mb: 2, 
                borderRadius: 2, 
                bgcolor: darkMode ? 'rgba(76,175,80,0.1)' : 'rgba(76,175,80,0.05)',
                border: `1px solid ${darkMode ? 'rgba(76,175,80,0.3)' : 'rgba(76,175,80,0.2)'}`
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SearchIcon sx={{ color: 'success.main', fontSize: '1.2rem' }} />
                  <Typography variant="body2" sx={{ 
                    color: 'success.main', 
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    🤖 AI Enhanced Search: We interpreted your query and found these relevant results
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Search Results */}
            {places.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ 
                  mb: 2, 
                  fontWeight: 700, 
                  color: theme.palette.text.primary,
                  pb: 1,
                  borderBottom: '2px solid #007aff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <DirectionsIcon sx={{ color: 'primary.main' }} />
                  Search Results
                </Typography>
                <Paper elevation={6} sx={{ 
                  borderRadius: 2, 
                  bgcolor: theme.palette.background.paper, 
                  maxHeight: 400, 
                  overflowY: 'auto',
                  boxShadow: darkMode 
                    ? '0 12px 40px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.3)' 
                    : '0 12px 40px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1)',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`
                }}>
                  <List sx={{ p: 0 }}>
                    {places.slice(0, 10).map((place, idx) => (
                      <React.Fragment key={place.place_id || idx}>
                        <ListItem 
                          onMouseEnter={() => setHoveredPlace({ title: place.name, placeId: place.place_id })}
                          onMouseLeave={() => setHoveredPlace(null)}
                          sx={{ 
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            p: { xs: 2, sm: 3 },
                            borderBottom: idx < places.length - 1 ? `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` : 'none',
                            '&:hover': {
                              bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                              transition: 'all 0.3s ease',
                              transform: 'translateY(-1px)',
                              boxShadow: darkMode 
                                ? '0 4px 12px rgba(0,0,0,0.3)' 
                                : '0 4px 12px rgba(0,0,0,0.1)'
                            }
                          }}>
                          <Box sx={{ width: '100%' }}>
                            {/* Top Row: Image and Basic Info */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                              <Box sx={{ 
                                mr: { xs: 2, sm: 3 }, 
                                width: { xs: 56, sm: 64 }, 
                                height: { xs: 56, sm: 64 },
                                borderRadius: 2,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                border: `2px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                flexShrink: 0,
                                overflow: 'hidden'
                              }}>
                                {place.photos && place.photos[0] ? (
                                  <img 
                                    src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=128&photo_reference=${place.photos[0].photo_reference}&key=${MAPS_API_KEY}`}
                                    alt={place.name}
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover',
                                      borderRadius: '6px'
                                    }}
                                  />
                                ) : (
                                  <Box sx={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                    borderRadius: '6px'
                                  }}>
                                    <SearchIcon sx={{ fontSize: '1.5rem', color: 'text.secondary' }} />
                                  </Box>
                                )}
                              </Box>
                              
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="h6" sx={{ 
                                  fontWeight: 700, 
                                  mb: 1,
                                  color: theme.palette.text.primary,
                                  fontSize: { xs: '1rem', sm: '1.1rem' },
                                  lineHeight: 1.3
                                }}>
                                  {place.name}
                                </Typography>
                                
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 2, 
                                  flexWrap: 'wrap'
                                }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Rating 
                                      value={place.rating || 0} 
                                      precision={0.1} 
                                      readOnly 
                                      size="small"
                                      sx={{ 
                                        '& .MuiRating-iconFilled': {
                                          color: '#FFD700'
                                        }
                                      }}
                                    />
                                    <Typography variant="body2" sx={{ 
                                      color: theme.palette.text.secondary,
                                      fontWeight: 500,
                                      fontSize: '0.85rem'
                                    }}>
                                      {place.rating ? `${place.rating.toFixed(1)}` : 'No rating'}
                                    </Typography>
                                  </Box>
                                  {place.user_ratings_total && (
                                    <Typography variant="body2" sx={{ 
                                      color: theme.palette.text.secondary,
                                      fontSize: '0.85rem'
                                    }}>
                                      • {place.user_ratings_total} reviews
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                            
                            {/* Summary Section - Full Width */}
                            {place.overviewReview && (
                              <Box sx={{ mb: 1.5 }}>
                                <Typography variant="caption" sx={{ 
                                  fontWeight: 700,
                                  color: 'primary.main',
                                  fontSize: '0.75rem',
                                  letterSpacing: 0.5,
                                  textTransform: 'uppercase',
                                  mb: 1,
                                  display: 'block'
                                }}>
                                  AI Highlights: What people are saying
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                  color: theme.palette.text.secondary,
                                  fontSize: '0.9rem',
                                  lineHeight: 1.4,
                                  fontStyle: 'italic',
                                  bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                  p: 1.5,
                                  borderRadius: 1,
                                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                                }}>
                                  "{place.overviewReview}"
                                </Typography>
                              </Box>
                            )}
                            
                            {/* Distance, Sentiment, and Navigate Section - Full Width */}
                            {place._ranking && (
                              <Box sx={{ 
                                display: 'flex', 
                                gap: 1, 
                                flexWrap: 'wrap',
                                alignItems: 'center'
                              }}>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 0.5,
                                  bgcolor: darkMode ? 'rgba(33,150,243,0.15)' : 'rgba(33,150,243,0.1)',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1,
                                  border: `1px solid ${darkMode ? 'rgba(33,150,243,0.3)' : 'rgba(33,150,243,0.2)'}`
                                }}>
                                  <LocationOnIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                                  <Typography variant="caption" sx={{ 
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    fontSize: '0.75rem'
                                  }}>
                                    {place._ranking.distance}km away
                                  </Typography>
                                </Box>
                                {place._ranking.sentimentScore && (
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.5,
                                    bgcolor: darkMode ? 'rgba(255,193,7,0.15)' : 'rgba(255,193,7,0.1)',
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 1,
                                    border: `1px solid ${darkMode ? 'rgba(255,193,7,0.3)' : 'rgba(255,193,7,0.2)'}`
                                  }}>
                                    <MoodIcon sx={{ fontSize: '1rem', color: 'warning.main' }} />
                                    <Typography variant="caption" sx={{ 
                                      color: 'warning.main',
                                      fontWeight: 600,
                                      fontSize: '0.75rem'
                                    }}>
                                      Sentiment: {place._ranking.sentimentScore}
                                    </Typography>
                                  </Box>
                                )}
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => handleNavigateClick(place)}
                                  startIcon={<DirectionsIcon />}
                                  sx={{
                                    minWidth: 'auto',
                                    px: 2,
                                    py: 0.5,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: 1,
                                    bgcolor: '#007AFF',
                                    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)',
                                    '&:hover': {
                                      bgcolor: '#0056CC',
                                      boxShadow: '0 4px 12px rgba(0, 122, 255, 0.4)',
                                      transform: 'translateY(-1px)'
                                    },
                                    '&:active': {
                                      transform: 'translateY(0)'
                                    },
                                    transition: 'all 0.3s ease'
                                  }}
                                >
                                  Navigate
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </ListItem>
                        {idx < places.length - 1 && (
                          <Divider sx={{ mx: 2, borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              </Box>
            )}

            {/* Starting Point Input Modal */}
            {showStartingPointInput && selectedPlace && (
              <Paper elevation={6} sx={{ 
                p: 3, 
                mb: 3, 
                borderRadius: 2, 
                bgcolor: theme.palette.background.paper,
                boxShadow: darkMode 
                  ? '0 12px 40px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.3)' 
                  : '0 12px 40px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1)',
                border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`
              }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: theme.palette.text.primary }}>
                  Navigate to {selectedPlace.name}
                </Typography>
                <Box className="starting-point-autocomplete-container" sx={{ position: 'relative', mb: 2 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Starting point (optional)"
                    placeholder="Search for a location or leave blank to use current location"
                    value={startingPoint}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStartingPoint(value);
                      // Clear previous timeout and set new one for debouncing
                      if (window.startingPointAutocompleteTimeout) {
                        clearTimeout(window.startingPointAutocompleteTimeout);
                      }
                      window.startingPointAutocompleteTimeout = setTimeout(() => {
                        handleStartingPointAutocomplete(value);
                      }, 300);
                    }}
                    onFocus={() => {
                      if (startingPoint.trim().length >= 2) {
                        handleStartingPointAutocomplete(startingPoint);
                      }
                    }}
                    onKeyDown={handleStartingPointKeyDown}
                    sx={{ ...textFieldSx }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: startingPointAutocompleteLoading && (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  {/* Starting Point Autocomplete Suggestions */}
                  {showStartingPointAutocomplete && (
                    <Paper elevation={8} sx={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      zIndex: 1000,
                      maxHeight: 200,
                      overflowY: 'auto',
                      bgcolor: theme.palette.background.paper,
                      boxShadow: darkMode 
                        ? '0 8px 32px rgba(0,0,0,0.6)' 
                        : '0 8px 32px rgba(0,0,0,0.15)',
                      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                    }}>
                      {startingPointAutocompleteSuggestions.length > 0 ? (
                        <List sx={{ p: 0 }}>
                          {startingPointAutocompleteSuggestions.map((suggestion, index) => (
                            <ListItem
                              key={suggestion.place_id}
                              button
                              onClick={() => handleStartingPointSuggestionSelect(suggestion)}
                              sx={{
                                px: 2,
                                py: 1.5,
                                borderBottom: index < startingPointAutocompleteSuggestions.length - 1 
                                  ? `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` 
                                  : 'none',
                                bgcolor: index === selectedStartingPointSuggestionIndex 
                                  ? (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)') 
                                  : 'transparent',
                                '&:hover': {
                                  bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                                }
                              }}
                            >
                              <SearchIcon sx={{ mr: 2, color: 'text.secondary', fontSize: '1.2rem' }} />
                              <ListItemText 
                                primary={suggestion.structured_formatting?.main_text || suggestion.description}
                                secondary={suggestion.structured_formatting?.secondary_text}
                                primaryTypographyProps={{
                                  sx: { 
                                    fontWeight: 600, 
                                    color: theme.palette.text.primary,
                                    fontSize: '0.9rem'
                                  }
                                }}
                                secondaryTypographyProps={{
                                  sx: { 
                                    color: theme.palette.text.secondary,
                                    fontSize: '0.8rem'
                                  }
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            No suggestions found
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  )}
                </Box>
                
                {/* HTTPS Notice for current location */}
                {!window.isSecureContext && (
                  <Typography variant="body2" sx={{ 
                    mb: 2, 
                    color: 'warning.main', 
                    fontWeight: 600,
                    p: 1.5,
                    bgcolor: darkMode ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'warning.main'
                  }}>
                    ⚠️ Current location requires HTTPS. Please specify a starting point or access via HTTPS for automatic location detection.
                  </Typography>
                )}
                
                {startingPointLocation && (
                  <Typography variant="body2" sx={{ mb: 2, color: 'success.main', fontWeight: 600 }}>
                    ✓ Starting point selected: {startingPoint}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleConfirmNavigation}
                    disabled={navigating}
                    sx={{ flex: 1 }}
                  >
                    {navigating ? <CircularProgress size={20} /> : 'Start Navigation'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowStartingPointInput(false);
                      setStartingPoint("");
                      setStartingPointLocation(null);
                    }}
                    sx={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Paper>
            )}

            {/* Route Details Accordion - HIDDEN FOR NOW */}
            {/* {routeSteps.length > 0 && (
              <Accordion 
                expanded={routeDetailsOpen} 
                onChange={() => setRouteDetailsOpen(!routeDetailsOpen)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <DirectionsIcon sx={{ color: 'primary.main' }} />
                    Route Details
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: theme.palette.background.default, borderRadius: 0, p: 0 }}>
                    {routeSteps.map((step, idx) => (
                      <React.Fragment key={idx}>
                        <ListItem sx={{ alignItems: 'flex-start', py: 2 }}>
                          <ListItemText
                            primary={<span dangerouslySetInnerHTML={{ __html: step.html_instructions }} />}
                            secondary={step.distance && step.duration ? `${step.distance.text} • ${step.duration.text}` : ''}
                          />
                        </ListItem>
                        {idx < routeSteps.length - 1 && <Divider sx={{ mx: 2 }} />}
                      </React.Fragment>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )} */}

            {/* Route Information */}
            {routeInfo && (
              <Paper elevation={6} sx={{ 
                p: 2, 
                mb: 2, 
                borderRadius: 2, 
                bgcolor: darkMode ? 'rgba(46, 125, 50, 0.1)' : '#e8f5e8',
                boxShadow: darkMode 
                  ? '0 12px 40px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.3)' 
                  : '0 12px 40px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1)',
                border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 1.5 
                }}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 700, 
                    color: darkMode ? '#4caf50' : '#2e7d32',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '1rem'
                  }}>
                    🛣️ Route Information
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      onClick={handleShareRoute}
                      size="small"
                      sx={{
                        color: darkMode ? '#4caf50' : '#2e7d32',
                        bgcolor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(46, 125, 50, 0.1)',
                        '&:hover': {
                          bgcolor: darkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(46, 125, 50, 0.2)',
                        }
                      }}
                      title="Share in Google Maps"
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={handleCopyRouteLink}
                      size="small"
                      sx={{
                        color: darkMode ? '#4caf50' : '#2e7d32',
                        bgcolor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(46, 125, 50, 0.1)',
                        '&:hover': {
                          bgcolor: darkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(46, 125, 50, 0.2)',
                        }
                      }}
                      title="Copy Google Maps Link"
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: '100px' }}>
                    <Typography variant="caption" sx={{ 
                      color: darkMode ? 'rgba(255,255,255,0.6)' : '#666', 
                      fontWeight: 500, 
                      display: 'block',
                      mb: 0.25
                    }}>
                      Distance
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      color: darkMode ? '#4caf50' : '#2e7d32', 
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      {routeInfo.distance.text}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: '100px' }}>
                    <Typography variant="caption" sx={{ 
                      color: darkMode ? 'rgba(255,255,255,0.6)' : '#666', 
                      fontWeight: 500, 
                      display: 'block',
                      mb: 0.25
                    }}>
                      Duration
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      color: darkMode ? '#4caf50' : '#2e7d32', 
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      {routeInfo.duration.text}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* Search Along Route Accordion */}
            {routeSteps.length > 0 && (
              <Accordion 
                expanded={searchAlongRouteOpen} 
                onChange={() => setSearchAlongRouteOpen(!searchAlongRouteOpen)}
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  boxShadow: darkMode 
                    ? '0 12px 40px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.3)' 
                    : '0 12px 40px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1)',
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                  '& .MuiAccordionSummary-root': {
                    borderRadius: 2,
                  },
                  '& .MuiAccordionDetails-root': {
                    borderRadius: 2,
                  }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <SearchIcon sx={{ color: 'primary.main' }} />
                    Search Along Route in natural language
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <form onSubmit={handleSearchStops} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Search for stops along your route in natural language"
                      placeholder="e.g., Find me an Indian Restaurant along the route without a detour"
                      value={stopQuery}
                      onChange={e => setStopQuery(e.target.value)}
                      sx={textFieldSx}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      helperText={navigationOrigin ? "Searching along your current route" : "Start navigation first to search along route"}
                    />
                    <Button 
                      type="submit" 
                      variant="contained" 
                      color="primary" 
                      disabled={searchingStops || !stopQuery.trim() || !encodedPolyline || !navigationOrigin} 
                      sx={{ height: 48, fontWeight: 600, borderRadius: 12 }}
                    >
                      {searchingStops ? <CircularProgress size={20} /> : 'Search Stops'}
                    </Button>
                  </form>
                  
                  {/* Clear Search Results Button */}
                  {searchMarkers.length > 0 && (
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => {
                          setSearchMarkers([]);
                          setSuggestedStops([]);
                          setSearchInfo(null);
                        }}
                        sx={{ fontSize: '0.75rem', py: 0.5 }}
                      >
                        Clear Search Results
                      </Button>
                    </Box>
                  )}

                  {/* Search Info - Detailed Logic Explanation */}
                  {searchInfo && (
                    <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 0, bgcolor: darkMode ? 'rgba(33, 150, 243, 0.1)' : '#e3f2fd' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                        🔍 Search Logic Applied
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, fontSize: '0.85rem' }}>
                        <strong>Query:</strong> "{stopQuery}"
                      </Typography>
                      {(() => {
                        const { searchType, timing, distance, location, estimatedDistanceKm } = searchInfo;
                        
                        if (searchType === 'location-based') {
                          return (
                            <>
                              <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                                <strong>Location:</strong> Near "{location}" along your route
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                💡 Using location-based search: Found "{location}" along your route and searching for {stopQuery.split('near')[0].trim()} nearby
                              </Typography>
                            </>
                          );
                        } else if (searchType === 'location-and-distance-based') {
                          return (
                            <>
                              <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                                <strong>Location:</strong> Near "{location}" at {distance}km along your route
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                💡 Using combined search: Located "{location}" along your route considering {distance}km distance constraint
                              </Typography>
                            </>
                          );
                        } else if (searchType === 'location-and-time-based') {
                          return (
                            <>
                              <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                                <strong>Location:</strong> Near "{location}" at {timing} hour{timing !== 1 ? 's' : ''} along your route
                                {estimatedDistanceKm && (
                                  <span> (~{estimatedDistanceKm}km from start)</span>
                                )}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                💡 Using combined search: Located "{location}" along your route considering {timing}-hour timing constraint
                              </Typography>
                            </>
                          );
                        } else if (searchType === 'distance-based') {
                          return (
                            <>
                              <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                                <strong>Location:</strong> {distance}km along your route
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                💡 Using distance-based search: Finding places near the {distance}km point along your route using precise distance calculation
                              </Typography>
                            </>
                          );
                        } else if (searchType === 'time-based') {
                          return (
                            <>
                              <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                                <strong>Location:</strong> {timing} hour{timing !== 1 ? 's' : ''} along your route
                                {estimatedDistanceKm && (
                                  <span> (~{estimatedDistanceKm}km from start)</span>
                                )}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                💡 Using time-based search: Finding places near the calculated point along your route based on average driving speed (70 km/h)
                              </Typography>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                                <strong>Location:</strong> Mid-point along your route
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                💡 Using route-based search: Finding places near the middle of your planned route
                              </Typography>
                            </>
                          );
                        }
                      })()}
                      {searchInfo.searchLocation && (
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, mt: 1 }}>
                          🎯 Search centered at: {searchInfo.searchLocation.lat.toFixed(4)}, {searchInfo.searchLocation.lng.toFixed(4)}
                        </Typography>
                      )}
                    </Paper>
                  )}
                  
                  {/* Suggested Stops */}
                  {suggestedStops.length > 0 && (
                    <>
                      <Typography variant="h6" sx={{ 
                        mb: 2, 
                        fontWeight: 700, 
                        color: 'primary.main',
                        pb: 1,
                        borderBottom: '2px solid #007aff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <DirectionsIcon sx={{ color: 'primary.main' }} />
                        Suggested Stops
                      </Typography>
                      <Paper elevation={6} sx={{ 
                        borderRadius: 2, 
                        bgcolor: theme.palette.background.paper, 
                        maxHeight: 400, 
                        overflowY: 'auto',
                        boxShadow: darkMode 
                          ? '0 12px 40px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.3)' 
                          : '0 12px 40px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1)',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`
                      }}>
                        <List sx={{ p: 0 }}>
                          {suggestedStops.map((stop, idx) => (
                            <React.Fragment key={stop.place_id || idx}>
                              <ListItem 
                                onMouseEnter={() => setHoveredPlace({ title: stop.name, position: stop.geometry.location })}
                                onMouseLeave={() => setHoveredPlace(null)}
                                sx={{ 
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                p: { xs: 2, sm: 3 },
                                borderBottom: idx < suggestedStops.length - 1 ? `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` : 'none',
                                '&:hover': {
                                  bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                  transition: 'all 0.3s ease',
                                  transform: 'translateY(-1px)',
                                  boxShadow: darkMode 
                                    ? '0 4px 12px rgba(0,0,0,0.3)' 
                                    : '0 4px 12px rgba(0,0,0,0.1)'
                                }
                              }}>
                                <Box sx={{ width: '100%' }}>
                                  {/* Top Row: Image and Basic Info */}
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ 
                                      mr: { xs: 2, sm: 3 }, 
                                      width: { xs: 56, sm: 64 }, 
                                      height: { xs: 56, sm: 64 },
                                      borderRadius: 2,
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                      border: `2px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                      flexShrink: 0,
                                      overflow: 'hidden'
                                    }}>
                                      {stop.photos && stop.photos[0] ? (
                                        <img 
                                          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=128&photo_reference=${stop.photos[0].photo_reference}&key=${MAPS_API_KEY}`}
                                          alt={stop.name}
                                          style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover',
                                            borderRadius: '6px'
                                          }}
                                        />
                                      ) : (
                                        <Box sx={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center',
                                          bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                          borderRadius: '6px'
                                        }}>
                                          <SearchIcon sx={{ fontSize: '1.5rem', color: 'text.secondary' }} />
                                        </Box>
                                      )}
                                    </Box>
                                    
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography variant="h6" sx={{ 
                                        fontWeight: 700, 
                                        mb: 1,
                                        color: theme.palette.text.primary,
                                        fontSize: { xs: '1rem', sm: '1.1rem' },
                                        lineHeight: 1.3
                                      }}>
                                        {stop.name}
                                      </Typography>
                                      
                                      <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 2, 
                                        flexWrap: 'wrap'
                                      }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Rating 
                                            value={stop.rating || 0} 
                                            precision={0.1} 
                                            readOnly 
                                            size="small"
                                            sx={{ 
                                              '& .MuiRating-iconFilled': {
                                                color: '#FFD700'
                                              }
                                            }}
                                          />
                                          <Typography variant="body2" sx={{ 
                                            color: theme.palette.text.secondary,
                                            fontWeight: 500,
                                            fontSize: '0.85rem'
                                          }}>
                                            {stop.rating ? `${stop.rating.toFixed(1)}` : 'No rating'}
                                          </Typography>
                                        </Box>
                                        {stop.user_ratings_total && (
                                          <Typography variant="body2" sx={{ 
                                            color: theme.palette.text.secondary,
                                            fontSize: '0.85rem'
                                          }}>
                                            • {stop.user_ratings_total} reviews
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  </Box>
                                  
                                  {/* Summary Section - Full Width */}
                                  {stop.overviewReview && (
                                    <Box sx={{ mb: 1.5 }}>
                                      <Typography variant="caption" sx={{ 
                                        fontWeight: 700,
                                        color: 'primary.main',
                                        fontSize: '0.75rem',
                                        letterSpacing: 0.5,
                                        textTransform: 'uppercase',
                                        mb: 1,
                                        display: 'block'
                                      }}>
                                        AI Highlights: What people are saying
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        color: theme.palette.text.secondary,
                                        fontSize: '0.9rem',
                                        lineHeight: 1.4,
                                        fontStyle: 'italic',
                                        bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                        p: 1.5,
                                        borderRadius: 1,
                                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                                      }}>
                                        "{stop.overviewReview}"
                                      </Typography>
                                    </Box>
                                  )}
                                  
                                  {/* Distance, Time, Sentiment, and Add Button Section - Full Width */}
                                  <Box sx={{ 
                                    display: 'flex', 
                                    gap: 1, 
                                    flexWrap: 'wrap',
                                    alignItems: 'center'
                                  }}>
                                    {/* Distance from Start */}
                                    <Box sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 0.5,
                                      bgcolor: darkMode ? 'rgba(33,150,243,0.15)' : 'rgba(33,150,243,0.1)',
                                      px: 1.5,
                                      py: 0.5,
                                      borderRadius: 1,
                                      border: `1px solid ${darkMode ? 'rgba(33,150,243,0.3)' : 'rgba(33,150,243,0.2)'}`
                                    }}>
                                      <LocationOnIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                                      <Typography variant="caption" sx={{ 
                                        color: 'primary.main',
                                        fontWeight: 600,
                                        fontSize: '0.75rem'
                                      }}>
                                        {stop.distanceFromStart ? `${stop.distanceFromStart.toFixed(0)}km` : 'Calculating...'}
                                      </Typography>
                                    </Box>
                                    
                                    {/* Time from Start */}
                                    {stop.timeFromStart && (
                                      <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 0.5,
                                        bgcolor: darkMode ? 'rgba(156,39,176,0.15)' : 'rgba(156,39,176,0.1)',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1,
                                        border: `1px solid ${darkMode ? 'rgba(156,39,176,0.3)' : 'rgba(156,39,176,0.2)'}`
                                      }}>
                                        <Typography variant="caption" sx={{ 
                                          color: darkMode ? '#ab47bc' : '#7b1fa2',
                                          fontWeight: 600,
                                          fontSize: '0.75rem'
                                        }}>
                                          🕒 {stop.timeFromStart}
                                        </Typography>
                                      </Box>
                                    )}
                                    
                                    {/* Sentiment */}
                                    {stop.sentimentScore !== undefined && (
                                      <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 0.5,
                                        bgcolor: darkMode ? 'rgba(255,193,7,0.15)' : 'rgba(255,193,7,0.1)',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1,
                                        border: `1px solid ${darkMode ? 'rgba(255,193,7,0.3)' : 'rgba(255,193,7,0.2)'}`
                                      }}>
                                        <MoodIcon sx={{ fontSize: '1rem', color: 'warning.main' }} />
                                        <Typography variant="caption" sx={{ 
                                          color: 'warning.main',
                                          fontWeight: 600,
                                          fontSize: '0.75rem'
                                        }}>
                                          {stop.sentimentScore || 50}
                                        </Typography>
                                      </Box>
                                    )}
                                    <Button
                                      variant="contained"
                                      size="small"
                                      onClick={() => handleAddStopToRoute(stop)}
                                      disabled={addingStopToRoute}
                                      startIcon={addingStopToRoute ? <CircularProgress size={16} /> : <DirectionsIcon />}
                                      sx={{
                                        minWidth: 'auto',
                                        px: 2,
                                        py: 0.5,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: 1,
                                        bgcolor: '#007AFF',
                                        boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)',
                                        '&:hover': {
                                          bgcolor: '#0056CC',
                                          boxShadow: '0 4px 12px rgba(0, 122, 255, 0.4)',
                                          transform: 'translateY(-1px)'
                                        },
                                        '&:active': {
                                          transform: 'translateY(0)'
                                        },
                                        transition: 'all 0.3s ease'
                                      }}
                                    >
                                      {addingStopToRoute ? 'Adding...' : 'Add'}
                                    </Button>
                                  </Box>
                                </Box>
                              </ListItem>
                              {idx < suggestedStops.length - 1 && (
                                <Divider sx={{ mx: 2, borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                              )}
                            </React.Fragment>
                          ))}
                        </List>
                      </Paper>
                    </>
                  )}
                  
                  {/* Added Stops */}
                  {addedStops.length > 0 && (
                    <Paper elevation={6} sx={{ 
                      mt: 2,
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                      boxShadow: darkMode 
                        ? '0 12px 40px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.3)' 
                        : '0 12px 40px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1)',
                      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`
                    }}>
                      <Box sx={{ 
                        p: { xs: 2, sm: 3 }, 
                        bgcolor: darkMode ? 'rgba(255,149,0,0.1)' : 'rgba(255,149,0,0.05)',
                        borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                      }}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          color: '#FF9500',
                          fontSize: { xs: '1rem', sm: '1.1rem' }
                        }}>
                          Added Stops
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        maxHeight: 400, 
                        overflowY: 'auto',
                        boxShadow: darkMode 
                          ? '0 12px 40px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.3)' 
                          : '0 12px 40px rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.1)',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`
                      }}>
                        <List sx={{ p: 0 }}>
                          {addedStops.map((stop, index) => (
                            <React.Fragment key={stop.place_id || index}>
                              <ListItem 
                                onMouseEnter={() => setHoveredPlace({ title: stop.name, position: stop.geometry.location })}
                                onMouseLeave={() => setHoveredPlace(null)}
                                sx={{ 
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                p: { xs: 2, sm: 3 },
                                borderBottom: index < addedStops.length - 1 ? `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` : 'none',
                                '&:hover': {
                                  bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                  transition: 'all 0.3s ease',
                                  transform: 'translateY(-1px)',
                                  boxShadow: darkMode 
                                    ? '0 4px 12px rgba(0,0,0,0.3)' 
                                    : '0 4px 12px rgba(0,0,0,0.1)'
                                }
                              }}>
                                <Box sx={{ width: '100%' }}>
                                  {/* Top Row: Image and Basic Info */}
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ 
                                      mr: { xs: 2, sm: 3 }, 
                                      width: { xs: 56, sm: 64 }, 
                                      height: { xs: 56, sm: 64 },
                                      borderRadius: 2,
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                      border: `2px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                      flexShrink: 0,
                                      overflow: 'hidden'
                                    }}>
                                      {stop.photos && stop.photos[0] ? (
                                        <img 
                                          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=128&photo_reference=${stop.photos[0].photo_reference}&key=${MAPS_API_KEY}`}
                                          alt={stop.name}
                                          style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover',
                                            borderRadius: '6px'
                                          }}
                                        />
                                      ) : (
                                        <Box sx={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center',
                                          bgcolor: '#FF9500',
                                          borderRadius: '6px'
                                        }}>
                                          <Typography sx={{ 
                                            color: '#fff', 
                                            fontWeight: 'bold',
                                            fontSize: '1.2rem'
                                          }}>
                                            {index + 1}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                    
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography variant="h6" sx={{ 
                                        fontWeight: 700, 
                                        mb: 1,
                                        color: theme.palette.text.primary,
                                        fontSize: { xs: '1rem', sm: '1.1rem' },
                                        lineHeight: 1.3
                                      }}>
                                        {stop.name}
                                      </Typography>
                                      
                                      <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 2, 
                                        flexWrap: 'wrap'
                                      }}>
                                        {stop.rating && (
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Rating 
                                              value={stop.rating || 0} 
                                              precision={0.1} 
                                              readOnly 
                                              size="small"
                                              sx={{ 
                                                '& .MuiRating-iconFilled': {
                                                  color: '#FFD700'
                                                }
                                              }}
                                            />
                                            <Typography variant="body2" sx={{ 
                                              color: theme.palette.text.secondary,
                                              fontWeight: 500,
                                              fontSize: '0.85rem'
                                            }}>
                                              {stop.rating ? `${stop.rating.toFixed(1)}` : 'No rating'}
                                            </Typography>
                                          </Box>
                                        )}
                                        {stop.user_ratings_total && (
                                          <Typography variant="body2" sx={{ 
                                            color: theme.palette.text.secondary,
                                            fontSize: '0.85rem'
                                          }}>
                                            • {stop.user_ratings_total} reviews
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  </Box>
                                  
                                  {/* AI Review Summary Section - Full Width */}
                                  {stop.overviewReview && (
                                    <Box sx={{ mb: 1.5 }}>
                                      <Typography variant="caption" sx={{ 
                                        fontWeight: 700,
                                        color: 'primary.main',
                                        fontSize: '0.75rem',
                                        letterSpacing: 0.5,
                                        textTransform: 'uppercase',
                                        mb: 1,
                                        display: 'block'
                                      }}>
                                        AI Highlights: What people are saying
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        color: theme.palette.text.secondary,
                                        fontSize: '0.9rem',
                                        lineHeight: 1.4,
                                        fontStyle: 'italic',
                                        bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                        p: 1.5,
                                        borderRadius: 1,
                                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                                      }}>
                                        "{stop.overviewReview}"
                                      </Typography>
                                    </Box>
                                  )}
                                  
                                  {/* Distance, Time, Sentiment, and Action Button Section - Full Width */}
                                  <Box sx={{ 
                                    display: 'flex', 
                                    gap: 1, 
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                      {/* Distance from Start */}
                                      <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 0.5,
                                        bgcolor: darkMode ? 'rgba(33,150,243,0.15)' : 'rgba(33,150,243,0.1)',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1,
                                        border: `1px solid ${darkMode ? 'rgba(33,150,243,0.3)' : 'rgba(33,150,243,0.2)'}`
                                      }}>
                                        <LocationOnIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                                        <Typography variant="caption" sx={{ 
                                          color: 'primary.main',
                                          fontWeight: 600,
                                          fontSize: '0.75rem'
                                        }}>
                                          {stop.distanceFromStart ? `${stop.distanceFromStart.toFixed(0)}km` : 'Calculating...'}
                                        </Typography>
                                      </Box>
                                      
                                      {/* Time from Start */}
                                      {stop.timeFromStart && (
                                        <Box sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: 0.5,
                                          bgcolor: darkMode ? 'rgba(156,39,176,0.15)' : 'rgba(156,39,176,0.1)',
                                          px: 1.5,
                                          py: 0.5,
                                          borderRadius: 1,
                                          border: `1px solid ${darkMode ? 'rgba(156,39,176,0.3)' : 'rgba(156,39,176,0.2)'}`
                                        }}>
                                          <Typography variant="caption" sx={{ 
                                            color: darkMode ? '#ab47bc' : '#7b1fa2',
                                            fontWeight: 600,
                                            fontSize: '0.75rem'
                                          }}>
                                            🕒 {stop.timeFromStart}
                                          </Typography>
                                        </Box>
                                      )}
                                      
                                      {/* Sentiment */}
                                      {stop.sentimentScore !== undefined && (
                                        <Box sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: 0.5,
                                          bgcolor: darkMode ? 'rgba(255,193,7,0.15)' : 'rgba(255,193,7,0.1)',
                                          px: 1.5,
                                          py: 0.5,
                                          borderRadius: 1,
                                          border: `1px solid ${darkMode ? 'rgba(255,193,7,0.3)' : 'rgba(255,193,7,0.2)'}`
                                        }}>
                                          <MoodIcon sx={{ fontSize: '1rem', color: 'warning.main' }} />
                                          <Typography variant="caption" sx={{ 
                                            color: 'warning.main',
                                            fontWeight: 600,
                                            fontSize: '0.75rem'
                                          }}>
                                            {stop.sentimentScore || 50}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                    
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleRemoveStop(stop)}
                                      sx={{
                                        borderRadius: 1,
                                        px: 2,
                                        py: 0.5,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#FF3B30',
                                        borderColor: '#FF3B30',
                                        '&:hover': {
                                          borderColor: '#D70015',
                                          bgcolor: '#FF3B30',
                                          color: '#fff',
                                          transform: 'translateY(-1px)'
                                        },
                                        '&:active': {
                                          transform: 'translateY(0)'
                                        },
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      Remove Stop
                                    </Button>
                                  </Box>
                                </Box>
                              </ListItem>
                            </React.Fragment>
                          ))}
                        </List>
                      </Box>
                    </Paper>
                  )}
                </AccordionDetails>
              </Accordion>
            )}

            {/* Error Display */}
            {error && (
              <Paper elevation={1} sx={{ p: 2, borderRadius: 0, bgcolor: darkMode ? 'rgba(244, 67, 54, 0.1)' : '#FFE5E5', border: '1px solid #FF3B30' }}>
                <Typography variant="body2" color="error">{error}</Typography>
              </Paper>
            )}
          </Box>

          {/* Right Panel: Map */}
          <Box sx={{ 
            flex: 1, 
            minWidth: 0, 
            height: { xs: '60vh', md: '100%' }, 
            width: { xs: '100%', md: '70%' }, 
            p: { xs: 0, md: 0 }, 
            m: 0, 
            bgcolor: darkMode ? '#000000' : '#f8f8f8'
          }}>
            <Paper elevation={12} sx={{ 
              height: '100%', 
              borderRadius: 0, 
              overflow: 'hidden', 
              boxShadow: { 
                xs: 'none',
                md: darkMode 
                  ? '0 24px 64px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)'
                  : '0 24px 64px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08)'
              }, 
              m: 0, 
              p: 0, 
              position: 'relative',
              border: { xs: 'none', md: darkMode ? '1px solid rgba(255,255,255,0.1)' : 'none' }
            }}>
              {/* Reset to current location button */}
              <Button
                variant="contained"
                size="small"
                onClick={handleResetToCurrentLocation}
                startIcon={<MyLocationIcon />}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 1000,
                  bgcolor: theme.palette.background.paper,
                  color: 'primary.main',
                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.1)',
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : '#f8f8f8',
                  },
                }}
              >
                My Location
              </Button>
              {isLoaded ? (
                <>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%', borderRadius: 0 }}
                  center={mapCenter}
                  zoom={13}
                  onLoad={map => {
                    mapRef.current = map;
                  }}
                >
                  {/* Traffic Layer */}
                  <TrafficLayer />

                  {/* Origin Marker (Start Point) */}
                  {routePolyline && navigationOrigin && 
                   ((typeof navigationOrigin === 'object' && 
                     typeof navigationOrigin.lat === 'number' && 
                     typeof navigationOrigin.lng === 'number') || 
                    typeof navigationOrigin === 'string') && (
                    <Marker
                      position={typeof navigationOrigin === 'object' 
                        ? { lat: parseFloat(navigationOrigin.lat), lng: parseFloat(navigationOrigin.lng) }
                        : navigationOrigin
                      }
                      title="Starting Point"
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/ltblue-dot.png',
                        scaledSize: { width: 48, height: 48 }
                      }}
                      label={{
                        text: "START",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        className: "marker-label"
                      }}
                    />
                  )}

                  {/* Destination Marker */}
                  {routePolyline && selectedPlace && selectedPlace.geometry?.location && 
                   typeof selectedPlace.geometry.location.lat === 'number' &&
                   typeof selectedPlace.geometry.location.lng === 'number' && (
                    <Marker
                      position={{ 
                        lat: parseFloat(selectedPlace.geometry.location.lat), 
                        lng: parseFloat(selectedPlace.geometry.location.lng) 
                      }}
                      title={selectedPlace.name}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        scaledSize: { width: 40, height: 40 }
                      }}
                      label={{
                        text: "END",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        className: "marker-label"
                      }}
                    />
                  )}

                  {/* Search Result Markers */}
                  {searchMarkers
                    .filter(marker => 
                      marker.position && 
                      typeof marker.position.lat === 'number' &&
                      typeof marker.position.lng === 'number'
                    )
                    .map((marker) => {
                    const isHovered = hoveredPlace && hoveredPlace.title === marker.title;
                    return (
                      <Marker
                        key={marker.id}
                        position={{
                          lat: parseFloat(marker.position.lat),
                          lng: parseFloat(marker.position.lng)
                        }}
                        title={marker.title}
                        icon={{
                          url: marker.type === 'search-result' 
                            ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                            : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          scaledSize: isHovered ? { width: 48, height: 48 } : { width: 32, height: 32 }
                        }}
                        label={{
                          text: marker.type === 'search-result' ? "S" : "?",
                          color: "#ffffff",
                          fontSize: isHovered ? "16px" : "14px",
                          fontWeight: "bold",
                          className: "marker-label"
                        }}
                        onMouseOver={() => setHoveredPlace(marker)}
                        onMouseOut={() => setHoveredPlace(null)}
                        animation={isHovered ? window.google?.maps?.Animation?.BOUNCE : null}
                      />
                    );
                  })}

                  {/* Added Stops Markers */}
                  {addedStops
                    .filter(stop => 
                      stop.geometry?.location?.lat && 
                      stop.geometry?.location?.lng &&
                      typeof stop.geometry.location.lat === 'number' &&
                      typeof stop.geometry.location.lng === 'number'
                    )
                    .map((stop, index) => {
                      const isHovered = hoveredPlace && hoveredPlace.title === stop.name;
                      return (
                        <Marker
                          key={stop.place_id || index}
                          position={{ 
                            lat: parseFloat(stop.geometry.location.lat), 
                            lng: parseFloat(stop.geometry.location.lng) 
                          }}
                          title={`Stop ${index + 1}: ${stop.name}`}
                          icon={{
                            url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
                            scaledSize: isHovered ? { width: 48, height: 48 } : { width: 36, height: 36 }
                          }}
                          label={{
                            text: `STOP ${index + 1}`,
                            color: "#000000",
                            fontSize: isHovered ? "12px" : "10px",
                            fontWeight: "bold",
                            className: "marker-label"
                          }}
                          animation={isHovered ? window.google?.maps?.Animation?.BOUNCE : null}
                        />
                      );
                    })}

                  {routePolyline && (
                    <Polyline
                      key={routeKey}
                      path={routePolyline}
                      options={{ 
                        strokeColor: '#007AFF', 
                        strokeWeight: 8, 
                        strokeOpacity: 0.9,
                        zIndex: 1000
                      }}
                    />
                  )}
                  
                  {/* Route Recalculation Indicator */}
                  {recalculatingRoute && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: 2,
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    >
                      <CircularProgress size={20} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Updating route...
                      </Typography>
                    </Box>
                  )}
                </GoogleMap>
                
                {/* Hover Tooltip for Places */}
                {hoveredPlace && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1001,
                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                      color: 'white',
                      borderRadius: 2,
                      p: 1.5,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  >
                    {hoveredPlace.title}
                  </Box>
                )}
                </>
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h6" color="primary" sx={{ opacity: 0.7 }}>
                    Loading map...
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </Box>
      
      {/* Share Snackbar */}
      <Snackbar
        open={shareSnackbarOpen}
        autoHideDuration={4000}
        onClose={() => setShareSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShareSnackbarOpen(false)} 
          severity={shareSnackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {shareSnackbarMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

// App wrapper with authentication
function App() {
  console.log('🎯 Main App component loaded!');
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}

// Component that handles auth state
function AppWithAuth() {
  const { isAuthenticated, login, loading } = useAuth();
  const [darkMode, setDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  if (loading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: darkMode ? '#121212' : '#f5f5f5'
      }}>
        <Typography variant="h6">Loading...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} darkMode={darkMode} />;
  }

  return <AuthenticatedApp />;
}

export default App;
