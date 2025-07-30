# PitStopPal 🚗



A modern, secure web application for intelligent route planning and navigation with AI-powered features. Your cheeky co-pilot for finding the perfect stops along your route. Built with React, Node.js, and integrated with Google Maps and OpenAI.

## ✨ Features

- 🗺️ **Interactive Maps**: Full Google Maps integration with satellite/terrain views
- 🔍 **Smart Search**: AI-powered Natural Language place search with ratings and photos
- 🛣️ **Intelligent Routing**: Optimized route planning with real-time directions
- 🚏 **Dynamic Stops**: Add/remove stops along your route on the fly using Natural Language
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- 🌙 **Dark Mode**: Beautiful dark/light theme switching
- 📤 **Share Routes**: Native sharing on mobile, clipboard fallback on desktop
- ⚡ **Real-time Updates**: Live route recalculation and traffic-aware routing

## 🎯 Quick Start

### Prerequisites
- Node.js and npm
- Docker Desktop
- Azure CLI

### Local Development
```bash
# Start the application locally
docker-compose up

# Or test the Docker images
./test-local.sh
```

### Deploy to Azure
```bash
# One-command deployment
./azure-deploy.sh
```

📖 **For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

## 🏗️ Architecture

- **Frontend**: React with Vite, Material-UI
- **Backend**: Node.js with Express
- **Deployment**: Azure Web App with Docker containers
- **Configuration**: Azure App Configuration
- **Database**: In-memory (can be extended to Azure SQL)

## 🚀 Features

- **Smart Route Planning**: Find optimal stops for fuel, food, and rest
- **Real-time Navigation**: Google Maps integration
- **AI-Powered Search**: OpenAI integration for intelligent recommendations
- **Location-Aware Search**: Automatically uses your current location for nearby searches
- **Responsive Design**: Works on desktop and mobile


## 📁 Project Structure

```
ADMaps/
├── backend/                 # Node.js backend
│   ├── index.js            # Main server file
│   ├── config.js           # Azure App Configuration
│   ├── Dockerfile          # Backend container
│   └── public/             # Frontend build (copied)
├── frontend/               # React frontend
│   ├── src/                # React source code
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
├── azure-deploy.sh         # Main deployment script
├── test-local.sh           # Local testing script
├── setup-local.sh          # Local development setup
├── docker-compose.yml      # Local development
├── azure-app-config-setup.sh # App Configuration setup
├── env.local.example       # Local environment template
└── DEPLOYMENT_GUIDE.md    # Comprehensive deployment guide
```

## 🔧 Development

### Local Setup
1. Clone the repository
2. Set up local environment: `./setup-local.sh`
3. Edit `.env` file with your API keys
4. Start with Docker Compose: `docker-compose up`
5. Access at http://localhost:3000

### Environment Variables
Required environment variables (configure in Azure App Configuration):
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `JWT_SECRET` - JWT token secret
- `ADMIN_USERNAME` - Admin login username
- `ADMIN_PASSWORD` - Admin login password

## 🌐 Production

**Application URL**: https://pitstoppal-webapp-ckcqehfyd4b2aqfj.eastus2-01.azurewebsites.net

### Azure Resources
- **Resource Group**: `rg-pitstoppal-1`
- **Web App**: `pitstoppal-webapp`
- **Container Registry**: `pitstoppalacr`
- **App Configuration**: `pitstoppal-appconfig`

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[azure-app-config-setup.sh](./azure-app-config-setup.sh)** - Azure App Configuration setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `./test-local.sh`
5. Deploy with `./azure-deploy.sh`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Made with ❤️ for road trips and pit stops!** 🚗💨