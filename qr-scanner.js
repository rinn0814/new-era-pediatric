// ============================================================
//  NEW ERA PEDIATRIC – QR Scanner (ADMIN ONLY)
//  Runs only on admin.html, redirects scans to index.html
// ============================================================
(function () {
  'use strict';

  function isAdminPage() {
    return /admin/i.test(window.location.pathname) ||
           !!document.querySelector('[data-admin-page]') ||
           document.title.toLowerCase().includes('admin');
  }

  const SCANNER_LIB = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
  const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
  const PLAIN_ID = /^[A-Za-z0-9_.-]{1,128}$/;

  let activeScanner = null;
  let session = 0;

  const CSS = `
    .nep-fabs { position: fixed; right: 18px; bottom: 18px; z-index: 9990; display: flex;
      flex-direction: column; align-items: flex-end; gap: 10px; }
    .nep-fab { display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border: none;
      border-radius: 999px; cursor: pointer; font-family: inherit; font-size: .9rem; font-weight: 600;
      background: #1a3a5c; color: #fff; box-shadow: 0 6px 18px rgba(26,58,92,.35); }
    .nep-fab:hover { background: #1b5fae; }
    .nep-fab.alt { background: #fff; color: #1a3a5c; border: 1.5px solid #1a3a5c; }
    .nep-overlay { position: fixed; inset: 0; z-index: 10000; display: none; align-items: center;
      justify-content: center; padding: 16px; background: rgba(15,30,50,.6); }
    .nep-overlay.open { display: flex; }
    .nep-box { width: 100%; max-width: 440px; max-height: 92vh; overflow: auto; background: #fff;
      color: #1e293b; border-radius: 16px; padding: 20px; font-family: inherit; }
    .nep-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .nep-head h3 { margin: 0; font-size: 1.05rem; color: #1a3a5c; }
    .nep-x { width: 34px; height: 34px; border: none; border-radius: 50%; cursor: pointer; background: #f1f5f9; }
    .nep-cam { position: relative; min-height: 280px; background: #000; border-radius: 12px; overflow: hidden; }
    #nep-qr-reader { width: 100%; }
    #nep-qr-reader video { width: 100% !important; object-fit: cover; }
    .nep-frame { position: absolute; left: 50%; top: 50%; width: 60%; max-width: 240px; aspect-ratio: 1;
      transform: translate(-50%,-50%); border: 3px solid #2e86de; border-radius: 14px;
      box-shadow: 0 0 0 999px rgba(0,0,0,.35); pointer-events: none; }
    .nep-status { min-height: 1.4em; margin: 12px 0 0; text-align: center; font-size: .9rem; color: #475569; }
    .nep-status.ok { color: #1e8e3e; font-weight: 600; }
    .nep-status.err { color: #ea4335; font-weight: 600; }
    .nep-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 14px; }
    .nep-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px;
      border: 1.5px solid #2e86de; background: #2e86de; color: #fff; cursor: pointer; font-family: inherit;
      font-size: .9rem; font-weight: 600; text-decoration: none; }
    .nep-btn.outline { background: #fff; color: #1b5fae; }
    .nep-file { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .nep-hidden { display: none !important; }
    .nep-qr-card { text-align: center; padding: 18px; border: 2px dashed #cbd5e1; border-radius: 14px; }
    .nep-qr-card img { width: 260px; max-width: 100%; height: auto; }
    .nep-qr-name { margin-top: 10px; font-size: 1.1rem; font-weight: 700; color: #1a3a5c; }
    .nep-qr-sub { font-size: .8rem; color: #64748b; }
    .nep-qr-link { margin-top: 8px; font-size: .7rem; color: #94a3b8; word-break: break-all; }
    .nep-select, .nep-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1;
      font-family: inherit; font-size: .9rem; margin-bottom: 10px; }
    .nep-mini-qr { margin-left: 6px; border: 1.5px solid #2e86de; background: #fff; color: #1b5fae;
      border-radius: 8px; padding: 4px 8px; cursor: pointer; }
    .nep-mini-qr:hover { background: #eef4fb; }
  `;

  // ================================================
  //  BUILD UI
  // ================================================
  function buildUI() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    document.body.insertAdjacentHTML('beforeend',
      '<div class="nep-fabs">' +
        '<button type="button" class="nep-fab alt" id="nepQrBtn"><i class="fas fa-qrcode"></i> Patient QR</button>' +
        '<button type="button" class="nep-fab" id="nepScanBtn"><i class="fas fa-camera"></i> Scan QR</button>' +
      '</div>' +

      '<div class="nep-overlay" id="nepScanOverlay">' +
        '<div class="nep-box">' +
          '<div class="nep-head"><h3><i class="fas fa-camera"></i> Scan Patient QR</h3>' +
          '<button type="button" class="nep-x" data-nep-close><i class="fas fa-times"></i></button></div>' +
          '<div class="nep-cam"><div id="nep-qr-reader"></div><div class="nep-frame"></div></div>' +
          '<p class="nep-status" id="nepScanStatus"></p>' +
          '<div class="nep-actions">' +
            '<label class="nep-btn outline" for="nepQrFile"><i class="fas fa-image"></i> Upload QR photo</label>' +
            '<input type="file" id="nepQrFile" accept="image/*" class="nep-file">' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="nep-overlay" id="nepQrOverlay">' +
        '<div class="nep-box">' +
          '<div class="nep-head"><h3><i class="fas fa-qrcode"></i> Patient QR Code</h3>' +
          '<button type="button" class="nep-x" data-nep-close><i class="fas fa-times"></i></button></div>' +
          '<select id="nepQrSelect" class="nep-select"></select>' +
          '<div style="display:flex;gap:8px;">' +
            '<input id="nepQrManual" class="nep-input" placeholder="Or paste patient ID..." />' +
            '<button type="button" class="nep-btn outline" id="nepQrGo">Go</button>' +
          '</div>' +
          '<div class="nep-qr-card">' +
            '<img id="nepQrImg" alt="Patient QR code">' +
            '<div class="nep-qr-name" id="nepQrName"></div>' +
            '<div class="nep-qr-sub">Scan to open this patient&rsquo;s record</div>' +
            '<div class="nep-qr-link" id="nepQrLink"></div>' +
          '</div>' +
          '<p class="nep-status" id="nepQrStatus"></p>' +
          '<div class="nep-actions">' +
            '<a class="nep-btn outline" id="nepQrDownload"><i class="fas fa-download"></i> Download</a>' +
            '<button type="button" class="nep-btn" id="nepQrPrint"><i class="fas fa-print"></i> Print</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div id="nep-qr-file" class="nep-hidden"></div>'
    );
  }

  // ================================================
  //  WIRE EVENTS
  // ================================================
  function wireEvents() {
    document.getElementById('nepScanBtn').addEventListener('click', openScanner);
    document.getElementById('nepQrBtn').addEventListener('click', function () { openQrManager(); });
    document.getElementById('nepQrPrint').addEventListener('click', printQr);
    document.getElementById('nepQrFile').addEventListener('change', onQrPhotoChosen);
    document.getElementById('nepQrSelect').addEventListener('change', function (e) {
      showQrFor(e.target.value);
    });
    document.getElementById('nepQrGo').addEventListener('click', function () {
      var v = document.getElementById('nepQrManual').value.trim();
      if (v) showQrFor(v);
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-nep-close]') || e.target.classList.contains('nep-overlay')) closeAll();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  }

  // ================================================
  //  OVERLAY HELPERS
  // ================================================
  function setOpen(id, open) {
    document.getElementById(id).classList.toggle('open', open);
    document.body.style.overflow = document.querySelector('.nep-overlay.open') ? 'hidden' : '';
  }

  function closeAll() {
    closeScanner();
    setOpen('nepQrOverlay', false);
  }

  function setStatus(id, text, type) {
    var el = document.getElementById(id);
    el.textContent = text;
    el.className = 'nep-status' + (type ? ' ' + type : '');
  }

  // ================================================
  //  SCRIPT LOADER
  // ================================================
  var loading = {};

  function loadScript(src) {
    if (!loading[src]) {
      loading[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = function () {
          delete loading[src];
          s.remove();
          reject(new Error('Failed to load: ' + src));
        };
        document.head.appendChild(s);
      });
    }
    return loading[src];
  }

  // ================================================
  //  QR SCANNER (CAMERA)
  // ================================================
  async function openScanner() {
    closeScanner();
    var mySession = ++session;
    setOpen('nepScanOverlay', true);
    setStatus('nepScanStatus', 'Starting camera\u2026');

    var found = false;

    var onScan = function (text) {
      if (found || mySession !== session) return;
      var id = extractPatientId(text);
      if (!id) {
        setStatus('nepScanStatus', 'Not a patient QR. Try another.', 'err');
        return;
      }
      found = true;
      openPatient(id);
    };

    try {
      if (!window.isSecureContext || !navigator.mediaDevices) throw new Error('insecure');
      await loadScript(SCANNER_LIB);
      var reader = new window.Html5Qrcode('nep-qr-reader');
      activeScanner = reader;

      try {
        await reader.start({ facingMode: 'environment' }, { fps: 10 }, onScan, function () {});
      } catch (e) {
        var cams = await window.Html5Qrcode.getCameras();
        if (!cams || !cams.length) throw e;
        await reader.start(cams[0].id, { fps: 10 }, onScan, function () {});
      }

      if (mySession !== session) {
        await stopScanner(reader);
        return;
      }
      setStatus('nepScanStatus', "Point camera at patient's QR code.");
    } catch (err) {
      if (mySession === session) {
        setStatus('nepScanStatus', 'Cannot start camera. Use "Upload QR photo" instead.', 'err');
      }
    }
  }

  function closeScanner() {
    session++;
    var o = document.getElementById('nepScanOverlay');
    if (o) o.classList.remove('open');
    var r = activeScanner;
    activeScanner = null;
    stopScanner(r);
    if (!document.querySelector('.nep-overlay.open')) document.body.style.overflow = '';
  }

  async function stopScanner(r) {
    if (!r) return;
    try { await r.stop(); } catch (e) {}
    try { r.clear(); } catch (e) {}
  }

  // ================================================
  //  EXTRACT PATIENT ID
  // ================================================
  function extractPatientId(text) {
    var raw = String(text || '').trim();
    if (raw.indexOf('patient=') !== -1) {
      try {
        return new URL(raw, window.location.origin).searchParams.get('patient');
      } catch (e) {
        return null;
      }
    }
    return PLAIN_ID.test(raw) ? raw : null;
  }

  // ================================================
  //  PATIENT URL
  // ================================================
  function getPatientUrl(id) {
    try {
      var u = new URL('index.html', window.location.href);
      u.searchParams.set('patient', id);
      return u.toString();
    } catch (e) {
      return 'index.html?patient=' + encodeURIComponent(id);
    }
  }

  function openPatient(id) {
    stopScanner(activeScanner);
    activeScanner = null;
    setStatus('nepScanStatus', 'Patient found! Opening\u2026', 'ok');
    if (navigator.vibrate) navigator.vibrate(120);
    setTimeout(function () {
      window.location.href = getPatientUrl(id);
    }, 600);
  }

  // ================================================
  //  QR PHOTO UPLOAD SCANNER
  // ================================================
  async function onQrPhotoChosen(e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    var mySession = session;
    setStatus('nepScanStatus', 'Reading photo\u2026');

    try {
      await loadScript(SCANNER_LIB);
      var reader = new window.Html5Qrcode('nep-qr-file');
      var text = await reader.scanFile(file, false);
      if (mySession !== session) return;

      var id = extractPatientId(text);
      if (!id) {
        setStatus('nepScanStatus', 'Not a patient QR.', 'err');
        return;
      }
      openPatient(id);
    } catch (err) {
      setStatus('nepScanStatus', 'No QR found in photo.', 'err');
    }
  }

  // ================================================
  //  COLLECT PATIENTS (for QR manager dropdown)
  // ================================================
  function collectPatients() {
    var map = new Map();

    document.querySelectorAll('a[href*="patient="]').forEach(function (a) {
      try {
        var pid = new URL(a.href, window.location.origin).searchParams.get('patient');
        if (pid && !map.has(pid)) map.set(pid, (a.textContent || '').trim().slice(0, 60) || pid);
      } catch (e) {}
    });

    document.querySelectorAll('[data-patient-id]').forEach(function (el) {
      var pid = el.getAttribute('data-patient-id');
      if (pid && !map.has(pid)) map.set(pid, el.getAttribute('data-patient-name') || pid);
    });

    try {
      var list = JSON.parse(localStorage.getItem('nep_patient_list') || '[]');
      list.forEach(function (p) {
        if (p.id && !map.has(p.id)) map.set(p.id, p.name || p.id);
      });
    } catch (e) {}

    return Array.from(map.entries()).map(function (entry) {
      return { id: entry[0], name: entry[1] };
    });
  }

  function getPatientName(id) {
    try {
      var saved = JSON.parse(localStorage.getItem('nep_patient_' + id) || 'null');
      if (saved && saved.name) return saved.name;
    } catch (e) {}
    var found = collectPatients().find(function (p) { return p.id === id; });
    return found ? found.name : id;
  }

  // ================================================
  //  QR MANAGER (generate & download QR)
  // ================================================
  function openQrManager(initialId) {
    setOpen('nepQrOverlay', true);

    var sel = document.getElementById('nepQrSelect');
    var patients = collectPatients();
    sel.innerHTML = '';

    if (patients.length === 0) {
      sel.innerHTML = '<option value="">No patients found on this page yet</option>';
    } else {
      patients.forEach(function (p) {
        var o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.name + ' (' + p.id + ')';
        sel.appendChild(o);
      });
    }

    if (initialId) {
      var opt = Array.from(sel.options).find(function (o) { return o.value === initialId; });
      if (!opt) {
        opt = document.createElement('option');
        opt.value = initialId;
        opt.textContent = getPatientName(initialId) + ' (' + initialId + ')';
        sel.appendChild(opt);
      }
      sel.value = initialId;
      showQrFor(initialId);
    } else if (patients.length > 0) {
      showQrFor(patients[0].id);
    } else {
      setStatus('nepQrStatus', 'Type a patient ID above, or open a patient list first.');
    }
  }

  async function showQrFor(id) {
    id = (id || '').trim();
    if (!id) return;

    var link = getPatientUrl(id);
    document.getElementById('nepQrName').textContent = getPatientName(id);
    document.getElementById('nepQrLink').textContent = link;
    document.getElementById('nepQrSelect').value = id;
    document.getElementById('nepQrImg').removeAttribute('src');
    setStatus('nepQrStatus', 'Creating QR\u2026');

    try {
      await loadScript(QR_LIB);
      var dataUrl = await window.QRCode.toDataURL(link, {
        width: 520,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#1a3a5c', light: '#ffffff' }
      });
      document.getElementById('nepQrImg').src = dataUrl;
      var dl = document.getElementById('nepQrDownload');
      dl.href = dataUrl;
      dl.download = 'QR-' + id + '.png';
      setStatus('nepQrStatus', "Print and attach to patient's file.");
    } catch (e) {
      setStatus('nepQrStatus', 'Cannot create QR. Check internet connection.', 'err');
    }
  }

  function printQr() {
    var src = document.getElementById('nepQrImg').getAttribute('src');
    if (!src) return;
    var name = document.getElementById('nepQrName').textContent;
    var win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      '<!DOCTYPE html><html><head><title>QR - ' + name + '</title>' +
      '<style>body{font-family:Arial;text-align:center;padding:40px;color:#1a3a5c}' +
      'img{width:320px;height:320px}h2{font-size:26px;margin:16px 0 4px}</style>' +
      '</head><body><h1>NEW ERA PEDIATRIC</h1><img src="' + src + '">' +
      '<h2>' + name + '</h2><p>Scan to open patient record</p></body></html>'
    );
    win.document.close();
    setTimeout(function () { win.print(); }, 500);
  }

  // ================================================
  //  AUTO-ADD MINI QR BUTTONS TO PATIENT LINKS
  // ================================================
  function autoAddQrButtons() {
    document.querySelectorAll('a[href*="patient="]').forEach(function (a) {
      if (a.nextElementSibling && a.nextElementSibling.classList.contains('nep-mini-qr')) return;

      var pid = null;
      try {
        pid = new URL(a.href, window.location.origin).searchParams.get('patient');
      } catch (e) {}
      if (!pid) return;

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nep-mini-qr';
      b.title = 'Show QR';
      b.innerHTML = '<i class="fas fa-qrcode"></i>';
      b.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        openQrManager(pid);
      };
      a.parentNode.insertBefore(b, a.nextSibling);
    });
  }

  // ================================================
  //  PUBLIC API
  // ================================================
  window.NEP_showPatientQR = function (id) { openQrManager(id); };

  // ================================================
  //  INIT
  // ================================================
  function init() {
    if (!isAdminPage()) return;
    buildUI();
    wireEvents();
    autoAddQrButtons();
    setInterval(autoAddQrButtons, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();