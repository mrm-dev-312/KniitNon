# KniitNon

Project overview and setup instructions.

## 🎯 Chat Integration in Dashboard

**✅ COMPLETED**: Chat functionality has been successfully moved from the main page to the dashboard for a unified research experience.

### Changes Made:
- **Chat Tab Added**: New dedicated Chat tab in the dashboard sidebar 
- **Enhanced Error Handling**: Improved logging and error recovery for chat interactions
- **Main Page Updated**: Replaced chat component with informational message directing users to dashboard
- **Responsive Layout**: Chat component optimized for dashboard sidebar layout

### Location:
- **Dashboard**: `/dashboard` - Chat available in the sidebar tabs
- **Component**: `components/ai/chat.tsx` - Enhanced with better error handling and logging

### Usage:
1. Navigate to the Research Explorer dashboard
2. Click on the "Chat" tab in the sidebar
3. Start conversing with the AI about your research topics
4. Generated insights can be used alongside visualization and outline tools

**Benefits**: All research tools (chat, visualization, outline builder, AI assistant) are now centralized in one dashboard for seamless workflow integration.

## Getting Started

1.  Install dependencies: `npm install`
2.  Run the development server: `npm run dev`
3.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Getting Started with Docker

1.  Build the Docker image: `docker-compose build`
2.  Start the services: `docker-compose up`
