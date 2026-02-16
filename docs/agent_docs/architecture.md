# Architecture Decisions

## Core Architecture

### Privacy-First Design

- All data stored locally in IndexedDB
- No cloud synchronization or external APIs
- User data never leaves the browser

### Extension Structure

- **Background Script**: Handles tab tracking, session management, and idle detection
- **Popup UI**: Vue 3-based interface for viewing and managing time data
- **Content Scripts**: None currently (privacy-focused)

## Data Layer

### Database Schema (Dexie.js)

- **Sessions**: Track browser tab activity with start/end times
- **Tags**: Rule-based and AI-enhanced categorization
- **Rules**: User-defined patterns for automatic tagging

### Session Management

- Real-time tracking via Chrome Tabs API
- Smart merging of overlapping/adjacent sessions
- Idle detection to filter out inactive periods

## Key Design Patterns

### Reactive Data Flow

- Vue 3 Composition API for reactive state
- Dexie.js live queries for real-time database updates
- Computed properties for derived data

### Error Resilience

- Graceful handling of IndexedDB errors
- Session recovery mechanisms
- Data validation with Arktype schemas

### Performance Considerations

- Efficient IndexedDB queries with proper indexing
- Debounced updates for frequent events
- Lazy loading of historical data

## Extension-Specific Considerations

### Browser API Usage

- Use `browser.*` APIs for cross-browser compatibility
- Handle permission changes gracefully
- Manage extension lifecycle events

### Storage Management

- Regular cleanup of old session data
- Efficient storage of time-series data
- Backup/export functionality
