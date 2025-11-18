## Prometheus Global Guardian

A real-time global environmental hazards monitoring and visualization platform built with React + TypeScript.

### Tech Stack

**Frontend:**
- **React** ^19.1.1 - UI library
- **TypeScript** ~5.9.3 - Type-safe JavaScript
- **Vite** ^7.1.7 - Fast build tool and dev server
- **Mapbox GL** ^3.15.0 - Interactive map visualization
- **React DOM** ^19.1.1 - React rendering engine

**Build & Development Tools:**
- **Node.js** 18.x (supports 20.x, 22.x)
- **ESLint** ^9.36.0 - Code linting
  - @eslint/js ^9.36.0
  - typescript-eslint ^8.45.0
  - eslint-plugin-react-hooks ^5.2.0
  - eslint-plugin-react-refresh ^0.4.22
- **TypeScript ESLint** ^8.45.0 - TypeScript linting

**Backend/Server:**
- **Express** ^5.1.0 - Node.js web framework
- **Node Fetch** ^3.3.2 - Fetch API for Node.js
- **Serve** ^14.2.0 - Static file server

**Type Definitions:**
- @types/react ^19.1.16
- @types/react-dom ^19.1.9
- @types/node ^24.6.0

### Project Structure

```
prometheus-global-guardian/
├── public/
│   └── assets/              # Static assets (logo, etc.)
│       ├── prometheus-logo.jpeg
│       └── prometheus-logo.png
├── src/
│   ├── index.tsx            # App entry point
│   ├── index.css            # Global styles
│   ├── App.tsx              # Main app component
│   └── components/          # Feature components
│       ├── Header.tsx
│       ├── StatusPanel.tsx
│       ├── LegendPanel.tsx
│       ├── MapView.tsx
│       ├── SaveReportModal.tsx
│       ├── SettingsModal.tsx
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
└── README.md
```

### Getting Started


1. Install dependencies (skip if already done):
	```bash
	npm install
	```

2. Start the development server (Vite):
	```bash
	npm run dev
	```

3. Open your browser and visit http://localhost:5173 (or the port shown in the terminal)
```
4. Build and preview for production:
	```bash
	npm run build
	npm run preview
	```

5. If you need to manually install map dependencies:
	```bash
	npm install mapbox-gl @types/mapbox-gl --save
	```

### Main Features

- Real-time aggregation of environmental hazard data from multiple sources (USGS, NASA EONET, GDACS)
- Mapbox globe visualization and hazard markers
- Hazard type filtering and statistics
- One-click export of hazard reports (HTML)
- Settings modal, ESC/overlay click to close, and modern UI interactions

### Notes

- All page structure, interactions, and styles have been migrated to React components