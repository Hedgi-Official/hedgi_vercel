# Hedgi - Currency Hedging Platform

## Overview

Hedgi is a comprehensive currency hedging platform that allows users to protect their currency positions against exchange rate fluctuations. The application provides real-time exchange rates, hedge management, and professional trading capabilities through integration with multiple forex brokers.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Internationalization**: React i18next supporting English and Portuguese (Brazil)

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **API Style**: RESTful API with JSON responses
- **Session Management**: Express-session with memory store
- **Authentication**: Passport.js with local strategy using scrypt for password hashing

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Tables**: Users, hedges, and trades with proper foreign key relationships

## Key Components

### Trading Integration
- **Broker API**: Direct integration with external broker API at `http://3.145.164.47`
- **Supported Brokers**: Tickmill, ActivTrades, FBS
- **Trade Management**: Real-time trade execution, monitoring, and closure
- **Currency Pairs**: USDBRL, EURUSD, USDMXN support

### Payment Processing
- **Provider**: Mercado Pago for Latin American markets
- **Features**: Brazil and Mexico market support with test/production environments
- **Implementation**: Server-side preferences creation with client-side Brick integration
- **Security**: Environment-based configuration with proper token management

### Real-time Features
- **Exchange Rates**: Live rate fetching from multiple broker APIs
- **Auto-refresh**: 5-15 second intervals for rate updates
- **Error Handling**: Graceful fallback when broker APIs are unavailable

### AI Chat Integration
- **Service**: OpenAI GPT integration for HedgiBot
- **Purpose**: Conversational hedge setup guidance
- **Features**: Session-based conversation history with multilingual support

## Data Flow

1. **User Authentication**: Login/registration through Passport.js with secure password hashing
2. **Rate Fetching**: Parallel requests to multiple broker APIs for live exchange rates
3. **Hedge Creation**: User input validation, rate locking, and broker trade execution
4. **Trade Monitoring**: Continuous polling of open positions with status updates
5. **Payment Processing**: Mercado Pago integration for premium features
6. **Data Persistence**: All operations logged to PostgreSQL with proper transaction handling

## External Dependencies

### Core Services
- **OpenAI API**: GPT-based chat functionality
- **Mercado Pago**: Payment processing for BR/MX markets
- **Broker APIs**: Real-time trading data and execution

### Development Tools
- **Drizzle ORM**: Type-safe database operations
- **Vite**: Fast development server and build tool
- **TanStack Query**: Server state management and caching

## Deployment Strategy

- **Platform**: Replit with Cloud Run deployment target
- **Build Process**: Vite build for frontend, esbuild for backend bundling
- **Environment**: Production/development configuration through environment variables
- **Database**: Managed PostgreSQL with automatic provisioning
- **Ports**: Multiple port configuration for development (3000, 5000, 5001, etc.)

## Changelog
- June 29, 2025. **Trade direction field added** - Active and previous trades now display "Buy USD" or "Sell USD" direction from Flask server's /status endpoint
- June 29, 2025. **Dashboard simulator renamed** - Changed from "Currency Hedge Simulator" to "Currency Hedge Placement" (EN) and "Execução de Hedge Cambial" (PT)
- June 20, 2025. **PIX key integration completed** - All trades automatically include user's PIX key in metadata section
- June 20, 2025. **Graceful database fallback implemented** - System continues working even when database is unavailable
- June 20, 2025. **Flask tunnel connection verified** - All endpoints successfully connect to https://alleged-gb-activated-immediate.trycloudflare.com
- June 20, 2025. **Removed problematic keep-alive agents** - Fixed "Control plane request failed" errors by removing cfAgent
- June 18, 2025. Enhanced /api/trades endpoint to include user's PIX key in metadata
- June 16, 2025. Enhanced trade close confirmation dialog with detailed spread information
- June 15, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.