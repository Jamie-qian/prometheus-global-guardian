## Prometheus Global Guardian

A real-time global environmental hazards monitoring and visualization platform built with React + TypeScript.

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