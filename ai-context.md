# AI Context: Log Viewer Project

## Project Overview
This project is a **Next.js 15** application designed to parse, visualize, and analyze large server log files (up to 250MB). It runs completely client-side for performance and privacy.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Context**: React 18

## Key Components
### 1. `components/LogViewer.tsx`
- **Role**: Main orchestrator.
- **Responsibilities**:
    - Reads raw text content.
    - parses content into `LogEntry` objects (Regex-based).
    - Groups entries by `requestId`.
    - Manages state: `searchTerm`, `filterLevel` (ERROR/WARN/etc.), `viewMode` (Flat vs. Request).
    - Computes statistics (Error counts, etc.).

### 2. `components/RequestList.tsx`
- **Role**: Displays a virtualized or paginated list of grouped requests.
- **Features**:
    - Shows status badges (SUCCESS/ERROR/WARNING).
    - Displays extracted URL.
    - Shows duration and entry count.

### 3. `components/RequestDetail.tsx`
- **Role**: Deep inspection of a single request.
- **Features**:
    - Timeline view of log entries.
    - formatting for JSON/XML bodies.
    - visual cues for "Incoming", "Outgoing", "Database" calls.

## Domain Logic & Log Parsing
The application relies on specific log patterns:
- **Timestamp**: `[YYYY-MM-DD HH:MM:SS]` (Start of entry)
- **Log Level**: `environment.LEVEL:` (e.g., `production.INFO:`) or inferred from keywords.
- **Request ID**: `REQ-[alphanumeric]` (Groups lines together).
- **Request URL**: `>>> METHOD URL` (e.g., `>>> POST /api/v1/user`).
- **Response**: `<<< STATUS JSON` (e.g., `<<< 200 {"ok":true}`).

## Project Structure
```
/
├── app/                 # Next.js App Router pages
├── components/          # React components (Logic heavy)
├── public/              # Static assets
├── README.md            # User documentation
├── package.json         # Dependencies
└── ai-context.md        # This file
```

## Setup & Commands
- `npm run dev`: Start development server (Port 3000).
- `npm run build`: Build for production.
