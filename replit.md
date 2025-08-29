# QuoteMaster Pro

## Overview

QuoteMaster Pro is a comprehensive SaaS application for professional quote management. Built as a full-stack TypeScript application, it enables businesses to create, manage, and track quotes with multiple professional templates. The system includes subscription management through Stripe, user authentication via Replit Auth, and a complete administrative interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query for server state and local React state for UI
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with typed request/response interfaces
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage
- **File Organization**: Modular structure with separate route handlers and storage abstraction

### Data Layer
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Centralized schema definitions in shared module
- **Migrations**: Drizzle Kit for database schema management
- **Connection**: Connection pooling with environment-based configuration

### Authentication & Authorization
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: Server-side sessions in PostgreSQL
- **User Management**: Role-based access control (user, admin, banned, deleted)
- **Security**: HTTP-only cookies with secure session handling

### Payment Integration
- **Provider**: Stripe for subscription management
- **Implementation**: Stripe Elements for secure payment processing
- **Webhooks**: Server-side webhook handling for subscription events
- **Models**: Subscription status tracking and customer management

### File Storage & Assets
- **Static Assets**: Vite-managed client assets with optimized bundling
- **Uploads**: Google Cloud Storage integration for company logos
- **PDF Generation**: Client-side PDF generation with multiple template variants

### Development Environment
- **Build System**: Vite for frontend with hot module replacement
- **Development Server**: Express with Vite middleware integration
- **Type Safety**: Shared TypeScript types between client and server
- **Code Quality**: ESLint and TypeScript strict mode enabled

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL database hosting
- **Replit Auth**: OpenID Connect authentication provider
- **Stripe**: Payment processing and subscription management
- **Google Cloud Storage**: File upload and storage service

### Frontend Libraries
- **React Ecosystem**: React, React DOM, React Hook Form
- **UI Components**: Radix UI primitives, Lucide React icons
- **Styling**: Tailwind CSS, class-variance-authority for component variants
- **Data Fetching**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Date Handling**: date-fns with Portuguese locale support

### Backend Dependencies
- **Express.js**: Web framework with CORS and middleware support
- **Drizzle ORM**: Type-safe database operations with PostgreSQL driver
- **Authentication**: OpenID Client, Passport.js for auth strategies
- **Session Management**: Express Session with PostgreSQL store
- **Payment Processing**: Stripe SDK for server-side operations
- **Development Tools**: tsx for TypeScript execution, esbuild for production builds

### Development Tools
- **Build Tools**: Vite, esbuild, TypeScript compiler
- **Validation**: Zod for runtime type validation
- **Testing**: Built-in Replit development environment
- **Utilities**: nanoid for ID generation, memoizee for caching