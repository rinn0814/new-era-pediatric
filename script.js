// ============================================================
//  NEW ERA PEDIATRIC – Patient Medical Records
//  Multi-Patient Support with LocalStorage
// ============================================================

(function () {
  'use strict';

  // ================================================
  //  GET PATIENT ID FROM URL (?patient=xxx)
  // ================================================
  function getPatientIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('patient') || 'demo-patient-001';
  }

  const PATIENT_ID = getPatientIdFromURL();

  // ================================================
  //  STORAGE KEYS (per patient)
  // ================================================
  const KEYS = {
    patient: 'nep_patient_' + PATIENT_ID,
    records: 'nep_records_' + PATIENT_ID,
    files:   'nep_files_' + PATIENT_ID,
    list:    'nep_patient_list'
  };

  // ================================================
  //  DEMO DATA
  // ================================================
  const DEMO_PATIENT = {
    id: PATIENT_ID,
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
      id: 'demo_rec_1', date: '2025-01-10', doctor: 'Dr. Elena Santos',
      complaint: 'Persistent cough and low-grade fever for 3 days',
      diagnosis: 'Upper Respiratory Tract Infection (URTI)',
      notes: 'Patient presents with dry cough, slight rhinorrhea, and temperature of 37.8°C.',
      prescription: 'Paracetamol 250mg every 6 hours. Honey-cough syrup 5mL every 8 hours.',
      treatment: 'Adequate rest. Increase fluid intake. Follow-up in 1 week.'
    },
    {
      id: 'demo_rec_2', date: '2024-11-22', doctor: 'Dr. Elena Santos',
      complaint: 'Rash on both arms after eating shrimp',
      diagnosis: 'Allergic Contact Dermatitis',
      notes: 'Mild erythematous papular rash bilaterally. No respiratory distress.',
      prescription: 'Cetirizine 5mg once daily for 5 days.',
      treatment: 'Avoid seafood. Return if swelling or difficulty breathing.'
    },
    {
      id: 'demo_rec_3', date: '2024-08-15', doctor: 'Dr. Michael Reyes',
      complaint: 'Routine well-child checkup and vaccination',
      diagnosis: 'Normal growth and development',
      notes: 'Weight: 17.2 kg. Height: 108 cm. Milestones appropriate.',
      prescription: 'None required.',
      treatment: 'Continue balanced diet. Next visit in 6 months.'
    }
  ];

  // ================================================
  //  STATE
  // ================================================
  let patient = {};
  let records = [];
  let files = [];
  let searchQuery = '';

  // ================================================
  //  LOAD / SAVE
  // ================================================
  function loadFromStorage() {
    try {
      const p = localStorage.getItem(KEYS.patient);
      const r = localStorage.getItem(KEYS.records);
      const f = localStorage.getItem(KEYS.files);

      if (p) {
        patient = JSON.parse(p);
      } else if (PATIENT_ID === 'demo-patient-001') {
        patient = { ...DEMO_PATIENT };
      } else {
        patient = {
          id: PATIENT_ID, name: 'New Patient', age: '',
          gender: '', birthday: '', guardian: '',
          contact: '', address: '', avatar: ''
        };
      }

      if (r) {
        records = JSON.parse(r);
      } else if (PATIENT_ID === 'demo-patient-001') {
        records = JSON.parse(JSON.stringify(DEMO_RECORDS));
      } else {
        records = [];
      }

      files = f ? JSON.parse(f) : [];

    } catch (e) {
      console.warn('Load error:', e);
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(KEYS.patient, JSON.stringify(patient));
      localStorage.setItem(KEYS.records, JSON.stringify(records));
      localStorage.setItem(KEYS.files, JSON.stringify(files));
      updatePatientList();
    } catch (e) {
      console.warn('Save error:', e);
    }
  }

  function updatePatientList() {
    try {
      let list = JSON.parse(localStorage.getItem(KEYS.list) || '[]');
      const existing = list.find(p => p.id === PATIENT_ID);
      if (!existing) {
        list.push({ id: PATIENT_ID, name: patient.name || 'Unknown' });
      } else {
        existing.name = patient.name || 'Unknown';
      }
      localStorage.setItem(KEYS.list, JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  // ================================================
  //  DOM HELPERS
  // ================================================
  function $(id) { return document.getElementById(id); }
  function $qa(sel) { return document.querySelectorAll(sel); }

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
    const u = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
  }

  function today() { return new Date().toISOString().split('T')[0]; }
  function genId() { return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }

  function fileIcon(type) {
    if (!type) return 'fa-file';
    if (type.startsWith('image/')) return 'fa-file-image';
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('word') || type.includes('document')) return 'fa-file-word';
    return 'fa-file-medical';
  }

  // ================================================
  //  TOAST
  // ================================================
  let toastTimer = null;

  function toast(msg, type) {
    type = type || 'success';
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
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  // ================================================
  //  MODALS
  // ================================================
  function openModal(id) {
    closeAllModals();
    const m = $(id);
    if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
  }

  function closeModal(id) {
    const m = $(id);
    if (m) m.classList.remove('active');
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
  }

  function closeAllModals() {
    $qa('.modal-overlay').forEach(function (m) { m.classList.remove('active'); });
    document.body.style.overflow = '';
  }

  $qa('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === this) {
        this.classList.remove('active');
        if (!document.querySelector('.modal-overlay.active')) {
          document.body.style.overflow = '';
        }
      }
    });
  });

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-close]');
    if (btn) closeModal(btn.getAttribute('data-close'));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });

  // ================================================
  //  RENDER PATIENT
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
      img.onload = function () { wrap.classList.remove('show-fallback'); };
      img.onerror = function () { wrap.classList.add('show-fallback'); };
    } else {
      img.src = '';
      wrap.classList.add('show-fallback');
    }
  }

  // ================================================
  //  RENDER STATS
  // ================================================
  function renderStats() {
    $('statRecords').textContent = records.length;
    if (records.length > 0) {
      const sorted = records.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      $('statLastVisit').textContent = fmtDate(sorted[0].date);
    } else {
      $('statLastVisit').textContent = '—';
    }
    $('statFiles').textContent = files.length;
  }

    // ================================================
  //  RENDER RECORDS
  // ================================================
  function renderRecords() {
    const container = $('medicalHistory');
    const emptyMsg  = $('emptyMessage');
    const noResults = $('noResults');
    container.innerHTML = '';

    var list = records.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    if (searchQuery.trim() !== '') {
      var q = searchQuery.toLowerCase();
      list = list.filter(function (r) {
        return (r.complaint && r.complaint.toLowerCase().indexOf(q) !== -1) ||
               (r.diagnosis && r.diagnosis.toLowerCase().indexOf(q) !== -1) ||
               (r.doctor && r.doctor.toLowerCase().indexOf(q) !== -1) ||
               (r.notes && r.notes.toLowerCase().indexOf(q) !== -1) ||
               (r.prescription && r.prescription.toLowerCase().indexOf(q) !== -1) ||
               (r.treatment && r.treatment.toLowerCase().indexOf(q) !== -1) ||
               (r.date && r.date.indexOf(q) !== -1);
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
      var card = document.createElement('div');
      card.className = 'record-card';
      card.setAttribute('data-id', r.id);

      var detailHTML = '<div class="record-detail-item"><label><i class="fas fa-stethoscope"></i> Chief Complaint</label><p>' + esc(r.complaint) + '</p></div>' +
                       '<div class="record-detail-item"><label><i class="fas fa-diagnoses"></i> Diagnosis</label><p>' + esc(r.diagnosis) + '</p></div>';

      if (r.notes) detailHTML += '<div class="record-detail-item full-width"><label><i class="fas fa-clipboard"></i> Doctor\'s Notes</label><p>' + esc(r.notes) + '</p></div>';
      if (r.prescription) detailHTML += '<div class="record-detail-item"><label><i class="fas fa-prescription"></i> Prescription</label><p>' + esc(r.prescription) + '</p></div>';
      if (r.treatment) detailHTML += '<div class="record-detail-item"><label><i class="fas fa-hand-holding-medical"></i> Treatment</label><p>' + esc(r.treatment) + '</p></div>';

      card.innerHTML = '<div class="record-card-header">' +
        '<div class="record-date"><i class="fas fa-calendar-check"></i> ' + esc(fmtDate(r.date)) +
        (r.doctor ? ' <span class="record-doctor"><i class="fas fa-user-md"></i> Dr. ' + esc(r.doctor) + '</span>' : '') + '</div>' +
        '<div class="record-actions">' +
        '<button class="btn btn-sm btn-outline" data-action="view" data-id="' + esc(r.id) + '"><i class="fas fa-eye"></i> View</button>' +
        '<button class="btn btn-sm btn-primary" data-action="edit" data-id="' + esc(r.id) + '"><i class="fas fa-pen"></i> Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="delete" data-id="' + esc(r.id) + '"><i class="fas fa-trash"></i> Delete</button>' +
        '</div></div><div class="record-details">' + detailHTML + '</div>';

      container.appendChild(card);
    });
  }

  // ================================================
  //  RENDER FILES
  // ================================================
  function renderFiles() {
    var list = $('fileList');
    var emptyMsg = $('emptyFiles');
    list.innerHTML = '';

    if (files.length === 0) {
      emptyMsg.classList.remove('hidden');
      return;
    }
    emptyMsg.classList.add('hidden');

    files.forEach(function (f, idx) {
      var li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = '<div class="file-info"><div class="file-icon"><i class="fas ' + fileIcon(f.type) + '"></i></div>' +
        '<div class="file-meta"><div class="file-name" title="' + esc(f.name) + '">' + esc(f.name) + '</div>' +
        '<div class="file-size">' + fmtSize(f.size) + ' &bull; ' + fmtDate(f.upload_date || f.date) + '</div></div></div>' +
        '<div class="file-actions">' +
        '<button class="btn btn-sm btn-outline" data-action="viewFile" data-index="' + idx + '" title="Preview"><i class="fas fa-eye"></i></button>' +
        '<button class="btn btn-sm btn-danger" data-action="deleteFile" data-index="' + idx + '" title="Remove"><i class="fas fa-trash"></i></button></div>';
      list.appendChild(li);
    });
  }

  // ================================================
  //  EVENT DELEGATION
  // ================================================
  $('medicalHistory').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');
    if (action === 'view') viewRecord(id);
    if (action === 'edit') editRecord(id);
    if (action === 'delete') confirmDeleteRecord(id);
  });

  $('fileList').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var idx = parseInt(btn.getAttribute('data-index'), 10);
    if (action === 'viewFile') previewFile(idx);
    if (action === 'deleteFile') confirmDeleteFile(idx);
  });

  // ================================================
  //  PATIENT EDIT
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
    clearFormErrors($('patientForm'));
    var fields = [
      { id: 'editName', label: 'Full Name' }, { id: 'editAge', label: 'Age' },
      { id: 'editGender', label: 'Gender' }, { id: 'editBirthday', label: 'Date of Birth' },
      { id: 'editGuardian', label: 'Parent / Guardian' }, { id: 'editContact', label: 'Contact' },
      { id: 'editAddress', label: 'Address' }
    ];
    var valid = true;
    fields.forEach(function (f) {
      var el = $(f.id);
      if (!el.value.trim()) { markFieldError(el, f.label + ' is required.'); valid = false; }
    });
    if (!valid) { toast('Please fill in all required fields.', 'error'); return; }

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
  //  ADD / EDIT RECORD
  // ================================================
  $('addRecordBtn').addEventListener('click', function () {
    $('recordForm').reset();
    $('recordId').value = '';
    $('recDate').value = today();
    $('recordModalTitle').innerHTML = '<i class="fas fa-file-medical"></i> Add Medical Record';
    $('saveRecordText').textContent = 'Save Record';
    clearFormErrors($('recordForm'));
    openModal('recordModal');
  });

  $('saveRecordBtn').addEventListener('click', function () {
    clearFormErrors($('recordForm'));
    var id = $('recordId').value.trim();
    var date = $('recDate').value;
    var doctor = $('recDoctor').value.trim();
    var complaint = $('recComplaint').value.trim();
    var diagnosis = $('recDiagnosis').value.trim();
    var notes = $('recNotes').value.trim();
    var prescription = $('recPrescription').value.trim();
    var treatment = $('recTreatment').value.trim();

    var valid = true;
    if (!date) { markFieldError($('recDate'), 'Date of visit is required.'); valid = false; }
    if (!complaint) { markFieldError($('recComplaint'), 'Chief complaint is required.'); valid = false; }
    if (!diagnosis) { markFieldError($('recDiagnosis'), 'Diagnosis is required.'); valid = false; }
    if (!valid) { toast('Please fill in all required fields.', 'error'); return; }

    if (id) {
      var idx = records.findIndex(function (r) { return r.id === id; });
      if (idx !== -1) {
        records[idx] = Object.assign({}, records[idx], { date: date, doctor: doctor, complaint: complaint, diagnosis: diagnosis, notes: notes, prescription: prescription, treatment: treatment });
        toast('Medical record updated successfully!');
      }
    } else {
      records.push({ id: genId(), date: date, doctor: doctor, complaint: complaint, diagnosis: diagnosis, notes: notes, prescription: prescription, treatment: treatment });
      toast('Medical record added successfully!');
    }

    saveToStorage();
    renderRecords();
    renderStats();
    closeModal('recordModal');
    $('recordForm').reset();
    $('recordId').value = '';
  });

  function editRecord(id) {
    var r = records.find(function (rec) { return rec.id === id; });
    if (!r) return;
    $('recordId').value = r.id;
    $('recDate').value = r.date || '';
    $('recDoctor').value = r.doctor || '';
    $('recComplaint').value = r.complaint || '';
    $('recDiagnosis').value = r.diagnosis || '';
    $('recNotes').value = r.notes || '';
    $('recPrescription').value = r.prescription || '';
    $('recTreatment').value = r.treatment || '';
    $('recordModalTitle').innerHTML = '<i class="fas fa-pen"></i> Edit Medical Record';
    $('saveRecordText').textContent = 'Update Record';
    clearFormErrors($('recordForm'));
    openModal('recordModal');
  }

  // ================================================
  //  VIEW RECORD
  // ================================================
  function viewRecord(id) {
    var r = records.find(function (rec) { return rec.id === id; });
    if (!r) return;
    var html = '<div class="view-grid">';
    html += '<div class="view-item"><label>Date of Visit</label><p>' + esc(fmtDate(r.date)) + '</p></div>';
    if (r.doctor) html += '<div class="view-item"><label>Doctor</label><p>Dr. ' + esc(r.doctor) + '</p></div>';
    html += '<div class="view-item"><label>Chief Complaint</label><p>' + esc(r.complaint) + '</p></div>';
    html += '<div class="view-item"><label>Diagnosis</label><p>' + esc(r.diagnosis) + '</p></div>';
    if (r.notes) html += '<div class="view-item"><label>Doctor\'s Notes</label><p>' + esc(r.notes) + '</p></div>';
    if (r.prescription) html += '<div class="view-item"><label>Prescription</label><p>' + esc(r.prescription) + '</p></div>';
    if (r.treatment) html += '<div class="view-item"><label>Treatment</label><p>' + esc(r.treatment) + '</p></div>';
    html += '</div>';
    $('viewContent').innerHTML = html;
    openModal('viewModal');
  }

  // ================================================
  //  DELETE CONFIRMATION
  // ================================================
  var pendingDelete = { type: null, id: null, index: null };

  function confirmDeleteRecord(id) {
    pendingDelete = { type: 'record', id: id, index: null };
    $('confirmMsg').textContent = 'Are you sure you want to delete this medical record? This action cannot be undone.';
    openModal('confirmModal');
  }

  function confirmDeleteFile(idx) {
    pendingDelete = { type: 'file', id: null, index: idx };
    var name = files[idx] ? files[idx].name : 'this file';
    $('confirmMsg').textContent = 'Are you sure you want to remove "' + name + '"?';
    openModal('confirmModal');
  }

  $('confirmDeleteBtn').addEventListener('click', function () {
    if (pendingDelete.type === 'record') {
      records = records.filter(function (r) { return r.id !== pendingDelete.id; });
      saveToStorage();
      renderRecords();
      renderStats();
      toast('Medical record deleted successfully!');
    } else if (pendingDelete.type === 'file') {
      var name = files[pendingDelete.index] ? files[pendingDelete.index].name : 'File';
      files.splice(pendingDelete.index, 1);
      saveToStorage();
      renderFiles();
      renderStats();
      toast('File "' + name + '" removed.');
    } else if (pendingDelete.type === 'reset') {
      if (PATIENT_ID === 'demo-patient-001') {
        patient = Object.assign({}, DEMO_PATIENT);
        records = JSON.parse(JSON.stringify(DEMO_RECORDS));
      } else {
        patient = { id: PATIENT_ID, name: 'New Patient', age: '', gender: '', birthday: '', guardian: '', contact: '', address: '', avatar: '' };
        records = [];
      }
      files = [];
      saveToStorage();
      renderPatient();
      renderRecords();
      renderFiles();
      renderStats();
      toast('Data reset.', 'info');
    }
    closeModal('confirmModal');
    pendingDelete = { type: null, id: null, index: null };
  });

    // ================================================
  //  FILE UPLOAD
  // ================================================
  var fileInput = $('fileInput');
  var dropZone = $('dropZone');

  $('uploadFileBtn').addEventListener('click', function () { fileInput.click(); });
  dropZone.addEventListener('click', function () { fileInput.click(); });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault(); e.stopPropagation(); this.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault(); e.stopPropagation(); this.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault(); e.stopPropagation(); this.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', function (e) {
    handleFiles(e.target.files);
    e.target.value = '';
  });

  function handleFiles(fileList) {
    var selected = Array.from(fileList);
    if (selected.length === 0) return;
    var MAX_SIZE = 5 * 1024 * 1024;
    var success = 0, fail = 0, processed = 0;

    selected.forEach(function (file) {
      if (file.size > MAX_SIZE) {
        toast('"' + file.name + '" is too large (max 5 MB).', 'error');
        fail++; processed++; checkDone();
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        files.push({
          id: genId(), name: file.name, type: file.type,
          size: file.size, data: e.target.result, upload_date: today()
        });
        saveToStorage();
        success++; processed++; checkDone();
      };
      reader.onerror = function () { fail++; processed++; checkDone(); };
      reader.readAsDataURL(file);
    });

    function checkDone() {
      if (processed < selected.length) return;
      renderFiles();
      renderStats();
      if (success > 0) toast(success + ' file(s) uploaded successfully!');
    }
  }

  // ================================================
  //  FILE PREVIEW
  // ================================================
  function previewFile(idx) {
    var f = files[idx];
    if (!f) return;
    var content = '<div class="file-preview-area">';
    if (f.data && f.data.indexOf('data:image') === 0) {
      content += '<img src="' + f.data + '" alt="' + esc(f.name) + '" />';
    } else if (f.data && f.data.indexOf('data:application/pdf') === 0) {
      content += '<iframe src="' + f.data + '" width="100%" height="500" style="border:none;border-radius:8px;"></iframe>';
    } else {
      content += '<div style="padding:40px;"><i class="fas fa-file-medical" style="font-size:4rem;color:#2e86de;opacity:.5;"></i><p style="margin-top:12px;color:#8e99aa;">Preview not available.</p></div>';
    }
    content += '</div><div class="file-preview-info">' +
      '<p><strong>File Name:</strong> ' + esc(f.name) + '</p>' +
      '<p><strong>File Type:</strong> ' + esc(f.type || 'Unknown') + '</p>' +
      '<p><strong>File Size:</strong> ' + fmtSize(f.size) + '</p>' +
      '<p><strong>Upload Date:</strong> ' + fmtDate(f.upload_date || f.date) + '</p></div>';
    $('filePreviewContent').innerHTML = content;

    var dl = $('downloadFileLink');
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
  //  SEARCH
  // ================================================
  $('searchRecords').addEventListener('input', function () {
    searchQuery = this.value;
    renderRecords();
  });

  // ================================================
  //  PRINT
  // ================================================
  $('printBtn').addEventListener('click', function () {
    var html = '<div class="print-header"><h2>NEW ERA PEDIATRIC</h2><p>Patient Medical Record Summary</p></div>' +
      '<div class="print-patient-info">' +
      '<div class="print-item"><label>Full Name</label><span>' + esc(patient.name) + '</span></div>' +
      '<div class="print-item"><label>Age</label><span>' + esc(patient.age) + '</span></div>' +
      '<div class="print-item"><label>Gender</label><span>' + esc(patient.gender) + '</span></div>' +
      '<div class="print-item"><label>Date of Birth</label><span>' + esc(fmtDate(patient.birthday)) + '</span></div>' +
      '<div class="print-item"><label>Parent / Guardian</label><span>' + esc(patient.guardian) + '</span></div>' +
      '<div class="print-item"><label>Contact</label><span>' + esc(patient.contact) + '</span></div>' +
      '<div class="print-item"><label>Address</label><span>' + esc(patient.address) + '</span></div></div>' +
      '<h3 style="color:#1a3a5c;margin-bottom:14px;">Medical History (' + records.length + ' record' + (records.length !== 1 ? 's' : '') + ')</h3><div class="print-records">';

    var sorted = records.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (sorted.length === 0) {
      html += '<p style="color:#8e99aa;text-align:center;padding:20px;">No medical records available.</p>';
    } else {
      sorted.forEach(function (r) {
        html += '<div class="print-record-card"><h4>' + esc(fmtDate(r.date)) + (r.doctor ? ' — Dr. ' + esc(r.doctor) : '') + '</h4>' +
          '<div class="pr-row"><span class="pr-label">Chief Complaint:</span><span class="pr-value">' + esc(r.complaint) + '</span></div>' +
          '<div class="pr-row"><span class="pr-label">Diagnosis:</span><span class="pr-value">' + esc(r.diagnosis) + '</span></div>';
        if (r.notes) html += '<div class="pr-row"><span class="pr-label">Notes:</span><span class="pr-value">' + esc(r.notes) + '</span></div>';
        if (r.prescription) html += '<div class="pr-row"><span class="pr-label">Prescription:</span><span class="pr-value">' + esc(r.prescription) + '</span></div>';
        if (r.treatment) html += '<div class="pr-row"><span class="pr-label">Treatment:</span><span class="pr-value">' + esc(r.treatment) + '</span></div>';
        html += '</div>';
      });
    }
    html += '</div><p style="margin-top:24px;text-align:right;color:#8e99aa;font-size:.78rem;">Generated on ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
    $('printContent').innerHTML = html;
    openModal('printModal');
  });

  $('doPrintBtn').addEventListener('click', function () {
    var content = $('printContent').innerHTML;
    var win = window.open('', '_blank');
    if (!win) { toast('Please allow pop-ups to print.', 'error'); return; }
    win.document.write('<!DOCTYPE html><html><head><title>New Era Pediatric</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>' +
      '<style>body{font-family:Inter,sans-serif;color:#1e293b;padding:30px;line-height:1.7}' +
      'h2{color:#1a3a5c;text-align:center;font-size:1.6rem}h3{color:#1a3a5c;font-size:1.15rem}' +
      '.print-header{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1a3a5c}' +
      '.print-header p{color:#8e99aa;text-transform:uppercase;letter-spacing:1.5px;font-size:.82rem}' +
      '.print-patient-info{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:24px}' +
      '.print-item{background:#f7f8fc;padding:10px 14px;border-radius:6px}' +
      '.print-item label{font-size:.68rem;font-weight:600;text-transform:uppercase;color:#1b5fae;display:block}' +
      '.print-item span{font-size:.92rem;font-weight:600}' +
      '.print-record-card{background:#f7f8fc;border-left:4px solid #2e86de;border-radius:6px;padding:16px;margin-bottom:12px}' +
      '.print-record-card h4{color:#1a3a5c;margin-bottom:10px}' +
      '.pr-row{display:flex;gap:8px;margin-bottom:6px;font-size:.88rem}' +
      '.pr-label{font-weight:600;color:#1b5fae;min-width:130px}' +
      '.pr-value{white-space:pre-wrap}</style></head><body>' + content + '</body></html>');
    win.document.close();
    setTimeout(function () { win.print(); }, 600);
  });

  // ================================================
  //  RESET
  // ================================================
  $('resetBtn').addEventListener('click', function () {
    pendingDelete = { type: 'reset', id: null, index: null };
    $('confirmMsg').textContent = 'Reset ALL data for this patient? This cannot be undone.';
    openModal('confirmModal');
  });

  // ================================================
  //  FORM VALIDATION
  // ================================================
  function markFieldError(inputEl, message) {
    var group = inputEl.closest('.form-group');
    if (!group) return;
    group.classList.add('has-error');
    var err = group.querySelector('.field-error');
    if (!err) { err = document.createElement('div'); err.className = 'field-error'; group.appendChild(err); }
    err.textContent = message;
  }

  function clearFormErrors(form) {
    if (!form) return;
    form.querySelectorAll('.form-group').forEach(function (g) { g.classList.remove('has-error'); });
    form.querySelectorAll('.field-error').forEach(function (e) { e.remove(); });
  }

  document.addEventListener('input', function (e) {
    var group = e.target.closest('.form-group.has-error');
    if (group) {
      group.classList.remove('has-error');
      var err = group.querySelector('.field-error');
      if (err) err.remove();
    }
  });

  // ================================================
  //  INITIALIZE
  // ================================================
  function init() {
    loadFromStorage();
    renderPatient();
    renderRecords();
    renderFiles();
    renderStats();
    updatePatientList();
    console.log('%c NEW ERA PEDIATRIC %c Patient: ' + PATIENT_ID,
      'background:#1a3a5c;color:#fff;padding:4px 10px;border-radius:4px 0 0 4px;font-weight:700;',
      'background:#2e86de;color:#fff;padding:4px 10px;border-radius:0 4px 4px 0;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();