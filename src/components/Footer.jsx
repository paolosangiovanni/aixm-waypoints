import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <strong>AIXM Waypoint Extractor</strong>
          <span>Tool per preview e filtering AIXM 5.1</span>
        </div>

        <div className="footer-right">
          <a href="mailto:youremail@example.com">pao.sangiovanni@gmail.com</a>
          <span className="footer-separator">•</span>
          <a
            href="https://github.com/paolosangiovanni/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <span className="footer-separator">•</span>
          <a
            href="https://linkedin.com/in/paolo-sangiovanni-284955117/en/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} – Built with React & Leaflet - Credits to Paolo Sangiovanni and Alessandro Salvador
      </div>
    </footer>
  );
}

export default Footer;
