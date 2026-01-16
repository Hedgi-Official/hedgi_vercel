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
- **Liquidity**: Multiple liquidity sources for best execution
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
- January 16, 2026. **Timeline netting with expiry-based adjustments** - New netting mode that handles overlapping hedges with different expiry dates. Algorithm computes net position for each time segment, generates initial hedge at current net, and schedules adjustment orders when positions expire. Uses signed net positions for correct delta calculation across direction changes.
- January 16, 2026. **Synthetic cross-pair decomposition** - EURBRL and GBPBRL orders are automatically expanded into their component tradable legs (EURUSD+USDBRL, GBPUSD+USDBRL). Volume adjustment uses LOT_SIZE (100,000) for notional conversion: EUR lots → USD notional → USDBRL lots. Real-time exchange rates fetched for accurate volume sizing. Component legs retain original payment date for proper netting.
- January 16, 2026. **Excel upload and payment date-based netting** - Batch upload now supports Excel formats (.xlsx, .xls) in addition to CSV. Added payment_date field (dd/mm/yyyy format) that automatically calculates duration_days until payment. Smart netting now groups by (symbol, paymentDate) for timeline-based hedge positioning. Database schema updated with payment_date column in pending_orders table.
- January 16, 2026. **Batch CSV upload and smart netting engine** - New /batch-upload page for uploading CSV files with hedge orders. Parses and validates orders (symbol, direction, volume), calculates net positions per currency pair, and executes net orders immediately or schedules for later. Smart netting reduces trading costs by offsetting long/short positions.
- January 16, 2026. **Pending orders queue system** - New pending_orders database table with full CRUD API. Corporate dashboard now shows Pending tab with scheduled orders that can be cancelled. Server routes: GET/POST /api/pending-orders, POST /api/pending-orders/batch, PATCH /api/pending-orders/:id/cancel.
- January 16, 2026. **Local P&L calculation framework** - Client-side P&L calculation utility (client/src/lib/pnl.ts) that computes entry value, current value, and P&L always expressed in USD. Uses 100,000 lot size standard and handles currency pair conversions for USDBRL, EURUSD, USDMXN, etc.
- January 16, 2026. **Corporate user dashboard launched** - Full corporate trading console with API integration: simulate hedges, execute orders, monitor open positions with live P&L, close orders with confirmation. Business account toggle reactivated, HedgiTest user created for testing.
- January 16, 2026. **Hedgi API proxy routes added** - Server-side proxy for secure API access: POST /api/hedgi/quotes/simulate, POST /api/hedgi/orders, GET /api/hedgi/orders, GET /api/hedgi/orders/:id, DELETE /api/hedgi/orders/:id. API keys stored securely in database per user.
- January 16, 2026. **Added story case section to home page** - Visual comparison showing -R$7,500 loss without hedging vs R$0 with Hedgi for B2B context
- January 16, 2026. **Developers page redesign** - Developer-focused hero with direct API showcase, removed story narrative (moved to home page)
- January 14, 2026. **New Developers page launched** - World-class developer experience page inspired by Stripe/Resend/Spotify with interactive code playground, language tabs (Node.js, Python, cURL), parameter toggles, quick start guide, capabilities grid, SDK roadmap (Coming Q1 2026), security section, and sandbox request form
- January 14, 2026. **Website restructuring** - Made ForCompanies the new home page, removed For Individuals and For Companies from navigation, archived old pages to client/src/pages/archive/ for future reuse
- August 21, 2025. **Rebranded to currency insurance messaging** - Updated About Us page from "hedging" to "currency insurance" terminology, emphasizing protection for businesses buying from other countries, with real statistics (75% companies lose money, $9.8B lost to FX moves)
- August 21, 2025. **Professional About Us page redesign** - Complete visual overhaul with fintech-style gradients, abstract financial patterns, currency symbols, animated icons, and professional contact integration (hjalmar@hedgi.ai)
- August 21, 2025. **Enhanced calendar logic for hedge calculations** - Single-day hedge support and expiration date exclusion from cost calculations for more accurate pricing
- July 17, 2025. **Secure password reset system fully operational** - Complete enterprise-grade password reset system with cryptographically secure tokens, email verification, and one-time use validation working end-to-end
- July 17, 2025. **Fixed URL parameter extraction issue** - Resolved Wouter router stripping query parameters by using window.location.search directly
- July 17, 2025. **Fixed case-sensitive email lookup** - Implemented case-insensitive email matching for token generation
- July 17, 2025. **Complete forgot password system implemented** - Added secure password reset flow with email verification, token-based authentication, and comprehensive frontend pages
- July 7, 2025. **Implemented comprehensive cache management solution** - Added service worker, cache-busting utilities, and user-friendly cache refresh component to resolve browser caching issues with Vite-generated assets
- July 7, 2025. **Fixed critical application startup issues** - Resolved duplicate key error in i18n translations and React Query context initialization problem
- June 20, 2025. **PIX key integration completed** - All trades automatically include user's PIX key in metadata section
- June 20, 2025. **Graceful database fallback implemented** - System continues working even when database is unavailable
- June 20, 2025. **Flask tunnel connection verified** - All endpoints successfully connect to https://alleged-gb-activated-immediate.trycloudflare.com
- June 20, 2025. **Removed problematic keep-alive agents** - Fixed "Control plane request failed" errors by removing cfAgent
- June 18, 2025. Enhanced /api/trades endpoint to include user's PIX key in metadata
- June 16, 2025. Enhanced trade close confirmation dialog with detailed spread information
- June 15, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.