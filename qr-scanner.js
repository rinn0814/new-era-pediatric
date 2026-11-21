/* ─── QR Scanner Module (Admin Only) ─── */
/* Loads html5-qrcode library lazily on first use */

let _html5QrCode = null;
let _scanning = false;
let _libLoaded = false;

/* ─── Lazy Load Library ─── */
function loadQRLibrary() {
  return new Promise((resolve, reject) => {
    if (_libLoaded) {
      resolve();
      return;
    }
    // Check if already available
    if (typeof Html5Qrcode !== "undefined") {
      _libLoaded = true;
      resolve();
      return;
    }

    // Check if script tag already exists (admin.html loads it)
    const existing = document.querySelector('script[src*="html5-qrcode"]');
    if (existing) {
      existing.addEventListener("load", () => {
        _libLoaded = true;
        resolve();
      });
      existing.addEventListener("error", reject);
      // If it was already loaded before listener attached
      if (typeof Html5Qrcode !== "undefined") {
        _libLoaded = true;
        resolve();
      }
      return;
    }

    // Dynamically create script tag as fallback
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.onload = () => {
      _libLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load QR library"));
    document.head.appendChild(script);
  });
}

/* ─── Start Scanner ─── */
async function startScanner(containerId = "qr-reader") {
  if (_scanning) {
    showToast("Scanner is already running.", "blue");
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    showToast("Scanner container not found.", "red");
    return;
  }

  try {
    await loadQRLibrary();
  } catch (err) {
    showToast("Failed to load QR library. Check your internet.", "red");
    return;
  }

  if (typeof Html5Qrcode === "undefined") {
    showToast("QR library not available.", "red");
    return;
  }

  try {
    _html5QrCode = new Html5Qrcode(containerId);
    _scanning = true;

    // Update UI buttons
    const startBtn = document.getElementById("btnStartScan");
    const stopBtn = document.getElementById("btnStopScan");
    if (startBtn) startBtn.style.display = "none";
    if (stopBtn) stopBtn.style.display = "inline-flex";

    await _html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      onQRScanSuccess,
      onQRScanError
    );
  } catch (err) {
    _scanning = false;

    // Reset UI
    const startBtn = document.getElementById("btnStartScan");
    const stopBtn = document.getElementById("btnStopScan");
    if (startBtn) startBtn.style.display = "inline-flex";
    if (stopBtn) stopBtn.style.display = "none";

    if (err.toString().includes("NotAllowedError") || err.toString().includes("Permission")) {
      showToast("Camera access denied. Please allow camera permission.", "red");
    } else if (err.toString().includes("NotFoundError")) {
      showToast("No camera found on this device.", "red");
    } else {
      showToast("Camera error: " + err.message, "red");
    }
  }
}

/* ─── Stop Scanner ─── */
async function stopScanner() {
  if (!_html5QrCode || !_scanning) return;

  try {
    await _html5QrCode.stop();
    _html5QrCode.clear();
    _scanning = false;

    // Reset UI
    const startBtn = document.getElementById("btnStartScan");
    const stopBtn = document.getElementById("btnStopScan");
    if (startBtn) startBtn.style.display = "inline-flex";
    if (stopBtn) stopBtn.style.display = "none";
  } catch (err) {
    // Silent fail on stop
    _scanning = false;
  }
}

/* ─── Scan Success Callback ─── */
function onQRScanSuccess(decodedText, decodedResult) {
  // Stop scanner immediately on first successful scan
  stopScanner();

  // Parse the scanned text
  let patientId = decodedText;

  // Handle different QR formats
  if (decodedText.startsWith("patient:")) {
    patientId = decodedText.replace("patient:", "");
  } else if (decodedText.includes("patient=")) {
    const url = new URL(decodedText);
    patientId = url.searchParams.get("patient") || decodedText;
  } else if (decodedText.includes("index.html?patient=")) {
    const url = new URL(decodedText, window.location.origin);
    patientId = url.searchParams.get("patient") || decodedText;
  }

  // Show result in scanner page
  const resultDiv = document.getElementById("scanResult");
  const resultText = document.getElementById("scanResultText");
  const openBtn = document.getElementById("btnOpenPatient");

  if (resultDiv) resultDiv.style.display = "block";

  // Try to find patient
  const patient = window._findPatientById
    ? window._findPatientById(patientId)
    : (typeof patients !== "undefined" ? patients.find((p) => p.id === patientId) : null);

  if (patient && resultText) {
    const name = `${patient.first_name || ""} ${patient.last_name || ""}`.trim();
    resultText.innerHTML = `<strong>${name}</strong> (${patient.patient_id || patient.id}) found!`;
    if (openBtn) {
      openBtn.style.display = "inline-flex";
      openBtn.onclick = () => {
        if (typeof window.viewPatient === "function") {
          window.viewPatient(patientId);
        }
      };
    }
    showToast("Patient found: " + name, "green");
  } else if (resultText) {
    resultText.textContent = `Scanned ID: ${patientId} — not found in records.`;
    if (openBtn) openBtn.style.display = "none";
    showToast("QR scanned but patient not found.", "blue");
  }
}

/* ─── Scan Error Callback (fires repeatedly, stay silent) ─── */
function onQRScanError(errorMessage) {
  // Intentionally silent — QR not in frame is normal
}

/* ─── Open Scanner Page (from floating button) ─── */
function openScannerPage() {
  // Navigate to scanner section in admin
  const scannerNav = document.querySelector('[data-page="scanner"]');
  if (scannerNav) {
    scannerNav.click();
  }
}

/* ─── Expose to global scope ─── */
window.startQRScan = function () {
  startScanner("qr-reader");
};

window.stopQRScan = function () {
  stopScanner();
};

window.openScannerPage = openScannerPage;

// Also expose individual functions
window.qrScanner = {
  start: startScanner,
  stop: stopScanner,
  loadLibrary: loadQRLibrary
};