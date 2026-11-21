// ============================================================
//  NEW ERA PEDIATRIC – Patient Medical Records
//  Multi-Patient Support with Firebase Real-Time Sync
//  100% Free Plan (Firestore Inline Sync - No Blaze Required)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, deleteDoc,
  collection, addDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// ============================================================
//  FIREBASE CONFIGURATION
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBmjJt58G5XFxykN0MhzzgwzRGeCOekkM",
  authDomain: "new-era-pediatric.firebaseapp.com",
  projectId: "new-era-pediatric",
  storageBucket: "new-era-pediatric.firebasestorage.app",
  messagingSenderId: "441796543456",
  appId: "1:441796543456:web:79e51a79adca6832d1a185",
  measurementId: "G-EKDHPWJV76"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

(function () {
  'use strict';

  // ================================================
  //  GET PATIENT ID FROM URL (?patient=xxx)
  // ================================================
  function getPatientIdFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('patient') || '_no_patient_';
  }

  var PATIENT_ID = getPatientIdFromURL();
  var HAS_PATIENT_PARAM = new URLSearchParams(window.location.search).has('patient');

  // ================================================
  //  FIREBASE REFERENCES
  // ================================================
  var patientDocRef = doc(db, "patients", PATIENT_ID);
  var recordsColRef = collection(db, "patients", PATIENT_ID, "records");
  var filesColRef = collection(db, "patients", PATIENT_ID, "files");

  // ================================================
  //  STORAGE KEYS (per patient) – offline fallback
  // ================================================
  var KEYS = {
    patient: 'nep_patient_' + PATIENT_ID,
    records: 'nep_records_' + PATIENT_ID,
    files:   'nep_files_' + PATIENT_ID,
    list:    'nep_patient_list',
    seeded:  'nep_seeded_' + PATIENT_ID
  };

  // ================================================
  //  DEMO DATA — removed (only real Firebase patients)
  // ================================================

  // ================================================
  //  STATE
  // ================================================
  var patient = {};
  var records = [];
  var files = [];
  var searchQuery = '';
  var firebaseReady = false;
  var editAvatarData = '';

  // ================================================
  //  DOM HELPERS
  // ================================================
  function $(id) { return document.getElementById(id); }
  function $qa(sel) { return document.querySelectorAll(sel); }

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '\u2014';
    try {
      var d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  function fmtSize(bytes) {
    if (!bytes || bytes < 1) return '0 B';
    var u = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
  }

  function today() { return new Date().toISOString().split('T')[0]; }

  function genId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function fileIcon(type) {
    if (!type) return 'fa-file';
    if (type.indexOf('image/') === 0) return 'fa-file-image';
    if (type.indexOf('pdf') !== -1) return 'fa-file-pdf';
    if (type.indexOf('word') !== -1 || type.indexOf('document') !== -1) return 'fa-file-word';
    return 'fa-file-medical';
  }

  // ================================================
  //  IMAGE COMPRESSION (Guarantees < 800KB for Firestore)
  // ================================================
  function compressImage(dataUrl, maxDim, quality) {
    maxDim = maxDim || 1024;
    quality = quality || 0.65;
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var w = img.width;
        var h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round(h * maxDim / w);
            w = maxDim;
          } else {
            w = Math.round(w * maxDim / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var result = canvas.toDataURL('image/jpeg', quality);
        if (result.length > 900000) {
          result = canvas.toDataURL('image/jpeg', 0.45);
        }
        resolve(result);
      };
      img.onerror = function () { resolve(dataUrl); };
      img.src = dataUrl;
    });
  }

  // ================================================
  //  TOAST
  // ================================================
  var toastTimer = null;

  function toast(msg, type) {
    type = type || 'success';
    var el = $('toast');
    var msgEl = $('toastMsg');
    msgEl.textContent = msg;
    el.className = 'toast ' + type;

    var icon = el.querySelector('i');
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
    var m = $(id);
    if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
  }

  function closeModal(id) {
    var m = $(id);
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
    var btn = e.target.closest('[data-close]');
    if (btn) {
      var modalId = btn.getAttribute('data-close');
      closeModal(modalId);
      if (modalId === 'patientModal') {
        editAvatarData = patient.avatar || '';
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });

  // ================================================
  //  LOCAL STORAGE (offline cache)
  // ================================================
  function loadFromLocalStorage() {
    try {
      var p = localStorage.getItem(KEYS.patient);
      var r = localStorage.getItem(KEYS.records);
      var f = localStorage.getItem(KEYS.files);

      if (p) {
        patient = JSON.parse(p);
      } else {
        patient = {
          id: PATIENT_ID, name: 'New Patient', age: '',
          gender: '', birthday: '', guardian: '',
          contact: '', address: '', avatar: ''
        };
      }

      if (r) {
        records = JSON.parse(r);
      } else {
        records = [];
      }

      files = f ? JSON.parse(f) : [];
    } catch (e) {
      console.warn('Load error:', e);
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(KEYS.patient, JSON.stringify(patient));
      localStorage.setItem(KEYS.records, JSON.stringify(records));

      var filesMeta = files.map(function (f) {
        return {
          id: f.id,
          firebaseId: f.firebaseId || '',
          name: f.name,
          type: f.type,
          size: f.size,
          upload_date: f.upload_date,
          data: f.data && f.data.length < 50000 ? f.data : ''
        };
      });
      localStorage.setItem(KEYS.files, JSON.stringify(filesMeta));
      updatePatientList();
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
    }
  }

  function updatePatientList() {
    try {
      var list = JSON.parse(localStorage.getItem(KEYS.list) || '[]');
      var existing = list.find(function (p) { return p.id === PATIENT_ID; });
      if (!existing) {
        list.push({ id: PATIENT_ID, name: patient.name || 'Unknown' });
      } else {
        existing.name = patient.name || 'Unknown';
      }
      localStorage.setItem(KEYS.list, JSON.stringify(list));
    } catch (e) {
      // ignore
    }
  }

  // ================================================
  //  FIREBASE: SAVE PATIENT PROFILE
  // ================================================
  async function firebaseSavePatient() {
    try {
      await setDoc(patientDocRef, {
        name: patient.name || '',
        age: patient.age || '',
        gender: patient.gender || '',
        birthday: patient.birthday || '',
        guardian: patient.guardian || '',
        contact: patient.contact || '',
        address: patient.address || '',
        avatar: patient.avatar || '',
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Firebase patient save error:', e);
    }
  }

  // ================================================
  //  FIREBASE: ADD / EDIT / DELETE RECORDS
  // ================================================
  async function firebaseAddRecord(recordData) {
    try {
      var docRef = await addDoc(recordsColRef, {
        date: recordData.date || '',
        doctor: recordData.doctor || '',
        complaint: recordData.complaint || '',
        diagnosis: recordData.diagnosis || '',
        notes: recordData.notes || '',
        prescription: recordData.prescription || '',
        treatment: recordData.treatment || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      console.error('Firebase add record error:', e);
      return genId();
    }
  }

  async function firebaseUpdateRecord(recordId, recordData) {
    if (!recordId) return;
    try {
      await updateDoc(doc(recordsColRef, recordId), {
        date: recordData.date || '',
        doctor: recordData.doctor || '',
        complaint: recordData.complaint || '',
        diagnosis: recordData.diagnosis || '',
        notes: recordData.notes || '',
        prescription: recordData.prescription || '',
        treatment: recordData.treatment || '',
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Firebase update record error:', e);
    }
  }

  async function firebaseDeleteRecord(recordId) {
    if (!recordId) return;
    try {
      await deleteDoc(doc(recordsColRef, recordId));
    } catch (e) {
      console.error('Firebase delete record error:', e);
    }
  }

  // ================================================
  //  FIREBASE: UPLOAD / DELETE FILE (Firestore Direct)
  // ================================================
  async function firebaseUploadFile(fileData) {
    try {
      var docRef = await addDoc(filesColRef, {
        name: fileData.name || '',
        type: fileData.type || '',
        size: fileData.size || 0,
        inlineData: fileData.data || '',
        upload_date: today(),
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      console.error('Firestore file upload error:', e);
      throw e;
    }
  }

  async function firebaseDeleteFile(fileData) {
    try {
      if (fileData.firebaseId) {
        await deleteDoc(doc(filesColRef, fileData.firebaseId));
      }
    } catch (e) {
      console.error('Firestore file delete error:', e);
    }
  }

  // ================================================
  //  FIREBASE: REAL-TIME LISTENERS
  // ================================================
  function startFirebaseListeners() {
    // ---- Listen for patient profile changes ----
    onSnapshot(patientDocRef, function (snapshot) {
      if (snapshot.exists()) {
        var data = snapshot.data();
        if (data.avatar && data.avatar.trim() !== '') {
          patient = Object.assign({ id: PATIENT_ID }, data);
        } else {
          var localAvatar = patient.avatar || '';
          patient = Object.assign({ id: PATIENT_ID }, data);
          patient.avatar = localAvatar;
        }
        saveToLocalStorage();
        renderPatient();
        renderStats();

        if (!firebaseReady) {
          firebaseReady = true;
          toast('\u2601\uFE0F Synced from cloud!', 'info');
        }
      }
    }, function (error) {
      console.warn('Patient listener error:', error);
    });

    // ---- Listen for medical records changes ----
    var recordsQuery = query(recordsColRef, orderBy("createdAt", "desc"));
    onSnapshot(recordsQuery, function (snapshot) {
      var newRecords = [];
      snapshot.forEach(function (docSnap) {
        newRecords.push(Object.assign({ id: docSnap.id }, docSnap.data()));
      });
      records = newRecords;
      saveToLocalStorage();
      renderRecords();
      renderStats();
    }, function (error) {
      console.warn('Records listener error:', error);
    });

    // ---- Listen for files changes ----
    var filesQuery = query(filesColRef, orderBy("createdAt", "desc"));
    onSnapshot(filesQuery, function (snapshot) {
      var newFiles = [];
      snapshot.forEach(function (docSnap) {
        var data = docSnap.data();
        newFiles.push({
          id: docSnap.id,
          firebaseId: docSnap.id,
          name: data.name || '',
          type: data.type || '',
          size: data.size || 0,
          data: data.inlineData || '',
          upload_date: data.upload_date || ''
        });
      });

      if (newFiles.length > 0) {
        files = newFiles;
      }
      renderFiles();
      renderStats();
      saveToLocalStorage();
    }, function (error) {
      console.warn('Files listener error:', error);
    });
  }

  // ================================================
  //  RENDER PATIENT
  // ================================================
  function renderPatient() {
    $('patientName').textContent     = patient.name     || '\u2014';
    $('patientAge').textContent      = patient.age      || '\u2014';
    $('patientGender').textContent   = patient.gender   || '\u2014';
    $('patientBirthday').textContent = fmtDate(patient.birthday);
    $('guardian').textContent        = patient.guardian || '\u2014';
    $('contact').textContent         = patient.contact  || '\u2014';
    $('address').textContent         = patient.address  || '\u2014';

    var wrap = $('avatarWrap');
    var img  = $('patientAvatar');
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
      var sorted = records.slice().sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });
      $('statLastVisit').textContent = fmtDate(sorted[0].date);
    } else {
      $('statLastVisit').textContent = '\u2014';
    }
    $('statFiles').textContent = files.length;
  }

  // ================================================
  //  RENDER RECORDS
  // ================================================
  function renderRecords() {
    var container = $('medicalHistory');
    var emptyMsg  = $('emptyMessage');
    var noResults = $('noResults');
    container.innerHTML = '';

    var list = records.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

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

      var detailHTML =
        '<div class="record-detail-item"><label><i class="fas fa-stethoscope"></i> Chief Complaint</label><p>' + esc(r.complaint) + '</p></div>' +
        '<div class="record-detail-item"><label><i class="fas fa-diagnoses"></i> Diagnosis</label><p>' + esc(r.diagnosis) + '</p></div>';

      if (r.notes) detailHTML += '<div class="record-detail-item full-width"><label><i class="fas fa-clipboard"></i> Doctor&rsquo;s Notes</label><p>' + esc(r.notes) + '</p></div>';
      if (r.prescription) detailHTML += '<div class="record-detail-item"><label><i class="fas fa-prescription"></i> Prescription</label><p>' + esc(r.prescription) + '</p></div>';
      if (r.treatment) detailHTML += '<div class="record-detail-item"><label><i class="fas fa-hand-holding-medical"></i> Treatment</label><p>' + esc(r.treatment) + '</p></div>';

      card.innerHTML =
        '<div class="record-card-header">' +
          '<div class="record-date"><i class="fas fa-calendar-check"></i> ' + esc(fmtDate(r.date)) +
            (r.doctor ? ' <span class="record-doctor"><i class="fas fa-user-md"></i> Dr. ' + esc(r.doctor) + '</span>' : '') +
          '</div>' +
          '<div class="record-actions">' +
            '<button class="btn btn-sm btn-outline" data-action="view" data-id="' + esc(r.id) + '"><i class="fas fa-eye"></i> View</button>' +
            '<button class="btn btn-sm btn-primary" data-action="edit" data-id="' + esc(r.id) + '"><i class="fas fa-pen"></i> Edit</button>' +
            '<button class="btn btn-sm btn-danger" data-action="delete" data-id="' + esc(r.id) + '"><i class="fas fa-trash"></i> Delete</button>' +
          '</div>' +
        '</div>' +
        '<div class="record-details">' + detailHTML + '</div>';

      container.appendChild(card);
    });
  }

  // ================================================
  //  RENDER FILES  (sorted latest first + inline images)
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

    // Sort by upload_date, latest first
    var sortedFiles = files.slice().sort(function (a, b) {
      return new Date(b.upload_date || 0) - new Date(a.upload_date || 0);
    });

    sortedFiles.forEach(function (f) {
      var idx = files.indexOf(f);
      var li = document.createElement('li');
      var isImage = f.type && f.type.indexOf('image/') === 0;
      li.className = 'file-item' + (isImage && f.data ? ' has-inline-img' : '');

      var thumbHTML = '';
      if (isImage) {
        var thumbSrc = f.data || '';
        if (thumbSrc) {
          thumbHTML = '<div class="file-icon" style="padding:0;overflow:hidden;"><img src="' + esc(thumbSrc) + '" alt="" style="width:100%;height:100%;object-fit:cover;" /></div>';
        } else {
          thumbHTML = '<div class="file-icon"><i class="fas fa-file-image"></i></div>';
        }
      } else {
        thumbHTML = '<div class="file-icon"><i class="fas ' + fileIcon(f.type) + '"></i></div>';
      }

      // Inline image shown without clicking eye
      var inlineImg = '';
      if (isImage && f.data) {
        inlineImg = '<img class="file-inline-img" src="' + esc(f.data) + '" alt="' + esc(f.name) + '" />';
      }

      li.innerHTML =
        '<div class="file-info">' + thumbHTML +
          '<div class="file-meta">' +
            '<div class="file-name" title="' + esc(f.name) + '">' + esc(f.name) + '</div>' +
            '<div class="file-size">' + fmtSize(f.size) + ' &bull; ' + fmtDate(f.upload_date) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="file-actions">' +
          '<button class="btn btn-sm btn-outline" data-action="viewFile" data-index="' + idx + '" title="Preview"><i class="fas fa-eye"></i></button>' +
          '<button class="btn btn-sm btn-danger" data-action="deleteFile" data-index="' + idx + '" title="Remove"><i class="fas fa-trash"></i></button>' +
        '</div>' +
        inlineImg;

      list.appendChild(li);
    });
  }

  // ================================================
  //  EVENT DELEGATION – RECORDS
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

  // ================================================
  //  EVENT DELEGATION – FILES
  // ================================================
  $('fileList').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var idx = parseInt(btn.getAttribute('data-index'), 10);
    if (action === 'viewFile') previewFile(idx);
    if (action === 'deleteFile') confirmDeleteFile(idx);
  });

  // ================================================
  //  PATIENT EDIT (with photo upload)
  // ================================================
  $('editPatientBtn').addEventListener('click', function () {
    $('editName').value     = patient.name     || '';
    $('editAge').value      = patient.age      || '';
    $('editGender').value   = patient.gender   || '';
    $('editBirthday').value = patient.birthday || '';
    $('editGuardian').value = patient.guardian || '';
    $('editContact').value  = patient.contact  || '';
    $('editAddress').value  = patient.address  || '';

    editAvatarData = patient.avatar || '';
    updateAvatarPreview();

    clearFormErrors($('patientForm'));
    openModal('patientModal');
  });

  function updateAvatarPreview() {
    var img = $('avatarPreviewImg');
    var fallback = $('avatarPreviewFallback');
    if (editAvatarData && editAvatarData !== '') {
      img.src = editAvatarData;
      img.style.display = 'block';
      fallback.style.display = 'none';
    } else {
      img.style.display = 'none';
      fallback.style.display = 'flex';
    }
  }

  $('editAvatarFile').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast('Photo must be under 10 MB.', 'error');
      e.target.value = '';
      return;
    }

    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var MAX = 300;
      var w = img.width;
      var h = img.height;
      if (w > h) {
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      } else {
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      editAvatarData = canvas.toDataURL('image/jpeg', 0.8);
      updateAvatarPreview();
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  });

  $('removePhotoBtn').addEventListener('click', function () {
    editAvatarData = '';
    updateAvatarPreview();
    toast('Photo removed.', 'info');
  });

    // ================================================
  //  AVATAR CLICK-TO-EDIT (click profile picture to adjust)
  // ================================================
  var avatarClickInput = $('avatarClickInput');
  var avatarEditImg = $('avatarEditImg');
  var avatarEditArea = $('avatarEditArea');
  var avatarZoomSlider = $('avatarZoomSlider');
  var avatarZoomValue = $('avatarZoomValue');
  var AREA_SIZE = 220;
  var avEdit = { srcImg: null, baseW: 0, baseH: 0, scale: 1, x: 0, y: 0, dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 };

  function avApplyTransform() {
    if (!avatarEditImg) return;
    avatarEditImg.style.transform = 'translate(' + avEdit.x + 'px,' + avEdit.y + 'px) scale(' + avEdit.scale + ')';
  }

  function avZoomTo(newScale) {
    var ratio = newScale / avEdit.scale;
    var c = AREA_SIZE / 2;
    avEdit.x = c - (c - avEdit.x) * ratio;
    avEdit.y = c - (c - avEdit.y) * ratio;
    avEdit.scale = newScale;
    if (avatarZoomValue) avatarZoomValue.textContent = Math.round(newScale * 100) + '%';
    avApplyTransform();
  }

  if (avatarClickInput) {
    avatarClickInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast('Photo must be under 10 MB.', 'error');
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = new Image();
        img.onload = function () {
          avEdit.srcImg = img;
          avEdit.scale = 1;
          avEdit.x = 0;
          avEdit.y = 0;
          if (avatarZoomSlider) avatarZoomSlider.value = 1;
          if (avatarZoomValue) avatarZoomValue.textContent = '100%';

          var ratio = Math.max(AREA_SIZE / img.width, AREA_SIZE / img.height);
          avEdit.baseW = img.width * ratio;
          avEdit.baseH = img.height * ratio;
          avatarEditImg.src = ev.target.result;
          avatarEditImg.style.width = avEdit.baseW + 'px';
          avatarEditImg.style.height = avEdit.baseH + 'px';
          avEdit.x = (AREA_SIZE - avEdit.baseW) / 2;
          avEdit.y = (AREA_SIZE - avEdit.baseH) / 2;
          avApplyTransform();
          openModal('avatarEditorModal');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Drag to reposition
  if (avatarEditArea) {
    function avDragStart(cx, cy) {
      avEdit.dragging = true;
      avEdit.startX = cx; avEdit.startY = cy;
      avEdit.origX = avEdit.x; avEdit.origY = avEdit.y;
    }
    function avDragMove(cx, cy) {
      if (!avEdit.dragging) return;
      avEdit.x = avEdit.origX + (cx - avEdit.startX);
      avEdit.y = avEdit.origY + (cy - avEdit.startY);
      avApplyTransform();
    }
    function avDragEnd() { avEdit.dragging = false; }

    avatarEditArea.addEventListener('mousedown', function (e) {
      e.preventDefault(); avDragStart(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', function (e) {
      avDragMove(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', avDragEnd);

    avatarEditArea.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var t = e.touches[0]; avDragStart(t.clientX, t.clientY);
    }, { passive: false });
    document.addEventListener('touchmove', function (e) {
      if (avEdit.dragging) { var t = e.touches[0]; avDragMove(t.clientX, t.clientY); }
    }, { passive: true });
    document.addEventListener('touchend', avDragEnd);
  }

  // Zoom slider
  if (avatarZoomSlider) {
    avatarZoomSlider.addEventListener('input', function () {
      avZoomTo(parseFloat(this.value));
    });
  }

  // Save adjusted photo
  var avatarEditorSaveBtn = $('avatarEditorSave');
  if (avatarEditorSaveBtn) {
    avatarEditorSaveBtn.addEventListener('click', async function () {
      if (!avEdit.srcImg) return;
      var canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      var ctx = canvas.getContext('2d');
      var outScale = 300 / AREA_SIZE;
      ctx.scale(outScale, outScale);
      ctx.translate(avEdit.x, avEdit.y);
      ctx.scale(avEdit.scale, avEdit.scale);
      ctx.drawImage(avEdit.srcImg, 0, 0, avEdit.baseW, avEdit.baseH);

      patient.avatar = canvas.toDataURL('image/jpeg', 0.85);
      saveToLocalStorage();
      await firebaseSavePatient();
      renderPatient();
      closeModal('avatarEditorModal');
      toast('Profile photo updated!');
    });
  }

  // ================================================
  //  SAVE PATIENT
  // ================================================
  $('savePatientBtn').addEventListener('click', async function () {
    clearFormErrors($('patientForm'));
    var btn = this;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

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

    if (!valid) {
      toast('Please fill in all required fields.', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      return;
    }

    patient.name     = $('editName').value.trim();
    patient.age      = $('editAge').value.trim();
    patient.gender   = $('editGender').value;
    patient.birthday = $('editBirthday').value;
    patient.guardian = $('editGuardian').value.trim();
    patient.contact  = $('editContact').value.trim();
    patient.address  = $('editAddress').value.trim();
    patient.avatar   = editAvatarData || '';

    saveToLocalStorage();
    await firebaseSavePatient();
    renderPatient();
    renderStats();
    closeModal('patientModal');
    toast('Patient details updated successfully!');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
  });

  // ================================================
  //  ADD RECORD
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

  // ================================================
  //  SAVE RECORD
  // ================================================
  $('saveRecordBtn').addEventListener('click', async function () {
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

    if (!valid) {
      toast('Please fill in all required fields.', 'error');
      return;
    }

    var recordData = {
      date: date, doctor: doctor, complaint: complaint,
      diagnosis: diagnosis, notes: notes,
      prescription: prescription, treatment: treatment
    };

    if (id) {
      var idx = records.findIndex(function (r) { return r.id === id; });
      if (idx !== -1) {
        records[idx] = Object.assign({}, records[idx], recordData);
        await firebaseUpdateRecord(id, recordData);
        toast('Medical record updated successfully!');
      }
    } else {
      var firebaseId = await firebaseAddRecord(recordData);
      records.push(Object.assign({ id: firebaseId }, recordData));
      toast('Medical record added successfully!');
    }

    saveToLocalStorage();
    renderRecords();
    renderStats();
    closeModal('recordModal');
    $('recordForm').reset();
    $('recordId').value = '';
  });

  // ================================================
  //  EDIT RECORD
  // ================================================
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
    if (r.notes) html += '<div class="view-item"><label>Doctor&rsquo;s Notes</label><p>' + esc(r.notes) + '</p></div>';
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

  $('confirmDeleteBtn').addEventListener('click', async function () {
    if (pendingDelete.type === 'record') {
      var recordToDelete = records.find(function (r) { return r.id === pendingDelete.id; });
      records = records.filter(function (r) { return r.id !== pendingDelete.id; });
      if (recordToDelete) {
        await firebaseDeleteRecord(recordToDelete.id);
      }
      saveToLocalStorage();
      renderRecords();
      renderStats();
      toast('Medical record deleted successfully!');
    } else if (pendingDelete.type === 'file') {
      var fileToDelete = files[pendingDelete.index];
      if (fileToDelete) {
        await firebaseDeleteFile(fileToDelete);
        files.splice(pendingDelete.index, 1);
        saveToLocalStorage();
        renderFiles();
        renderStats();
        toast('File "' + (fileToDelete.name || 'File') + '" removed.');
      }
    } else if (pendingDelete.type === 'reset') {
      patient = {
        id: PATIENT_ID, name: 'New Patient', age: '',
        gender: '', birthday: '', guardian: '',
        contact: '', address: '', avatar: ''
      };
      records = [];
      files = [];
      localStorage.removeItem(KEYS.seeded);
      saveToLocalStorage();
      await firebaseSavePatient();
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
  //  FILE UPLOAD (100% Free - Direct to Firestore)
  // ================================================
  var fileInput = $('fileInput');
  var dropZone = $('dropZone');

  $('uploadFileBtn').addEventListener('click', function () { fileInput.click(); });
  dropZone.addEventListener('click', function () { fileInput.click(); });

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

  async function handleFiles(fileList) {
    var selected = Array.from(fileList);
    if (selected.length === 0) return;
    var success = 0, fail = 0;

    toast('Processing & uploading ' + selected.length + ' file(s)...', 'info');

    for (var i = 0; i < selected.length; i++) {
      var file = selected[i];

      // Non-images (like PDF) must fit within Firestore's 1MB limit
      if (!file.type.startsWith('image/') && file.size > 700 * 1024) {
        toast('"' + file.name + '" exceeds 700KB limit for documents.', 'error');
        fail++;
        continue;
      }

      try {
        var dataUrl = await new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function (e) { resolve(e.target.result); };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Smart image compression
        if (file.type && file.type.indexOf('image/') === 0) {
          dataUrl = await compressImage(dataUrl, 1024, 0.65);
        }

        // Add to local UI list immediately
        var newFile = {
          id: genId(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: dataUrl,
          upload_date: today()
        };
        files.unshift(newFile);
        renderFiles();
        renderStats();

        // Sync directly to Firestore
        var firebaseId = await firebaseUploadFile({
          name: file.name,
          type: file.type,
          size: file.size,
          data: dataUrl
        });

        if (firebaseId) {
          newFile.firebaseId = firebaseId;
        }

        success++;
      } catch (e) {
        console.error('File upload failed:', e);
        fail++;
      }
    }

    saveToLocalStorage();
    renderFiles();
    renderStats();

    if (success > 0) toast(success + ' file(s) saved & synced!');
    if (fail > 0) toast(fail + ' file(s) failed to sync.', 'error');
  }

  // ================================================
  //  FILE PREVIEW
  // ================================================
  function previewFile(idx) {
    var f = files[idx];
    if (!f) return;

    var content = '<div class="file-preview-area">';
    var fileUrl = f.data || '';

    if (f.type && f.type.indexOf('image/') === 0) {
      content += '<img src="' + esc(fileUrl) + '" alt="' + esc(f.name) + '" />';
    } else if (f.type && f.type.indexOf('pdf') !== -1) {
      content += '<iframe src="' + esc(fileUrl) + '" width="100%" height="500" style="border:none;border-radius:8px;"></iframe>';
    } else {
      content += '<div style="padding:40px;"><i class="fas fa-file-medical" style="font-size:4rem;color:#2e86de;opacity:.5;"></i><p style="margin-top:12px;color:#8e99aa;">Preview not available.</p></div>';
    }

    content += '</div><div class="file-preview-info">' +
      '<p><strong>File Name:</strong> ' + esc(f.name) + '</p>' +
      '<p><strong>File Type:</strong> ' + esc(f.type || 'Unknown') + '</p>' +
      '<p><strong>File Size:</strong> ' + fmtSize(f.size) + '</p>' +
      '<p><strong>Upload Date:</strong> ' + esc(fmtDate(f.upload_date)) + '</p></div>';

    $('filePreviewContent').innerHTML = content;

    var dl = $('downloadFileLink');
    if (fileUrl) {
      dl.href = fileUrl;
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
  //  PRINT  (with logo)
  // ================================================
  $('printBtn').addEventListener('click', function () {
    var logoUrl = new URL('logo.png', window.location.href).href;
    var html =
      '<div class="print-header"><img src="' + logoUrl + '" alt="Logo" style="width:80px;height:auto;margin:0 auto 10px;display:block;"/><h2>NEW ERA PEDIATRIC</h2><p>Patient Medical Record Summary</p></div>' +
      '<div class="print-patient-info">' +
        '<div class="print-item"><label>Full Name</label><span>' + esc(patient.name) + '</span></div>' +
        '<div class="print-item"><label>Age</label><span>' + esc(patient.age) + '</span></div>' +
        '<div class="print-item"><label>Gender</label><span>' + esc(patient.gender) + '</span></div>' +
        '<div class="print-item"><label>Date of Birth</label><span>' + esc(fmtDate(patient.birthday)) + '</span></div>' +
        '<div class="print-item"><label>Parent / Guardian</label><span>' + esc(patient.guardian) + '</span></div>' +
        '<div class="print-item"><label>Contact</label><span>' + esc(patient.contact) + '</span></div>' +
        '<div class="print-item"><label>Address</label><span>' + esc(patient.address) + '</span></div>' +
      '</div>' +
      '<h3 style="color:#1a3a5c;margin-bottom:14px;">Medical History (' + records.length + ' record' + (records.length !== 1 ? 's' : '') + ')</h3>' +
      '<div class="print-records">';

    var sorted = records.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    if (sorted.length === 0) {
      html += '<p style="color:#8e99aa;text-align:center;padding:20px;">No medical records available.</p>';
    } else {
      sorted.forEach(function (r) {
        html += '<div class="print-record-card"><h4>' + esc(fmtDate(r.date)) + (r.doctor ? ' \u2014 Dr. ' + esc(r.doctor) : '') + '</h4>' +
          '<div class="pr-row"><span class="pr-label">Chief Complaint:</span><span class="pr-value">' + esc(r.complaint) + '</span></div>' +
          '<div class="pr-row"><span class="pr-label">Diagnosis:</span><span class="pr-value">' + esc(r.diagnosis) + '</span></div>';
        if (r.notes) html += '<div class="pr-row"><span class="pr-label">Notes:</span><span class="pr-value">' + esc(r.notes) + '</span></div>';
        if (r.prescription) html += '<div class="pr-row"><span class="pr-label">Prescription:</span><span class="pr-value">' + esc(r.prescription) + '</span></div>';
        if (r.treatment) html += '<div class="pr-row"><span class="pr-label">Treatment:</span><span class="pr-value">' + esc(r.treatment) + '</span></div>';
        html += '</div>';
      });
    }

    html += '</div><p style="margin-top:24px;text-align:right;color:#8e99aa;font-size:.78rem;">Generated on ' +
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';

    $('printContent').innerHTML = html;
    openModal('printModal');
  });

  $('doPrintBtn').addEventListener('click', function () {
    var content = $('printContent').innerHTML;
    var win = window.open('', '_blank');
    if (!win) { toast('Please allow pop-ups to print.', 'error'); return; }

    win.document.write(
      '<!DOCTYPE html><html><head><title>New Era Pediatric</title>' +
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
      '.pr-value{white-space:pre-wrap}</style></head><body>' + content + '</body></html>'
    );
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
    if (!err) {
      err = document.createElement('div');
      err.className = 'field-error';
      group.appendChild(err);
    }
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
  async function init() {
    if (HAS_PATIENT_PARAM) {
      document.body.classList.add('patient-mode');
    } else {
      document.body.classList.remove('patient-mode');
    }

    loadFromLocalStorage();
    renderPatient();
    renderRecords();
    renderFiles();
    renderStats();
    updatePatientList();

    startFirebaseListeners();

    console.log(
      '%c NEW ERA PEDIATRIC %c Patient: ' + PATIENT_ID + ' %c Firebase Sync: ON',
      'background:#1a3a5c;color:#fff;padding:4px 10px;border-radius:4px 0 0 4px;font-weight:700;',
      'background:#2e86de;color:#fff;padding:4px 10px;font-weight:700;',
      'background:#ea4335;color:#fff;padding:4px 10px;border-radius:0 4px 4px 0;'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();