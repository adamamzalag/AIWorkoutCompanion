# AI Workout Coach

## Overview

This is a full-stack fitness application that provides personalized workout plans and AI-powered coaching. The application uses React on the frontend with Express.js and Node.js on the backend, featuring AI-generated workout plans, YouTube video integration for exercise demonstrations, and real-time workout tracking.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js 20
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL 16 (Neon serverless)
- **Authentication**: Replit Auth with session management
- **AI Integration**: OpenAI API for workout generation and coaching
- **External APIs**: YouTube Data API for exercise videos

### Key Components

#### Database Layer
- **Schema**: Comprehensive fitness tracking schema with users, workout plans, exercises, sessions, and progress tracking
- **Connection Management**: Robust connection pooling with automatic retry logic for Neon database
- **Session Storage**: PostgreSQL-based session storage for authentication

#### AI Coach System
- **Workout Generation**: OpenAI-powered system for creating personalized workout plans
- **Coaching Tips**: Real-time AI feedback and guidance during workouts
- **Progress Analysis**: AI-driven insights into user fitness progress
- **Chat System**: Interactive AI coach conversations with session management

#### Video Integration
- **YouTube API**: Multi-key failover system for reliable video search
- **Exercise Videos**: Automatic video matching for exercise demonstrations
- **Quality Filtering**: Algorithm to ensure high-quality instructional videos

#### Workout System
- **Real-time Tracking**: Live workout sessions with exercise logging
- **Progress Persistence**: Automatic saving of workout progress
- **Resume Capability**: Ability to resume interrupted workout sessions
- **Timer Integration**: Built-in timers for time-based exercises

## Data Flow

1. **User Authentication**: Replit Auth handles user login and session management
2. **Profile Setup**: Onboarding flow collects fitness level, equipment, and goals
3. **Workout Generation**: AI system creates personalized workout plans based on user profile
4. **Exercise Video Matching**: YouTube API finds instructional videos for each exercise
5. **Workout Execution**: Real-time tracking with progress logging and AI coaching
6. **Progress Analysis**: Historical data analysis for insights and plan adjustments

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Connection Management**: Automatic retry logic for connection reliability

### AI Services
- **OpenAI API**: GPT models for workout generation and coaching responses
- **Prompt Engineering**: Specialized prompts for fitness expertise

### Video Services
- **YouTube Data API**: Multiple API key rotation for reliability
- **Video Quality Filtering**: Algorithm to select appropriate instructional content

### Authentication
- **Replit Auth**: OAuth-based authentication with user profile integration
- **Session Management**: PostgreSQL-backed session storage

## Deployment Strategy

### Development Environment
- **Replit Integration**: Optimized for Replit development environment
- **Hot Reload**: Vite development server with fast refresh
- **Module System**: ESM throughout the application

### Production Build
- **Frontend**: Vite build process creating optimized static assets
- **Backend**: ESBuild bundling for Node.js production deployment
- **Static Serving**: Express serves frontend assets in production

### Environment Configuration
- **Database URL**: Required environment variable for PostgreSQL connection
- **API Keys**: OpenAI and YouTube API keys for external service integration
- **Session Secret**: Secure session management configuration

## Changelog
- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.