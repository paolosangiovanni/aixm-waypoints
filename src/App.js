import React, { useState, useRef, useEffect } from "react";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Footer from "./components/Footer";

// --------------------
// Icona waypoint
// --------------------
const waypointIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2l0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTIgNS44ODdsOC40NjggMTQuMTEzaC0xNi45MzZsOC40NjgtMTQuMTEzem0wLTMuODg3bC0xMiAyMGgyNGwtMTItMjB6Ii8+PC9zdmc+",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// --------------------
// Dummy waypoint iniziali
// --------------------
const DUMMY_WAYPOINTS = [
  { "@_gml:id": "uuid.TEST-1", _preview: { designator: "TEST1", lat: 41.8, lon: 12.25 } },
  { "@_gml:id": "uuid.TEST-2", _preview: { designator: "TEST2", lat: 45.63, lon: 8.72 } },
  { "@_gml:id": "uuid.TEST-3", _preview: { designator: "TEST3", lat: 44.5, lon: 11.3 } },
];

function App() {
  const [xmlFile, setXmlFile] = useState(null);
  const [xmlJson, setXmlJson] = useState(null);
  const [waypoints, setWaypoints] = useState(DUMMY_WAYPOINTS);
  const [isDummy, setIsDummy] = useState(true);
  const [visible, setVisible] = useState(new Set(DUMMY_WAYPOINTS.map((_, i) => i)));
  const [searchTerm, setSearchTerm] = useState("");
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
  // Decimali → DMS con 4 decimali
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

    const membersRaw = root["message:hasMember"];
    if (!membersRaw) return [];

    const membersArray = Array.isArray(membersRaw) ? membersRaw : [membersRaw];
    const previews = [];

    membersArray.forEach((m) => {
      const dpRaw = m["aixm:DesignatedPoint"];
      if (!dpRaw) return;
      const dpArray = Array.isArray(dpRaw) ? dpRaw : [dpRaw];

      dpArray.forEach((point) => {
        const timeSlices = point["aixm:timeSlice"]?.["aixm:DesignatedPointTimeSlice"];
        if (!timeSlices) return;
        const sliceArray = Array.isArray(timeSlices) ? timeSlices : [timeSlices];

        sliceArray.forEach((s) => {
          const posNode = s["aixm:location"]?.["aixm:Point"]?.["gml:pos"];
          if (!posNode) return;

          const [lat, lon] = (posNode.__text || posNode).trim().split(" ").map(parseFloat);

          previews.push({
            designator: s["aixm:designator"]?.__text || s["aixm:designator"] || "N/A",
            lat,
            lon,
          });
        });
      });
    });

    return previews;
  };

  // --------------------
  // Costruisce un AIXM 5.1 con solo i waypoint
  // --------------------
  const buildWaypointOnlyAIXM = (json) => {
    const root = json["message:AIXMBasicMessage"];
    if (!root) return null;

    const membersRaw = root["message:hasMember"];
    if (!membersRaw) return null;

    const membersArray = Array.isArray(membersRaw) ? membersRaw : [membersRaw];

    const waypointMembers = membersArray
      .map((m) => {
        const dpRaw = m["aixm:DesignatedPoint"];
        if (!dpRaw) return null;

        const dpArray = Array.isArray(dpRaw) ? dpRaw : [dpRaw];
        const dpFiltered = dpArray
          .map((point) => {
            const timeSlices = point["aixm:timeSlice"]?.["aixm:DesignatedPointTimeSlice"];
            if (!timeSlices) return null;

            const sliceArray = Array.isArray(timeSlices) ? timeSlices : [timeSlices];
            const validSlices = sliceArray.filter(
              (s) => s["aixm:location"]?.["aixm:Point"]?.["gml:pos"]?.trim() !== ""
            );

            if (validSlices.length === 0) return null;

            return {
              ...point,
              "@_gml:id": "uuid." + generateUUID(),
              "aixm:timeSlice": { "aixm:DesignatedPointTimeSlice": validSlices },
            };
          })
          .filter(Boolean);

        if (dpFiltered.length === 0) return null;
        return { "aixm:DesignatedPoint": dpFiltered };
      })
      .filter(Boolean);

    return {
      "message:AIXMBasicMessage": {
        ...root,
        "message:hasMember": waypointMembers,
      },
    };
  };

  // --------------------
  // Upload XML
  // --------------------
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setXmlFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: false });
      const json = parser.parse(reader.result);
      const previews = extractWaypoints(json);

      if (previews.length === 0) {
        alert("Nessun waypoint trovato!");
        return;
      }

      setWaypoints(previews.map((p, i) => ({ "@_gml:id": `preview-${i}`, _preview: p })));
      setVisible(new Set(previews.map((_, i) => i)));
      setXmlJson(json);
      setIsDummy(false);

      setTimeout(() => {
        if (!mapRef.current) return;
        const bounds = L.latLngBounds(previews.map((p) => [p.lat, p.lon]));
        if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }, 100);
    };

    reader.readAsText(file);
  };

  // --------------------
  // Toggle visibilità mappa
  // --------------------
  const toggleVisibility = (i) => {
    setVisible((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (visible.size === waypoints.length) setVisible(new Set());
    else setVisible(new Set(waypoints.map((_, i) => i)));
  };

  // --------------------
  // Download XML waypoint solo
  // --------------------
  const handleDownloadWaypoints = () => {
    if (!xmlFile || !xmlJson) return alert("Carica prima un file XML!");

    const newXmlJson = buildWaypointOnlyAIXM(xmlJson);
    if (!newXmlJson) return alert("Nessun waypoint trovato!");

    const builder = new XMLBuilder({ ignoreAttributes: false, format: true, suppressEmptyNode: true });
    const newXml = builder.build(newXmlJson);

    const originalName = xmlFile.name.replace(/\.xml$/i, "");
    const blob = new Blob([newXml], { type: "application/xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${originalName}_waypoints_only.xml`;
    link.click();
  };

  // --------------------
  // Download CSV
  // --------------------
  const handleDownloadCSV = () => {
    if (!waypoints || waypoints.length === 0) return alert("Nessun waypoint disponibile per l'estrazione CSV!");

    const headers = ["Designator", "Lat", "Lon", "Lat DMS", "Lon DMS"];
    const rows = waypoints.map((wp) => [
      wp._preview.designator,
      wp._preview.lat,
      wp._preview.lon,
      toDMSLabel(wp._preview.lat, true),
      toDMSLabel(wp._preview.lon, false),
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "waypoints.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // --------------------
  // Filtra lista waypoint in base alla search
  // --------------------
  const filteredWaypoints = waypoints.filter((wp) =>
    wp._preview.designator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const newVisible = new Set(filteredWaypoints.map((_, i) => i));
    setVisible(newVisible);
  }, [searchTerm, waypoints]);

  // Fit bounds automatico
  useEffect(() => {
    if (!mapRef.current || visible.size === 0) return;

    const visibleWaypoints = waypoints
      .filter((_, i) => visible.has(i))
      .map((wp) => [wp._preview.lat, wp._preview.lon]);

    if (visibleWaypoints.length === 0) return;

    const bounds = L.latLngBounds(visibleWaypoints);
    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  }, [waypoints, visible]);

  // Fix Leaflet resize
  useEffect(() => {
    const handleResize = () => mapRef.current?.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
          <h2>
            Waypoint {isDummy ? "di esempio" : "estratti"} ({waypoints.length})
          </h2>

          <input
            type="text"
            placeholder="Cerca waypoint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              marginBottom: "12px",
              width: "100%",
              fontSize: "14px",
            }}
          />

          <label>
            <input
              type="checkbox"
              checked={visible.size === filteredWaypoints.length}
              onChange={toggleAll}
            />{" "}
            Mostra/Nascondi tutti sulla mappa
          </label>

          <ul>
            {filteredWaypoints.map((wp, i) => (
              <li key={i}>
                <label>
                  <input
                    type="checkbox"
                    checked={visible.has(i)}
                    onChange={() => toggleVisibility(i)}
                  />{" "}
                  <strong>{wp._preview.designator}</strong> –{" "}
                  {toDMSLabel(wp._preview.lat, true)}, {toDMSLabel(wp._preview.lon, false)}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="waypoint-map">
          <MapContainer
            whenCreated={(map) => (mapRef.current = map)}
            center={[waypoints[0]._preview.lat, waypoints[0]._preview.lon]}
            zoom={6}
            className="leaflet-container"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {waypoints
              .filter((_, i) => visible.has(i))
              .map((wp, i) => (
                <Marker key={i} position={[wp._preview.lat, wp._preview.lon]} icon={waypointIcon}>
                  <Popup>
                    <strong>{wp._preview.designator}</strong>
                    <br />
                    {toDMSLabel(wp._preview.lat, true)}
                    <br />
                    {toDMSLabel(wp._preview.lon, false)}
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default App;
