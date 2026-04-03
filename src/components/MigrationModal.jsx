import "./MigrationModal.css";

export default function MigrationModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleRedirect = () => {
    window.location.href = "https://aviondir.com";
  };

  return (
    <div className="migration-modal-overlay" onClick={onClose}>
      <div
        className="migration-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-modal-title"
      >
        <button
          type="button"
          className="migration-modal-close"
          onClick={onClose}
          aria-label="Chiudi finestra"
        >
          x
        </button>

        <p className="migration-modal-kicker">Software migrato</p>
        <h2 id="migration-modal-title">Questa funzione ora vive su Aviondir</h2>
        <p>
          Le esportazioni non sono piu disponibili in questa applicazione
          standalone. Tutto il flusso e stato migrato in un progetto piu grande
          gestito su aviondir.com.
        </p>

        <div className="migration-modal-actions">
          <button
            type="button"
            className="migration-modal-primary"
            onClick={handleRedirect}
          >
            Apri aviondir.com
          </button>
          <button
            type="button"
            className="migration-modal-secondary"
            onClick={onClose}
          >
            Resta qui
          </button>
        </div>
      </div>
    </div>
  );
}
