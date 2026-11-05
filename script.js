// ============================================================
//  NEW ERA PEDIATRIC – Patient Medical Records System
//  Fully functional prototype with LocalStorage persistence
// ============================================================

(function () {
  'use strict';

  // ================================================
  //  SECTION 1 : DEFAULT DEMO DATA
  // ================================================
  const DEMO_PATIENT = {
    name: 'Sophia Marie Dela Cruz',
    age: '5 years old',
    gender: 'Female',
    birthday: '2020-03-15',
    guardian: 'Maria Dela Cruz',
    contact: '+63 917 123 4567',
    address: '123 Sampaguita St., Barangay San Jose, Quezon City, Metro Manila',
    avatar: ''
  };

  const DEMO_RECORDS = [
    {
      id: 'rec_demo_1',
      date: '2025-01-10',
      doctor: 'Dr. Elena Santos',
      complaint: 'Persistent cough and low-grade fever for 3 days',
      diagnosis: 'Upper Respiratory Tract Infection (URTI)',
      notes: 'Patient presents with dry cough, slight rhinorrhea, and temperature of 37.8°C. Lungs clear on auscultation. No wheezing or retractions observed.',
      prescription: 'Paracetamol 250mg every 6 hours (as needed for fever). Honey-cough syrup 5mL every 8 hours.',
      treatment: 'Adequate rest. Increase fluid intake. Warm compress on forehead if fever persists. Follow-up in 1 week if symptoms continue.'
    },
    {
      id: 'rec_demo_2',
      date: '2024-11-22',
      doctor: 'Dr. Elena Santos',
      complaint: 'Rash on both arms after eating shrimp',
      diagnosis: 'Allergic Contact Dermatitis (food allergy)',
      notes: 'Mild erythematous papular rash bilaterally on upper extremities. No respiratory distress. Onset within 2 hours of seafood ingestion.',
      prescription: 'Cetirizine 5mg once daily for 5 days. Topical hydrocortisone cream 1% applied twice daily.',
      treatment: 'Avoid seafood and known allergens. Keep affected area clean and dry. Return immediately if swelling, difficulty breathing, or worsening rash.'
    },
    {
      id: 'rec_demo_3',
      date: '2024-08-15',
      doctor: 'Dr. Michael Reyes',
      complaint: 'Routine well-child checkup and vaccination',
      diagnosis: 'Normal growth and development',
      notes: 'Weight: 17.2 kg (50th percentile). Height: 108 cm (55th percentile). Developmental milestones appropriate for age. Vaccines updated.',
      prescription: 'None required.',
      treatment: 'Continue balanced diet. Encourage physical activity. Next well-child visit in 6 months.'
    }
  ];

  const DEMO_FILES = [];

  // ================================================
  //  SECTION 2 : APPLICATION STATE
  // ================================================
  let patient = { ...DEMO_PATIENT };
  let records = [];
  let files = [];
  let searchQuery = '';

  // ================================================
  //  SECTION 3 : LOCALSTORAGE HELPERS
  // ================================================
  const STORAGE_KEYS = {
    patient: 'nep_patient',
    records: 'nep_records',
    files:   'nep_files'
  };

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.patient, JSON.stringify(patient));
      localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
      localStorage.setItem(STORAGE_KEYS.files,   JSON.stringify(files));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
      toast('Storage full — some data may not persist.', 'error');
    }
  }

  function loadFromStorage() {
    try {
      const p = localStorage.getItem(STORAGE_KEYS.patient);
      const r = localStorage.getItem(STORAGE_KEYS.records);
      const f = localStorage.getItem(STORAGE_KEYS.files);

      if (p) patient = { ...DEMO_PATIENT, ...JSON.parse(p) };
      else   patient = { ...DEMO_PATIENT };

      if (r) records = JSON.parse(r);
      else   records = JSON.parse(JSON.stringify(DEMO_RECORDS));

      if (f) files = JSON.parse(f);
      else   files = JSON.parse(JSON.stringify(DEMO_FILES));

    } catch (e) {
      console.warn('LocalStorage load failed:', e);
      patient = { ...DEMO_PATIENT };
      records = JSON.parse(JSON.stringify(DEMO_RECORDS));
      files   = JSON.parse(JSON.stringify(DEMO_FILES));
    }
  }

  function clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEYS.patient);
      localStorage.removeItem(STORAGE_KEYS.records);
      localStorage.removeItem(STORAGE_KEYS.files);
    } catch (e) {
      console.warn('LocalStorage clear failed:', e);
    }
  }

  // ================================================
  //  SECTION 4 : DOM HELPERS
  // ================================================
  function $(id)       { return document.getElementById(id); }
  function $q(sel)     { return document.querySelector(sel); }
  function $qa(sel)    { return document.querySelectorAll(sel); }

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
  }

  function fmtSize(bytes) {
    if (!bytes || bytes < 1) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function genId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function fileIcon(type) {
    if (!type) return 'fa-file';
    if (type.startsWith('image/')) return 'fa-file-image';
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('word') || type.includes('document')) return 'fa-file-word';
    if (type.includes('sheet') || type.includes('excel')) return 'fa-file-excel';
    return 'fa-file-medical';
  }

  // ================================================
  //  SECTION 5 : TOAST NOTIFICATIONS
  // ================================================
  let toastTimer = null;

  function toast(msg, type = 'success') {
    const el = $('toast');
    const msgEl = $('toastMsg');

    msgEl.textContent = msg;
    el.className = 'toast ' + type;

    const icon = el.querySelector('i');
    if (icon) {
      icon.className = type === 'success' ? 'fas fa-check-circle'
                     : type === 'error'   ? 'fas fa-exclamation-circle'
                     : 'fas fa-info-circle';
    }

    clearTimeout(toastTimer);
    void el.offsetWidth;
    el.classList.add('show');

    toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 3500);
  }

  // ================================================
  //  SECTION 6 : MODAL MANAGEMENT
  // ================================================
  function openModal(id) {
    closeAllModals();
    const m = $(id);
    if (m) {
      m.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(id) {
    const m = $(id);
    if (m) m.classList.remove('active');
    // Only re-enable scroll if no other modal is open
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
  }

  function closeAllModals() {
    $qa('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  }

  // Overlay click to close
  $qa('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
      if (e.target === this) {
        this.classList.remove('active');
        if (!document.querySelector('.modal-overlay.active')) {
          document.body.style.overflow = '';
        }
      }
    });
  });

  // Close buttons (data-close attribute)
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-close]');
    if (btn) {
      closeModal(btn.getAttribute('data-close'));
    }
  });

  // ESC key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });

  // ================================================
  //  SECTION 7 : RENDER PATIENT
  // ================================================
  function renderPatient() {
    $('patientName').textContent     = patient.name     || '—';
    $('patientAge').textContent      = patient.age       || '—';
    $('patientGender').textContent   = patient.gender    || '—';
    $('patientBirthday').textContent = fmtDate(patient.birthday);
    $('guardian').textContent        = patient.guardian  || '—';
    $('contact').textContent         = patient.contact   || '—';
    $('address').textContent         = patient.address   || '—';

    const wrap = $('avatarWrap');
    const img  = $('patientAvatar');

    if (patient.avatar && patient.avatar.trim() !== '') {
      img.src = patient.avatar;
      img.alt = patient.name;
      img.onload = () => wrap.classList.remove('show-fallback');
      img.onerror = () => wrap.classList.add('show-fallback');
    } else {
      img.src = '';
      wrap.classList.add('show-fallback');
    }
  }

  // ================================================
  //  SECTION 8 : RENDER STATS
  // ================================================
  function renderStats() {
    $('statRecords').textContent = records.length;

    if (records.length > 0) {
      const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
      $('statLastVisit').textContent = fmtDate(sorted[0].date);
    } else {
      $('statLastVisit').textContent = '—';
    }

    $('statFiles').textContent = files.length;
  }

  // ================================================
  //  SECTION 9 : RENDER MEDICAL RECORDS
  // ================================================
  function renderRecords() {
    const container = $('medicalHistory');
    const emptyMsg  = $('emptyMessage');
    const noResults = $('noResults');

    container.innerHTML = '';

    let list = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Search filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => {
        return (r.complaint    && r.complaint.toLowerCase().includes(q))    ||
               (r.diagnosis    && r.diagnosis.toLowerCase().includes(q))    ||
               (r.doctor       && r.doctor.toLowerCase().includes(q))       ||
               (r.notes        && r.notes.toLowerCase().includes(q))        ||
               (r.prescription && r.prescription.toLowerCase().includes(q)) ||
               (r.treatment    && r.treatment.toLowerCase().includes(q))    ||
               (r.date         && r.date.includes(q));
      });
    }

    if (records.length === 0) {
      emptyMsg.classList.remove('hidden');
      noResults.classList.add('hidden');
      return;
    }

    emptyMsg.classList.add('hidden');

    if (list.length === 0) {
      noResults.classList.remove('hidden');
      return;
    }

    noResults.classList.add('hidden');

    list.forEach(function (r) {
      const card = document.createElement('div');
      card.className = 'record-card';
      card.setAttribute('data-id', r.id);

      let detailHTML = `
        <div class="record-detail-item">
          <label><i class="fas fa-stethoscope"></i> Chief Complaint</label>
          <p>${esc(r.complaint)}</p>
        </div>
        <div class="record-detail-item">
          <label><i class="fas fa-diagnoses"></i> Diagnosis</label>
          <p>${esc(r.diagnosis)}</p>
        </div>`;

      if (r.notes) {
        detailHTML += `
        <div class="record-detail-item full-width">
          <label><i class="fas fa-clipboard"></i> Doctor's Notes</label>
          <p>${esc(r.notes)}</p>
        </div>`;
      }
      if (r.prescription) {
        detailHTML += `
        <div class="record-detail-item">
          <label><i class="fas fa-prescription"></i> Prescription</label>
          <p>${esc(r.prescription)}</p>
        </div>`;
      }
      if (r.treatment) {
        detailHTML += `
        <div class="record-detail-item">
          <label><i class="fas fa-hand-holding-medical"></i> Treatment</label>
          <p>${esc(r.treatment)}</p>
        </div>`;
      }

      card.innerHTML = `
        <div class="record-card-header">
          <div class="record-date">
            <i class="fas fa-calendar-check"></i>
            ${esc(fmtDate(r.date))}
            ${r.doctor ? `<span class="record-doctor"><i class="fas fa-user-md"></i> Dr. ${esc(r.doctor)}</span>` : ''}
          </div>
          <div class="record-actions">
            <button class="btn btn-sm btn-outline" data-action="view"   data-id="${esc(r.id)}">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="btn btn-sm btn-primary" data-action="edit"   data-id="${esc(r.id)}">
              <i class="fas fa-pen"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger"  data-action="delete" data-id="${esc(r.id)}">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
        <div class="record-details">${detailHTML}</div>
      `;

      container.appendChild(card);
    });
  }
  
    // ================================================
  //  SECTION 10 : RENDER FILES
  // ================================================
  function renderFiles() {
    const list = $('fileList');
    const emptyMsg = $('emptyFiles');

    list.innerHTML = '';

    if (files.length === 0) {
      emptyMsg.classList.remove('hidden');
      return;
    }

    emptyMsg.classList.add('hidden');

    files.forEach(function (f, idx) {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `
        <div class="file-info">
          <div class="file-icon"><i class="fas ${fileIcon(f.type)}"></i></div>
          <div class="file-meta">
            <div class="file-name" title="${esc(f.name)}">${esc(f.name)}</div>
            <div class="file-size">${fmtSize(f.size)} &bull; ${fmtDate(f.date)}</div>
          </div>
        </div>
        <div class="file-actions">
          <button class="btn btn-sm btn-outline" data-action="viewFile" data-index="${idx}" title="Preview">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-danger"  data-action="deleteFile" data-index="${idx}" title="Remove">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  // ================================================
  //  SECTION 11 : EVENT DELEGATION – RECORDS
  // ================================================
  $('medicalHistory').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const id     = btn.getAttribute('data-id');

    if (action === 'view')   viewRecord(id);
    if (action === 'edit')   editRecord(id);
    if (action === 'delete') confirmDeleteRecord(id);
  });

  // ================================================
  //  SECTION 12 : EVENT DELEGATION – FILES
  // ================================================
  $('fileList').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const idx    = parseInt(btn.getAttribute('data-index'), 10);

    if (action === 'viewFile')   previewFile(idx);
    if (action === 'deleteFile') confirmDeleteFile(idx);
  });

  // ================================================
  //  SECTION 13 : PATIENT EDIT
  // ================================================
  $('editPatientBtn').addEventListener('click', function () {
    $('editName').value     = patient.name     || '';
    $('editAge').value      = patient.age       || '';
    $('editGender').value   = patient.gender    || '';
    $('editBirthday').value = patient.birthday  || '';
    $('editGuardian').value = patient.guardian  || '';
    $('editContact').value  = patient.contact   || '';
    $('editAddress').value  = patient.address   || '';
    $('editAvatar').value   = patient.avatar    || '';

    clearFormErrors($('patientForm'));
    openModal('patientModal');
  });

  $('savePatientBtn').addEventListener('click', function () {
    const form = $('patientForm');
    clearFormErrors(form);

    const fields = [
      { id: 'editName',     label: 'Full Name' },
      { id: 'editAge',      label: 'Age' },
      { id: 'editGender',   label: 'Gender' },
      { id: 'editBirthday', label: 'Date of Birth' },
      { id: 'editGuardian', label: 'Parent / Guardian' },
      { id: 'editContact',  label: 'Contact Number' },
      { id: 'editAddress',  label: 'Address' }
    ];

    let valid = true;
    fields.forEach(function (f) {
      const el = $(f.id);
      if (!el.value.trim()) {
        markFieldError(el, f.label + ' is required.');
        valid = false;
      }
    });

    if (!valid) {
      toast('Please fill in all required fields.', 'error');
      return;
    }

    patient.name     = $('editName').value.trim();
    patient.age      = $('editAge').value.trim();
    patient.gender   = $('editGender').value;
    patient.birthday = $('editBirthday').value;
    patient.guardian = $('editGuardian').value.trim();
    patient.contact  = $('editContact').value.trim();
    patient.address  = $('editAddress').value.trim();
    patient.avatar   = $('editAvatar').value.trim();

    saveToStorage();
    renderPatient();
    renderStats();
    closeModal('patientModal');
    toast('Patient details updated successfully!');
  });

  // ================================================
  //  SECTION 14 : ADD / EDIT RECORD
  // ================================================
  $('addRecordBtn').addEventListener('click', function () {
    // Reset form
    $('recordForm').reset();
    $('recordId').value = '';
    $('recDate').value  = today();
    $('recordModalTitle').innerHTML = '<i class="fas fa-file-medical"></i> Add Medical Record';
    $('saveRecordText').textContent = 'Save Record';
    clearFormErrors($('recordForm'));
    openModal('recordModal');
  });

  $('saveRecordBtn').addEventListener('click', function () {
    const form = $('recordForm');
    clearFormErrors(form);

    const id          = $('recordId').value.trim();
    const date        = $('recDate').value;
    const doctor      = $('recDoctor').value.trim();
    const complaint   = $('recComplaint').value.trim();
    const diagnosis   = $('recDiagnosis').value.trim();
    const notes       = $('recNotes').value.trim();
    const prescription= $('recPrescription').value.trim();
    const treatment   = $('recTreatment').value.trim();

    // Validate required
    let valid = true;
    if (!date) {
      markFieldError($('recDate'), 'Date of visit is required.');
      valid = false;
    }
    if (!complaint) {
      markFieldError($('recComplaint'), 'Chief complaint is required.');
      valid = false;
    }
    if (!diagnosis) {
      markFieldError($('recDiagnosis'), 'Diagnosis is required.');
      valid = false;
    }

    if (!valid) {
      toast('Please fill in all required fields.', 'error');
      return;
    }

    if (id) {
      // EDIT
      const idx = records.findIndex(function (r) { return r.id === id; });
      if (idx !== -1) {
        records[idx] = { ...records[idx], date, doctor, complaint, diagnosis, notes, prescription, treatment };
        toast('Medical record updated successfully!');
      }
    } else {
      // ADD
      records.push({
        id: genId(),
        date, doctor, complaint, diagnosis, notes, prescription, treatment
      });
      toast('Medical record added successfully!');
    }

    saveToStorage();
    renderRecords();
    renderStats();
    closeModal('recordModal');

    // Reset form for next use
    $('recordForm').reset();
    $('recordId').value = '';
    $('recordModalTitle').innerHTML = '<i class="fas fa-file-medical"></i> Add Medical Record';
    $('saveRecordText').textContent = 'Save Record';
    clearFormErrors($('recordForm'));
  });

  function editRecord(id) {
    const r = records.find(function (rec) { return rec.id === id; });
    if (!r) return;

    $('recordId').value        = r.id;
    $('recDate').value         = r.date || '';
    $('recDoctor').value       = r.doctor || '';
    $('recComplaint').value    = r.complaint || '';
    $('recDiagnosis').value    = r.diagnosis || '';
    $('recNotes').value        = r.notes || '';
    $('recPrescription').value = r.prescription || '';
    $('recTreatment').value    = r.treatment || '';
    $('recordModalTitle').innerHTML = '<i class="fas fa-pen"></i> Edit Medical Record';
    $('saveRecordText').textContent = 'Update Record';
    clearFormErrors($('recordForm'));

    openModal('recordModal');
  }

  // ================================================
  //  SECTION 15 : VIEW RECORD
  // ================================================
  function viewRecord(id) {
    const r = records.find(function (rec) { return rec.id === id; });
    if (!r) return;

    let html = '<div class="view-grid">';

    html += `<div class="view-item"><label>Date of Visit</label><p>${esc(fmtDate(r.date))}</p></div>`;
    if (r.doctor) html += `<div class="view-item"><label>Doctor</label><p>Dr. ${esc(r.doctor)}</p></div>`;
    html += `<div class="view-item"><label>Chief Complaint</label><p>${esc(r.complaint)}</p></div>`;
    html += `<div class="view-item"><label>Diagnosis</label><p>${esc(r.diagnosis)}</p></div>`;
    if (r.notes)       html += `<div class="view-item"><label>Doctor's Notes</label><p>${esc(r.notes)}</p></div>`;
    if (r.prescription)html += `<div class="view-item"><label>Prescription</label><p>${esc(r.prescription)}</p></div>`;
    if (r.treatment)   html += `<div class="view-item"><label>Treatment</label><p>${esc(r.treatment)}</p></div>`;

    html += '</div>';

    $('viewContent').innerHTML = html;
    openModal('viewModal');
  }

  // ================================================
  //  SECTION 16 : DELETE RECORD (CONFIRM)
  // ================================================
  let pendingDelete = { type: null, id: null, index: null };

  function confirmDeleteRecord(id) {
    pendingDelete = { type: 'record', id: id, index: null };
    $('confirmMsg').textContent = 'Are you sure you want to delete this medical record? This action cannot be undone.';
    openModal('confirmModal');
  }

  function confirmDeleteFile(idx) {
    pendingDelete = { type: 'file', id: null, index: idx };
    const name = files[idx] ? files[idx].name : 'this file';
    $('confirmMsg').textContent = 'Are you sure you want to remove "' + name + '"? This action cannot be undone.';
    openModal('confirmModal');
  }

  $('confirmDeleteBtn').addEventListener('click', function () {
    if (pendingDelete.type === 'record') {
      records = records.filter(function (r) { return r.id !== pendingDelete.id; });
      saveToStorage();
      renderRecords();
      renderStats();
      closeModal('confirmModal');
      toast('Medical record deleted successfully!');

    } else if (pendingDelete.type === 'file') {
      const name = files[pendingDelete.index] ? files[pendingDelete.index].name : 'File';
      files.splice(pendingDelete.index, 1);
      saveToStorage();
      renderFiles();
      renderStats();
      closeModal('confirmModal');
      toast('File "' + name + '" removed.');
    }

    pendingDelete = { type: null, id: null, index: null };
  });

  // ================================================
  //  SECTION 17 : FILE UPLOAD
  // ================================================
  const fileInput = $('fileInput');
  const dropZone  = $('dropZone');

  $('uploadFileBtn').addEventListener('click', function () {
    fileInput.click();
  });

  dropZone.addEventListener('click', function () {
    fileInput.click();
  });

  // Drag & Drop
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', function (e) {
    handleFiles(e.target.files);
    e.target.value = '';
  });

  function handleFiles(fileList) {
    const selected = Array.from(fileList);
    if (selected.length === 0) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    let successCount = 0;
    let failCount = 0;
    let processed = 0;

    selected.forEach(function (file) {
      if (file.size > MAX_SIZE) {
        toast('"' + file.name + '" is too large (max 5 MB).', 'error');
        failCount++;
        processed++;
        checkDone();
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        files.push({
          id: genId(),
          name: file.name,
          type: file.type,
          size: file.size,
          date: today(),
          data: e.target.result
        });
        successCount++;
        processed++;
        checkDone();
      };
      reader.onerror = function () {
        failCount++;
        processed++;
        checkDone();
      };
      reader.readAsDataURL(file);
    });

    function checkDone() {
      if (processed < selected.length) return;

      saveToStorage();
      renderFiles();
      renderStats();

      if (successCount > 0 && failCount === 0) {
        toast(successCount + ' file(s) uploaded successfully!');
      } else if (successCount > 0 && failCount > 0) {
        toast(successCount + ' uploaded, ' + failCount + ' failed.', 'info');
      }
    }
  }

  // ================================================
  //  SECTION 18 : FILE PREVIEW
  // ================================================
  function previewFile(idx) {
    const f = files[idx];
    if (!f) return;

    let content = '<div class="file-preview-area">';

    if (f.data && f.data.startsWith('data:image')) {
      content += '<img src="' + f.data + '" alt="' + esc(f.name) + '" />';
    } else if (f.data && f.data.startsWith('data:application/pdf')) {
      content += '<iframe src="' + f.data + '" width="100%" height="500" style="border:none;border-radius:8px;"></iframe>';
    } else {
      content += '<div style="padding:40px 20px;"><i class="fas fa-file-medical" style="font-size:4rem;color:#2e86de;opacity:.5;"></i><p style="margin-top:12px;color:#8e99aa;font-size:1rem;">Preview not available for this file type.</p></div>';
    }

    content += '</div>';
    content += `
      <div class="file-preview-info">
        <p><strong>File Name:</strong> ${esc(f.name)}</p>
        <p><strong>File Type:</strong> ${esc(f.type || 'Unknown')}</p>
        <p><strong>File Size:</strong> ${fmtSize(f.size)}</p>
        <p><strong>Upload Date:</strong> ${fmtDate(f.date)}</p>
      </div>`;

    $('filePreviewContent').innerHTML = content;

    // Download link
    const dl = $('downloadFileLink');
    if (f.data) {
      dl.href = f.data;
      dl.setAttribute('download', f.name);
      dl.style.display = 'inline-flex';
    } else {
      dl.style.display = 'none';
    }

    openModal('filePreviewModal');
  }

    // ================================================
  //  SECTION 19 : SEARCH
  // ================================================
  $('searchRecords').addEventListener('input', function () {
    searchQuery = this.value;
    renderRecords();
  });

  // ================================================
  //  SECTION 20 : PRINT PATIENT RECORD
  // ================================================
  $('printBtn').addEventListener('click', function () {
    let html = `
      <div class="print-header">
        <h2>NEW ERA PEDIATRIC</h2>
        <p>Patient Medical Record Summary</p>
      </div>
      <div class="print-patient-info">
        <div class="print-item"><label>Full Name</label><span>${esc(patient.name)}</span></div>
        <div class="print-item"><label>Age</label><span>${esc(patient.age)}</span></div>
        <div class="print-item"><label>Gender</label><span>${esc(patient.gender)}</span></div>
        <div class="print-item"><label>Date of Birth</label><span>${esc(fmtDate(patient.birthday))}</span></div>
        <div class="print-item"><label>Parent / Guardian</label><span>${esc(patient.guardian)}</span></div>
        <div class="print-item"><label>Contact</label><span>${esc(patient.contact)}</span></div>
        <div class="print-item"><label>Address</label><span>${esc(patient.address)}</span></div>
      </div>
      <h3 style="color:#1a3a5c;margin-bottom:14px;"><i class="fas fa-notes-medical" style="color:#2e86de;"></i> Medical History (${records.length} record${records.length !== 1 ? 's' : ''})</h3>
      <div class="print-records">`;

    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
      html += '<p style="color:#8e99aa;text-align:center;padding:20px;">No medical records available.</p>';
    } else {
      sorted.forEach(function (r) {
        html += `
        <div class="print-record-card">
          <h4><i class="fas fa-calendar-check" style="color:#2e86de;"></i> ${esc(fmtDate(r.date))}${r.doctor ? ' — Dr. ' + esc(r.doctor) : ''}</h4>
          <div class="pr-row"><span class="pr-label">Chief Complaint:</span><span class="pr-value">${esc(r.complaint)}</span></div>
          <div class="pr-row"><span class="pr-label">Diagnosis:</span><span class="pr-value">${esc(r.diagnosis)}</span></div>`;
        if (r.notes)       html += `<div class="pr-row"><span class="pr-label">Doctor's Notes:</span><span class="pr-value">${esc(r.notes)}</span></div>`;
        if (r.prescription)html += `<div class="pr-row"><span class="pr-label">Prescription:</span><span class="pr-value">${esc(r.prescription)}</span></div>`;
        if (r.treatment)   html += `<div class="pr-row"><span class="pr-label">Treatment:</span><span class="pr-value">${esc(r.treatment)}</span></div>`;
        html += `</div>`;
      });
    }

    if (files.length > 0) {
      html += `<h3 style="color:#1a3a5c;margin:20px 0 14px;"><i class="fas fa-file-medical" style="color:#2e86de;"></i> Attached Files (${files.length})</h3>`;
      files.forEach(function (f) {
        html += `<div class="pr-row" style="margin-bottom:4px;"><span class="pr-label">${esc(f.name)}:</span><span class="pr-value">${fmtSize(f.size)} — ${fmtDate(f.date)}</span></div>`;
      });
    }

    html += '</div>';
    html += `<p style="margin-top:24px;text-align:right;color:#8e99aa;font-size:.78rem;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`;

    $('printContent').innerHTML = html;
    openModal('printModal');
  });

  $('doPrintBtn').addEventListener('click', function () {
    const content = $('printContent').innerHTML;
    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast('Please allow pop-ups to print.', 'error');
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>New Era Pediatric - Patient Record</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>
          body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 30px; line-height: 1.7; }
          h2 { color: #1a3a5c; text-align: center; font-size: 1.6rem; letter-spacing: 1px; }
          h3 { color: #1a3a5c; font-size: 1.15rem; margin: 20px 0 12px; }
          .print-header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1a3a5c; }
          .print-header p { color: #8e99aa; text-transform: uppercase; letter-spacing: 1.5px; font-size: .82rem; }
          .print-patient-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px; }
          .print-item { background: #f7f8fc; padding: 10px 14px; border-radius: 6px; }
          .print-item label { font-size: .68rem; font-weight: 600; text-transform: uppercase; letter-spacing: .8px; color: #1b5fae; display: block; }
          .print-item span { font-size: .92rem; font-weight: 600; }
          .print-record-card { background: #f7f8fc; border-left: 4px solid #2e86de; border-radius: 6px; padding: 16px; margin-bottom: 12px; }
          .print-record-card h4 { color: #1a3a5c; margin-bottom: 10px; font-size: 1rem; }
          .pr-row { display: flex; gap: 8px; margin-bottom: 6px; font-size: .88rem; }
          .pr-label { font-weight: 600; color: #1b5fae; min-width: 130px; }
          .pr-value { color: #1e293b; white-space: pre-wrap; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWin.document.close();
    setTimeout(function () { printWin.print(); }, 600);
  });

  // ================================================
  //  SECTION 21 : RESET DEMO DATA
  // ================================================
  $('resetBtn').addEventListener('click', function () {
    pendingDelete = { type: 'reset', id: null, index: null };
    $('confirmMsg').textContent = 'Are you sure you want to reset ALL data back to demo data? All patient info, records, and files will be replaced.';
    openModal('confirmModal');
  });

  // Extend confirm handler for reset
  $('confirmDeleteBtn').addEventListener('click', function () {
    if (pendingDelete.type === 'reset') {
      clearStorage();
      patient = { ...DEMO_PATIENT };
      records = JSON.parse(JSON.stringify(DEMO_RECORDS));
      files   = JSON.parse(JSON.stringify(DEMO_FILES));
      saveToStorage();
      renderPatient();
      renderRecords();
      renderFiles();
      renderStats();
      closeModal('confirmModal');
      toast('All data has been reset to demo data.', 'info');
      pendingDelete = { type: null, id: null, index: null };
    }
  });

  // ================================================
  //  SECTION 22 : FORM VALIDATION HELPERS
  // ================================================
  function markFieldError(inputEl, message) {
    const group = inputEl.closest('.form-group');
    if (!group) return;
    group.classList.add('has-error');
    let errEl = group.querySelector('.field-error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'field-error';
      group.appendChild(errEl);
    }
    errEl.textContent = message;
  }

  function clearFormErrors(form) {
    if (!form) return;
    form.querySelectorAll('.form-group').forEach(function (g) {
      g.classList.remove('has-error');
    });
    form.querySelectorAll('.field-error').forEach(function (e) {
      e.remove();
    });
  }

  // Clear error on input
  document.addEventListener('input', function (e) {
    const group = e.target.closest('.form-group.has-error');
    if (group) {
      group.classList.remove('has-error');
      const errEl = group.querySelector('.field-error');
      if (errEl) errEl.remove();
    }
  });

  // ================================================
  //  SECTION 23 : RENDER ALL & INITIALIZE
  // ================================================
  function renderAll() {
    renderPatient();
    renderRecords();
    renderFiles();
    renderStats();
  }

  function init() {
    loadFromStorage();
    renderAll();
    console.log('%c NEW ERA PEDIATRIC %c Patient Records System Ready',
      'background:#1a3a5c;color:#fff;padding:4px 10px;border-radius:4px 0 0 4px;font-weight:700;',
      'background:#2e86de;color:#fff;padding:4px 10px;border-radius:0 4px 4px 0;'
    );
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();