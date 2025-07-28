# 🗺️ PitStopPal - Your Smart Travel Companion

A modern, secure web application for intelligent route planning and navigation with AI-powered features. Your cheeky co-pilot for finding the perfect stops along your route. Built with React, Node.js, and integrated with Google Maps and OpenAI.

## ✨ Features

- 🔐 **Secure Authentication**: JWT-based login system with persistent sessions
- 🗺️ **Interactive Maps**: Full Google Maps integration with satellite/terrain views
- 🔍 **Smart Search**: AI-powered place search with ratings and photos
- 🛣️ **Intelligent Routing**: Optimized route planning with real-time directions
- 🚏 **Dynamic Stops**: Add/remove stops along your route on the fly
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- 🌙 **Dark Mode**: Beautiful dark/light theme switching
- 📤 **Share Routes**: Native sharing on mobile, clipboard fallback on desktop
- ⚡ **Real-time Updates**: Live route recalculation and traffic-aware routing

## 🏗️ Architecture

```
PitStopPal/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/   # Login and UI components
│   │   ├── context/      # Authentication context
│   │   └── App.jsx       # Main application
├── backend/           # Node.js + Express API
│   ├── middleware/       # Authentication middleware
│   └── index.js         # API routes and logic
├── scripts/           # Azure deployment scripts
└── env-examples/      # Environment variable templates
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Google Maps API Key
- OpenAI API Key (optional, for enhanced features)

### Local Development

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
       cd PitStopPal
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp ../env-examples/backend.env.example .env
   # Edit .env with your API keys
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp ../env-examples/frontend.env.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:4001
   - **Default Login**: `admin` / `XXXX`

## 🔐 Authentication

The application uses JWT-based authentication with:
- **Session Persistence**: 24-hour token validity
- **Automatic Logout**: On token expiration or auth failure
- **Secure Headers**: All API calls include authentication
- **Default Credentials**: Configurable via environment variables

### API Protection
All backend routes are protected except:
- `GET /health` - Health check
- `POST /login` - Authentication endpoint

## ☁️ Azure Deployment

### Automated Deployment
Use our comprehensive deployment scripts:

```bash
# Install Azure CLI and login
az login

# Complete deployment (creates resources + deploys both apps)
./scripts/deploy-all.sh

# Or deploy individually
./scripts/deploy-backend.sh
./scripts/deploy-frontend.sh
```

### Manual Azure Setup

1. **Create Resources**
   ```bash
   # Resource group
   az group create --name rg-admaps --location "East US"
   
   # App Service Plan
   az appservice plan create --name plan-admaps --resource-group rg-admaps --sku B1 --is-linux
   
   # Backend Web App
   az webapp create --resource-group rg-admaps --plan plan-admaps --name admaps-backend-api --runtime "NODE:18-lts"
   
   # Frontend Web App
   az webapp create --resource-group rg-admaps --plan plan-admaps --name admaps-frontend-app --runtime "NODE:18-lts"
   ```

2. **Configure App Settings**
   ```bash
   # Backend settings
   az webapp config appsettings set --name admaps-backend-api --resource-group rg-admaps --settings \
     GOOGLE_MAPS_API_KEY="your-key" \
     OPENAI_API_KEY="your-key" \
     JWT_SECRET="your-secret" \
     ADMIN_USERNAME="admin" \
     ADMIN_PASSWORD="your-password"
   ```

### Deployment URLs
After deployment:
- **Frontend**: `https://admaps-frontend-app.azurewebsites.net`
- **Backend**: `https://admaps-backend-api.azurewebsites.net`

## 🔒 Security & API Keys

### Recommended Security Practices

1. **Azure Key Vault** (Recommended)
   ```bash
   # Create Key Vault
   az keyvault create --name kv-admaps --resource-group rg-admaps
   
   # Store secrets
   az keyvault secret set --vault-name kv-admaps --name "GoogleMapsApiKey" --value "your-key"
   az keyvault secret set --vault-name kv-admaps --name "OpenAIApiKey" --value "your-key"
   ```

2. **App Settings** (Simpler)
   - Store sensitive data in Azure App Settings
   - Never commit API keys to version control
   - Use environment-specific configurations

### Required API Keys
- **Google Maps API**: Places API, Directions API, Maps JavaScript API
- **OpenAI API**: For intelligent route optimization (optional)

## 🛠️ Configuration

### Environment Variables

#### Backend (`backend/.env`)
```bash
PORT=4001
GOOGLE_MAPS_API_KEY=your_google_maps_key
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_jwt_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

#### Frontend (`frontend/.env.local`)
```bash
VITE_BACKEND_URL=http://localhost:4001
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Production Configuration
- **HTTPS Required**: Web Share API needs secure context
- **CORS**: Automatically configured for Azure deployment
- **Session Management**: 24-hour token expiration
- **Error Handling**: Automatic logout on auth failures

## 📱 Mobile Features

### Native Sharing
- **iOS Safari**: Native iOS share sheet
- **Android Chrome**: Native Android share intent
- **Desktop**: Clipboard fallback with notification

### Responsive Design
- **Mobile-First**: Optimized for touch interfaces
- **Adaptive Layout**: Single-column on mobile, side-by-side on desktop
- **Touch Gestures**: Full map interaction support

## 🔧 Development

### Available Scripts

#### Backend
```bash
npm start        # Start production server
npm run dev      # Start development server
```

#### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Development Workflow
1. Start backend server (`npm start` in backend/)
2. Start frontend dev server (`npm run dev` in frontend/)
3. Access application at http://localhost:5173
4. Backend API available at http://localhost:4001

## 📊 Monitoring & Troubleshooting

### Azure Monitoring
```bash
# View application logs
az webapp log tail --name admaps-backend-api --resource-group rg-admaps

# Check app status
az webapp show --name admaps-frontend-app --resource-group rg-admaps --query "state"
```

### Common Issues
1. **Maps not loading**: Check Google Maps API key and billing
2. **Login fails**: Verify JWT secret and credentials
3. **CORS errors**: Ensure backend URL is correct in frontend
4. **Share not working**: Requires HTTPS for Web Share API

## 💰 Cost Estimation

### Azure Resources (Monthly)
- **App Service Plan B1**: ~$13.14
- **Two Web Apps**: Included in plan
- **Storage**: ~$0.50
- **Total**: ~$13.64/month

### API Usage
- **Google Maps**: Pay-per-use (free tier available)
- **OpenAI**: Pay-per-use (optional feature)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [Deployment Plan](DEPLOYMENT_PLAN.md) for detailed setup instructions
- Review Azure logs for runtime issues
- Ensure all API keys are properly configured
- Verify HTTPS is enabled for mobile sharing features

---

**Built with ❤️ using React, Node.js, Google Maps, and OpenAI**