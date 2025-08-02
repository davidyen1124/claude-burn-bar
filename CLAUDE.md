# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Burn Bar is an Electron-based macOS menubar application that tracks Claude API usage and spending by reading Claude CLI's JSONL log files. It displays real-time cost information and environmental impact metrics.

## Commands

### Development

- `npm run dev` - Start the app in development mode with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run clean` - Remove the dist directory
- `npm run typecheck` - Type check TypeScript without emitting files
- `npm run package` - Build distributable app to release/ directory using electron-builder
- `npm run lint` - Run ESLint with TypeScript configuration
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting without applying changes

## Architecture

### Core Components

1. **src/main.ts** - Electron main process entry point
   - Manages app lifecycle, menubar setup, and window creation
   - Implements security best practices (CSP, navigation blocking)
   - Handles tray icon creation and menu building

2. **src/usage.ts** - Core usage tracking logic
   - Reads Claude CLI JSONL files from standard locations
   - Calculates token usage and costs based on model pricing
   - Implements file scanning with fast-glob

3. **src/pricing.ts** - Model pricing configuration
   - Pattern matching for Claude models (Opus, Sonnet, Haiku)
   - Per-token pricing including cache read/write costs
   - Environmental impact calculations

4. **src/menu.ts** - Dynamic menu generation
   - Builds menubar interface with usage statistics
   - Implements "5% Club" milestone tracking
   - Handles environmental impact display

5. **src/fun-metrics.ts** - Environmental impact calculations
   - Converts token usage to environmental metrics (trees, water, energy)
   - Provides educational comparisons for resource consumption

6. **src/security.ts** - Electron security utilities
   - IPC sender validation to prevent unauthorized communication
   - Secure IPC handler wrapper with origin allowlisting

### Data Flow

1. Application reads JSONL files from Claude CLI directories:
   - `~/.config/claude/projects/`
   - `~/.claude/projects/`
   - `$CLAUDE_CONFIG_DIR/projects/`

2. Parses conversation logs to extract model usage and token counts

3. Calculates costs using model-specific pricing from pricing.ts

4. Updates menubar every 5 minutes with current spending and metrics

### Key Implementation Details

- **TypeScript Configuration**: Targets ES2022 with strict mode and module resolution
- **Electron Security**: Implements contextIsolation, disables nodeIntegration, blocks new window creation
- **Error Handling**: Graceful fallbacks for file reading errors with user-friendly messages
- **Performance**: Efficient file scanning using glob patterns, caches results between updates

## Important Patterns

- All file paths use absolute paths, no relative imports
- Environmental impact calculations use educational metrics via fun-metrics.ts
- Menu items use Electron's role system for standard actions (quit, about)
- Date handling uses dayjs for consistent formatting
