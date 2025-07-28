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
  ContentCopy as ContentCopyIcon
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
    },
    secondary: {
      main: darkMode ? '#8e8e93' : '#e5e5ea', // Apple gray
    },
    background: {
      default: darkMode ? '#000000' : '#f8f8f8',
      paper: darkMode ? '#1c1c1e' : '#fff',
    },
    text: {
      primary: darkMode ? '#ffffff' : '#111',
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



  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPlaces([]);
    try {
      const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/search`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({ query: search })
      });
      
      const handledResp = await handleApiResponse(resp);
      if (!handledResp) return; // Authentication failed, user logged out
      
      const data = await handledResp.json();
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
        // Use selected starting point location
        origin = startingPointLocation;
      } else if (startingPoint.trim()) {
        // Use provided starting point as string
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
      setNavigationOrigin(origin);
      
      // Get directions
              const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/directions`, {
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
      try {
        const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/recalculate-route`, {
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
          bounds.extend(navigationOrigin);
          bounds.extend(selectedPlace.geometry.location);
          newPolyline.forEach(point => bounds.extend(point));
          // Add remaining stops to bounds
          updatedStops.forEach(stopItem => {
            bounds.extend(stopItem.geometry.location);
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
    if (navigator.geolocation && window.isSecureContext) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          setMapCenter(newLocation);
          setError(""); // Clear any previous errors
        },
        (error) => {
          console.error('Error getting location:', error);
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
      const searchOrigin = navigationOrigin || currentLocation;
      
      const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/add-stop`, {
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
      const markers = (data.suggestedStops || []).map((stop, index) => ({
        id: stop.place_id || `stop-${index}`,
        position: {
          lat: stop.geometry.location.lat,
          lng: stop.geometry.location.lng
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
    if (!selectedPlace || !navigationOrigin) return;
    
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
      const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/add-stop-to-route`, {
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
        bounds.extend(navigationOrigin);
        bounds.extend(selectedPlace.geometry.location);
        newPolyline.forEach(point => bounds.extend(point));
        // Add all added stops to bounds
        [...addedStops, stop].forEach(stopItem => {
          bounds.extend(stopItem.geometry.location);
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
      borderRadius: 0,
      backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#f4f4f7',
      fontSize: '1rem',
      minHeight: '56px',
      '& fieldset': {
        borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      },
      '&:hover fieldset': {
        borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#007aff',
        borderWidth: '2px',
      },
    },
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
            : 'linear-gradient(135deg, rgba(255, 87, 34, 1) 0%, rgba(255, 152, 0, 1) 100%)',
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
            letterSpacing: '-2px',
            fontFamily: '"SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
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
            Your cheeky co-pilot for pee, petrol, and pakoras
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
        {/* Slim Header with Icon-inspired Background */}
        <Box sx={{ 
          color: 'white', 
          py: 1, 
          px: 3, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1000,
          background: darkMode 
            ? 'rgba(30, 30, 30, 1)'
            : 'rgba(255, 87, 34, 1)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>          
          {/* Spacer for mobile */}
          <Box sx={{ width: { xs: '32px', md: '60px' } }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box 
              component="img"
              src={pitStopPalIcon}
              alt="PitStopPal"
              sx={{
                width: { xs: '28px', sm: '32px', md: '36px' },
                height: { xs: '28px', sm: '32px', md: '36px' },
                borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                filter: 'brightness(1.05)'
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 800, 
                letterSpacing: '-1px',
                fontFamily: '"SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
                color: 'white',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem' }
              }}>
                PitStopPal
              </Typography>
              <Typography variant="caption" sx={{ 
                fontWeight: 400, 
                letterSpacing: '0.3px',
                fontFamily: '"SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
                color: 'rgba(255,255,255,0.85)',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                fontStyle: 'italic',
                display: { xs: 'none', sm: 'block' }
              }}>
                Your cheeky co-pilot for pee, petrol, and pakoras
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Logout Button */}
            <Button
              onClick={logout}
              sx={{
                minWidth: 'auto',
                width: { xs: '32px', md: '70px' },
                height: '32px',
                borderRadius: '16px',
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.25)',
                },
                fontSize: '0.8rem',
                px: { xs: 0, md: 1 }
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
                width: { xs: '32px', md: '60px' },
                height: '32px',
                borderRadius: '16px',
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.25)',
                },
                fontSize: '1rem'
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
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Search for places"
                  placeholder="e.g., Find a Coffee shop in Singapore near the Marina Bay Sands"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={textFieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
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
                <Paper elevation={1} sx={{ borderRadius: 0, bgcolor: theme.palette.background.paper, maxHeight: 300, overflowY: 'auto' }}>
                  <List sx={{ p: 0 }}>
                    {places.slice(0, 10).map((place, idx) => (
                      <React.Fragment key={place.place_id || idx}>
                        <ListItem sx={{ alignItems: 'flex-start' }}>
                          <Avatar sx={{ mr: 2, width: 48, height: 48 }}>
                            {place.photos && place.photos[0] ? (
                              <img 
                                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=48&photo_reference=${place.photos[0].photo_reference}&key=${MAPS_API_KEY}`}
                                alt={place.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <SearchIcon />
                            )}
                          </Avatar>
                          <ListItemText
                            primary={place.name}
                            secondary={<>
                              {place.formatted_address}<br/>
                              <Rating value={place.rating || 0} precision={0.1} readOnly size="small" />
                              {place.user_ratings_total ? ` (${place.user_ratings_total} ratings)` : ''}
                            </>}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleNavigateClick(place)}
                            startIcon={<DirectionsIcon />}
                            sx={{
                              ml: 1,
                              minWidth: 'auto',
                              px: 2,
                              py: 0.5,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              borderRadius: 2,
                              bgcolor: '#007AFF',
                              '&:hover': {
                                bgcolor: '#0056CC',
                              }
                            }}
                          >
                            Navigate
                          </Button>
                        </ListItem>
                        {idx < places.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              </Box>
            )}

            {/* Starting Point Input Modal */}
            {showStartingPointInput && selectedPlace && (
              <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 0, bgcolor: theme.palette.background.paper }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: theme.palette.text.primary }}>
                  Navigate to {selectedPlace.name}
                </Typography>
                {isLoaded && (
                  <Autocomplete
                    onLoad={autocomplete => setAutocomplete(autocomplete)}
                    onPlaceChanged={() => {
                      if (autocomplete) {
                        const place = autocomplete.getPlace();
                        if (place.geometry) {
                          setStartingPointLocation({
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                          });
                          setStartingPoint(place.formatted_address);
                        }
                      }
                    }}
                  >
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Starting point (optional)"
                      placeholder="Search for a location or leave blank to use current location"
                      value={startingPoint}
                      onChange={e => setStartingPoint(e.target.value)}
                      sx={{ ...textFieldSx, mb: 2 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Autocomplete>
                )}
                
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
                  <Button
                    variant="contained"
                    onClick={handleConfirmNavigation}
                    disabled={navigating}
                    sx={{ flex: 1 }}
                  >
                    {navigating ? <CircularProgress size={20} /> : 'Start Navigation'}
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
              <Paper elevation={4} sx={{ 
                p: 2, 
                mb: 2, 
                borderRadius: 0, 
                bgcolor: darkMode ? 'rgba(46, 125, 50, 0.1)' : '#e8f5e8',
                boxShadow: darkMode 
                  ? '0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)'
                  : '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                border: darkMode ? '1px solid rgba(46, 125, 50, 0.2)' : 'none'
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
                    <SearchIcon sx={{ color: 'primary.main' }} />
                    Search Along Route
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <form onSubmit={handleSearchStops} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Search for stops along your route"
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
                      variant="outlined" 
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
                                <strong>📍 Location:</strong> Near "{location}" along your route
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
                                <strong>📍 Location:</strong> Near "{location}" at {distance}km along your route
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
                                <strong>📍 Location:</strong> Near "{location}" at {timing} hour{timing !== 1 ? 's' : ''} along your route
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
                                <strong>📍 Location:</strong> {distance}km along your route
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
                                <strong>📍 Location:</strong> {timing} hour{timing !== 1 ? 's' : ''} along your route
                                {estimatedDistanceKm && (
                                  <span> (~{estimatedDistanceKm}km from start)</span>
                                )}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                                💡 Using time-based search: Finding places near the calculated point along your route based on average driving speed (50 km/h)
                              </Typography>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
                                <strong>📍 Location:</strong> Mid-point along your route
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
                    <Paper elevation={4} sx={{ 
                      p: 0, 
                      borderRadius: 0, 
                      bgcolor: 'background.paper',
                      boxShadow: darkMode 
                        ? '0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)'
                        : '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                      overflow: 'hidden'
                    }}>
                      <Box sx={{ p: 2, borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, bgcolor: darkMode ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.05)' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          🎯 Suggested Stops
                        </Typography>
                      </Box>
                      <List sx={{ maxHeight: 300, overflowY: 'auto', p: 0 }}>
                        {suggestedStops.map((stop, idx) => (
                          <Box key={stop.place_id || idx}>
                            <ListItem sx={{ 
                              alignItems: 'flex-start', 
                              p: 2,
                              '&:hover': {
                                bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                              }
                            }}>
                              {/* Place Photo */}
                              <Avatar
                                sx={{ 
                                  mr: 2, 
                                  width: 56, 
                                  height: 56, 
                                  borderRadius: 2,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}
                              >
                                {stop.photos && stop.photos[0] ? (
                                  <img 
                                    src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=112&photo_reference=${stop.photos[0].photo_reference}&key=${MAPS_API_KEY}`}
                                    alt={stop.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                                  />
                                ) : (
                                  <SearchIcon sx={{ color: 'text.secondary' }} />
                                )}
                              </Avatar>
                              
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
                                    {stop.name}
                                  </Typography>
                                }
                                secondary={
                                  <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                                      {stop.formatted_address}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                      <Rating value={stop.rating || 0} precision={0.1} readOnly size="small" />
                                      {stop.user_ratings_total && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                          ({stop.user_ratings_total})
                                        </Typography>
                                      )}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
                                      <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 0.5,
                                        bgcolor: darkMode ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.08)',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 0,
                                        border: `1px solid ${darkMode ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.2)'}`
                                      }}>
                                        <Typography variant="caption" sx={{ 
                                          color: 'primary.main', 
                                          fontWeight: 600,
                                          fontSize: '0.75rem'
                                        }}>
                                          📍 {stop.distanceFromRoute ? `${stop.distanceFromRoute.toFixed(1)}km from route` : 'Near route'}
                                        </Typography>
                                      </Box>
                                      {stop.distanceFromOrigin && (
                                        <Box sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: 0.5,
                                          bgcolor: darkMode ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.08)',
                                          px: 1.5,
                                          py: 0.5,
                                          borderRadius: 0,
                                          border: `1px solid ${darkMode ? 'rgba(76,175,80,0.3)' : 'rgba(76,175,80,0.2)'}`
                                        }}>
                                          <Typography variant="caption" sx={{ 
                                            color: 'success.main',
                                            fontWeight: 600,
                                            fontSize: '0.75rem'
                                          }}>
                                            🕒 {stop.timeDisplayFromOrigin || `${Math.round(stop.distanceFromOrigin / 50 * 60)}m`} from start
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                }
                              />
                              
                              <Button
                                variant="contained"
                                size="medium"
                                onClick={() => handleAddStopToRoute(stop)}
                                disabled={addingStopToRoute}
                                startIcon={addingStopToRoute ? <CircularProgress size={16} /> : <DirectionsIcon />}
                                sx={{
                                  ml: 1,
                                  minWidth: 'auto',
                                  px: 2,
                                  py: 1,
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  borderRadius: 3,
                                  bgcolor: '#007AFF',
                                  boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                                  '&:hover': {
                                    bgcolor: '#0056CC',
                                    boxShadow: '0 6px 16px rgba(0, 122, 255, 0.4)',
                                    transform: 'translateY(-1px)'
                                  },
                                  '&:active': {
                                    transform: 'translateY(0)'
                                  },
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {addingStopToRoute ? 'Adding...' : 'Add'}
                              </Button>
                            </ListItem>
                            {idx < suggestedStops.length - 1 && (
                              <Divider sx={{ mx: 2, borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                            )}
                          </Box>
                        ))}
                      </List>
                    </Paper>
                  )}
                  
                  {/* Added Stops */}
                  {addedStops.length > 0 && (
                    <Paper elevation={4} sx={{ 
                      p: 0, 
                      borderRadius: 0, 
                      bgcolor: 'background.paper',
                      boxShadow: darkMode 
                        ? '0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)'
                        : '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                      overflow: 'hidden',
                      mt: 2
                    }}>
                      <Box sx={{ p: 2, borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, bgcolor: darkMode ? 'rgba(255,149,0,0.1)' : 'rgba(255,149,0,0.05)' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#FF9500' }}>
                          🛑 Added Stops
                        </Typography>
                      </Box>
                      <List sx={{ maxHeight: 300, overflowY: 'auto', p: 0 }}>
                        {addedStops.map((stop, index) => (
                          <Box key={stop.place_id || index}>
                            <ListItem sx={{ 
                              alignItems: 'flex-start', 
                              p: 2,
                              '&:hover': {
                                bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                              }
                            }}>
                              <Avatar
                                sx={{ 
                                  mr: 2, 
                                  width: 48, 
                                  height: 48, 
                                  borderRadius: 2,
                                  bgcolor: '#FF9500',
                                  fontWeight: 'bold',
                                  fontSize: '1rem'
                                }}
                              >
                                {index + 1}
                              </Avatar>
                              
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
                                    {stop.name}
                                  </Typography>
                                }
                                secondary={
                                  <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                                      {stop.formatted_address}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                      <Rating value={stop.rating || 0} precision={0.1} readOnly size="small" />
                                      {stop.user_ratings_total && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                          ({stop.user_ratings_total})
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                }
                              />
                              
                              <Button
                                variant="outlined"
                                size="medium"
                                onClick={() => handleRemoveStop(stop)}
                                sx={{
                                  ml: 1,
                                  minWidth: 'auto',
                                  px: 2,
                                  py: 1,
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  borderRadius: 3,
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
                                Remove
                              </Button>
                            </ListItem>
                            {index < addedStops.length - 1 && (
                              <Divider sx={{ mx: 2, borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                            )}
                          </Box>
                        ))}
                      </List>
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
                  {routePolyline && navigationOrigin && (
                    <Marker
                      position={navigationOrigin}
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
                  {routePolyline && selectedPlace && selectedPlace.geometry?.location && (
                    <Marker
                      position={{ lat: selectedPlace.geometry.location.lat, lng: selectedPlace.geometry.location.lng }}
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
                  {searchMarkers.map((marker) => (
                    <Marker
                      key={marker.id}
                      position={marker.position}
                      title={marker.title}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
                        scaledSize: { width: 32, height: 32 }
                      }}
                      label={{
                        text: "?",
                        color: "#ffffff",
                        fontSize: "14px",
                        fontWeight: "bold",
                        className: "marker-label"
                      }}
                    />
                  ))}

                  {/* Added Stops Markers */}
                  {addedStops.map((stop, index) => (
                    <Marker
                      key={stop.place_id || index}
                      position={{ lat: stop.geometry.location.lat, lng: stop.geometry.location.lng }}
                      title={`Stop ${index + 1}: ${stop.name}`}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
                        scaledSize: { width: 36, height: 36 }
                      }}
                      label={{
                        text: `STOP ${index + 1}`,
                        color: "#000000",
                        fontSize: "10px",
                        fontWeight: "bold",
                        className: "marker-label"
                      }}
                    />
                  ))}

                  {routePolyline && (
                    <Polyline
                      key={routeKey}
                      path={routePolyline}
                      options={{ strokeColor: '#6750A4', strokeWeight: 5, strokeOpacity: 0.8 }}
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
