const { DefaultAzureCredential } = require('@azure/identity');
const { AppConfigurationClient } = require('@azure/app-configuration');

let configCache = {};
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getConfig() {
    const now = Date.now();
    
    // Return cached config if still valid
    if (now - lastFetch < CACHE_DURATION && Object.keys(configCache).length > 0) {
        return configCache;
    }
    
    try {
        const connectionString = process.env.AZURE_APP_CONFIG_CONNECTION_STRING;
        if (!connectionString) {
            console.warn('AZURE_APP_CONFIG_CONNECTION_STRING not set, using environment variables');
            return {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY,
                GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
                JWT_SECRET: process.env.JWT_SECRET,
                ADMIN_USERNAME: process.env.ADMIN_USERNAME,
                ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
            };
        }
        
        const client = new AppConfigurationClient(connectionString);
        const settings = client.listConfigurationSettings({
            keyFilter: "Backend:*"
        });
        
        const newConfig = {};
        for await (const setting of settings) {
            const key = setting.key.replace('Backend:', '');
            newConfig[key] = setting.value;
        }
        
        configCache = newConfig;
        lastFetch = now;
        
        console.log('Configuration loaded from Azure App Configuration');
        return newConfig;
    } catch (error) {
        console.error('Error loading configuration from Azure App Configuration:', error);
        console.log('Falling back to environment variables');
        
        return {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
            JWT_SECRET: process.env.JWT_SECRET,
            ADMIN_USERNAME: process.env.ADMIN_USERNAME,
            ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
        };
    }
}

module.exports = { getConfig };
