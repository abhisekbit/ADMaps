import React, { useState } from 'react';
import {
  Box, Paper, TextField, Button, Typography, Alert,
  IconButton, InputAdornment, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, Map } from '@mui/icons-material';
import pitStopPalIcon from '../assets/image.png';

const Login = ({ onLogin, darkMode }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001';
      const response = await fetch(`${backendUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('loginTime', Date.now().toString());
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (e) => {
    setCredentials(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError(''); // Clear error when user types
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100vw',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: darkMode ? '#121212' : '#f5f5f5',
      p: { xs: 2, sm: 3, md: 4 },
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <Paper elevation={8} sx={{ 
        p: { xs: 3, sm: 4, md: 5 }, 
        width: '100%', 
        maxWidth: { xs: 350, sm: 400, md: 450 },
        bgcolor: darkMode ? '#1e1e1e' : '#fff',
        borderRadius: 3,
        position: 'relative',
        mx: 'auto'
      }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {/* PitStopPal Logo */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mb: 3
            }}>
              <Box 
                component="img"
                src={pitStopPalIcon}
                alt="PitStopPal"
                sx={{
                  width: { xs: 80, sm: 100, md: 120 },
                  height: { xs: 80, sm: 100, md: 120 },
                  borderRadius: '16px',
                  boxShadow: darkMode 
                    ? '0 8px 32px rgba(76, 175, 80, 0.3)' 
                    : '0 8px 32px rgba(46, 125, 50, 0.2)',
                  filter: 'brightness(1.1)',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)'
                  }
                }}
              />
            </Box>
          <Typography variant="h3" component="h1" gutterBottom sx={{
            background: darkMode 
              ? 'linear-gradient(45deg, #4caf50, #81c784)'
              : 'linear-gradient(45deg, #2e7d32, #4caf50)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 'bold',
            letterSpacing: '-0.02em'
          }}>
            PitStopPal
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ 
            fontWeight: 300,
            mb: 1 
          }}>
            Your Smart Travel Companion
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ 
            display: 'block',
            opacity: 0.8
          }}>
            Sign in to start your journey
          </Typography>
        </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              margin="normal"
              value={credentials.username}
              onChange={handleInputChange('username')}
              required
              autoFocus
              disabled={loading}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              value={credentials.password}
              onChange={handleInputChange('password')}
              required
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !credentials.username || !credentials.password}
              sx={{ 
                mt: 1, 
                mb: 2,
                py: 1.5,
                background: darkMode 
                  ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                  : 'linear-gradient(45deg, #2e7d32, #4caf50)',
                '&:hover': {
                  background: darkMode 
                    ? 'linear-gradient(45deg, #388e3c, #4caf50)'
                    : 'linear-gradient(45deg, #1b5e20, #2e7d32)',
                }
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Signing In...
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Paper>
    </Box>
  );
};

export default Login; 