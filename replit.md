# Hedgi - Currency Hedging Platform

## Overview

Hedgi is a comprehensive currency hedging platform designed to protect users' currency positions from exchange rate fluctuations. It offers real-time exchange rates, advanced hedge management, and professional trading capabilities through integrations with multiple forex brokers. The platform aims to provide currency insurance for businesses, helping them mitigate financial losses due to volatile foreign exchange markets.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI**: Radix UI with Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Internationalization**: React i18next (English, Portuguese)

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API**: RESTful API with JSON responses
- **Authentication**: Passport.js (local strategy, scrypt hashing)
- **Session Management**: Express-session

### Data Storage
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit
- **Deployment**: Neon serverless PostgreSQL with connection pooling
- **Key Tables**: Users, hedges, and trades

### Key Features
- **Trading Integration**: Direct API integration with a broker for real-time trade execution, monitoring, and closure, supporting major currency pairs (USDBRL, EURUSD, USDMXN). Includes synthetic cross-pair decomposition (e.g., EURBRL into EURUSD+USDBRL).
- **Payment Processing**: Integration with Mercado Pago for Brazil and Mexico markets, supporting server-side preference creation and client-side Brick integration.
- **Real-time Data**: Live exchange rate fetching from multiple broker APIs with auto-refresh and graceful error handling.
- **AI Chat Integration**: HedgiBot using OpenAI GPT for conversational hedge setup guidance, featuring session-based history and multilingual support.
- **Corporate Dashboard**: A comprehensive console for corporate users to simulate hedges, execute orders, monitor open positions with live P&L, and close orders.
- **Batch Processing**: Supports CSV and Excel file uploads for batch order processing, including a smart netting engine that groups orders by symbol and payment date to reduce trading costs.
- **Pending Orders**: A system for managing scheduled orders, including those waiting for market open or resulting from timeline netting adjustments.
- **SEO & Internationalization**: Comprehensive meta tags, sitemaps, robots.txt, JSON-LD structured data, and URL-based language routing for multilingual SEO.

## External Dependencies

- **OpenAI API**: For GPT-based AI chat functionality (HedgiBot).
- **Mercado Pago**: For payment processing in Brazilian and Mexican markets.
- **Broker APIs**: For real-time trading data, execution, and liquidity.
- **Neon**: Serverless PostgreSQL database hosting.

## Changelog
- February 7, 2026. **Codebase cleanup Phase 3 & 4** - Server consolidation: deleted unused routes.ts (908 lines), renamed routes-fixed.ts to routes.ts (the active file), deleted simple-auth.ts (unused auth endpoint), consolidated payment route mounting from index.ts into main routes file, cleaned up index.ts imports. i18n pruning: removed 328 lines of unused translation keys from both English and Portuguese - deleted entire aboutUs, forIndividuals, cta, features, lifestyle namespaces; pruned landing namespace to 5 used keys; removed 19 root-level orphan keys and 6 companiesPage socialProof keys.
- February 7, 2026. **Comprehensive multilingual SEO overhaul** - Added URL-based language routing with /pt/ prefix for Portuguese pages. Added hreflang annotations, updated sitemap.xml with bilingual hreflang elements. Fixed viewport initial-scale, removed aggressive no-cache meta tags. Improved 404 page. Added FAQ structured data to what-is-hedge page.
- February 7, 2026. **Codebase cleanup Phase 1 & 2** - Removed 47MB attached_assets, 20MB public/images, deprecated server files, orphaned components, and duplicate assets.