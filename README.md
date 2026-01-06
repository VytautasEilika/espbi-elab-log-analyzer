# Log File Viewer

A modern Next.js application for parsing and visualizing large log files (up to 200MB).

## Features

- 📁 **Drag & Drop Upload** - Easy file upload with drag-and-drop support
- 🔍 **Smart Parsing** - Automatically detects log levels (ERROR, WARN, INFO, DEBUG) and timestamps
- 📦 **Request Grouping** - Groups related log entries by Request ID for easier debugging
- 🔬 **Deep Inspection** - Format JSON/XML bodies, headers, and extract URLs
- 🎨 **Beautiful UI** - Modern, responsive design with dark mode and gradient effects
- 📊 **Statistics Dashboard** - Real-time statistics showing error counts, warnings, etc.
- 🔎 **Search & Filter** - Search through logs and filter by log level
- 📄 **Pagination** - Efficient pagination for handling large files
- ⚡ **Performance** - Optimized for files up to 200MB

## Supported Log Formats

The viewer automatically identifies and parses logs following these patterns:

- **Timestamps**: `[YYYY-MM-DD HH:MM:SS]` at the start of lines
- **Log Levels**: `DEBUG`, `INFO`, `WARN`, `ERROR` (often formatted as `environment.LEVEL:`)
- **Request IDs**: `REQ-alphanumeric` (e.g., `REQ-695bac56b1d7a`)
- **Request URL**: Extracted from lines starting with `>>> METHOD URL` (e.g., `>>> POST /api/submit`)
- **Response Status**: Extracted from lines starting with `<<< STATUS` (e.g., `<<< 200`)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Upload a log file** - Drag and drop a .log or .txt file, or click to browse
2. **View statistics** - See counts of errors, warnings, info, and debug messages
3. **Search logs** - Use the search bar to find specific content
4. **Filter by level** - Click level buttons (ERROR, WARN, INFO, DEBUG) to filter
5. **Request View** - Toggle between "Flat View" (raw logs) and "Request View" (grouped by ID)
6. **Navigate** - Use pagination to browse through large files

## Technology Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React** - UI components

## Configuration

The application is configured to handle large files:
- Maximum file size: 250MB (configured in `next.config.js`)
- Pagination: 100 lines per page (configurable in `LogViewer.tsx`)

## License

MIT
