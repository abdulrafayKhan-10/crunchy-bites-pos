# Installation & Setup Guide

## Important: SQLite Installation

The `better-sqlite3` package requires native compilation. If you encounter installation errors, follow these steps:

### Option 1: Install Build Tools (Recommended)

**Windows:**
```bash
# Install windows-build-tools (run as Administrator in PowerShell)
npm install --global windows-build-tools

# Then install dependencies
npm install
```

### Option 2: Use Pre-built Binaries

```bash
# Clear npm cache
npm cache clean --force

# Install with pre-built binaries
npm install --prefer-offline --no-audit --progress=false
```

### Option 3: Manual Installation

If automatic installation fails:

1. **Install Visual Studio Build Tools**
   - Download from: https://visualstudio.microsoft.com/downloads/
   - Select "Desktop development with C++"
   - Install

2. **Install Node.js native addon build tool**
   ```bash
   npm install --global node-gyp
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

## Quick Start

Once dependencies are installed:

```bash
# Start the application
npm start

# Or for development with DevTools
npm run dev
```

## First Run

On first launch:
1. Database will be created automatically
2. Sample products and deals will be added
3. Application window will open

## Troubleshooting

### "Module not found" errors
```bash
npm install
```

### Database errors
- Delete database file: `%APPDATA%/crunchy-bites-pos/crunchy-bites.db`
- Restart application

### Printing not working
- Check printer is connected and set as default
- PDF will be generated automatically if printer unavailable
- PDFs save to Downloads folder

## System Requirements

- **OS**: Windows 10/11, macOS 10.13+, Linux
- **Node.js**: v16 or higher
- **RAM**: 2GB minimum
- **Disk**: 100MB free space

## Support

If you continue to have installation issues:
1. Ensure Node.js is up to date
2. Run PowerShell/Terminal as Administrator
3. Check antivirus isn't blocking npm
4. Try clearing npm cache: `npm cache clean --force`
