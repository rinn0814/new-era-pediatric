import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, addDoc,
  query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ─── Firebase Config ─── */
const firebaseConfig = {
  apiKey: "AIzaSyBmjJt58G5XFxykN0MhzzgwzRGeCOekkM",
  authDomain: "new-era-pediatric.firebaseapp.com",
  projectId: "new-era-pediatric",
  storageBucket: "new-era-pediatric.firebasestorage.app",
  messagingSenderId: "441796543456",
  appId: "1:441796543456:web:79e51a79adca6832d1a185"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ─── State ─── */
let currentPatient = null;
let currentPatientId = null;
let allImages = [];   // for lightbox
let lbIndex = 0;

/* ─── Init ─── */
window.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupModals();
  setupEventListeners();
  setupAvatarChange();

  const params = new URLSearchParams(window.location.search);
  const pid = params.get("patient");
  if (pid) {
    await loadPatient(pid);
  } else {
    showNoPatient();
  }
});

/* ─── Show / Hide ─── */
function showLoading() {
  document.getElementById("loadingScreen").style.display = "flex";
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("noPatient").style.display = "none";
}
function showNoPatient() {
  document.getElementById("loadingScreen").style.display = "none";
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("noPatient").style.display = "flex";
}
function showMain() {
  document.getElementById("loadingScreen").style.display = "none";
  document.getElementById("noPatient").style.display = "none";
  document.getElementById("mainContent").style.display = "block";
}

/* ─── Toast ─── */
function showToast(message, type = "green") {
  const wrap = document.getElementById("toastWrap");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icons = { green: "fa-check-circle", red: "fa-exclamation-circle", blue: "fa-info-circle" };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.green}"></i> ${message}`;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ─── Helpers ─── */
function calcAge(birthDate) {
  if (!birthDate) return "—";
  const today = new Date();
  const birth = new Date(birthDate);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  if (years < 1) return `${months} mo`;
  return `${years} yr ${months} mo`;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function isImage(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
}

function getFileTypeClass(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "xls";
  return "file";
}

function getFileIcon(typeClass) {
  const map = { pdf: "fa-file-pdf", doc: "fa-file-word", xls: "fa-file-excel", file: "fa-file-alt" };
  return map[typeClass] || "fa-file-alt";
}

function getFileTag(filename) {
  const n = (filename || "").toLowerCase();
  if (n.includes("lab") || n.includes("blood") || n.includes("test")) return { cls: "tag-lab", txt: "Lab Result" };
  if (n.includes("presc") || n.includes("rx")) return { cls: "tag-presc", txt: "Prescription" };
  if (n.includes("xray") || n.includes("x-ray")) return { cls: "tag-xray", txt: "X-Ray" };
  if (n.includes("ultra") || n.includes("usg")) return { cls: "tag-ultrasound", txt: "Ultrasound" };
  return { cls: "tag-other", txt: "General" };
}

function compressImage(dataUrl, maxDim = 1024, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > h && w > maxDim) { h = (maxDim / w) * h; w = maxDim; }
      else if (h > maxDim) { w = (maxDim / h) * w; h = maxDim; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function computeBMI(weight, height) {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  if (!w || !h) return null;
  const bmi = w / (h * h);
  let label = "";
  if (bmi < 14) label = "Underweight";
  else if (bmi < 18) label = "Normal";
  else if (bmi < 25) label = "Overweight";
  else label = "Obese";
  return { value: bmi.toFixed(1), label };
}

/* ─── Tabs ─── */
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
}

/* ─── Modals ─── */
function setupModals() {
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.close).classList.remove("open");
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach((bd) => {
    bd.addEventListener("click", (e) => {
      if (e.target === bd) bd.classList.remove("open");
    });
  });
}

function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

/* ─── Event Listeners ─── */
function setupEventListeners() {
  // Print & PDF
  document.getElementById("btnPrint").addEventListener("click", printRecords);
  document.getElementById("btnPrintPDF").addEventListener("click", exportPDF);

  // Add Record
  document.getElementById("btnAddRecord").addEventListener("click", () => {
    document.getElementById("recDate").value = new Date().toISOString().split("T")[0];
    openModal("addRecordModal");
  });
  document.getElementById("btnSaveRecord").addEventListener("click", saveRecord);

  // File upload
  document.getElementById("btnUploadFiles").addEventListener("click", () => {
    document.getElementById("fileUploadInput").click();
  });
  document.getElementById("btnTakePhoto").addEventListener("click", () => {
    document.getElementById("cameraCaptureInput").click();
  });
  document.getElementById("fileUploadInput").addEventListener("change", handleFileUpload);
  document.getElementById("cameraCaptureInput").addEventListener("change", handleCameraCapture);

  // Lightbox
  document.getElementById("lbClose").addEventListener("click", closeLightbox);
  document.getElementById("lbPrev").addEventListener("click", () => {
    lbIndex = (lbIndex - 1 + allImages.length) % allImages.length;
    showLightboxImg();
  });
  document.getElementById("lbNext").addEventListener("click", () => {
    lbIndex = (lbIndex + 1) % allImages.length;
    showLightboxImg();
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
    if (document.getElementById("lightbox").classList.contains("open")) {
      if (e.key === "ArrowLeft") { lbIndex = (lbIndex - 1 + allImages.length) % allImages.length; showLightboxImg(); }
      if (e.key === "ArrowRight") { lbIndex = (lbIndex + 1) % allImages.length; showLightboxImg(); }
    }
  });
}

/* ─── Avatar Change ─── */
function setupAvatarChange() {
  const wrap = document.getElementById("avatarWrap");
  const fileInput = document.getElementById("avatarChangeFile");

  wrap.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentPatientId) return;
    try {
      const raw = await new Promise((res) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target.result);
        r.readAsDataURL(file);
      });
      const compressed = await compressImage(raw, 300, 0.8);
      await updateDoc(doc(db, "patients", currentPatientId), {
        avatar: compressed,
        updated_at: new Date().toISOString()
      });
      document.getElementById("patientAvatar").src = compressed;
      showToast("Profile photo updated!", "green");
    } catch (err) {
      showToast("Error updating photo: " + err.message, "red");
    }
    fileInput.value = "";
  });
}

/* ─── Load Patient ─── */
async function loadPatient(patientId) {
  showLoading();
  try {
    const snap = await getDoc(doc(db, "patients", patientId));
    if (!snap.exists()) {
      showNoPatient();
      return;
    }
    currentPatient = { id: snap.id, ...snap.data() };
    currentPatientId = patientId;
    renderPatient();
    showMain();
    await loadRecords();
    await loadFiles();
    renderHistory();
    renderVitals();
  } catch (err) {
    showToast("Error loading patient: " + err.message, "red");
    showNoPatient();
  }
}

function renderPatient() {
  const p = currentPatient;
  const name = `${p.first_name || ""} ${p.middle_name || ""} ${p.last_name || ""}`.trim();
  document.title = `NEW ERA PEDIATRIC – ${name}`;

  // Avatar
  const avatarEl = document.getElementById("patientAvatar");
  if (p.avatar) {
    avatarEl.src = p.avatar;
    avatarEl.style.display = "block";
  } else {
    avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1d4ed8&color=fff&size=128`;
    avatarEl.style.display = "block";
  }

  // Info
  document.getElementById("patientName").textContent = name;
  document.getElementById("patientId").textContent = p.patient_id || p.id;
  document.getElementById("patientBirth").textContent = formatDate(p.birth_date);
  document.getElementById("patientAge").textContent = calcAge(p.birth_date);
  document.getElementById("patientSex").textContent = p.sex || "—";
  document.getElementById("patientGuardian").textContent = p.guardian_name || "—";
  document.getElementById("patientContact").textContent = p.contact_number || "—";
  document.getElementById("patientAddress").textContent = p.address || "—";

  // Mini vitals
  document.getElementById("vWeight").textContent = p.weight ? `${p.weight} kg` : "—";
  document.getElementById("vHeight").textContent = p.height ? `${p.height} cm` : "—";
  document.getElementById("vTemp").textContent = p.temperature ? `${p.temperature} °C` : "—";
  document.getElementById("vHeart").textContent = p.heart_rate ? `${p.heart_rate} bpm` : "—";

  // Allergy
  const allergyBar = document.getElementById("allergyBar");
  if (p.medical_history && p.medical_history.toLowerCase().includes("allerg")) {
    allergyBar.style.display = "flex";
    document.getElementById("allergyText").textContent = p.medical_history;
  } else {
    allergyBar.style.display = "none";
  }
}

/* ─── Records ─── */
async function loadRecords() {
  const container = document.getElementById("recordsList");
  try {
    const snap = await getDocs(
      query(collection(db, "patients", currentPatientId, "records"), orderBy("date", "desc"))
    );
    if (snap.empty) {
      container.innerHTML = `
        <div class="empty">
          <i class="fas fa-notes-medical"></i>
          <p>No medical records yet</p>
        </div>`;
      return;
    }
    container.innerHTML = snap.docs
      .map((d) => {
        const r = d.data();
        return `
          <div class="record-card" onclick="window._viewRecord('${d.id}')">
            <div class="record-head">
              <span class="badge badge-blue">${r.visit_type || "Consultation"}</span>
              <span class="record-date"><i class="fas fa-calendar"></i> ${formatDate(r.date)}</span>
            </div>
            <div class="record-body">
              <div class="record-row"><strong>Diagnosis:</strong> ${r.diagnosis || "—"}</div>
              ${r.treatment ? `<div class="record-row"><strong>Treatment:</strong> ${r.treatment}</div>` : ""}
              ${r.notes ? `<div class="record-row"><strong>Notes:</strong> ${r.notes}</div>` : ""}
            </div>
          </div>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `
      <div class="empty">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading records</p>
      </div>`;
  }
}

window._viewRecord = async function (recordId) {
  try {
    const snap = await getDoc(doc(db, "patients", currentPatientId, "records", recordId));
    if (!snap.exists()) return;
    const r = snap.data();
    document.getElementById("viewRecordBody").innerHTML = `
      <div class="form-group">
        <label>Visit Type</label>
        <div style="font-size:.92rem;color:var(--ink);"><span class="badge badge-blue">${r.visit_type || "Consultation"}</span></div>
      </div>
      <div class="form-group">
        <label>Date</label>
        <div style="font-size:.88rem;color:var(--ink2);">${formatDate(r.date)}</div>
      </div>
      <div class="form-group">
        <label>Diagnosis</label>
        <div style="font-size:.88rem;color:var(--ink2);">${r.diagnosis || "—"}</div>
      </div>
      <div class="form-group">
        <label>Treatment / Prescription</label>
        <div style="font-size:.88rem;color:var(--ink2);">${r.treatment || "—"}</div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <div style="font-size:.88rem;color:var(--ink2);">${r.notes || "—"}</div>
      </div>
      <div class="form-group">
        <label>Created</label>
        <div style="font-size:.8rem;color:var(--muted);">${formatDateTime(r.created_at)}</div>
      </div>`;
    openModal("viewRecordModal");
  } catch (err) {
    showToast("Error loading record.", "red");
  }
};

async function saveRecord() {
  const date = document.getElementById("recDate").value;
  const type = document.getElementById("recType").value;
  const diagnosis = document.getElementById("recDiagnosis").value.trim();
  const treatment = document.getElementById("recTreatment").value.trim();
  const notes = document.getElementById("recNotes").value.trim();

  if (!diagnosis) {
    showToast("Please enter a diagnosis.", "red");
    return;
  }

  try {
    await addDoc(collection(db, "patients", currentPatientId, "records"), {
      date,
      visit_type: type,
      diagnosis,
      treatment,
      notes,
      created_at: new Date().toISOString()
    });
    closeModal("addRecordModal");
    showToast("Record saved!", "green");
    await loadRecords();
  } catch (err) {
    showToast("Error saving record: " + err.message, "red");
  }
}

/* ─── Files ─── */
async function loadFiles() {
  const container = document.getElementById("filesList");
  try {
    const snap = await getDocs(
      query(collection(db, "patients", currentPatientId, "files"), orderBy("uploaded_at", "desc"))
    );
    if (snap.empty) {
      container.innerHTML = `
        <div class="empty">
          <i class="fas fa-folder-open"></i>
          <p>No files uploaded yet</p>
        </div>`;
      allImages = [];
      return;
    }

    allImages = [];
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Sort by uploaded_at descending (latest first)
    docs.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));

    // Collect images for lightbox
    docs.forEach((f) => {
      if (isImage(f.filename)) {
        allImages.push(f);
      }
    });

    // Render — images inline, sorted by date latest first
    let html = "";
    let imgIdx = 0;
    docs.forEach((f) => {
      const tag = getFileTag(f.filename);
      const typeCls = getFileTypeClass(f.filename);

      if (isImage(f.filename)) {
        const idx = imgIdx++;
        html += `
          <div class="file-item file-item-image">
            <div class="file-inline-header">
              <i class="fas fa-image" style="color:#2563eb;"></i>
              <span class="file-inline-name">${f.filename}</span>
              <span class="file-inline-date"><i class="fas fa-calendar"></i> ${formatDateTime(f.uploaded_at)}</span>
              <div class="file-inline-actions">
                <button class="btn btn-ghost btn-sm" onclick="window._downloadFile('${f.id}')"><i class="fas fa-download"></i></button>
                <button class="btn btn-red btn-sm" onclick="window._deleteFile('${f.id}')"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <img class="file-inline-img" src="${f.data}" alt="${f.filename}" onclick="window._openLightbox(${idx})" />
            <div class="file-tag ${tag.cls}">${tag.txt}</div>
          </div>`;
      } else {
        html += `
          <div class="file-item file-item-doc">
            <div class="file-doc-icon ${typeCls}">
              <i class="fas ${getFileIcon(typeCls)}"></i>
            </div>
            <div class="file-doc-info">
              <div class="file-doc-name">${f.filename}</div>
              <div class="file-doc-date"><i class="fas fa-calendar"></i> ${formatDateTime(f.uploaded_at)}</div>
              <div class="file-tag ${tag.cls}">${tag.txt}</div>
            </div>
            <div class="file-doc-actions">
              <button class="btn btn-ghost btn-sm" onclick="window._downloadFile('${f.id}')"><i class="fas fa-download"></i></button>
              <button class="btn btn-red btn-sm" onclick="window._deleteFile('${f.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>`;
      }
    });
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `
      <div class="empty">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading files</p>
      </div>`;
  }
}

async function handleFileUpload(e) {
  const files = e.target.files;
  if (!files || !files.length || !currentPatientId) return;
  await processFiles(files);
  e.target.value = "";
}

async function handleCameraCapture(e) {
  const files = e.target.files;
  if (!files || !files.length || !currentPatientId) return;
  await processFiles(files);
  e.target.value = "";
}

async function processFiles(fileList) {
  showToast("Uploading files...", "blue");
  let ok = 0;
  for (const file of fileList) {
    try {
      let data;
      if (isImage(file.name)) {
        const raw = await new Promise((res) => {
          const r = new FileReader();
          r.onload = (ev) => res(ev.target.result);
          r.readAsDataURL(file);
        });
        data = await compressImage(raw, 1024, 0.7);
      } else {
        data = await new Promise((res) => {
          const r = new FileReader();
          r.onload = (ev) => res(ev.target.result);
          r.readAsDataURL(file);
        });
      }

      await addDoc(collection(db, "patients", currentPatientId, "files"), {
        filename: file.name,
        data,
        size: file.size,
        type: file.type,
        uploaded_at: new Date().toISOString()
      });
      ok++;
    } catch (err) {
      showToast(`Error uploading ${file.name}`, "red");
    }
  }
  if (ok > 0) {
    showToast(`${ok} file(s) uploaded!`, "green");
    await loadFiles();
  }
}

window._downloadFile = async function (fileId) {
  try {
    const snap = await getDoc(doc(db, "patients", currentPatientId, "files", fileId));
    if (!snap.exists()) return;
    const f = snap.data();
    const link = document.createElement("a");
    link.href = f.data;
    link.download = f.filename;
    link.click();
  } catch (err) {
    showToast("Error downloading.", "red");
  }
};

window._deleteFile = async function (fileId) {
  if (!confirm("Delete this file?")) return;
  try {
    await deleteDoc(doc(db, "patients", currentPatientId, "files", fileId));
    showToast("File deleted.", "green");
    await loadFiles();
  } catch (err) {
    showToast("Error deleting.", "red");
  }
};

/* ─── Lightbox ─── */
window._openLightbox = function (idx) {
  lbIndex = idx;
  showLightboxImg();
  document.getElementById("lightbox").classList.add("open");
};

function showLightboxImg() {
  const img = allImages[lbIndex];
  if (!img) return;
  document.getElementById("lbImg").src = img.data;
  document.getElementById("lbName").textContent =
    `${img.filename}  (${lbIndex + 1} / ${allImages.length})`;
  document.getElementById("lbDownload").href = img.data;
  document.getElementById("lbDownload").download = img.filename;
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
}

/* ─── History ─── */
function renderHistory() {
  const p = currentPatient;
  const el = document.getElementById("historyText");
  if (p.medical_history) {
    el.textContent = p.medical_history;
  } else {
    el.textContent = "No medical history recorded.";
  }
}

/* ─── Vitals ─── */
function renderVitals() {
  const p = currentPatient;
  document.getElementById("vdWeight").textContent = p.weight ? `${p.weight} kg` : "—";
  document.getElementById("vdHeight").textContent = p.height ? `${p.height} cm` : "—";
  document.getElementById("vdTemp").textContent = p.temperature ? `${p.temperature} °C` : "—";
  document.getElementById("vdHeart").textContent = p.heart_rate ? `${p.heart_rate} bpm` : "—";
  document.getElementById("vdBP").textContent = p.blood_pressure || "—";
  document.getElementById("vdO2").textContent = p.oxygen_saturation ? `${p.oxygen_saturation}%` : "—";

  const bmi = computeBMI(p.weight, p.height);
  const bmiCard = document.getElementById("bmiCard");
  if (bmi) {
    bmiCard.style.display = "block";
    document.getElementById("bmiValue").textContent = bmi.value;
    document.getElementById("bmiLabel").textContent = bmi.label;
  } else {
    bmiCard.style.display = "none";
  }
}

/* ─── Print ─── */
function printRecords() {
  if (!currentPatient) return;
  generatePrintHTML();
  const win = window.open("", "_blank");
  win.document.write(document.getElementById("printArea").innerHTML);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

function exportPDF() {
  if (!currentPatient) return;
  generatePrintHTML();
  const win = window.open("", "_blank");
  win.document.write(document.getElementById("printArea").innerHTML);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

function generatePrintHTML() {
  const p = currentPatient;
  const name = `${p.first_name || ""} ${p.middle_name || ""} ${p.last_name || ""}`.trim();
  const age = calcAge(p.birth_date);
  const bmi = computeBMI(p.weight, p.height);

  document.getElementById("printArea").innerHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Patient Record – ${name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;padding:30px;color:#333;}
        .header{text-align:center;margin-bottom:24px;border-bottom:3px solid #0f2b5b;padding-bottom:16px;}
        .header img{width:80px;height:80px;border-radius:12px;object-fit:cover;}
        .header h1{color:#0f2b5b;font-size:22px;margin:10px 0 4px;}
        .header p{color:#666;font-size:12px;}
        .section{margin-bottom:20px;}
        .section h2{font-size:14px;color:#0f2b5b;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:10px;text-transform:uppercase;}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .info-item{font-size:13px;}
        .info-item strong{color:#333;}
        .record{background:#f8f9fa;border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:10px;}
        .record h3{font-size:13px;color:#0f2b5b;}
        .record p{font-size:12px;color:#555;margin-top:4px;}
        .footer{margin-top:30px;text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:12px;}
        @media print{body{padding:15px;}}
      </style>
    </head>
    <body>
      <div class="header">
        <img src="logo.png" alt="Logo" />
        <h1>NEW ERA PEDIATRIC</h1>
        <p>Patient Medical Record</p>
        <p>Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      <div class="section">
        <h2>Patient Information</h2>
        <div class="info-grid">
          <div class="info-item"><strong>Patient ID:</strong> ${p.patient_id || p.id}</div>
          <div class="info-item"><strong>Full Name:</strong> ${name}</div>
          <div class="info-item"><strong>Birth Date:</strong> ${formatDate(p.birth_date)}</div>
          <div class="info-item"><strong>Age:</strong> ${age}</div>
          <div class="info-item"><strong>Sex:</strong> ${p.sex || "—"}</div>
          <div class="info-item"><strong>Weight:</strong> ${p.weight || "—"} kg</div>
          <div class="info-item"><strong>Height:</strong> ${p.height || "—"} cm</div>
          ${bmi ? `<div class="info-item"><strong>BMI:</strong> ${bmi.value} (${bmi.label})</div>` : ""}
          <div class="info-item"><strong>Guardian:</strong> ${p.guardian_name || "—"}</div>
          <div class="info-item"><strong>Contact:</strong> ${p.contact_number || "—"}</div>
          <div class="info-item"><strong>Address:</strong> ${p.address || "—"}</div>
        </div>
      </div>
      <div class="section">
        <h2>Medical History</h2>
        <p style="font-size:13px;">${p.medical_history || "No medical history recorded."}</p>
      </div>
      <div class="section">
        <h2>Vitals</h2>
        <div class="info-grid">
          <div class="info-item"><strong>Temperature:</strong> ${p.temperature || "—"} °C</div>
          <div class="info-item"><strong>Heart Rate:</strong> ${p.heart_rate || "—"} bpm</div>
          <div class="info-item"><strong>Blood Pressure:</strong> ${p.blood_pressure || "—"}</div>
          <div class="info-item"><strong>O2 Saturation:</strong> ${p.oxygen_saturation || "—"}%</div>
        </div>
      </div>
      <div class="footer">
        <p><strong>NEW ERA PEDIATRIC</strong></p>
        <p>© 2026 NEW ERA PEDIATRIC. All rights reserved.</p>
      </div>
    </body>
    </html>`;
}