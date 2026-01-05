# Memory Garden

## Overview

Memory Garden is a personal, emotional journaling application designed for parents to preserve memories, voice notes, and keepsakes for their children. The app provides an intimate, journal-like experience where parents can record moments, voice memos, notes from others, and keepsakes. Children can later view their "garden" of memories. The design philosophy emphasizes warmth, calm, and emotional connection rather than social media-style interaction.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix UI primitives)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ES modules)
- **API Style**: RESTful JSON API with `/api` prefix
- **Validation**: Zod schemas for request validation

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Current Storage**: In-memory storage implementation (`MemStorage` class) with interface for future database migration
- **Database Ready**: Schema defined for PostgreSQL, requires `DATABASE_URL` environment variable when using real database

### Key Design Patterns
- **Monorepo Structure**: Client code in `client/`, server in `server/`, shared types in `shared/`
- **Path Aliases**: `@/` for client source, `@shared/` for shared modules
- **Schema-First**: Database schema generates TypeScript types and Zod validation schemas via `drizzle-zod`
- **Mobile-First Design**: Optimized for 430px viewport width with centered container layout

### Data Models
- **Memories**: Core content with types (moment, voiceMemo, fromOthers, keepsake)
- **Children**: Profiles for memory recipients
- **Users**: Authentication-ready schema (not yet implemented)

## External Dependencies

### Database
- **PostgreSQL**: Primary database (Drizzle ORM configured)
- **Drizzle Kit**: Database migration tooling (`db:push` script)

### UI Framework Dependencies
- **Radix UI**: Accessible component primitives (dialog, accordion, toast, etc.)
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

### Build & Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **TSX**: TypeScript execution for development

### Key Runtime Libraries
- **TanStack React Query**: Async state management
- **date-fns**: Date formatting
- **class-variance-authority**: Component variant management
- **Zod**: Runtime type validation