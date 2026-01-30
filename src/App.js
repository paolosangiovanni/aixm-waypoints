import React, { useState, useRef, useEffect } from "react";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Footer from "./components/Footer";
import MeasureTool from "./components/MeasureTool";
// --------------------
// Icona waypoint
// --------------------
const waypointIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <polygon points="12,0 24,20 0,20" fill="#fff" stroke="#000" stroke-width="1"/>
      </svg>
    `),
  iconSize: [24, 24],       // dimensioni SVG
  iconAnchor: [12, 20],     // punta triangolo al centro basso
  popupAnchor: [0, -24],    // popup sopra la punta
});




// --------------------
// Dummy waypoint iniziali
// --------------------
const DUMMY_WAYPOINTS = [
  { id: "D1", _preview: { designator: "TEST1", lat: 41.8, lon: 12.25 } },
  { id: "D2", _preview: { designator: "TEST2", lat: 45.63, lon: 8.72 } },
  { id: "D3", _preview: { designator: "TEST3", lat: 44.5, lon: 11.3 } },
];

function App() {
  const [xmlFile, setXmlFile] = useState(null);
  const [xmlJson, setXmlJson] = useState(null);
  const [waypoints, setWaypoints] = useState(DUMMY_WAYPOINTS);
  const [isDummy, setIsDummy] = useState(true);
  const [visible, setVisible] = useState(new Set(DUMMY_WAYPOINTS.map(wp => wp.id)));
  const [searchTerm, setSearchTerm] = useState("");
  const [mapKey, setMapKey] = useState(0);
  const mapRef = useRef(null);

  // --------------------
  // UUID generator
  // --------------------
  const generateUUID = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

  // --------------------
  // Decimali → DMS
  // --------------------
  const toDMSLabel = (decimal, isLat) => {
    const dir = isLat ? (decimal >= 0 ? "N" : "S") : decimal >= 0 ? "E" : "W";
    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(4);
    return `${deg}°${min}'${sec}" ${dir}`;
  };

  // --------------------
  // Estrazione waypoint
  // --------------------
const extractWaypoints = (json) => {
  const root = json["message:AIXMBasicMessage"];
  if (!root) return [];

  const members = Array.isArray(root["message:hasMember"])
    ? root["message:hasMember"]
    : [root["message:hasMember"]];

  const previews = [];

  members.forEach((m) => {
    const dp = m?.["aixm:DesignatedPoint"];
    if (!dp) return;

    const dpArray = Array.isArray(dp) ? dp : [dp];

    dpArray.forEach((point) => {
      const slices = point?.["aixm:timeSlice"]?.["aixm:DesignatedPointTimeSlice"];
      if (!slices) return;

      const sliceArray = Array.isArray(slices) ? slices : [slices];

      sliceArray.forEach((s) => {
        const pos = s?.["aixm:location"]?.["aixm:Point"]?.["gml:pos"];
        if (!pos) return;

        const [lat, lon] = (typeof pos === "string" ? pos : pos["#text"] || pos.__text)
          .trim()
          .split(" ")
          .map(Number);

        const rawDesignator = s["aixm:designator"];

        const designator =
          typeof rawDesignator === "string"
            ? rawDesignator
            : rawDesignator?.["#text"] || rawDesignator?.__text || "N/A";

        previews.push({
          id: crypto.randomUUID(),
          designator,
          lat,
          lon,
        });
      });
    });
  });

  return previews;
};


  // --------------------
  // Costruisce AIXM con soli waypoint
  // --------------------
  const buildWaypointOnlyAIXM = (json) => {
    const root = json["message:AIXMBasicMessage"];
    if (!root) return null;

    const members = Array.isArray(root["message:hasMember"])
      ? root["message:hasMember"]
      : [root["message:hasMember"]];

    const filteredMembers = members
      .map((m) => {
        const dp = m["aixm:DesignatedPoint"];
        if (!dp) return null;

        const dpArray = Array.isArray(dp) ? dp : [dp];

        return {
          "aixm:DesignatedPoint": dpArray.map((p) => ({
            ...p,
            "@_gml:id": "uuid." + generateUUID(),
          })),
        };
      })
      .filter(Boolean);

    return {
      "message:AIXMBasicMessage": {
        ...root,
        "message:hasMember": filteredMembers,
      },
    };
  };

  // --------------------
  // Upload XML
  // --------------------
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const parser = new XMLParser({ ignoreAttributes: false });
      const json = parser.parse(reader.result);

      const extracted = extractWaypoints(json);
      if (extracted.length === 0) {
        alert("Nessun waypoint trovato!");
        return;
      }

      const wp = extracted.map((p) => ({
        id: p.id,
        _preview: p,
      }));

      setXmlFile(file);
      setXmlJson(json);
      setWaypoints(wp);
      setVisible(new Set(wp.map(w => w.id)));
      setIsDummy(false);
      setMapKey(k => k + 1);
    };

    reader.readAsText(file);
  };

  // --------------------
  // Toggle visibilità
  // --------------------
  const toggleVisibility = (id) => {
    setVisible(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (visible.size === waypoints.length) setVisible(new Set());
    else setVisible(new Set(waypoints.map(wp => wp.id)));
  };

  // --------------------
  // Download XML waypoint
  // --------------------
  const handleDownloadWaypoints = () => {
    if (!xmlJson || !xmlFile) return alert("Carica prima un file XML!");

    const newJson = buildWaypointOnlyAIXM(xmlJson);
    const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
    const xml = builder.build(newJson);

    const blob = new Blob([xml], { type: "application/xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = xmlFile.name.replace(/\.xml$/i, "") + "_waypoints.xml";
    link.click();
  };

  // --------------------
  // Download CSV
  // --------------------
  const handleDownloadCSV = () => {
    const headers = ["Designator", "Lat", "Lon", "Lat DMS", "Lon DMS"];
    const rows = waypoints.map(wp => [
      wp._preview.designator,
      wp._preview.lat,
      wp._preview.lon,
      toDMSLabel(wp._preview.lat, true),
      toDMSLabel(wp._preview.lon, false),
    ]);

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "waypoints.csv";
    link.click();
  };

  const filteredWaypoints = waypoints.filter(wp =>
    wp._preview.designator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-container">
      <h1>AIXM Waypoint Extractor</h1>

      <div className="controls">
        <input type="file" accept=".xml" onChange={handleFileUpload} />
        <button onClick={handleDownloadWaypoints}>Estrai Waypoint (AIXM 5.1)</button>
        <button onClick={handleDownloadCSV}>Esporta CSV</button>
      </div>

      <div className="waypoint-map-container">
        <div className="waypoint-list">
          <h2>Waypoint ({waypoints.length})</h2>

          <input
            type="text"
            placeholder="Cerca waypoint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <label>
            <input
              type="checkbox"
              checked={visible.size === waypoints.length}
              onChange={toggleAll}
            />{" "}
            Mostra/Nascondi tutti
          </label>

          <ul>
            {filteredWaypoints.map(wp => (
              <li key={wp.id}>
                <label className="wp-item">
                  <input
                    type="checkbox"
                    checked={visible.has(wp.id)}
                    onChange={() => toggleVisibility(wp.id)}
                  />

                  <div className="wp-text">
                    <div className="wp-designator">
                      {wp._preview.designator}
                    </div>

                    <div className="wp-coords">
                      {toDMSLabel(wp._preview.lat, true)} — {toDMSLabel(wp._preview.lon, false)}
                    </div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="waypoint-map">
          <MapContainer
            key={mapKey}
            whenCreated={(map) => {
            mapRef.current = map;
          }}

            center={[waypoints[0]._preview.lat, waypoints[0]._preview.lon]}
            zoom={6}
            className="leaflet-container"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {waypoints
              .filter(wp => visible.has(wp.id))
              .map(wp => (
                <Marker
                  key={wp.id}
                  position={[wp._preview.lat, wp._preview.lon]}
                  icon={waypointIcon}
                >
                <Popup>
                  <strong>{wp._preview.designator}</strong>
                  <div className="wp-coords">
                    {toDMSLabel(wp._preview.lat, true)} 
                    <br/>
                    {toDMSLabel(wp._preview.lon, false)}
                  </div>
                </Popup>

                </Marker>
              ))}
              <MeasureTool waypoints={waypoints} />
          </MapContainer>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
