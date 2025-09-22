# Overview

This is a **Bible Transcription Practice Application** that helps users improve their typing skills while engaging with Biblical texts. The system combines faith-based content with typing practice, featuring multilingual support (Korean, English, Chinese, Japanese), church-based communities, challenges, and competitive leaderboards. Users can practice typing Bible verses, track their progress, participate in challenges, and compete with others both individually and as church communities.

# Recent Changes

## 2025-09-19: 성경 본문 로딩 성능 대폭 최적화
- **번들 API 구현**: 기존 4번 순차 API 호출을 `/api/bible/initial-data` 1번 호출로 통합, 응답시간 수초→5-20ms로 단축
- **인기 구절 프리페칭**: 창세기 1장, 시편 23편, 요한복음 3장 등 6개 인기 장을 서버에서 미리 로딩하여 즉시 제공
- **클라이언트 영구 캐싱**: localStorage 활용 24시간 TTL 캐싱으로 재방문 시 네트워크 호출 없이 즉시 로딩
- **기본값 즉시 설정**: 한국어/개역개정 번역본을 서버에서 미리 선별하여 클라이언트 추가 호출 없이 즉시 적용
- **성능 개선 결과**: 첫 로딩 4API호출→1API호출, 응답시간 수초→20ms이하, 재방문시 캐시로 즉시 로딩

## 2025-09-18: Profile System Enhancements
- **Profile Editing**: Complete profile editing modal with firstName, age, region, and church selection support
- **Korean Character Support**: Full support for Korean input (한국어) in all profile fields with immediate UI feedback
- **Profile Visibility**: Enhanced profile page displaying age/region information with clear completion status
- **UX Improvements**: Loading states, success feedback, pre-filled forms, and clickable completion hints
- **Code Quality**: Resolved all React key prop warnings and TypeScript compilation errors for system stability

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Routing**: Wouter for client-side routing with conditional rendering based on authentication state
- **UI Components**: Custom component library built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Styling**: Tailwind CSS with custom design system using CSS variables and shadcn/ui components
- **Authentication Flow**: Conditional rendering between landing page for unauthenticated users and main app for authenticated users

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth using OpenID Connect (OIDC) with session management
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful endpoints with organized route handlers and error middleware
- **Development**: Vite middleware integration for hot reloading in development

## Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon Database
- **ORM**: Drizzle ORM with code-first schema definitions
- **Schema Structure**: 
  - Users with typing statistics and church affiliations
  - Bible books and verses with multilingual text support
  - Typing sessions for performance tracking
  - Churches for community features
  - Challenges and participation tracking
  - Session storage for authentication state
- **Migrations**: Drizzle Kit for database schema migrations

## Authentication and Authorization
- **Provider**: Replit Auth with OpenID Connect protocol
- **Session Management**: Server-side sessions stored in PostgreSQL with TTL
- **Security**: HTTPS-only cookies, CSRF protection, and secure session configuration
- **User Profile**: Automatic user creation/update from OIDC claims
- **Authorization**: Middleware-based route protection for authenticated endpoints

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Connection**: WebSocket-based connections using @neondatabase/serverless

### Authentication Services  
- **Replit Auth**: OpenID Connect authentication provider
- **Session Storage**: PostgreSQL-backed session persistence

### UI and Styling
- **Radix UI**: Headless UI component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **React Icons**: Additional icon sets (Google, GitHub, Apple icons)

### Development Tools
- **Vite**: Build tool with React plugin and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast bundling for production builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

### Data Management
- **TanStack Query**: Server state management with caching and synchronization
- **Drizzle ORM**: Type-safe database queries and schema management
- **Zod**: Runtime schema validation for API inputs and database schemas

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation for database records
- **clsx/tailwind-merge**: Conditional CSS class composition
- **wouter**: Lightweight client-side routing