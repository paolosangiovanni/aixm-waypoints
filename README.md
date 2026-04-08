# AIXM Waypoint Extractor

**AIXM Waypoint Extractor** is a React web app that allows you to upload AIXM XML files, visualize waypoints on an interactive map, filter their visibility, and download the complete data in XML or CSV format.

This app is designed to simplify waypoint analysis and generate georeferenced reports quickly and efficiently.

---

## 🛠 Key Features

- **AIXM XML Import**: upload XML files containing waypoints and parse them into readable objects.
- **Interactive Map View**: all waypoints are displayed on a Leaflet map with custom markers.
- **Dynamic Waypoint Filtering**: show/hide waypoints on the map without modifying the original file.
- **Full XML Export**: download all imported waypoints in an XML file.
- **CSV Export**: generate a CSV file with both decimal and DMS coordinates.
- **Readable DMS Coordinates**: latitude and longitude converted to degrees, minutes, and seconds (N/S, E/W).
- **Responsive Design**: the map and waypoint list adapt to both desktop and mobile screens.

---

## 📁 Project Structure

/src
├─ App.js # Main React component
├─ App.css # App styles
├─ components/
│ └─ Footer.js # Footer component
└─ index.js # React entry point

---

## ⚡ Installation

Clone the repository:

```bash
git clone https://github.com/your-username/aixm-waypoint-extractor.git
cd aixm-waypoint-extractor
```

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm start
```

## GitHub Pages deploy

The project is configured for GitHub Pages through the `homepage` field in `package.json`.

Deploy the current build with:

```bash
npm run deploy
```

You can also use the explicit alias:

```bash
npm run deploy:gh-pages
```
