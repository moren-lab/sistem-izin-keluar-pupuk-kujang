/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Karyawan Module: Figma Exact Redesign with Dynamic Audit Trail & Timeline
 * - Dashboard Karyawan
 * - Pengajuan Saya
 * - Riwayat Pengajuan (List / Tabel)
 * - Riwayat Pengajuan (Card / Grid)
 */

window.empCurrentPage = 1;
window.empPageSize = 6;
window.currentEmpViewMode = window.currentEmpViewMode || 'card';

/**
 * Mendapatkan profil Karyawan yang sedang aktif dari master MOCK_USERS
 * Menyelesaikan bug sinkronisasi akun baru/pergantian pengguna (Moreno dsb.)
 */
function getCurrentEmployeeActor() {
  if (!window.activeEmployeeUser) {
    try {
      const savedNip = localStorage.getItem('KUJANG_ACTIVE_EMP_NIP');
      if (savedNip && savedNip !== 'PK-2024-8841' && savedNip !== 'PK-2024-8842') {
        const users = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
        const found = users.find(u => u.nip === savedNip && u.status === 'Aktif');
        if (found) window.activeEmployeeUser = found;
      }
    } catch(e) {}
  }
  if (window.activeEmployeeUser && (window.currentActor === 'karyawan' || window.currentActor === 'karyawan2')) {
    if (window.ACTORS && window.ACTORS.karyawan) {
      window.ACTORS.karyawan.name = window.activeEmployeeUser.name;
      window.ACTORS.karyawan.nip = window.activeEmployeeUser.nip;
      if (window.activeEmployeeUser.department) window.ACTORS.karyawan.department = window.activeEmployeeUser.department;
      if (window.activeEmployeeUser.role || window.activeEmployeeUser.title) {
        window.ACTORS.karyawan.title = window.activeEmployeeUser.role || window.activeEmployeeUser.title;
      }
      if (window.activeEmployeeUser.directSupervisor || window.activeEmployeeUser.supervisor) {
        window.ACTORS.karyawan.approverName = window.activeEmployeeUser.directSupervisor || window.activeEmployeeUser.supervisor;
      }
    }
    return window.activeEmployeeUser;
  }
  const users = window.MOCK_USERS || [];
  const isK2 = (window.currentActor === 'karyawan2');

  if (isK2) {
    const activeEmp2 = users.find(u => u.roleKey === 'karyawan2' && u.status === 'Aktif');
    if (activeEmp2) {
      if (window.ACTORS && window.ACTORS.karyawan2) {
        window.ACTORS.karyawan2.name = activeEmp2.name;
        window.ACTORS.karyawan2.nip = activeEmp2.nip;
        if (activeEmp2.department) window.ACTORS.karyawan2.department = activeEmp2.department;
        if (activeEmp2.role) window.ACTORS.karyawan2.title = activeEmp2.role;
        if (activeEmp2.directSupervisor || activeEmp2.supervisor) {
          window.ACTORS.karyawan2.approverName = activeEmp2.directSupervisor || activeEmp2.supervisor;
        }
      }
      if (!activeEmp2.approverName && (activeEmp2.directSupervisor || activeEmp2.supervisor)) {
        activeEmp2.approverName = activeEmp2.directSupervisor || activeEmp2.supervisor;
      }
      return activeEmp2;
    }
    return (window.ACTORS && window.ACTORS.karyawan2) || {
      nip: 'PK-2024-8842',
      name: 'Arthur Morgan, S.Tr.T.',
      title: 'Staf Instrumentasi & Otomasi Pabrik',
      department: 'Departemen Rekayasa & Pemeliharaan',
      approverName: 'Ir. Hendra Gunawan, M.T.'
    };
  }

  // Akun Karyawan 1 (Budi Pratama)
  const budiEmp = users.find(u => u.kujangId === 'KJG-991024' || u.nip === 'PK-2024-8841' || (u.name && u.name.includes('Budi Pratama')));
  if (budiEmp) {
    if (window.ACTORS && window.ACTORS.karyawan) {
      window.ACTORS.karyawan.name = budiEmp.name;
      window.ACTORS.karyawan.nip = budiEmp.nip;
      if (budiEmp.department) window.ACTORS.karyawan.department = budiEmp.department;
      if (budiEmp.role) window.ACTORS.karyawan.title = budiEmp.role;
      if (budiEmp.directSupervisor || budiEmp.supervisor) {
        window.ACTORS.karyawan.approverName = budiEmp.directSupervisor || budiEmp.supervisor;
      }
    }
    return budiEmp;
  }

  const activeEmp = users.find(u => (u.roleKey === 'karyawan' || (u.role && u.role.toLowerCase().includes('karyawan'))) && u.status === 'Aktif');
  if (activeEmp) return activeEmp;
  return (window.ACTORS && window.ACTORS.karyawan) || {
    nip: 'PK-2024-8841',
    name: 'Budi Pratama, S.T.',
    title: 'Staf Rekayasa Mesin',
    department: 'Departemen Rekayasa & Pemeliharaan',
    approverName: 'Ir. Hendra Gunawan, M.T.'
  };
}

/**
 * ===================================================================
 * LOGIKA DINAS KANTOR BERSAMA (MULTI-ANGGOTA) & LAPOR TIBA DI KANTOR
 * ===================================================================
 */
window._selectedGroupMembers = [];
window._currentSuratPerintah = null;

/**
 * Inisialisasi Pencarian Anggota Rombongan Dinas (Searchable Combobox)
 */
window.initGroupDinasMembersForm = function() {
  const currentEmp = typeof getCurrentEmployeeActor === 'function' ? getCurrentEmployeeActor() : { nip: 'PK-2024-8841', department: 'Departemen Rekayasa & Pemeliharaan' };
  const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];

  // Filter kandidat: SEMUA karyawan aktif selain akun inisiator sendiri DAN tidak sedang memiliki izin aktif
  const candidates = allUsers.filter(u => {
    if (u.status !== 'Aktif') return false;
    if (u.nip === currentEmp.nip) return false;
    const isEmp = (u.roleKey === 'karyawan' || u.roleKey === 'karyawan2' || (u.role && u.role.toLowerCase().includes('karyawan')) || (u.department && !u.roleKey?.includes('approver') && !u.roleKey?.includes('admin') && !u.roleKey?.includes('security')));
    if (!isEmp) return false;
    // CEK TIKET AKTIF: Karyawan yang sedang memiliki izin aktif (belum selesai/final) dilarang dipilih
    const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(u.nip) : null;
    if (activeTicket) return false;
    return true;
  });

  window._groupMemberCandidates = candidates;

  // Pasang event listener untuk search input Desktop
  const inputSearch = document.getElementById('inputSearchGroupMember');
  const dropdown = document.getElementById('memberFloatingDropdown');
  if (inputSearch && !inputSearch._hasSearchListener) {
    inputSearch._hasSearchListener = true;
    inputSearch.addEventListener('input', (e) => {
      window.filterGroupMemberSearch(e.target.value);
    });
    inputSearch.addEventListener('focus', () => {
      window.filterGroupMemberSearch(inputSearch.value || '');
    });
  }

  // 2. Dropdown Mobile (jika menggunakan select)
  const mSelectAdd = document.getElementById('mSelectAddGroupMember');
  if (mSelectAdd) {
    mSelectAdd.innerHTML = '<option value="">-- Pilih rekan satu tim --</option>' +
      candidates
        .filter(c => !window._selectedGroupMembers.some(m => m.nip === c.nip))
        .map(c => `<option value="${c.nip}">${c.name} (${c.nip}) — Atasan: ${(c.directSupervisor || c.supervisor || 'Atasan').split(',')[0]}</option>`)
        .join('');
  }

  window.renderSelectedGroupMembers();
};

/**
 * Filter dan Render Dropdown Hasil Pencarian Anggota Karyawan
 */
window.filterGroupMemberSearch = function(query) {
  const dropdown = document.getElementById('memberFloatingDropdown');
  const listEl = document.getElementById('memberItemsList');
  const emptyEl = document.getElementById('memberEmptyState');
  const emptyTerm = document.getElementById('emptyMemberSearchTerm');
  if (!dropdown || !listEl) return;

  const candidates = (window._groupMemberCandidates || []).filter(c => 
    !window._selectedGroupMembers.some(m => m.nip === c.nip)
  );

  const cleanQuery = String(query || '').trim();
  const filtered = candidates.filter(c => {
    if (!cleanQuery) return true; // Tampilkan semua saran jika query kosong
    return (typeof window.matchSearchTokens === 'function')
      ? window.matchSearchTokens(cleanQuery, c.name, c.nip, c.department, c.title, c.directSupervisor || c.supervisor)
      : (c.name.toLowerCase().includes(cleanQuery.toLowerCase()) || c.nip.toLowerCase().includes(cleanQuery.toLowerCase()) || (c.department && c.department.toLowerCase().includes(cleanQuery.toLowerCase())));
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) {
      emptyEl.style.display = 'block';
      if (emptyTerm) emptyTerm.textContent = cleanQuery;
    }
  } else {
    if (emptyEl) emptyEl.style.display = 'none';
    listEl.innerHTML = filtered.map(c => {
      const initials = (c.name || 'KY').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      const sup = (c.directSupervisor || c.supervisor || 'Atasan Langsung');
      return `
        <div class="member-search-item" onclick="window.addGroupMemberByNip('${c.nip}')" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0.55rem 0.75rem; border-radius: 6px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f1f5f9;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; border: 1px solid #bae6fd; flex-shrink: 0;">
              ${initials}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 0.8rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name} <span style="font-weight: 500; color: #64748b; font-size: 0.72rem;">(${c.nip})</span></div>
              <div style="font-size: 0.7rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.department || 'Departemen Rekayasa & Pemeliharaan'} • ${c.title || 'Karyawan'}">${c.department || 'Departemen Rekayasa & Pemeliharaan'} • ${c.title || 'Karyawan'}</div>
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <span style="font-size: 0.68rem; font-weight: 700; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 3px 8px; border-radius: 999px; display: inline-flex; align-items: center; white-space: nowrap; line-height: 1.2;">
              Atasan: ${sup.split(',')[0]}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  dropdown.style.display = 'block';
};

// Tutup floating dropdown jika user klik di luar area combobox
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('wrapSearchMember');
  const dropdown = document.getElementById('memberFloatingDropdown');
  if (dropdown && wrap && !wrap.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

window.addGroupMemberByNip = function(nip) {
  if (!nip) return;
  if (window._selectedGroupMembers.length >= 5) {
    if (typeof window.showToast === 'function') window.showToast('Maksimal anggota tim dinas adalah 5 orang.', 'warning');
    return;
  }
  const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const user = allUsers.find(u => u.nip === nip);
  if (!user) return;

  // Validasi izin aktif
  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(user.nip) : null;
  if (activeTicket) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Karyawan (${user.name}) saat ini masih memiliki izin aktif (#${activeTicket.id}) dan tidak dapat ditambahkan ke tim dinas.`, 'warning');
    }
    return;
  }

  if (window._selectedGroupMembers.some(m => String(m.nip).trim() === String(nip).trim())) return;

  window._selectedGroupMembers.push({
    nip: user.nip,
    name: user.name,
    title: user.title || user.role || 'Karyawan',
    department: user.department || 'Departemen Rekayasa & Pemeliharaan',
    supervisor: user.directSupervisor || user.supervisor || 'Ir. Hendra Gunawan, M.T.'
  });

  const inputSearch = document.getElementById('inputSearchGroupMember');
  if (inputSearch) inputSearch.value = '';
  const dropdown = document.getElementById('memberFloatingDropdown');
  if (dropdown) dropdown.style.display = 'none';

  window.initGroupDinasMembersForm();
};

window.removeGroupMemberByNip = function(nip, event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
    if (typeof event.preventDefault === 'function') event.preventDefault();
  }
  window._selectedGroupMembers = (window._selectedGroupMembers || []).filter(m => String(m.nip).trim() !== String(nip).trim());
  window.renderSelectedGroupMembers();
  
  // Perbarui dropdown Mobile jika ada
  const mSelectAdd = document.getElementById('mSelectAddGroupMember');
  if (mSelectAdd && window._groupMemberCandidates) {
    mSelectAdd.innerHTML = '<option value="">-- Pilih rekan satu tim --</option>' +
      window._groupMemberCandidates
        .filter(c => !window._selectedGroupMembers.some(m => m.nip === c.nip))
        .map(c => `<option value="${c.nip}">${c.name} (${c.nip}) — Atasan: ${(c.directSupervisor || c.supervisor || 'Atasan').split(',')[0]}</option>`)
        .join('');
  }
};

window.renderSelectedGroupMembers = function() {
  const container = document.getElementById('listSelectedGroupMembers');
  const mContainer = document.getElementById('mListSelectedGroupMembers');

  const html = window._selectedGroupMembers.map(m => `
    <span style="display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
      <span>👤 ${m.name}</span>
      <span style="font-size: 0.68rem; color: #3b82f6; font-weight: 600;">(${(m.supervisor || '').split(',')[0]})</span>
      <button type="button" onclick="window.removeGroupMemberByNip('${m.nip}', event)" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 11px; padding: 0 2px; line-height: 1; font-weight: 800;" title="Hapus ${m.name}">✕</button>
    </span>
  `).join('');

  if (container) {
    container.innerHTML = html || '<span style="font-size: 0.72rem; color: #94a3b8; font-style: italic;">Belum ada anggota tim yang ditambahkan. Pengajuan ini bersifat perorangan jika kosong.</span>';
  }
  if (mContainer) {
    mContainer.innerHTML = html || '<span style="font-size: 0.7rem; color: #94a3b8; font-style: italic;">Belum ada rekan tim yang ditambahkan.</span>';
  }
};

/**
 * Handler Upload Dokumen Surat Tugas / Perintah Dinas
 */
window.handleSuratPerintahUpload = function(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];
  if (file.size > 5 * 1024 * 1024) {
    if (typeof window.showToast === 'function') window.showToast('Ukuran berkas melebihi batas 5 MB.', 'error');
    inputEl.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    window._currentSuratPerintah = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf',
      dataUrl: e.target.result,
      uploadedAt: new Date().toISOString()
    };

    const dropzone = document.getElementById('dropzoneSuratPerintah');
    const preview = document.getElementById('previewSuratPerintahCard');
    const nameEl = document.getElementById('previewSuratPerintahName');
    const sizeEl = document.getElementById('previewSuratPerintahSize');
    const iconEl = document.getElementById('previewSuratPerintahIcon');

    if (dropzone) dropzone.style.display = 'none';
    if (preview) preview.style.display = 'flex';
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = `${Math.round(file.size / 1024)} KB • Berkas Terlampir`;
    if (iconEl) iconEl.textContent = file.type.includes('image') ? '🖼️' : '📄';

    if (typeof window.showToast === 'function') window.showToast('✅ Berkas Surat Perintah berhasil dilampirkan.', 'success');
  };
  reader.readAsDataURL(file);
};

window.removeSuratPerintahFile = function() {
  window._currentSuratPerintah = null;
  const inputEl = document.getElementById('fileSuratPerintah');
  if (inputEl) inputEl.value = '';
  const dropzone = document.getElementById('dropzoneSuratPerintah');
  const preview = document.getElementById('previewSuratPerintahCard');
  if (dropzone) dropzone.style.display = 'block';
  if (preview) preview.style.display = 'none';
};

/**
 * Modal Simulasi Tap In Kartu Akses Gerbang (Palang Otomatis)
 */
window.openSimulasiTapInModal = function(ticketId) {
  const ticketsList = window.ticketsList || [];
  const t = ticketsList.find(x => x.id === ticketId);
  if (!t) return;
  window.currentTapInTicketId = ticketId;

  const modal = document.getElementById('modalSimulasiTapIn');
  const badge = document.getElementById('tapInTicketIdBadge');
  const listEl = document.getElementById('tapInMembersCardList');
  if (badge) badge.textContent = t.id;

  if (listEl) {
    const eligibleMembers = [];
    if (!t.initiatorCancelled) {
      eligibleMembers.push({
        name: t.applicantName,
        nip: t.applicantNip || 'PK-2024-8841',
        role: 'Inisiator / Pemohon Utama'
      });
    }
    if (t.isGroupDinas && Array.isArray(t.members)) {
      t.members.filter(m => m.status !== 'batal').forEach(m => {
        eligibleMembers.push({
          name: m.name,
          nip: m.nip,
          role: 'Anggota Tim'
        });
      });
    }

    listEl.innerHTML = eligibleMembers.map(m => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; transition: border-color 0.2s;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
            💳
          </div>
          <div>
            <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a;">${m.name}</div>
            <div style="font-size: 0.72rem; color: #64748b;">NIP: ${m.nip} • <span style="color: #0369a1; font-weight: 700;">${m.role}</span></div>
          </div>
        </div>
        <button type="button" class="btn-figma-primary" onclick="window.executeTapInGate('${t.id}', '${m.nip}', '${m.name.replace(/'/g, "\\'")}')" style="padding: 0.45rem 0.95rem; font-size: 0.775rem; font-weight: 700; background: #2563eb; border-color: #2563eb; color: #ffffff; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
          <span>📶 Tap Kartu</span>
        </button>
      </div>
    `).join('');
  }

  if (modal) modal.classList.add('open');
};

window.closeSimulasiTapInModal = function() {
  const modal = document.getElementById('modalSimulasiTapIn');
  if (modal) modal.classList.remove('open');
  window.currentTapInTicketId = null;
};

window.executeTapInGate = function(ticketId, memberNip, memberName) {
  const ticketsList = window.ticketsList || [];
  const t = ticketsList.find(x => x.id === ticketId);
  if (!t) return;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

  // KUNCI TANGGAL & JAM KEPULANGAN
  t.status = 'Menunggu Verifikasi Atasan';
  t.tapInTime = nowFormatted;
  t.tapInMember = memberName;
  t.tapInNip = memberNip;
  t.arrivalReportedTime = nowFormatted;
  t.arrivalReportedAt = nowFormatted;
  t.reportedReturnTime = nowFormatted;
  t.employeeReportedReturnTime = nowFormatted;
  t.timeFrozen = true;

  if (!t.timeline) t.timeline = [];
  t.timeline.push({
    event: 'Tap In Gerbang Masuk',
    time: nowFormatted,
    by: `${memberName} (${memberNip})`,
    desc: `Tap In kartu akses di Pos 1 Gerbang Utama oleh ${memberName}. Jam kepulangan terkunci pada ${nowFormatted}. Menunggu verifikasi kehadiran fisik oleh Atasan.`
  });

  window.saveTickets(ticketsList);

  // Kirim Notifikasi ke Atasan Peninjau
  if (typeof window.createNotification === 'function') {
    window.createNotification({
      recipientRole: 'approver',
      recipientNip: t.approverNip || 'PK-2015-1002',
      recipientName: t.approverName || 'Ir. Hendra Gunawan, M.T.',
      actorSource: 'karyawan',
      type: 'tap_in_arrival',
      title: 'Dinas Kantor Melakukan Tap In',
      message: `Dinas kantor (#${t.id} - ${t.applicantName} & tim) baru saja melakukan Tap In di gerbang masuk. Periksa anggota dan tekan [ Konfirmasi Kepulangan ] jika mereka benar-benar sudah kembali di ruangan.`,
      ticketId: t.id,
      priority: 'urgent',
      eventId: `tap_in_${t.id}`
    });
  }

  window.closeSimulasiTapInModal();
  if (typeof window.showToast === 'function') {
    window.showToast(`✅ Akses Diterima! Kartu ${memberName} terverifikasi. Jam kepulangan terkunci.`, 'success');
  }

  // Render ulang views
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.renderSecurityView === 'function') window.renderSecurityView();
  if (typeof window.renderMobileKaryawan === 'function') window.renderMobileKaryawan();
};

window.reportArrivalAtOffice = function(ticketId) {
  window.openSimulasiTapInModal(ticketId);
};

window._docViewerZoomed = false;

window.handleDocViewerBackdropClick = function(e) {
  // Tutup jika klik terjadi pada backdrop stage di luar kertas A4 atau gambar dokumen
  if (e.target.id === 'modalDocViewer' || e.target.id === 'docViewerStage' || e.target.id === 'docViewerBody') {
    window.closeDocViewerModal();
  }
};

window.toggleDocViewerZoom = function() {
  window._docViewerZoomed = !window._docViewerZoomed;
  const img = document.getElementById('docViewerMainImg');
  const paper = document.getElementById('docViewerA4Paper');
  const btn = document.getElementById('btnZoomDocViewer');
  
  if (img) {
    img.classList.toggle('zoomed', window._docViewerZoomed);
  }
  if (paper) {
    paper.style.transform = window._docViewerZoomed ? 'scale(1.15)' : 'scale(1)';
    paper.style.transformOrigin = 'top center';
    paper.style.transition = 'transform 0.2s ease';
  }
  if (btn) {
    btn.style.background = window._docViewerZoomed ? 'rgba(5, 150, 105, 0.4)' : 'rgba(255, 255, 255, 0.1)';
  }
};

// Listener tombol ESC global untuk keluar dari Lightbox
if (!window._docLightboxEscBound) {
  window._docLightboxEscBound = true;
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const modal = document.getElementById('modalDocViewer');
      if (modal && modal.classList.contains('open')) {
        window.closeDocViewerModal();
      }
    }
  });
}

window.viewSuratPerintahDetail = function(ticketIdParam) {
  const ticketId = ticketIdParam || window.currentDetailTicketId || window.currentModalTicketId;
  const ticketsList = window.ticketsList || [];
  let t = ticketsList.find(x => x.id === ticketId);
  if (!t && typeof window.loadTickets === 'function') {
    t = (window.loadTickets() || []).find(x => x.id === ticketId);
  }

  let doc = (t && t.suratPerintah) ? t.suratPerintah : window._currentSuratPerintah;
  if (!doc) {
    if (typeof window.showToast === 'function') window.showToast('Dokumen surat perintah tugas dinas belum dilampirkan.', 'warning');
    return;
  }

  window._activeViewingDoc = doc;
  window._docViewerZoomed = false;

  const modal = document.getElementById('modalDocViewer');
  const titleEl = document.getElementById('docViewerTitle');
  const subEl = document.getElementById('docViewerSubtitle');
  const metaEl = document.getElementById('docViewerMeta');
  const iconEl = document.getElementById('docViewerIcon');
  const bodyEl = document.getElementById('docViewerBody');
  const btnZoom = document.getElementById('btnZoomDocViewer');

  if (titleEl) titleEl.textContent = doc.name || 'Dokumen Surat Perintah Dinas';
  if (subEl) subEl.textContent = t ? `Tiket #${t.id} • Pemohon: ${t.applicantName || 'Inisiator'}` : 'Surat Perintah Resmi Unit Kerja';
  const sizeKb = Math.round((doc.size || 145000) / 1024);
  const isImage = (doc.type && doc.type.includes('image')) || (doc.name && /\.(png|jpe?g|webp)$/i.test(doc.name));
  
  if (metaEl) metaEl.textContent = `Ukuran: ${sizeKb} KB • Format: ${isImage ? 'Gambar Berkas Asli (PNG/JPG)' : 'Dokumen PDF Resmi'}`;
  if (iconEl) iconEl.textContent = isImage ? '🖼️' : '📄';
  if (btnZoom) btnZoom.style.display = 'inline-flex';

  if (bodyEl) {
    if (doc.dataUrl && isImage) {
      // Fullscreen Image Lightbox ala WhatsApp
      bodyEl.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;">
          <img id="docViewerMainImg" class="doc-lightbox-img" src="${doc.dataUrl}" alt="${doc.name}" onclick="window.toggleDocViewerZoom()" title="Klik untuk Zoom (Perbesar)">
        </div>
      `;
    } else if (doc.dataUrl && doc.dataUrl.startsWith('data:application/pdf') && doc.dataUrl.length > 500) {
      // PDF Iframe Viewer
      bodyEl.innerHTML = `
        <iframe class="doc-lightbox-iframe" src="${doc.dataUrl}" title="Pratinjau PDF"></iframe>
      `;
    } else {
      // High-Fidelity Official A4 Letterhead ala Surat Perintah PT Pupuk Kujang
      const todayFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const applicantName = (t && t.applicantName) ? t.applicantName : 'Bima Arya Nugraha, S.T.';
      const applicantNip = (t && t.applicantNip) ? t.applicantNip : 'PK-2024-8847';
      const department = (t && t.department) ? t.department : 'Departemen Rekayasa & Pemeliharaan';
      const approverName = (t && t.approverName) ? t.approverName : 'Ir. Hendra Gunawan, M.T.';
      const approverTitle = (t && t.approverTitle) ? t.approverTitle : 'Manager Rekayasa & Pemeliharaan';
      const destination = (t && t.destination) ? t.destination : 'Kantor Pusat Pupuk Indonesia, Jakarta';
      const reason = (t && t.reason) ? t.reason : 'Koordinasi Teknis & Penugasan Luar Kawasan Pabrik';
      const plannedExit = (t && t.plannedExit) ? t.plannedExit.replace('T', ' ') : '10 Nov 2026 08:00';
      const estimatedReturn = (t && t.estimatedReturn) ? t.estimatedReturn.replace('T', ' ') : '10 Nov 2026 17:00';
      const membersList = (t && Array.isArray(t.members)) ? t.members.filter(m => m.status !== 'batal') : [];

      bodyEl.innerHTML = `
        <div id="docViewerA4Paper" class="doc-lightbox-a4-paper">
          <!-- Kop Surat Resmi Pupuk Kujang -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #0f2b48; padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 48px; height: 48px; background: #00875a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 1.4rem;">
                PK
              </div>
              <div>
                <div style="font-weight: 900; font-size: 1.05rem; letter-spacing: 0.5px; color: #0f2b48; text-transform: uppercase;">PT PUPUK KUJANG</div>
                <div style="font-size: 0.72rem; color: #475569; line-height: 1.3;">Member of PT Pupuk Indonesia (Persero)</div>
                <div style="font-size: 0.68rem; color: #64748b; line-height: 1.2;">Jl. Jend. A. Yani No. 39 Cikampek 41373, Karawang - Jawa Barat</div>
              </div>
            </div>
            <div style="text-align: right; border-left: 1px solid #cbd5e1; padding-left: 12px;">
              <span style="display: inline-block; padding: 2px 8px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; color: #047857; font-weight: 800; font-size: 0.7rem; letter-spacing: 0.3px;">
                DOKUMEN RESMI
              </span>
              <div style="font-size: 0.68rem; color: #64748b; margin-top: 3px; font-family: monospace;">KODE: PK-SP-DIR-OPS</div>
            </div>
          </div>

          <!-- Judul Surat -->
          <div style="text-align: center; margin-bottom: 18px;">
            <h2 style="font-size: 1.1rem; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; text-decoration: underline; letter-spacing: 0.5px;">SURAT PERINTAH TUGAS DINAS</h2>
            <div style="font-size: 0.775rem; color: #334155; font-weight: 600; margin-top: 4px;">Nomor: SP-${t ? t.id.replace('TK-', '') : '20261110-888'}/KUJANG/REK-PEL/${new Date().getFullYear()}</div>
          </div>

          <!-- Dasar Penugasan -->
          <div style="font-size: 0.8rem; color: #334155; line-height: 1.5; margin-bottom: 12px;">
            Yang bertanda tangan di bawah ini menerangkan dan menugaskan karyawan yang tercantum di bawah ini untuk melaksanakan tugas dinas perusahaan ke luar kawasan operasional:
          </div>

          <!-- Tabel Personel Yang Ditugaskan -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 14px;">
            <div style="background: #f1f5f9; padding: 6px 10px; font-size: 0.75rem; font-weight: 800; color: #0f172a; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between;">
              <span>DAFTAR PERSONEL PENUGASAN DINAS</span>
              <span style="color: #059669;">${membersList.length + 1} Orang</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
              <thead>
                <tr style="background: #f8fafc; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0;">
                  <th style="padding: 6px 10px; width: 35px;">No</th>
                  <th style="padding: 6px 10px;">Nama Karyawan</th>
                  <th style="padding: 6px 10px; width: 120px;">NIP</th>
                  <th style="padding: 6px 10px; width: 130px;">Peran Tim</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                  <td style="padding: 6px 10px; font-weight: 700;">1</td>
                  <td style="padding: 6px 10px; font-weight: 700; color: #0f172a;">${applicantName}</td>
                  <td style="padding: 6px 10px; font-family: monospace;">${applicantNip}</td>
                  <td style="padding: 6px 10px;"><span style="background: #d1fae5; color: #065f46; font-weight: 700; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem;">👑 Inisiator / PJ</span></td>
                </tr>
                ${membersList.map((m, idx) => `
                  <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                    <td style="padding: 6px 10px; font-weight: 600;">${idx + 2}</td>
                    <td style="padding: 6px 10px; font-weight: 600; color: #1e293b;">${m.name}</td>
                    <td style="padding: 6px 10px; font-family: monospace;">${m.nip || '-'}</td>
                    <td style="padding: 6px 10px;"><span style="background: #e0f2fe; color: #0369a1; font-weight: 600; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem;">👤 Anggota</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Rincian Agenda & Lokasi -->
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; font-size: 0.775rem; margin-bottom: 16px; line-height: 1.5;">
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 4px 8px;">
              <div style="font-weight: 700; color: #64748b;">Lokasi / Tujuan:</div>
              <div style="font-weight: 700; color: #0f172a;">${destination}</div>

              <div style="font-weight: 700; color: #64748b;">Keperluan / Agenda:</div>
              <div style="color: #1e293b;">${reason}</div>

              <div style="font-weight: 700; color: #64748b;">Jadwal Penugasan:</div>
              <div style="font-weight: 700; color: #059669;">${plannedExit} WIB s/d ${estimatedReturn} WIB</div>

              <div style="font-weight: 700; color: #64748b;">Unit Kerja:</div>
              <div style="color: #334155;">${department}</div>
            </div>
          </div>

          <!-- Tanda Tangan & Cap Sah -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 18px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
            <div>
              <div style="font-size: 0.68rem; color: #64748b; font-family: monospace;">KODE TIKET: #${t ? t.id : 'TK-20261110-888'}</div>
              <div style="margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #ecfdf5; border: 1px solid #86efac; border-radius: 4px; font-size: 0.68rem; color: #166534; font-weight: 700;">
                ✓ Terverifikasi Digital di Sistem Kujang Gate
              </div>
            </div>
            <div style="text-align: right; min-width: 200px;">
              <div style="font-size: 0.72rem; color: #475569;">Cikampek, ${todayFormatted}</div>
              <div style="font-size: 0.75rem; font-weight: 700; color: #0f172a; margin-top: 2px;">Pejabat Pemberi Perintah:</div>
              <div style="height: 38px; display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                <span style="color: #059669; font-size: 0.72rem; font-weight: 800; font-family: cursive; border: 1.5px solid #059669; border-radius: 4px; padding: 2px 6px;">[ SIGNED DIGITALLY ]</span>
              </div>
              <div style="font-weight: 800; font-size: 0.8rem; color: #0f172a; text-decoration: underline;">${approverName}</div>
              <div style="font-size: 0.7rem; color: #64748b;">${approverTitle}</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
};

window.closeDocViewerModal = function() {
  const modal = document.getElementById('modalDocViewer');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => {
      if (!modal.classList.contains('open')) {
        modal.style.display = 'none';
      }
    }, 200);
  }
  window._activeViewingDoc = null;
  window._docViewerZoomed = false;
};

window.downloadCurrentDocViewerFile = function() {
  const doc = window._activeViewingDoc;
  if (!doc) return;
  const fileName = doc.name || 'Surat_Perintah_Dinas.pdf';

  if (doc.dataUrl) {
    const a = document.createElement('a');
    a.href = doc.dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    // Generate sample PDF/text blob download
    const blobContent = `%PDF-1.4\n% Pupuk Kujang Surat Perintah: ${fileName}\nTanggal: ${new Date().toLocaleDateString('id-ID')}\nStatus: Sah Terlampir\n`;
    const blob = new Blob([blobContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  if (typeof window.showToast === 'function') {
    window.showToast(`Mengunduh berkas: ${fileName}`, 'success');
  }
};

/**
 * Reset total seluruh status upload Surat Perintah & Anggota Tim (Multi-Aktor Clean State)
 */
window.resetAllDinasUploadState = function() {
  // 1. Regular Desktop
  window._selectedGroupMembers = [];
  window._currentSuratPerintah = null;
  const fileInput = document.getElementById('fileSuratPerintah');
  if (fileInput) fileInput.value = '';
  const dropzone = document.getElementById('dropzoneSuratPerintah');
  if (dropzone) dropzone.style.display = 'block';
  const preview = document.getElementById('previewSuratPerintahCard');
  if (preview) preview.style.display = 'none';
  const listMembers = document.getElementById('listSelectedGroupMembers');
  if (listMembers) {
    listMembers.innerHTML = '<span style="font-size: 0.72rem; color: #94a3b8; font-style: italic;">Belum ada anggota tim yang ditambahkan. Pengajuan ini bersifat perorangan jika kosong.</span>';
  }

  // 2. Emergency Desktop
  window._selectedEmergGroupMembers = [];
  window._currentEmergSuratPerintah = null;
  const emergFileInput = document.getElementById('fileEmergSuratPerintah');
  if (emergFileInput) emergFileInput.value = '';
  const emergDropzone = document.getElementById('dropzoneEmergSuratPerintah');
  if (emergDropzone) emergDropzone.style.display = 'block';
  const emergPreview = document.getElementById('previewEmergSuratPerintahCard');
  if (emergPreview) emergPreview.style.display = 'none';
  const emergListMembers = document.getElementById('listSelectedEmergGroupMembers');
  if (emergListMembers) {
    emergListMembers.innerHTML = '<span style="font-size: 0.72rem; color: #94a3b8; font-style: italic;">Belum ada anggota tim yang ditambahkan. Pengajuan ini bersifat perorangan jika kosong.</span>';
  }

  // 3. Mobile
  window._selectedGroupMembersMobile = [];
  window._currentSuratPerintahMobile = null;
  const mFileInput = document.getElementById('mFileSuratPerintah');
  if (mFileInput) mFileInput.value = '';
  const mDropzone = document.getElementById('mDropzoneSuratPerintah');
  if (mDropzone) mDropzone.style.display = 'block';
  const mPreview = document.getElementById('mPreviewSuratPerintahCard');
  if (mPreview) mPreview.style.display = 'none';
  const mListMembers = document.getElementById('mListSelectedGroupMembers');
  if (mListMembers) {
    mListMembers.innerHTML = '<span style="font-size: 0.7rem; color: #94a3b8; font-style: italic;">Belum ada rekan tim yang ditambahkan.</span>';
  }
};

/**
 * Fitur Pembatalan Keikutsertaan Mandiri bagi Anggota Tim
 */
window.cancelMemberParticipation = function(ticketId, memberNip) {
  const ticketsList = window.ticketsList || [];
  const t = ticketsList.find(x => x.id === ticketId);
  if (!t || !Array.isArray(t.members)) return;

  const currentEmp = typeof getCurrentEmployeeActor === 'function' ? getCurrentEmployeeActor() : { nip: memberNip, name: 'Anggota' };
  const targetNip = memberNip || currentEmp.nip;
  const memberObj = t.members.find(m => m.nip === targetNip);
  if (!memberObj) return;

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

  memberObj.status = 'batal';
  memberObj.cancelledAt = nowFormatted;
  memberObj.cancelledBy = currentEmp.name;

  if (!t.timeline) t.timeline = [];
  t.timeline.push({
    event: 'Anggota Mundur dari Tim',
    time: nowFormatted,
    by: `${currentEmp.name} (Anggota Tim)`,
    desc: `${currentEmp.name} membatalkan keikutsertaan dalam dinas bersama ini. Pengajuan tetap berjalan untuk anggota lainnya.`
  });

  if (typeof window.saveTickets === 'function') window.saveTickets(ticketsList);

  // Tutup modal cancel jika terbuka
  const modalCancelRequest = document.getElementById('modalCancelRequest');
  if (modalCancelRequest) modalCancelRequest.classList.remove('open');
  if (typeof window.mobileCloseSheet === 'function') window.mobileCloseSheet();

  if (typeof window.showToast === 'function') {
    window.showToast(`Keikutsertaan Anda pada tiket #${t.id} berhasil dibatalkan. Anggota tim lainnya tetap berjalan.`, 'info');
  }

  // Refresh
  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
  if (typeof window.renderMobileKaryawan === 'function') window.renderMobileKaryawan();
};

/**
 * Fitur Pembatalan untuk Inisiator Saja (Anggota Tetap Jalan)
 */
window.cancelGroupForInitiatorOnly = function(ticketId) {
  const ticketsList = window.ticketsList || [];
  const t = ticketsList.find(x => x.id === ticketId);
  if (!t) return;

  const currentEmp = typeof getCurrentEmployeeActor === 'function' ? getCurrentEmployeeActor() : { name: t.applicantName };
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nowFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())} WIB`;

  t.initiatorCancelled = true;
  t.initiatorCancelledAt = nowFormatted;

  if (!t.timeline) t.timeline = [];
  t.timeline.push({
    event: 'Inisiator Mundur dari Dinas',
    time: nowFormatted,
    by: `${currentEmp.name} (Inisiator)`,
    desc: `Inisiator (${currentEmp.name}) membatalkan keikutsertaannya sendiri. Izin dinas bersama tetap dilanjutkan untuk anggota tim lainnya.`
  });

  if (typeof window.saveTickets === 'function') window.saveTickets(ticketsList);

  const modalCancelRequest = document.getElementById('modalCancelRequest');
  if (modalCancelRequest) modalCancelRequest.classList.remove('open');
  if (typeof window.mobileCloseSheet === 'function') window.mobileCloseSheet();

  if (typeof window.showToast === 'function') {
    window.showToast(`Keikutsertaan Anda pada tiket #${t.id} telah dibatalkan. Pengajuan tetap aktif untuk rekan tim Anda.`, 'info');
  }

  if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
  if (typeof window.renderApproverView === 'function') window.renderApproverView();
  if (typeof window.updateKaryawanMetrics === 'function') window.updateKaryawanMetrics();
  if (typeof window.renderMobileKaryawan === 'function') window.renderMobileKaryawan();
};
window.getCurrentEmployeeActor = getCurrentEmployeeActor;
window.getCurrentEmployeeUser = getCurrentEmployeeActor;

function updateKaryawanMetrics() {
  const ticketsList = window.ticketsList || [];
  const empActor = getCurrentEmployeeActor();
  const myNip = empActor.nip || 'PK-2024-8841';

  // Batasi hanya tiket milik akun yang sedang aktif (termasuk tiket dinas bersama sebagai anggota)
  const myTickets = ticketsList.filter(t => 
    t.applicantNip === myNip || 
    t.createdForNip === myNip || 
    t.createdByNip === myNip || 
    (Array.isArray(t.members) && t.members.some(m => m.nip === myNip)) ||
    (!t.applicantNip && myNip === 'PK-2024-8841')
  );
  const totalMonth = myTickets.length;

  const completedTickets = myTickets.filter(t => t.status === 'Selesai');
  const completedCount = completedTickets.length;
  const lateCompleted = completedTickets.filter(t => t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'))).length;
  const onTimeCompleted = Math.max(0, completedCount - lateCompleted);

  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  const activeCount = activeTicket ? 1 : 0;

  const statEmpTotalMonth = document.getElementById('statEmpTotalMonth');
  const statEmpCompletedCount = document.getElementById('statEmpCompletedCount');
  const statEmpCompletedSub = document.getElementById('statEmpCompletedSub');
  const statEmpActiveCount = document.getElementById('statEmpActiveCount');
  const statEmpActiveSub = document.getElementById('statEmpActiveSub');

  if (statEmpTotalMonth) statEmpTotalMonth.textContent = totalMonth;
  if (statEmpCompletedCount) statEmpCompletedCount.textContent = completedCount;
  if (statEmpCompletedSub) {
    statEmpCompletedSub.textContent = `${onTimeCompleted} tepat waktu, ${lateCompleted} terlambat`;
  }
  if (statEmpActiveCount) statEmpActiveCount.textContent = activeCount;
  if (statEmpActiveSub) {
    if (activeCount > 0) {
      if (activeTicket.status === 'Terlambat') {
        statEmpActiveSub.innerHTML = '<span style="color:#b91c1c; font-weight:800;">⚠️ Terlambat Kembali</span>';
      } else {
        statEmpActiveSub.textContent = activeTicket.status === 'Sedang di Luar' ? 'Sedang di luar area' : activeTicket.status;
      }
    } else {
      statEmpActiveSub.textContent = 'Tidak ada izin aktif';
    }
  }

  // Sidebar Badge
  const sidebarEmpActiveBadge = document.getElementById('sidebarEmpActiveBadge');
  if (sidebarEmpActiveBadge) {
    sidebarEmpActiveBadge.textContent = activeCount;
    sidebarEmpActiveBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
  }
  const bnavEmpActiveBadge = document.getElementById('bnavEmpActiveBadge');
  if (bnavEmpActiveBadge) {
    bnavEmpActiveBadge.textContent = activeCount;
    bnavEmpActiveBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
  }
}

function filterEmpTickets() {
  const ticketsList = window.ticketsList || [];
  const searchEmpInput = document.getElementById('searchEmpInput');
  const filterEmpPeriod = document.getElementById('filterEmpPeriod');
  const filterEmpCategory = document.getElementById('filterEmpCategory');
  const filterEmpType = document.getElementById('filterEmpType');
  const filterEmpStatus = document.getElementById('filterEmpStatus');

  const empActor = getCurrentEmployeeActor();
  const myNip = empActor.nip || 'PK-2024-8841';

  const query = searchEmpInput ? searchEmpInput.value.trim().toLowerCase() : '';
  const period = filterEmpPeriod ? filterEmpPeriod.value : 'all';
  const category = filterEmpCategory ? filterEmpCategory.value : 'all';
  const type = filterEmpType ? filterEmpType.value : 'all';
  const status = filterEmpStatus ? filterEmpStatus.value : 'all';

  // Status resmi yang diizinkan untuk Riwayat Pengajuan
  const RIWAYAT_STATUSES = ['selesai', 'terlambat', 'ditolak', 'kedaluwarsa', 'kadaluwarsa', 'dibatalkan'];

  const filtered = ticketsList.filter(t => {
    // Check if deleted by employee
    if (t.deletedByKaryawan) return false;

    // 0. Batasi ke akun yang sedang aktif (sebagai inisiator maupun anggota tim)
    const isMyTicket = t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841') || (myNip === 'PK-2024-8841' && (!t.applicantNip || t.applicantNip === 'PK-2024-8841')) || (Array.isArray(t.members) && t.members.some(m => m.nip === myNip));
    if (!isMyTicket) return false;

    // HANYA tiket berstatus riwayat yang diizinkan (mengecualikan status aktif seperti Menunggu Persetujuan, Menunggu Otorisasi Darurat, Disetujui, Sedang di Luar)
    const tStatusNorm = (t.status || '').toLowerCase().trim();
    const isRiwayat = RIWAYAT_STATUSES.includes(tStatusNorm) || !!t.isLate;
    if (!isRiwayat) return false;

    // 1. Dropdown Filters
    if (category !== 'all' && t.category !== category) return false;
    if (type !== 'all' && t.type !== type) return false;

    // Status Filter:
    if (status !== 'all') {
      if (status === 'Darurat') {
        const isEmergency = Boolean(t.isEmergency || (t.id && (t.id.startsWith('TK-EMG') || t.id.includes('-EMG-'))) || t.category === 'Izin Darurat' || t.category === 'Darurat' || (t.type && t.type.toLowerCase().includes('darurat')));
        if (!isEmergency) return false;
      } else if (status === 'Terlambat') {
        const isLate = t.status === 'Terlambat' || !!t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat'));
        if (!isLate) return false;
      } else if (status === 'Kedaluwarsa') {
        if (tStatusNorm !== 'kedaluwarsa' && tStatusNorm !== 'kadaluwarsa') return false;
      } else if (status === 'Ditolak') {
        if (!tStatusNorm.includes('tolak')) return false;
      } else if (status === 'Dibatalkan') {
        if (!tStatusNorm.includes('batal')) return false;
      } else if (status === 'Selesai') {
        if (tStatusNorm !== 'selesai' || t.isLate) return false;
      } else {
        if (t.status !== status) return false;
      }
    }

    // 2. Period Filter
    if (typeof window.matchesPeriodFilter === 'function' && !window.matchesPeriodFilter(t, period)) {
      return false;
    }

    // 3. Search input (multi-token matching for ID, destination, reason, approver name, category, type)
    if (query) {
      const matcher = typeof window.matchSearchTokens === 'function' ? window.matchSearchTokens : (typeof matchSearchTokens === 'function' ? matchSearchTokens : null);
      if (matcher) {
        if (!matcher(query, t.id, t.reason, t.destination, t.approverName, t.category, t.type, t.applicantName)) return false;
      } else {
        const matchId = (t.id || '').toLowerCase().includes(query);
        const matchReason = (t.reason || '').toLowerCase().includes(query);
        const matchDest = (t.destination || '').toLowerCase().includes(query);
        const matchApp = (t.approverName || '').toLowerCase().includes(query);
        if (!matchId && !matchReason && !matchDest && !matchApp) return false;
      }
    }


    return true;
  });

  // Sorting Riwayat (Terbaru / Terlama)
  const sortEmpEl = document.getElementById('sortEmpRiwayat');
  const sortEmpOrder = sortEmpEl ? sortEmpEl.value : 'desc';

  filtered.sort((a, b) => {
    const parseTime = (item) => {
      const raw = item.createdAt || item.plannedExit || 0;
      const d = (typeof window.parseTicketDateTime === 'function') ? window.parseTicketDateTime(raw) : new Date(raw);
      return (d && !isNaN(d.getTime())) ? d.getTime() : 0;
    };
    const tA = parseTime(a);
    const tB = parseTime(b);
    return sortEmpOrder === 'asc' ? tA - tB : tB - tA;
  });

  return filtered;
}

/**
 * Dynamic Timeline Builder based on real ticket lifecycle
 */
function buildActivePermitTimeline(activeTicket) {
  if (!activeTicket) return '';

  const status = activeTicket.status;
  const isEmergency = activeTicket.isEmergency || (activeTicket.id && activeTicket.id.startsWith('TK-EMG'));
  const plannedTimeStr = activeTicket.plannedExit ? activeTicket.plannedExit.slice(11, 16) + ' WIB' : '10.00 WIB';
  const returnTimeStr = activeTicket.estimatedReturn ? activeTicket.estimatedReturn.slice(11, 16) + ' WIB' : '13.00 WIB';
  const isOneWay = activeTicket.type === 'Pulang Mendahului';

  // Extract events if recorded in activeTicket.timeline
  const timelineList = activeTicket.timeline || [];
  const eventDibuat = timelineList.find(e => e.event && (e.event.toLowerCase().includes('diajukan') || e.event.toLowerCase().includes('dibuat')));
  const eventDisetujui = timelineList.find(e => e.event && (e.event.toLowerCase().includes('disetujui') || e.event.toLowerCase().includes('otorisasi')));
  const eventScanOut = timelineList.find(e => e.event && e.event.toLowerCase().includes('scan out'));
  const eventScanIn = timelineList.find(e => e.event && e.event.toLowerCase().includes('Tap In'));

  const timeCreated = eventDibuat ? eventDibuat.time : (activeTicket.createdAt || 'Baru saja diajukan');
  const timeApproved = eventDisetujui ? eventDisetujui.time : (activeTicket.approvedAt || 'Menunggu verifikasi');
  const timeScanOut = eventScanOut ? eventScanOut.time : (activeTicket.scanOutTime ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : `Rencana ${plannedTimeStr}`);
  const timeScanIn = eventScanIn ? eventScanIn.time : (activeTicket.scanInTime ? activeTicket.scanInTime.replace(/ \(Pos 1.*\)/, '') : `Batas ${returnTimeStr}`);

  // Status flags
  const isPending = (status === 'Menunggu Persetujuan' || status === 'Menunggu Otorisasi Darurat');
  const isApproved = (status === 'Disetujui');
  const isOutside = (status === 'Sedang di Luar' || status === 'Terlambat');
  const isCompleted = (status === 'Selesai');
  const isRejected = (status === 'Ditolak');

  let steps = [];

  // STEP 1: Pengajuan diajukan
  steps.push({
    title: isEmergency ? 'Pengajuan Darurat diajukan' : 'Pengajuan diajukan',
    time: timeCreated,
    desc: `${activeTicket.category} — ${activeTicket.type}`,
    state: 'completed'
  });

  // STEP 2: Persetujuan Atasan
  if (isPending) {
    steps.push({
      title: isEmergency ? 'Menunggu Otorisasi Darurat' : 'Menunggu persetujuan atasan',
      time: 'Sedang berlangsung',
      desc: `Menunggu tinjauan & keputusan dari ${activeTicket.approverName || 'Atasan Langsung'}`,
      state: 'active_pending'
    });
  } else if (isRejected) {
    steps.push({
      title: 'Pengajuan Ditolak Atasan',
      time: timeApproved,
      desc: activeTicket.rejectionReason || activeTicket.approverNote || 'Alasan tidak disetujui',
      state: 'rejected'
    });
  } else {
    steps.push({
      title: isEmergency ? 'Otorisasi Darurat Disetujui' : 'Disetujui oleh atasan',
      badge: 'Disetujui',
      time: timeApproved,
      desc: `${activeTicket.approverName || 'Ir. Hendra Gunawan, M.T.'}${activeTicket.approverTitle ? ' — ' + activeTicket.approverTitle : ''}`,
      state: 'completed'
    });
  }

  // STEP 3: Scan Out Pos Jaga
  if (isPending || isRejected) {
    steps.push({
      title: 'Scan Out tercatat di Pos 1',
      time: `Rencana ${plannedTimeStr}`,
      desc: isRejected ? 'Dibatalkan karena izin ditolak' : 'Menunggu persetujuan atasan sebelum scan gerbang',
      state: 'upcoming'
    });
  } else if (isApproved) {
    steps.push({
      title: 'Siap Scan Out di Pos 1 Gerbang Utama',
      time: `Jadwal: ${plannedTimeStr}`,
      desc: 'Tunjukkan QR Code digital kepada petugas satpam di gerbang',
      state: 'active_ready'
    });
  } else {
    steps.push({
      title: 'Scan Out tercatat',
      time: timeScanOut,
      desc: 'Pos 1 — Karyawan meninggalkan area operasional',
      state: 'completed'
    });
  }

  // STEP 4: Tap In Kembali (or Pulang Mendahului)
  if (isOneWay) {
    steps.push({
      title: 'Pulang Mendahului',
      time: plannedTimeStr,
      desc: 'Izin pulang selesai jam kerja, tidak perlu kembali ke area pabrik',
      state: (isOutside || isCompleted) ? 'completed' : 'upcoming'
    });
  } else {
    if (isCompleted) {
      steps.push({
        title: 'Tap In Kartu Akses tercatat',
        time: timeScanIn,
        desc: activeTicket.isLate ? 'Karyawan kembali ke area pabrik via Tap In (Terlambat)' : 'Pos 1 — Karyawan kembali ke area pabrik tepat waktu via Tap In',
        state: 'completed'
      });
    } else if (isOutside) {
      steps.push({
        title: status === 'Terlambat' ? 'Tap In Terlambat (Segera ke Pos 1)' : 'Batas kembali ' + returnTimeStr,
        time: status === 'Terlambat' ? '⚠️ Melewati batas estimasi' : 'Tap In Kartu di Pos 1',
        desc: status === 'Terlambat' ? 'Segera lakukan Tap In Kartu Akses di Pos 1 Gerbang Utama!' : 'Belum kembali ke area',
        state: status === 'Terlambat' ? 'active_overdue' : 'active_outside'
      });
    } else {
      steps.push({
        title: 'Batas kembali ' + returnTimeStr,
        time: 'Tap In Kartu di Pos 1',
        desc: 'Belum kembali ke area',
        state: 'upcoming'
      });
    }
  }

  // Render steps to HTML with dynamic dots and lines
  return `
    <div style="display: flex; flex-direction: column; gap: 1.15rem; position: relative; padding-left: 1.5rem; margin-top: 0.5rem;">
      <div style="position: absolute; left: 6px; top: 8px; bottom: 8px; width: 2px; background: #e2e8f0;"></div>
      ${steps.map((st) => {
    let dotStyle = 'background: #1d68d8; border: 2.5px solid #ffffff;';
    let opacity = '1';
    let titleColor = '#0f172a';

    if (st.state === 'completed') {
      dotStyle = 'background: #10b981; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #10b981;';
    } else if (st.state === 'active_pending') {
      dotStyle = 'background: #f59e0b; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #f59e0b;';
      titleColor = '#b45309';
    } else if (st.state === 'active_ready') {
      dotStyle = 'background: #1d68d8; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #1d68d8;';
      titleColor = '#1d68d8';
    } else if (st.state === 'active_outside') {
      dotStyle = 'background: #9333ea; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #9333ea;';
      titleColor = '#7e22ce';
    } else if (st.state === 'active_overdue' || st.state === 'rejected') {
      dotStyle = 'background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 0 0 2px #dc2626;';
      titleColor = '#dc2626';
    } else if (st.state === 'upcoming') {
      dotStyle = 'background: #ffffff; border: 2.5px solid #cbd5e1;';
      opacity = '0.55';
    }

    return `
          <div style="position: relative; opacity: ${opacity};">
            <div style="position: absolute; left: -1.5rem; top: 4px; width: 14px; height: 14px; border-radius: 50%; ${dotStyle}"></div>
            <div style="font-size: 0.7rem; color: #64748b; font-weight: 600;">${st.time}</div>
            <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 1px;">
              <span style="font-size: 0.825rem; font-weight: 800; color: ${titleColor};">${st.title}</span>
              ${st.badge ? `<span style="font-size: 0.72rem; font-weight: 700; color: #059669;">${st.badge}</span>` : ''}
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px; line-height: 1.35;">${st.desc}</div>
          </div>
        `;
  }).join('')}
    </div>
  `;
}

/**
 * 1. DASHBOARD KARYAWAN (FIGMA SCREEN 1)
 */
function renderKaryawanDashboard() {
  updateKaryawanMetrics();

  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  const figmaHeroStrip = document.getElementById('figmaHeroStrip');
  const cardActivePermitSummary = document.getElementById('cardActivePermitSummary');
  const karyawanDashboardRecentList = document.getElementById('karyawanDashboardRecentList');
  const ticketsList = window.ticketsList || [];
  const empActor = getCurrentEmployeeActor();
  const myNip = empActor.nip || 'PK-2024-8841';

  // Perbarui ucapan selamat datang di banner hero secara dinamis (sesuai akun login aktif)
  const empHeroGreeting = document.getElementById('empHeroGreeting');
  const empHeroSub = document.getElementById('empHeroSub');
  if (empHeroGreeting) {
    const nowH = new Date().getHours();
    let timeGreeting = 'pagi';
    if (nowH >= 11 && nowH < 15) timeGreeting = 'siang';
    else if (nowH >= 15 && nowH < 18) timeGreeting = 'sore';
    else if (nowH >= 18 || nowH < 5) timeGreeting = 'malam';
    empHeroGreeting.innerHTML = `Selamat ${timeGreeting}, ${window.renderUserPhoto(empActor.name, 32)} <span>${empActor.name}</span>`;
  }
  const primaryApprover = (typeof window.getPrimaryApprover === 'function') 
    ? window.getPrimaryApprover(empActor.name || empActor.nip) 
    : (window.ACTORS && window.ACTORS.karyawan && window.ACTORS.karyawan.approverName ? { name: window.ACTORS.karyawan.approverName } : null);

  if (empHeroSub) {
    const title = empActor.role || empActor.title || 'Staf Rekayasa Mesin';
    const dept = empActor.department || 'Departemen Rekayasa & Pemeliharaan';
    if (primaryApprover && primaryApprover.name) {
      empHeroSub.textContent = `Karyawan | ${dept} | Atasan: ${primaryApprover.name}`;
    } else {
      empHeroSub.textContent = `${title} | ${dept} | Atasan Anda tidak tersedia, jika ingin membuat pengajuan pilih atasan lain`;
    }
  }

  const empNoApproverNotice = document.getElementById('empNoApproverNotice');
  if (empNoApproverNotice) {
    empNoApproverNotice.style.display = primaryApprover ? 'none' : 'flex';
  }

  // 1.1 Hero Strip
  if (figmaHeroStrip) {
    if (activeTicket) {
      const statusPill = getCleanEmpStatus(activeTicket.status, activeTicket);
      let statusText = `Status: Izin Aktif — ${activeTicket.id}`;
      let statusSub = `${activeTicket.category} — Batas kembali ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '13:00 WIB'}`;

      if (activeTicket.status === 'Menunggu Persetujuan' || activeTicket.status === 'Menunggu Otorisasi Darurat') {
        statusText = `Status: Izin Diajukan — ${activeTicket.id}`;
        statusSub = `${activeTicket.category} — Menunggu Persetujuan Atasan (${activeTicket.approverName || (primaryApprover ? primaryApprover.name : 'Atasan Langsung')})`;
      } else if (activeTicket.status === 'Disetujui') {
        statusText = `Status: Izin Disetujui — ${activeTicket.id}`;
        statusSub = `${activeTicket.category} — QR Siap Digunakan di Pos 1 — Jadwal Keluar ${activeTicket.plannedExit ? activeTicket.plannedExit.slice(11, 16) + ' WIB' : ''}`;
      } else if (activeTicket.status === 'Terlambat') {
        statusText = `Status: Terlambat Kembali — ${activeTicket.id}`;
        statusSub = `${activeTicket.category} — Batas waktu ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : ''} TELAH TERLEWAT! Segera Tap In Kartu Akses di Pos 1.`;
      } else if (activeTicket.status === 'Sedang di Luar') {
        statusText = `Status: Izin Aktif — ${activeTicket.id}`;
        statusSub = `${activeTicket.category} — Scan Out ${activeTicket.scanOutTime ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : '10:05 WIB'} — Batas kembali ${activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '13:00 WIB'}`;
      }

      figmaHeroStrip.innerHTML = `
        <div class="hero-strip-left">
          ${statusPill}
          <span class="hero-strip-text">${statusText}</span>
          <span class="hero-strip-sub">${statusSub}</span>
        </div>
        <button class="btn-hero-action" onclick="setKaryawanNav('pengajuan')">
          Pengajuan Saya →
        </button>
      `;
    } else {
      figmaHeroStrip.innerHTML = `
        <div class="hero-strip-left">
          
          <span class="hero-strip-text">Status: Tidak Ada Perizinan Aktif</span>
          <span class="hero-strip-sub">Ajukan izin bila hendak meninggalkan area.</span>
        </div>
        <button class="btn-hero-action" onclick="setKaryawanNav('pengajuan')">
          + Buat Pengajuan
        </button>
      `;
    }
  }

  // 1.2 Card: Izin aktif saya
  if (cardActivePermitSummary) {
    if (activeTicket) {
      const isOutside = (activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat');
      const isWaitingVerify = (activeTicket.status === 'Menunggu Verifikasi Atasan');
      const FINISHED_STATUSES = ['Selesai', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'];
      const isFinished = FINISHED_STATUSES.includes(activeTicket.status);
      const isApproved = !isOutside && !isWaitingVerify && (activeTicket.status === 'Disetujui');
      const isEmergTicket = Boolean(
        activeTicket.isEmergency ||
        activeTicket.status === 'Menunggu Otorisasi Darurat' ||
        (activeTicket.id && (activeTicket.id.includes('-EMG-') || activeTicket.id.startsWith('TK-EMG-')))
      );
      const isEmergLocked = !isOutside && !isWaitingVerify && !isFinished && !isApproved && !activeTicket.scanOutTime && isEmergTicket && (
        activeTicket.status === 'Menunggu Otorisasi Darurat' ||
        (activeTicket.emergencyLocked === true && activeTicket.status !== 'Disetujui') ||
        (activeTicket.qrLocked === true && activeTicket.status !== 'Disetujui')
      );
      const isPending = !isOutside && !isWaitingVerify && !isFinished && !isApproved && (activeTicket.status === 'Menunggu Persetujuan');

      const currentEmpActor = typeof getCurrentEmployeeActor === 'function' ? getCurrentEmployeeActor() : { nip: 'PK-2024-8841' };
      const myNip = currentEmpActor.nip || 'PK-2024-8841';
      const isMemberOnly = activeTicket.isGroupDinas && activeTicket.applicantNip !== myNip;
    const isGroupDinasActive = Boolean(activeTicket.isGroupDinas && Array.isArray(activeTicket.members) && activeTicket.members.filter(m => m.status !== 'batal').length > 0);

      const isOutsideOrWaiting = isOutside || isWaitingVerify;
      const col1Label = (isOutsideOrWaiting && activeTicket.scanOutTime) ? 'Scan Out Pos 1' : 'Jadwal Keluar';
      const col1Val = (isOutsideOrWaiting && activeTicket.scanOutTime) ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
      const col2Label = activeTicket.type === 'Pulang Mendahului' ? 'Tipe Kepulangan' : 'Batas kembali';
      const col2Val = activeTicket.type === 'Pulang Mendahului' ? 'Pulang Lebih Awal' : (activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '-');

      let actionButtonsHtml = '';
      if (isWaitingVerify) {
        actionButtonsHtml = `
          <button class="btn-figma-secondary" disabled style="background: #eff6ff; color: #1e40af; border: 1.5px solid #bfdbfe; font-weight: 700; cursor: not-allowed; display: inline-flex; align-items: center; gap: 4px;">
            <span>⏳ Menunggu Verifikasi Atasan</span>
          </button>
        `;
      } else if (isOutside) {
        const hasPendingExt = activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';
        const hasUsedExtension = activeTicket.extensionApproved || (activeTicket.extensionCount && activeTicket.extensionCount >= 1);
        const isKembali = activeTicket.type !== 'Pulang Mendahului';
        const isGroupDinasActive = Boolean(activeTicket.isGroupDinas && Array.isArray(activeTicket.members) && activeTicket.members.filter(m => m.status !== 'batal').length > 0);

        actionButtonsHtml = `
          ${(isKembali) ? (
            hasPendingExt ? `
              <button class="btn-figma-secondary btn-pending-ext-notice" disabled style="opacity: 0.9; cursor: not-allowed; font-weight: 700;" title="Permohonan perpanjangan sedang ditinjau Atasan">
                <span>Menunggu Persetujuan Perpanjangan</span>
              </button>
            ` : (hasUsedExtension ? `
              <button class="btn-figma-secondary" disabled style="opacity: 0.6; cursor: not-allowed; background: #d97706;" title="Perpanjangan waktu hanya dapat diajukan maksimal 1 kali dan telah disetujui">
                <span>Perpanjangan Telah Digunakan (Maks. 1x)</span>
              </button>
            ` : `
              <button class="btn-figma-secondary" style="font-weight: 700;" onclick="openExtendDurationModal('${activeTicket.id}')">
                <span>Ajukan Perpanjangan</span>
              </button>
            `)
          ) : ''}
          ${isGroupDinasActive ? `
            <button class="btn-figma-secondary" style="background:#2563eb; color:#ffffff; border-color:#2563eb; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" onclick="window.openSimulasiTapInModal('${activeTicket.id}')" title="Tempelkan kartu akses gerbang masuk untuk mengunci waktu kepulangan">
              <span>💳 Simulasi Tap In Gerbang</span>
            </button>
          ` : `
            <button class="btn-figma-secondary" style="background:#059669; color:#ffffff; border-color:#059669; font-weight: 700;" onclick="executeScanIn('${activeTicket.id}')" title="Tap in kartu akses gerbang masuk">
              <span>✓ Tap In Kartu Akses (Masuk)</span>
            </button>
          `}
        `;
      } else if (isEmergLocked) {
        const isFaceScan = (activeTicket.selectedMethod === 'facescan');
        actionButtonsHtml = `
          ${isFaceScan ? `
            <button class="btn-figma-primary" style="background:#059669; border-color:#059669; font-weight:800;" onclick="window.openEmergencyUnlockModal('${activeTicket.id}', 'facescan')">
              <span>🤳 Scan Wajah Atasan</span>
            </button>
          ` : ''}
          ${!isMemberOnly ? `
            <button class="btn-figma-blue" onclick="window.openEditTicketModal('${activeTicket.id}')">
              <span>Edit Pengajuan</span>
            </button>
          ` : ''}
          <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
            <span>${isMemberOnly ? 'Batalkan Keikutsertaan' : 'Batalkan Izin'}</span>
          </button>
        `;
      } else if (isPending) {
        actionButtonsHtml = `
          ${!isMemberOnly ? `
            <button class="btn-figma-blue" onclick="window.openEditTicketModal('${activeTicket.id}')">
              <span>Edit Pengajuan</span>
            </button>
            <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
              <span>Batalkan Izin</span>
            </button>
          ` : `
            <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
              <span>Batalkan Keikutsertaan</span>
            </button>
          `}
        `;
      } else if (isApproved) {
        actionButtonsHtml = `
          <button class="btn-figma-primary" onclick="openTicketDetail('${activeTicket.id}', 'qr')">
            <span>Buka QR Izin</span>
          </button>
          <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
            <span>${isMemberOnly ? 'Batalkan Keikutsertaan' : 'Batalkan'}</span>
          </button>
        `;
      }

      const isEmergency = activeTicket.isEmergency || (activeTicket.id && activeTicket.id.includes('-EMG-')) || activeTicket.status === 'Menunggu Otorisasi Darurat';
      const activeMembers = Array.isArray(activeTicket.members) ? activeTicket.members.filter(m => m.status !== 'batal' && m.status !== 'cancelled') : [];

      cardActivePermitSummary.innerHTML = `
        <div class="figma-card-header">
          <h3 class="figma-card-title">Izin aktif saya</h3>
          <a href="#" class="figma-card-link" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Detail Pengajuan</a>
        </div>
        <div>
          <div style="font-size: 1.05rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span>${activeTicket.id}</span>
            ${isEmergency ? `<span style="font-size: 0.72rem; color: #be123c; font-weight: 800; background: #ffe4e6; padding: 2px 7px; border-radius: 4px; border: 1px solid #fecdd3; letter-spacing: 0.3px;">Izin Darurat</span>` : ''}
            ${activeTicket.isGroupDinas ? `<span style="font-size: 0.72rem; color: #047857; font-weight: 800; background: #ecfdf5; padding: 2px 7px; border-radius: 4px; border: 1px solid #a7f3d0; letter-spacing: 0.3px;">👥 Dinas Bersama (${activeMembers.length + (activeTicket.initiatorCancelled ? 0 : 1)} Orang)</span>` : ''}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; font-weight: 600; line-height: 1.35;">
            <div>${activeTicket.category}</div>
            <div style="font-weight: 500; font-size: 0.75rem; color: var(--text-muted);">${activeTicket.type}</div>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; max-width: 100%; word-break: break-word; overflow-wrap: anywhere; overflow: hidden; text-overflow: ellipsis; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4;" title="${(String(activeTicket.destination || '') + ' — ' + String(activeTicket.reason || '')).replace(/"/g, '&quot;')}">${activeTicket.destination} — ${activeTicket.reason}</div>
          <div style="margin-top: 8px; display: inline-flex; align-items: center;">
            ${getCleanEmpStatus(activeTicket.status, activeTicket)}
          </div>
        </div>

        ${activeTicket.isGroupDinas && Array.isArray(activeTicket.members) ? `
          <div style="margin-top: 8px; background: rgba(5, 150, 105, 0.05); border: 1px solid rgba(5, 150, 105, 0.2); border-radius: 6px; padding: 6px 10px; font-size: 0.75rem;">
            <div style="font-weight: 700; color: #065f46; display: flex; align-items: center; justify-content: space-between;">
              <span>👥 Tim Dinas:</span>
              <span style="font-size: 0.7rem; font-weight: 600; color: #047857;">${activeMembers.length + (activeTicket.initiatorCancelled ? 0 : 1)} Personel Aktif</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
              ${!activeTicket.initiatorCancelled ? `<span style="background: #d1fae5; color: #065f46; padding: 2px 7px; border-radius: 4px; font-weight: 600;">👑 ${activeTicket.applicantName} (Inisiator)</span>` : `<span style="background: #f1f5f9; color: #94a3b8; text-decoration: line-through; padding: 2px 7px; border-radius: 4px;">${activeTicket.applicantName} (Batal)</span>`}
              ${activeTicket.members.map(m => (m.status === 'batal' || m.status === 'cancelled') ? `<span style="background: #f1f5f9; color: #94a3b8; text-decoration: line-through; padding: 2px 7px; border-radius: 4px;">${m.name} (Batal)</span>` : `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 4px; font-weight: 600;">👤 ${m.name}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${isWaitingVerify ? `
          <div style="margin-top: 0.75rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 10px; font-size: 0.75rem; color: #1e40af; line-height: 1.4;">
            <strong>🏢 Tap In Gerbang Tercatat:</strong> Jam kepulangan telah dikunci pada <strong>${activeTicket.tapInTime || activeTicket.arrivalReportedTime || activeTicket.reportedReturnTime || '-'}</strong>${activeTicket.tapInMember ? ` (oleh ${activeTicket.tapInMember})` : ''}. Menunggu Atasan (${activeTicket.approverName}) memverifikasi fisik kehadiran Anda di ruangan kerja.
          </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid var(--border-color, #f1f5f9);">
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col1Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col1Val}</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col2Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col2Val}</div>
          </div>
        </div>

        ${isEmergLocked ? `
          <div style="margin-top: 0.85rem; font-size: 0.775rem; padding-top: 0.65rem; border-top: 1px solid var(--border-color, #f1f5f9);">
            <div style="font-weight: 800; color: #b91c1c; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <span>Izin Darurat Menunggu Otorisasi</span>
              <span style="font-weight: 700; color: #b91c1c;">QR Terkunci</span>
            </div>
            <div style="color: #475569; margin-top: 0.25rem; line-height: 1.45;">
              Sesuai SOP K3, QR Code izin darurat terkunci sampai diverifikasi dan disetujui oleh Atasan.
            </div>
          </div>
        ` : ''}

        <div class="card-action-btns-wrap" style="display: flex; gap: 0.5rem; margin-top: 1.15rem; flex-wrap: wrap;">
          ${actionButtonsHtml}
        </div>
      `;
    } else {
      cardActivePermitSummary.innerHTML = `
        <div class="figma-card-header">
          <h3 class="figma-card-title">Izin aktif saya</h3>
        </div>
        <div style="padding: 1.5rem 0.5rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🏢</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a;">Tidak Ada Perizinan Aktif</div>
          <p style="font-size: 0.8rem; color: #64748b; margin-top: 4px; max-width: 320px; margin-left: auto; margin-right: auto; margin-bottom: 1.25rem;">
            Anda sedang berada di kawasan operasional pabrik.
          </p>
          <button class="btn-figma-primary" onclick="setKaryawanNav('pengajuan')" style="font-size: 0.825rem; padding: 0.5rem 1rem;">
            Buka Pengajuan Saya →
          </button>
        </div>
      `;
    }
  }

  // 1.3 Card: Pengajuan terbaru (2 Completed recent tickets)
  if (karyawanDashboardRecentList) {
    const completedItems = ticketsList.filter(t =>
      (t.applicantNip === myNip || (!t.applicantNip && myNip === 'PK-2024-8841')) &&
      t.status === 'Selesai'
    ).slice(0, 2);

    if (completedItems.length === 0) {
      karyawanDashboardRecentList.innerHTML = `
        <div style="padding: 1.25rem 0; text-align: center; color: #94a3b8; font-size: 0.825rem;">
          Belum ada riwayat pengajuan selesai.
        </div>
      `;
    } else {
      karyawanDashboardRecentList.innerHTML = completedItems.map((t, idx) => {
        const exitHour = t.plannedExit ? t.plannedExit.slice(11, 16) : '09:00';
        const returnHour = t.estimatedReturn ? t.estimatedReturn.slice(11, 16) : '11:00';
        const timeSpan = `${exitHour} s/d ${returnHour} WIB`;

        // Format tanggal secara akurat (hindari .slice(0,6) yang menghasilkan "2026-1")
        let dayMonth = 'Hari ini';
        if (t.createdAt) {
          const parsed = typeof window.parseTicketDateTime === 'function' ? window.parseTicketDateTime(t.createdAt) : new Date(t.createdAt);
          if (parsed && !isNaN(parsed.getTime())) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            dayMonth = `${parsed.getDate()} ${months[parsed.getMonth()]}`;
          } else {
            dayMonth = t.createdAt.split(',')[0].trim();
          }
        }

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 0; ${idx < completedItems.length - 1 ? 'border-bottom: 1px solid #f1f5f9;' : ''} gap: 1rem; flex-wrap: wrap;">
            <!-- Kolom 1: ID Tiket & Kategori -->
            <div style="min-width: 170px; flex: 1;">
              <div style="font-size: 0.875rem; font-weight: 800; font-family: var(--font-mono); color: #0f172a; letter-spacing: -0.2px;">${t.id}</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 3px; font-weight: 500;">${dayMonth} — ${t.category}</div>
            </div>

            <!-- Kolom 2: Rentang Waktu (Kolom terpisah teratur agar waktu rapi sejajar) -->
            <div style="min-width: 125px; text-align: right;">
              <span style="font-size: 0.8rem; color: #334155; font-weight: 600; font-family: var(--font-mono);">${timeSpan}</span>
            </div>

            <!-- Kolom 3: Status Pill (Lebar teratur agar tidak menabrak waktu) -->
            <div style="min-width: 190px; text-align: left;">
              ${getCleanEmpStatus(t.status || 'Selesai', t)}
            </div>

            <!-- Kolom 4: Aksi Detail Pengajuan & Hapus -->
            <div style="min-width: 175px; text-align: right; white-space: nowrap;">
              <div class="action-pills-row">
                <button type="button" class="btn-pill-action btn-pill-detail" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Detail Pengajuan">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                  <span>Detail Pengajuan</span>
                </button>
                <button type="button" class="btn-pill-action btn-pill-delete" onclick="deleteEmpTicket('${t.id}')" title="Hapus Pengajuan #${t.id}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 1.4 Donut Chart: Status Izin Saya
  renderKaryawanDonutChart();
}

/**
 * Render Donut Chart SVG matching Figma Screen 1 & User Screenshot
 */
function renderKaryawanDonutChart() {
  if (typeof window.renderKaryawanDonutChart === 'function' && window.renderKaryawanDonutChart !== renderKaryawanDonutChart) {
    return window.renderKaryawanDonutChart();
  }
}

// ===================================================================
// FULL PAGE PERMIT APPLICATION FORM LOGIC (BENTO GRID DEDICATED VIEW)
// ===================================================================

/**
 * Tab switcher untuk Formulir Penuh Pengajuan Izin Keluar (Bento Grid)
 * Menghubungkan 100% sistem asli: Search Atasan dinamis, Otorisasi QR Darurat, validasi SOP, konfirmasi ringkasan
 */
window.switchFullPermitTab = function(tab) {
  const btnRegular = document.getElementById('btnFullTypeRegular');
  const btnEmergency = document.getElementById('btnFullTypeEmergency');
  const panelRegular = document.getElementById('panelFullRegular');
  const panelEmergency = document.getElementById('panelFullEmergency');

  if (tab === 'emergency') {
    if (btnEmergency) btnEmergency.classList.add('active', 'emergency');
    if (btnRegular) btnRegular.classList.remove('active');
    if (panelRegular) panelRegular.style.display = 'none';
    if (panelEmergency) panelEmergency.style.display = 'block';
    if (typeof window.handleOpenEmergency === 'function') {
      window.handleOpenEmergency();
    }
  } else {
    if (btnRegular) btnRegular.classList.add('active');
    if (btnEmergency) btnEmergency.classList.remove('active', 'emergency');
    if (panelRegular) panelRegular.style.display = 'block';
    if (panelEmergency) panelEmergency.style.display = 'none';
    if (typeof window.handleOpenNewRequest === 'function') {
      window.handleOpenNewRequest();
    }
  }

  // Formulir penuh inline di halaman, jangan sampai scroll body terkunci
  document.body.classList.remove('modal-open');
};

window.handleCancelFullForm = function() {
  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  document.body.classList.remove('modal-open');
  if (activeTicket) {
    if (typeof renderPengajuanSayaView === 'function') {
      renderPengajuanSayaView();
    }
  } else {
    if (typeof setKaryawanNav === 'function') {
      setKaryawanNav('dashboard');
    }
  }
};

/**
 * 2. PENGAJUAN SAYA (FIGMA SCREEN 2)
 */
function renderPengajuanSayaView() {
  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket() : null;
  const karyawanActiveTicketWrapper = document.getElementById('karyawanActiveTicketWrapper');
  const karyawanFullFormContainer = document.getElementById('karyawanFullFormContainer');
  const colPengajuanLeft = document.getElementById('colPengajuanLeft');
  const colPengajuanRight = document.getElementById('colPengajuanRight');
  const emptyEmpActiveBox = document.getElementById('emptyEmpActiveBox');

  // Pastikan body tidak terkunci saat berada di halaman Pengajuan Saya
  document.body.classList.remove('modal-open');

  // Skenario 1: Belum Ada Izin Aktif -> Langsung Tampilkan Formulir Penuh (Full Page Bento Grid)
  if (!activeTicket) {
    if (karyawanActiveTicketWrapper) karyawanActiveTicketWrapper.style.display = 'none';
    if (colPengajuanLeft) colPengajuanLeft.style.display = 'none';
    if (colPengajuanRight) colPengajuanRight.style.display = 'none';
    if (emptyEmpActiveBox) emptyEmpActiveBox.style.display = 'none';
    if (karyawanFullFormContainer) {
      karyawanFullFormContainer.style.display = 'block';
      window.switchFullPermitTab('regular');
    }
    document.body.classList.remove('modal-open');
    return;
  }

  // Skenario 2: Sudah Ada Izin Aktif -> Tampilkan Kartu Izin Aktif & Kronologi (Sesuai Gambar Pengguna)
  if (karyawanFullFormContainer) karyawanFullFormContainer.style.display = 'none';
  if (emptyEmpActiveBox) emptyEmpActiveBox.style.display = 'none';
  if (karyawanActiveTicketWrapper) karyawanActiveTicketWrapper.style.display = 'block';
  if (colPengajuanLeft) colPengajuanLeft.style.display = 'flex';
  if (colPengajuanRight) colPengajuanRight.style.display = 'flex';
  document.body.classList.remove('modal-open');

  // Left Column
  if (colPengajuanLeft) {
    const isOutside = (activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat');
    const isWaitingVerify = (activeTicket.status === 'Menunggu Verifikasi Atasan');
    const FINISHED_STATUSES = ['Selesai', 'Dibatalkan', 'Ditolak', 'Kedaluwarsa'];
    const isFinished = FINISHED_STATUSES.includes(activeTicket.status);
    const isApproved = !isOutside && !isWaitingVerify && (activeTicket.status === 'Disetujui');
    const isEmergTicket = Boolean(
      activeTicket.isEmergency ||
      activeTicket.status === 'Menunggu Otorisasi Darurat' ||
      (activeTicket.id && (activeTicket.id.includes('-EMG-') || activeTicket.id.startsWith('TK-EMG-')))
    );
    const isEmergLocked = !isOutside && !isWaitingVerify && !isFinished && !isApproved && !activeTicket.scanOutTime && isEmergTicket && (
      activeTicket.status === 'Menunggu Otorisasi Darurat' ||
      (activeTicket.emergencyLocked === true && activeTicket.status !== 'Disetujui') ||
      (activeTicket.qrLocked === true && activeTicket.status !== 'Disetujui')
    );
    const isPending = !isOutside && !isWaitingVerify && !isFinished && !isApproved && (activeTicket.status === 'Menunggu Persetujuan');

    const currentEmpActor = typeof getCurrentEmployeeActor === 'function' ? getCurrentEmployeeActor() : { nip: 'PK-2024-8841' };
    const myNip = currentEmpActor.nip || 'PK-2024-8841';
    const isMemberOnly = activeTicket.isGroupDinas && activeTicket.applicantNip !== myNip;
    const isGroupDinasActive = Boolean(activeTicket.isGroupDinas && Array.isArray(activeTicket.members) && activeTicket.members.filter(m => m.status !== 'batal').length > 0);

    const isOutsideOrWaiting = isOutside || isWaitingVerify;
    const col1Label = (isOutsideOrWaiting && activeTicket.scanOutTime) ? 'Scan Out Pos 1' : 'Jadwal Keluar';
    const col1Val = (isOutsideOrWaiting && activeTicket.scanOutTime) ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
    const col2Label = activeTicket.type === 'Pulang Mendahului' ? 'Tipe Kepulangan' : 'Batas kembali';
    const col2Val = activeTicket.type === 'Pulang Mendahului' ? 'Pulang Lebih Awal' : (activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '-');

    let actionButtonsHtml = '';
    if (isWaitingVerify) {
      actionButtonsHtml = `
        <button class="btn-figma-secondary" disabled style="background: #eff6ff; color: #1e40af; border: 1.5px solid #bfdbfe; font-weight: 700; cursor: not-allowed; display: inline-flex; align-items: center; gap: 4px;">
          <span>⏳ Menunggu Verifikasi Atasan</span>
        </button>
      `;
    } else if (isOutside) {
      const isLateStatus = (activeTicket.status === 'Terlambat' || activeTicket.isLate);
      const hasPendingExt = activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';
      const hasUsedExtension = activeTicket.extensionApproved || (activeTicket.extensionCount && activeTicket.extensionCount >= 1);
      const isKembali = activeTicket.type !== 'Pulang Mendahului';

      actionButtonsHtml = `
        ${(!isLateStatus && isKembali) ? (
          hasPendingExt ? `
            <button class="btn-figma-secondary btn-pending-ext-notice" disabled style="opacity: 0.9; cursor: not-allowed; font-weight: 700;" title="Permohonan perpanjangan sedang ditinjau Atasan">
              <span>Menunggu Persetujuan Perpanjangan</span>
            </button>
          ` : (hasUsedExtension ? `
            <button class="btn-figma-secondary" disabled style="opacity: 0.6; cursor: not-allowed; background: #d97706" title="Perpanjangan waktu hanya dapat diajukan maksimal 1 kali dan telah disetujui">
              <span>Perpanjangan Telah Digunakan (Maks. 1x)</span>
            </button>
          ` : `
            <button class="btn-figma-secondary" style="font-weight: 700;" onclick="openExtendDurationModal('${activeTicket.id}')">
              <span>Ajukan Perpanjangan</span>
            </button>
          `)
        ) : ''}
        ${isGroupDinasActive ? `
        <button class="btn-figma-secondary" style="background:#2563eb; color:#ffffff; border-color:#2563eb; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" onclick="window.openSimulasiTapInModal('${activeTicket.id}')" title="Tempelkan kartu akses gerbang masuk untuk mengunci waktu kepulangan">
          <span>💳 Simulasi Tap In Gerbang</span>
        </button>
        ` : `
        <button class="btn-figma-secondary" style="background:#059669; color:#ffffff; border-color:#059669; font-weight: 700;" onclick="executeScanIn('${activeTicket.id}')" title="Tap in kartu akses gerbang masuk">
          <span>✓ Tap In Kartu Akses (Masuk)</span>
        </button>
        `}
      `;
    } else if (isEmergLocked) {
      const isFaceScan = (activeTicket.selectedMethod === 'facescan');
      actionButtonsHtml = `
        ${isFaceScan ? `
          <button class="btn-figma-primary" style="background:#059669; border-color:#059669; font-weight:800;" onclick="window.openEmergencyUnlockModal('${activeTicket.id}', 'facescan')">
            <span>🤳 Scan Wajah Atasan</span>
          </button>
        ` : ''}
        ${!isMemberOnly ? `
          <button class="btn-figma-blue" onclick="window.openEditTicketModal('${activeTicket.id}')">
            <span>Edit Pengajuan</span>
          </button>
        ` : ''}
        <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
          <span>${isMemberOnly ? 'Batalkan Keikutsertaan' : 'Batalkan Izin'}</span>
        </button>
      `;
    } else if (isPending) {
      actionButtonsHtml = `
        ${!isMemberOnly ? `
          <button class="btn-figma-blue" onclick="window.openEditTicketModal('${activeTicket.id}')">
            <span>Edit Pengajuan</span>
          </button>
          <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Izin</span>
          </button>
        ` : `
          <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Keikutsertaan</span>
          </button>
        `}
      `;
    } else if (isApproved) {
      actionButtonsHtml = `
        <button class="btn-figma-primary" onclick="openTicketDetail('${activeTicket.id}', 'qr')">
          <span>Buka QR Izin</span>
        </button>
        <button class="btn-figma-danger" onclick="openCancelModal('${activeTicket.id}')">
          <span>${isMemberOnly ? 'Batalkan Keikutsertaan' : 'Batalkan'}</span>
        </button>
      `;
    }

    const isEmergency = activeTicket.isEmergency || (activeTicket.id && activeTicket.id.includes('-EMG-')) || activeTicket.status === 'Menunggu Otorisasi Darurat';
    const activeMembers = Array.isArray(activeTicket.members) ? activeTicket.members.filter(m => m.status !== 'batal' && m.status !== 'cancelled') : [];

    colPengajuanLeft.innerHTML = `
      <!-- Card 1: Izin aktif saya -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title">Izin aktif saya</h3>
          <a href="#" class="figma-card-link" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Detail Pengajuan</a>
        </div>
        <div>
          <div style="font-size: 1.05rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span>${activeTicket.id}</span>
            ${isEmergency ? `<span style="font-size: 0.72rem; color: #be123c; font-weight: 800; background: #ffe4e6; padding: 2px 7px; border-radius: 4px; border: 1px solid #fecdd3; letter-spacing: 0.3px;">Izin Darurat</span>` : ''}
            ${activeTicket.isGroupDinas ? `<span style="font-size: 0.72rem; color: #047857; font-weight: 800; background: #ecfdf5; padding: 2px 7px; border-radius: 4px; border: 1px solid #a7f3d0; letter-spacing: 0.3px;">👥 Dinas Bersama (${activeMembers.length + (activeTicket.initiatorCancelled ? 0 : 1)} Orang)</span>` : ''}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; font-weight: 600; line-height: 1.35;">
            <div>${activeTicket.category}</div>
            <div style="font-weight: 500; font-size: 0.75rem; color: var(--text-muted);">${activeTicket.type}</div>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; max-width: 100%; word-break: break-word; overflow-wrap: anywhere; overflow: hidden; text-overflow: ellipsis; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4;" title="${(activeTicket.destination || '').replace(/"/g, '&quot;')} — ${(activeTicket.reason || '').replace(/"/g, '&quot;')}">${(activeTicket.destination || '').replace(/\r?\n+/g, ' ')} — ${(activeTicket.reason || '').replace(/\r?\n+/g, ' ')}</div>
          <div style="margin-top: 8px; display: inline-flex; align-items: center;">
            ${getCleanEmpStatus(activeTicket.status, activeTicket)}
          </div>
        </div>

        ${activeTicket.isGroupDinas && Array.isArray(activeTicket.members) ? `
          <div style="margin-top: 8px; background: rgba(5, 150, 105, 0.05); border: 1px solid rgba(5, 150, 105, 0.2); border-radius: 6px; padding: 6px 10px; font-size: 0.75rem;">
            <div style="font-weight: 700; color: #065f46; display: flex; align-items: center; justify-content: space-between;">
              <span>👥 Tim Dinas:</span>
              <span style="font-size: 0.7rem; font-weight: 600; color: #047857;">${activeMembers.length + (activeTicket.initiatorCancelled ? 0 : 1)} Personel Aktif</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
              ${!activeTicket.initiatorCancelled ? `<span style="background: #d1fae5; color: #065f46; padding: 2px 7px; border-radius: 4px; font-weight: 600;">👑 ${activeTicket.applicantName} (Inisiator)</span>` : `<span style="background: #f1f5f9; color: #94a3b8; text-decoration: line-through; padding: 2px 7px; border-radius: 4px;">${activeTicket.applicantName} (Batal)</span>`}
              ${activeTicket.members.map(m => (m.status === 'batal' || m.status === 'cancelled') ? `<span style="background: #f1f5f9; color: #94a3b8; text-decoration: line-through; padding: 2px 7px; border-radius: 4px;">${m.name} (Batal)</span>` : `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 4px; font-weight: 600;">👤 ${m.name}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${isWaitingVerify ? `
          <div style="margin-top: 0.75rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 10px; font-size: 0.75rem; color: #1e40af; line-height: 1.4;">
            <strong>🏢 Tap In Gerbang Tercatat:</strong> Jam kepulangan telah dikunci pada <strong>${activeTicket.tapInTime || activeTicket.arrivalReportedTime || activeTicket.reportedReturnTime || '-'}</strong>${activeTicket.tapInMember ? ` (oleh ${activeTicket.tapInMember})` : ''}. Menunggu Atasan (${activeTicket.approverName}) memverifikasi fisik kehadiran Anda di ruangan kerja.
          </div>
        ` : ''}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid var(--border-color, #f1f5f9);">
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col1Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col1Val}</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col2Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col2Val}</div>
          </div>
        </div>

        ${isEmergLocked ? `
          <div style="margin-top: 0.85rem; font-size: 0.775rem; padding-top: 0.65rem; border-top: 1px solid var(--border-color, #f1f5f9);">
            <div style="font-weight: 800; color: #b91c1c; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <span>Izin Darurat Menunggu Otorisasi</span>
              <span style="font-weight: 700; color: #b91c1c;">QR Terkunci</span>
            </div>
            <div style="color: #475569; margin-top: 0.25rem; line-height: 1.45;">
              ${activeTicket.selectedMethod === 'facescan'
                ? 'Metode otorisasi: <strong>Scan Wajah Atasan di Tempat</strong>. Silakan klik tombol "Scan Wajah Atasan" di bawah dan arahkan kamera ke wajah Atasan untuk membuka QR Code.'
                : 'Sesuai SOP K3, QR Code izin darurat terkunci sampai diverifikasi dan disetujui oleh Atasan.'}
            </div>
          </div>
        ` : ''}

        <div class="card-action-btns-wrap" style="display: flex; gap: 0.5rem; margin-top: 1.15rem; flex-wrap: wrap;">
          ${actionButtonsHtml}
        </div>
      </div>

      <!-- Card 2: Atasan langsung -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title">Atasan langsung</h3>
        </div>
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center;">${window.renderUserPhoto(activeTicket.approverName || "Ir. Hendra Gunawan, M.T.", 26)} <span>${activeTicket.approverName || "Ir. Hendra Gunawan, M.T."}</span></div>
        <div style="font-size: 0.775rem; color: var(--text-secondary); margin-top: 2px;">${activeTicket.approverTitle || 'Manajer Rekayasa & Pemeliharaan'}</div>
        ${activeTicket.reassignedFrom ? `
          <div style="margin-top: 0.45rem; font-size: 0.75rem; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; padding: 0.3rem 0.65rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600;">
            <span> Dialihkan dari ${activeTicket.reassignedFrom}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Right Column
  if (colPengajuanRight) {
    const isOutside = (activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat');
    const hasPendingExt = isOutside && activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';

    colPengajuanRight.innerHTML = `
      ${hasPendingExt ? `
        <!-- Status Permohonan Perpanjangan -->
        <div class="figma-card">
          <div class="figma-card-header">
            <h3 class="figma-card-title">Permohonan Perpanjangan Waktu</h3>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 0.9rem; margin-bottom: 0.85rem;">
            <div style="font-weight: 700; color: #0f172a; font-size: 0.8rem;">
              Permohonan Perpanjangan Sedang Ditinjau
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px; line-height: 1.45;">
              Usulan jam kembali baru: <strong style="color: var(--text-primary);">${activeTicket.pendingExtension.newEstimatedReturn ? (window.formatDisplayDate ? window.formatDisplayDate(activeTicket.pendingExtension.newEstimatedReturn) : activeTicket.pendingExtension.newEstimatedReturn.replace('T', ' ')) : '-'}</strong>. Penandaan terlambat ditangguhkan sementara.
            </div>
          </div>
          <button class="btn-figma-secondary" style="background: #fef3c7; color: #92400e; border: 1.5px solid #fde68a; font-weight: 700; width: 100%; justify-content: center;" onclick="openPendingExtensionDetailModal('${activeTicket.id}')">
            <span>Detail Ajukan Perpanjangan</span>
          </button>
        </div>
      ` : ''}

      <!-- Card: Kronologi tercatat (Dynamic Timeline) -->
      <div class="figma-card">
        <div class="figma-card-header">
          <h3 class="figma-card-title">Kronologi tercatat</h3>
        </div>
        ${buildActivePermitTimeline(activeTicket)}
      </div>
    `;
  }
}

/**
 * 3. RIWAYAT PENGAJUAN (FIGMA SCREEN 3 - TABLE & SCREEN 4 - CARD)
 */
function renderRiwayatView() {
  const filtered = filterEmpTickets();
  const containerEmpRequests = document.getElementById('containerEmpRequests');
  const emptyEmpBox = document.getElementById('emptyEmpBox');
  const figmaRiwayatCountMeta = document.getElementById('figmaRiwayatCountMeta');
  const figmaEmpPaginationBar = document.getElementById('figmaEmpPaginationBar');
  const figmaEmpPaginationMeta = document.getElementById('figmaEmpPaginationMeta');

  if (!containerEmpRequests) return;

  if (filtered.length === 0) {
    containerEmpRequests.innerHTML = '';
    if (emptyEmpBox) emptyEmpBox.style.display = 'flex';
    if (figmaEmpPaginationBar) figmaEmpPaginationBar.style.display = 'none';
    if (figmaRiwayatCountMeta) {
      figmaRiwayatCountMeta.textContent = '0 pengajuan ditemukan';
    }
    return;
  }

  if (emptyEmpBox) emptyEmpBox.style.display = 'none';
  if (figmaEmpPaginationBar) figmaEmpPaginationBar.style.display = 'flex';


  // Pagination calculation
  const totalItems = filtered.length;
  const pageSize = window.empPageSize || 6;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  let currentPage = window.empCurrentPage || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  window.empCurrentPage = currentPage;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = filtered.slice(startIndex, endIndex);

  if (figmaEmpPaginationMeta) {
    if (totalItems === 0) {
      figmaEmpPaginationMeta.textContent = 'Menampilkan 0 dari 0 pengajuan';
    } else {
      figmaEmpPaginationMeta.textContent = `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems} pengajuan`;
    }
  }

  // Update pagination buttons
  renderPaginationButtons(totalPages, currentPage);

  // Render Card or Table
  if (window.currentEmpViewMode === 'table') {
    renderEmpTable(pageItems, containerEmpRequests);
  } else {
    renderEmpCards(pageItems, containerEmpRequests);
  }
}

function renderPaginationButtons(totalPages, currentPage) {
  const btnsContainer = document.querySelector('.figma-pagination-btns');
  if (!btnsContainer) return;

  let html = `<button class="btn-figma-page" id="btnEmpPagePrev" ${currentPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Sebelumnya</button>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="btn-figma-page ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  html += `<button class="btn-figma-page" id="btnEmpPageNext" ${currentPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Berikutnya</button>`;

  btnsContainer.innerHTML = html;

  // Event handlers
  const prevBtn = document.getElementById('btnEmpPagePrev');
  const nextBtn = document.getElementById('btnEmpPageNext');

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (window.empCurrentPage > 1) {
        window.empCurrentPage--;
        renderRiwayatView();
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (window.empCurrentPage < totalPages) {
        window.empCurrentPage++;
        renderRiwayatView();
      }
    };
  }

  btnsContainer.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      window.empCurrentPage = parseInt(btn.getAttribute('data-page'), 10);
      renderRiwayatView();
    };
  });
}

/**
 * Helpers for Clean Status Typography & Schedule with Day Name
 */
const DAYS_OF_WEEK_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatTicketScheduleWithDay(t) {
  if (!t) return '-';
  const dExit = (typeof window.parseTicketDateTime === 'function') 
    ? (window.parseTicketDateTime(t.plannedExit) || window.parseTicketDateTime(t.createdAt)) 
    : new Date(t.plannedExit || t.createdAt);

  let dayName = 'Senin';
  let dateFormatted = '';
  let plannedTimeStr = '10:00';

  if (dExit && !isNaN(dExit.getTime())) {
    dayName = DAYS_OF_WEEK_ID[dExit.getDay()];
    dateFormatted = `${dExit.getDate()} ${MONTHS_SHORT_ID[dExit.getMonth()]} ${dExit.getFullYear()}`;
    const pad = (n) => String(n).padStart(2, '0');
    plannedTimeStr = `${pad(dExit.getHours())}:${pad(dExit.getMinutes())}`;
  } else {
    const rawExit = t.plannedExit || t.createdAt || '';
    const match = rawExit.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (match) {
      dateFormatted = `${match[1]} ${match[2]} ${match[3]}`;
    } else {
      dateFormatted = t.createdAt ? t.createdAt.slice(0, 11) : '26 Okt 2026';
    }
    const tMatch = rawExit.match(/(\d{1,2})[:.](\d{2})/);
    plannedTimeStr = tMatch ? `${tMatch[1].padStart(2, '0')}:${tMatch[2]}` : '10:00';
    dayName = 'Senin';
  }

  let returnTimeStr = '';
  if (t.estimatedReturn) {
    const dReturn = (typeof window.parseTicketDateTime === 'function')
      ? window.parseTicketDateTime(t.estimatedReturn)
      : new Date(t.estimatedReturn);
    if (dReturn && !isNaN(dReturn.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      if (dExit && !isNaN(dExit.getTime()) && dReturn.toDateString() !== dExit.toDateString()) {
        const retDay = DAYS_OF_WEEK_ID[dReturn.getDay()];
        returnTimeStr = `${retDay}, ${pad(dReturn.getHours())}:${pad(dReturn.getMinutes())} WIB`;
      } else {
        returnTimeStr = `${pad(dReturn.getHours())}:${pad(dReturn.getMinutes())} WIB`;
      }
    } else {
      const tMatch = String(t.estimatedReturn).match(/(\d{1,2})[:.](\d{2})/);
      returnTimeStr = tMatch ? `${tMatch[1].padStart(2, '0')}:${tMatch[2]} WIB` : `${t.estimatedReturn.slice(11, 16).replace('.', ':')} WIB`;
    }
  } else if (t.type === 'Pulang Mendahului' || t.type === 'Tidak Kembali (Pulang)') {
    returnTimeStr = '(Pulang)';
  }

  let timePart = `${plannedTimeStr} WIB`;
  if (returnTimeStr) {
    if (returnTimeStr.startsWith('(')) {
      timePart = `${plannedTimeStr} WIB ${returnTimeStr}`;
    } else {
      timePart = `${plannedTimeStr} s/d ${returnTimeStr}`;
    }
  }
  return `<div class="schedule-day-date" style="font-weight: 600; font-size: 0.72rem; line-height: 1.35; white-space: nowrap;">${dayName}, ${dateFormatted}</div><div class="schedule-time-text" style="font-size: 0.7rem; color: #64748b; font-family: var(--font-mono); font-weight: 500; margin-top: 1px; white-space: nowrap;">${timePart}</div>`;
}

function getCleanEmpStatus(status, ticket) {
  let label = status || 'Selesai';
  let color = '#059669'; // brand green
  let statusKey = 'selesai';

  if (status === 'Selesai') {
    if (ticket && (ticket.isLate || (ticket.scanInTime && ticket.scanInTime.includes('[Terlambat]')) || ticket.lateMinutes > 0)) {
      label = 'Selesai (Terlambat)';
      color = '#b45309';
      statusKey = 'selesai-late';
    } else {
      label = 'Selesai';
      color = '#059669';
      statusKey = 'selesai';
    }
  } else if (status === 'Sedang di Luar') {
    label = 'Sedang di Luar';
    color = '#0284c7';
    statusKey = 'outside';
  } else if (status === 'Terlambat') {
    label = 'Selesai (Terlambat)';
    color = '#b45309';
    statusKey = 'selesai-late';
  } else if (status === 'Disetujui') {
    label = 'Disetujui';
    color = '#059669';
    statusKey = 'approved';
  } else if (status === 'Menunggu Persetujuan') {
    label = 'Menunggu Persetujuan';
    color = '#d97706';
    statusKey = 'pending';
  } else if (status === 'Menunggu Verifikasi Atasan') {
    label = 'Menunggu Verifikasi Atasan';
    color = '#2563eb';
    statusKey = 'waiting-verify';
  } else if (status === 'Menunggu Otorisasi Darurat' || status === 'Darurat Terkunci') {
    label = 'Menunggu Otorisasi Darurat';
    color = '#be123c';
    statusKey = 'emergency';
  } else if (status === 'Ditolak') {
    label = 'Ditolak';
    color = '#dc2626';
    statusKey = 'rejected';
  } else if (status === 'Kedaluwarsa' || status === 'Kadaluwarsa') {
    label = 'Kedaluwarsa';
    color = '#64748b';
    statusKey = 'expired';
  } else if (status === 'Dibatalkan') {
    label = 'Dibatalkan';
    color = '#64748b';
    statusKey = 'cancelled';
  }

  const bgMap = {
    'selesai': 'rgba(16, 185, 129, 0.1)',
    'selesai-late': 'rgba(245, 158, 11, 0.12)',
    'outside': 'rgba(2, 132, 199, 0.1)',
    'late': 'rgba(220, 38, 38, 0.1)',
    'approved': 'rgba(16, 185, 129, 0.1)',
    'pending': 'rgba(245, 158, 11, 0.12)',
    'waiting-verify': 'rgba(37, 99, 235, 0.12)',
    'emergency': 'rgba(190, 18, 60, 0.1)',
    'rejected': 'rgba(220, 38, 38, 0.1)',
    'expired': 'rgba(100, 116, 139, 0.1)',
    'cancelled': 'rgba(100, 116, 139, 0.1)'
  };
  const borderMap = {
    'selesai': 'rgba(16, 185, 129, 0.25)',
    'selesai-late': 'rgba(245, 158, 11, 0.3)',
    'outside': 'rgba(2, 132, 199, 0.25)',
    'late': 'rgba(220, 38, 38, 0.25)',
    'approved': 'rgba(16, 185, 129, 0.25)',
    'pending': 'rgba(245, 158, 11, 0.3)',
    'waiting-verify': 'rgba(37, 99, 235, 0.3)',
    'emergency': 'rgba(190, 18, 60, 0.25)',
    'rejected': 'rgba(220, 38, 38, 0.25)',
    'expired': 'rgba(100, 116, 139, 0.25)',
    'cancelled': 'rgba(100, 116, 139, 0.25)'
  };

  const currentBg = bgMap[statusKey] || 'rgba(100, 116, 139, 0.1)';
  const currentBorder = borderMap[statusKey] || 'rgba(100, 116, 139, 0.25)';

  return `<span class="figma-clean-status status-${statusKey}" style="display: inline-flex; align-items: center; padding: 0.2rem 0.65rem; border-radius: 9999px; font-weight: 700; font-size: 0.775rem; background: ${currentBg}; color: ${color}; border: 1px solid ${currentBorder}; line-height: 1.3;" title="${(label || '').replace(/"/g, '&quot;')}"><span>${label}</span></span>`;
}

/**
 * Render Figma Card Grid (Screen 4) - WITHOUT Moda Transportasi
 */
function renderEmpCards(list, containerElement) {
  const target = containerElement || document.getElementById('containerEmpRequests');
  if (!target) return;

  if (!list || list.length === 0) {
    target.innerHTML = `
      <div style="text-align: center; padding: 3rem 1.5rem; background: var(--card-bg, #ffffff); border: 1px dashed var(--border-color, #e2e8f0); border-radius: 10px; margin-top: 0.85rem;">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📄</div>
        <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary, #0f172a);">Tidak Ada Data Pengajuan</div>
        <div style="font-size: 0.8rem; color: var(--text-muted, #64748b); margin-top: 0.25rem;">Tidak ditemukan pengajuan izin yang sesuai dengan filter atau kata kunci pencarian.</div>
      </div>
    `;
    return;
  }

  target.innerHTML = `
    <div class="figma-card-grid">
      ${list.map(t => {
        let catatanText = `<span style="display:inline-flex; align-items:center; gap:4px;">✓ Tepat waktu — Disetujui ${window.renderUserPhoto(t.approverName || 'Ir. Hendra Gunawan, M.T.', 18)} <span>${t.approverName || 'Atasan'}</span></span>`;
        let catatanColor = '#059669';
        let catatanBg = '#f0fdf4';
        let catatanBorder = '#dcfce7';
        let noteType = 'success';

        if (t.status === 'Terlambat') {
          catatanText = '⚠️ Melewati batas estimasi kembali — Belum Tap In di Pos 1';
          catatanColor = '#b91c1c';
          catatanBg = '#fef2f2';
          catatanBorder = '#fecaca';
          noteType = 'danger';
        } else if (t.isLate || (t.approverNote && t.approverNote.toLowerCase().includes('terlambat')) || (t.status === 'Selesai' && t.scanInTime && t.scanInTime.includes('[Terlambat]'))) {
          const lateFull = typeof window.formatLateDurationFull === 'function' ? window.formatLateDurationFull(t.lateMinutes || 10) : `${t.lateMinutes || 10} menit`;
          catatanText = `⏱️ Kembali ${t.actualReturnTime || (t.scanInTime ? t.scanInTime.slice(11, 16) + ' WIB' : '12.10 WIB')} — +${lateFull} dari estimasi`;
          catatanColor = '#b45309';
          catatanBg = '#fffbeb';
          catatanBorder = '#fde68a';
          noteType = 'warning';
        } else if (t.status === 'Ditolak' || (t.status || '').toLowerCase().includes('tolak')) {
          catatanText = `✕ ${t.rejectionReason || 'Ditolak: alasan tidak memadai'}`;
          catatanColor = '#b91c1c';
          catatanBg = '#fef2f2';
          catatanBorder = '#fecaca';
          noteType = 'danger';
        } else if (t.status === 'Kedaluwarsa' || t.status === 'Kadaluwarsa') {
          catatanText = '⏱️ Waktu berlaku izin habis sebelum verifikasi scan keluar';
          catatanColor = '#64748b';
          catatanBg = '#f8fafc';
          catatanBorder = '#e2e8f0';
          noteType = 'muted';
        } else if (t.status === 'Dibatalkan' || (t.status || '').toLowerCase().includes('batal')) {
          catatanText = '✕ Pengajuan izin dibatalkan oleh pemohon';
          catatanColor = '#64748b';
          catatanBg = '#f8fafc';
          catatanBorder = '#e2e8f0';
          noteType = 'muted';
        }

        // Format tanggal secara rapi & manusiawi (contoh: 26 Okt 2026)
        let dateStr = 'Hari ini';
        if (t.createdAt) {
          const parsed = typeof window.parseTicketDateTime === 'function' ? window.parseTicketDateTime(t.createdAt) : new Date(t.createdAt);
          if (parsed && !isNaN(parsed.getTime())) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            dateStr = `${parsed.getDate()} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
          } else {
            dateStr = t.createdAt.split(',')[0].trim();
          }
        }

        const scheduleWithDay = formatTicketScheduleWithDay(t);
        const isEmergency = Boolean(t.isEmergency || (t.id && t.id.startsWith('TK-EMG')) || (t.category && t.category.toLowerCase().includes('darurat')));
        let displayCategory = t.category;
        if (!displayCategory || displayCategory === 'Izin Darurat' || displayCategory === 'Darurat') {
          displayCategory = (t.type === 'Pulang Mendahului' || (t.reason && t.reason.toLowerCase().includes('keluarga'))) ? 'Urusan Pribadi' : 'Dinas Kantor';
        }
        const isDinas = displayCategory === 'Dinas Kantor';
        const isGroupDinas = Boolean((t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0)) && isDinas);
        const groupCount = (t.initiatorCancelled ? 0 : 1) + (Array.isArray(t.members) ? t.members.filter(m => m.status !== 'batal').length : (t.memberCount || 2));

        return `
          <div class="figma-grid-item" data-status="${t.status}" style="${isEmergency ? 'border-left: 4px solid var(--rose-danger, #e11d48);' : ''}">
            <!-- Header ID & Status -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
              <div>
                <div class="figma-ticket-id" style="font-size: 0.95rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); letter-spacing: -0.2px;">${t.id}</div>
                <div class="figma-ticket-date" style="font-size: 0.725rem; color: #64748b; margin-top: 2px; font-weight: 500;">Diajukan: ${typeof window.formatDisplayCreatedDate === 'function' ? window.formatDisplayCreatedDate(t.createdAt) : (t.createdAt || 'Hari ini')}</div>
              </div>
              <div style="text-align: right;">${getCleanEmpStatus(t.status, t)}</div>
            </div>

            <!-- Applicant Box with Photo & Category -->
            <div style="background:var(--bg-subtle, #f8fafc); padding:0.55rem 0.75rem; border-radius:6px; display:flex; align-items:flex-start; justify-content:space-between; gap: 0.75rem; margin: 0.35rem 0;">
              <div style="display: flex; align-items: flex-start; gap: 0.65rem;">
                ${window.renderUserPhoto(t.applicantName || 'Budi Pratama, S.T.', 36)}
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); line-height: 1.3;">${t.applicantName || 'Budi Pratama, S.T.'}</div>
                  <div style="font-size:0.72rem; color:var(--text-secondary); font-family: var(--font-mono, monospace); line-height: 1.25;">NIP: ${t.applicantNip || 'PK-2024-8841'}</div>
                  <div style="font-size:0.72rem; color:var(--text-muted); line-height: 1.25;">${t.department || 'Departemen Rekayasa & Pemeliharaan'}</div>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                <span class="figma-tag-badge ${isDinas ? 'badge-dinas' : 'badge-pribadi'}" style="white-space: nowrap;">${displayCategory}</span>
                ${isEmergency ? `<span style="font-size: 0.68rem; font-weight: 800; color: #be123c; background: #ffe4e6; padding: 1px 6px; border-radius: 4px; border: 1px solid #fecdd3; letter-spacing: 0.2px; white-space: nowrap;">🚨 Darurat</span>` : ''}
                ${isGroupDinas ? `<span style="font-size: 0.68rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 1px 6px; border-radius: 4px; border: 1px solid #bae6fd; letter-spacing: 0.2px; white-space: nowrap;" title="Tim Dinas (${groupCount} Orang)">👥 Tim (${groupCount})</span>` : ''}
              </div>
            </div>

            <!-- Detail Box (Tujuan, Keperluan, Rencana Waktu) -->
            <div class="figma-card-detail-box" style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.55rem 0.65rem; background: var(--bg-subtle, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1.25rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; min-width: 95px; flex-shrink: 0; white-space: nowrap;">Tujuan keluar</span>
                <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 600; text-align: right; line-height: 1.35; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.destination || '').replace(/"/g, '&quot;')}">${(t.destination || '-').replace(/\r?\n+/g, ' ')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1.25rem;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; min-width: 95px; flex-shrink: 0; white-space: nowrap;">Keperluan</span>
                <span class="detail-val" style="font-size: 0.75rem; color: var(--text-primary, #0f172a); font-weight: 500; text-align: right; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.35;" title="${(t.reason || '').replace(/"/g, '&quot;')}">${(t.reason || '-').replace(/\r?\n+/g, ' ')}</span>
              </div>
              <div class="detail-schedule-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; padding-top: 0.35rem; border-top: 1px dashed #e2e8f0;">
                <span class="detail-label" style="font-size: 0.72rem; color: #64748b; font-weight: 500; white-space: nowrap;">Rencana waktu</span>
                <div class="detail-schedule-val" style="text-align: right;">${scheduleWithDay}</div>
              </div>
            </div>

            <!-- Note Banner (Sesuai status) -->
            <div class="figma-note-banner note-${noteType}" style="font-size: 0.72rem; color: ${catatanColor}; background: ${catatanBg}; border: 1px solid ${catatanBorder}; border-radius: 6px; padding: 0.38rem 0.55rem; line-height: 1.35; font-weight: 600;">
              ${catatanText}
            </div>

            <!-- Action Buttons Footer -->
            <div class="figma-card-footer" style="display: flex; gap: 0.5rem; align-items: center; width: 100%; margin-top: auto; padding-top: 0.55rem; border-top: 1px solid #f1f5f9;">
              ${(t.status === 'Disetujui' && !t.scanOutTime) ? `
                <button class="btn-figma-primary" style="padding: 0.42rem 0.65rem; font-size: 0.72rem; white-space: nowrap; flex-shrink: 0;" onclick="openTicketDetail('${t.id}', 'qr')">
                  Buka QR Izin
                </button>
              ` : ''}
              <div class="action-pills-row" style="flex: 1; width: 100%;">
                <button type="button" class="btn-pill-action btn-pill-detail" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Detail Pengajuan">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                  <span>Detail Pengajuan</span>
                </button>
                <button type="button" class="btn-pill-action btn-pill-delete" onclick="deleteEmpTicket('${t.id}')" title="Hapus Pengajuan #${t.id}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Render Figma List / Table (Screen 3) - WITHOUT Moda Transportasi
 */
function renderEmpTable(list, containerElement) {
  const target = containerElement || document.getElementById('containerEmpRequests');
  if (!target) return;

  if (!list || list.length === 0) {
    target.innerHTML = `
      <div style="text-align: center; padding: 3rem 1.5rem; background: var(--card-bg, #ffffff); border: 1px dashed var(--border-color, #e2e8f0); border-radius: 10px; margin-top: 0.85rem;">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📄</div>
        <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary, #0f172a);">Tidak Ada Data Pengajuan</div>
        <div style="font-size: 0.8rem; color: var(--text-muted, #64748b); margin-top: 0.25rem;">Tidak ditemukan pengajuan izin yang sesuai dengan filter atau kata kunci pencarian.</div>
      </div>
    `;
    return;
  }

  target.innerHTML = `
    <div class="figma-table-card" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
      <table class="figma-table" style="min-width: 950px;">
        <thead>
          <tr>
            <th style="white-space: nowrap; min-width: 170px;">Nomor Tiket & Kategori</th>
            <th style="white-space: nowrap; min-width: 180px;">Pemohon & NIP</th>
            <th style="white-space: nowrap; min-width: 180px;">Tujuan & Keperluan</th>
            <th style="white-space: nowrap; min-width: 140px;">Rencana Waktu</th>
            <th style="white-space: nowrap; min-width: 95px;">Status</th>
            <th style="white-space: nowrap; min-width: 180px;">Catatan</th>
            <th style="white-space: nowrap; min-width: 175px;">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(t => {
    const statusHtml = getCleanEmpStatus(t.status, t);
    let catatanHtml = `<span style="color: var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;">✓ Tepat waktu — Disetujui ${window.renderUserPhoto(t.approverName || 'Hendra Gunawan', 18)} <span>${t.approverName || 'Hendra Gunawan'}</span></span>`;
    let tindakanHtml = `
      <div class="action-pills-row">
        <button type="button" class="btn-pill-action btn-pill-detail" onclick="openTicketDetail('${t.id}', 'detail')" title="Lihat Detail Pengajuan">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
          <span>Detail Pengajuan</span>
        </button>
        <button type="button" class="btn-pill-action btn-pill-delete" onclick="deleteEmpTicket('${t.id}')" title="Hapus Pengajuan #${t.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Hapus</span>
        </button>
      </div>
    `;

    const scheduleWithDay = formatTicketScheduleWithDay(t);
    const isEmergency = Boolean(t.isEmergency || (t.id && t.id.startsWith('TK-EMG')) || (t.category && t.category.toLowerCase().includes('darurat')));
    let displayCategory = t.category;
    if (!displayCategory || displayCategory === 'Izin Darurat' || displayCategory === 'Darurat') {
      displayCategory = (t.type === 'Pulang Mendahului' || (t.reason && t.reason.toLowerCase().includes('keluarga'))) ? 'Urusan Pribadi' : 'Dinas Kantor';
    }
    const isDinas = displayCategory === 'Dinas Kantor';
    const isGroupDinas = Boolean((t.isGroupDinas || (Array.isArray(t.members) && t.members.length > 0)) && isDinas);
    const groupCount = (t.initiatorCancelled ? 0 : 1) + (Array.isArray(t.members) ? t.members.filter(m => m.status !== 'batal').length : (t.memberCount || 2));

    return `
              <tr style="${isEmergency ? 'border-left: 4px solid var(--rose-danger, #e11d48); background-color: rgba(225, 29, 72, 0.035);' : ''}">
                <td style="vertical-align: middle;">
                  <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                    <span style="font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); font-size: 0.8rem;">${t.id}</span>
                    ${isEmergency ? `<span style="font-size: 0.68rem; font-weight: 800; color: #be123c; background: #ffe4e6; padding: 1px 6px; border-radius: 4px; border: 1px solid #fecdd3; letter-spacing: 0.2px;">🚨 Darurat</span>` : ''}
                    ${isGroupDinas ? `<span style="font-size: 0.68rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 1px 6px; border-radius: 4px; border: 1px solid #bae6fd; letter-spacing: 0.2px;" title="Tim Dinas (${groupCount} Orang)">👥 Tim (${groupCount})</span>` : ''}
                  </div>
                  <div style="font-size: 0.725rem; color: #64748b; margin-top: 3px; line-height: 1.35;">
                    <div>${displayCategory}</div>
                    <div>${t.type}</div>
                  </div>
                </td>
                <td style="vertical-align: middle;">
                  <div style="display: flex; align-items: flex-start; gap: 0.55rem;">
                    ${window.renderUserPhoto(t.applicantName || 'Budi Pratama, S.T.', 30)}
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                      <div style="font-weight: 700; color: var(--text-primary); font-size: 0.8rem; line-height: 1.3;">${t.applicantName || 'Budi Pratama, S.T.'}</div>
                      <div style="font-size: 0.72rem; color: var(--text-secondary); font-family: var(--font-mono, monospace); line-height: 1.25;">NIP: ${t.applicantNip || 'PK-2024-8841'}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.25;">${t.department || '-'}</div>
                    </div>
                  </div>
                </td>
                <td style="vertical-align: middle;">
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 0.8rem; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.destination || '').replace(/"/g, '&quot;')}">${(t.destination || '-').replace(/\r?\n+/g, ' ')}</div>
                  <div style="font-size: 0.725rem; color: #64748b; margin-top: 2px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(t.reason || '').replace(/"/g, '&quot;')}">${(t.reason || '-').replace(/\r?\n+/g, ' ')}</div>
                </td>
                <td>${scheduleWithDay}</td>
                <td style="white-space: nowrap; vertical-align: middle;">${statusHtml}</td>
                <td style="font-size: 0.75rem;">${catatanHtml}</td>
                <td style="white-space: nowrap; vertical-align: middle;">${tindakanHtml}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;

  const card = containerElement ? containerElement.querySelector('.figma-table-card') : document.querySelector('.figma-table-card');
  if (card && typeof window.enableDragScroll === 'function') {
    window.enableDragScroll(card);
  }
}

/**
 * Main Karyawan View Router
 */
function renderKaryawanView() {
  updateKaryawanMetrics();
  const currentKaryawanNav = window.currentKaryawanNav || 'dashboard';

  if (currentKaryawanNav === 'dashboard') {
    renderKaryawanDashboard();
  } else if (currentKaryawanNav === 'pengajuan') {
    renderPengajuanSayaView();
  } else if (currentKaryawanNav === 'riwayat') {
    renderRiwayatView();
  }

  // Render Mobile Container (PDF Hal 1 & 4)
  if (typeof renderKaryawanMobileDashboard === 'function') {
    renderKaryawanMobileDashboard();
  }
}

// Global View Switcher function
window.setEmpViewMode = function(mode) {
  window.currentEmpViewMode = mode;
  const btnEmpViewCard = document.getElementById('btnEmpViewCard');
  const btnEmpViewTable = document.getElementById('btnEmpViewTable');
  if (btnEmpViewCard) btnEmpViewCard.classList.toggle('active', mode !== 'table');
  if (btnEmpViewTable) btnEmpViewTable.classList.toggle('active', mode === 'table');
  if (typeof renderRiwayatView === 'function') {
    renderRiwayatView();
  }
};

// Wire Filter and View Switcher listeners
document.addEventListener('DOMContentLoaded', () => {
  const btnEmpViewCard = document.getElementById('btnEmpViewCard');
  const btnEmpViewTable = document.getElementById('btnEmpViewTable');

  if (btnEmpViewCard) {
    btnEmpViewCard.addEventListener('click', () => {
      window.setEmpViewMode('card');
    });
  }

  if (btnEmpViewTable) {
    btnEmpViewTable.addEventListener('click', () => {
      window.setEmpViewMode('table');
    });
  }

  const searchEmpInput = document.getElementById('searchEmpInput');
  const filterEmpPeriod = document.getElementById('filterEmpPeriod');
  const filterEmpCategory = document.getElementById('filterEmpCategory');
  const filterEmpType = document.getElementById('filterEmpType');
  const filterEmpStatus = document.getElementById('filterEmpStatus');

  [searchEmpInput, filterEmpPeriod, filterEmpCategory, filterEmpType, filterEmpStatus, document.getElementById('sortEmpRiwayat')].forEach(el => {
    if (el) {
      el.addEventListener('input', () => {
        window.empCurrentPage = 1;
        renderRiwayatView();
      });
      el.addEventListener('change', () => {
        window.empCurrentPage = 1;
        renderRiwayatView();
      });
    }
  });

  const filterEmpChartPeriod = document.getElementById('filterEmpChartPeriod');
  if (filterEmpChartPeriod) {
    filterEmpChartPeriod.addEventListener('change', () => {
      renderKaryawanDonutChart();
    });
  }
});

// DELETE FEATURE FOR RIWAYAT PENGAJUAN (STRICT SERVER-LEVEL RULES)
function deleteEmpTicket(ticketId) {
  let ticketsList = window.ticketsList || [];
  const t = ticketsList.find(x => x.id === ticketId);
  const myNip = (window.getCurrentEmployeeActor ? window.getCurrentEmployeeActor().nip : null) || 'PK-2024-8841';

  if (!t) return;
  const targetNip = t.applicantNip || 'PK-2024-8841';
  if (targetNip !== myNip) {
    if (typeof window.showToast === 'function') window.showToast('Anda tidak berhak menghapus tiket karyawan lain.', 'error');
    return;
  }

  const handler = () => {
    t.deletedByKaryawan = true;
    window.saveTickets(ticketsList);

    renderRiwayatView();
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();
    if (typeof window.renderAdminStatusTracking === 'function') window.renderAdminStatusTracking();
    if (typeof window.updateAdminMetrics === 'function') window.updateAdminMetrics();

    if (typeof window.showToast === 'function') {
      window.showToast('1 riwayat dihapus', 'info');
    }
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Riwayat Pengajuan',
      message: 'Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tiket yang masih berjalan tidak dapat dihapus.',
      onConfirm: handler
    });
  } else if (confirm('Apakah Anda yakin ingin menghapus pengajuan ini dari riwayat? Tindakan ini tidak dapat dibatalkan.')) {
    handler();
  }
}

function deleteAllEmpRiwayat() {
  const empActor = (typeof window.getCurrentEmployeeActor === 'function') ? window.getCurrentEmployeeActor() : null;
  const myNip = (empActor && empActor.nip) || 'PK-2024-8841';
  const allFiltered = typeof filterEmpTickets === 'function' ? filterEmpTickets() : [];

  if (allFiltered.length === 0) {
    if (typeof window.showToast === 'function') {
      window.showToast('Tidak ada riwayat pengajuan untuk dihapus.', 'warning');
    }
    return;
  }

  const count = allFiltered.length;
  const handler = () => {
    const idsToDelete = new Set(allFiltered.map(t => t.id));
    let ticketsList = window.ticketsList || [];
    let deletedCount = 0;
    ticketsList.forEach(t => {
      if (idsToDelete.has(t.id)) {
        t.deletedByKaryawan = true;
        deletedCount++;
      }
    });
    window.saveTickets(ticketsList);

    renderRiwayatView();
    if (typeof window.renderKaryawanView === 'function') window.renderKaryawanView();

    if (typeof window.showToast === 'function') {
      window.showToast(`${deletedCount} riwayat berhasil dihapus`, 'success');
    }
  };

  if (typeof window.openDeleteConfirmModal === 'function') {
    window.openDeleteConfirmModal({
      title: 'Hapus Semua Riwayat',
      message: `Apakah Anda yakin ingin menghapus <strong>${count}</strong> riwayat pengajuan? Tiket yang masih berjalan tidak akan terhapus.`,
      onConfirm: handler
    });
  } else if (confirm(`Apakah Anda yakin ingin menghapus ${count} riwayat pengajuan?`)) {
    handler();
  }
}

// Expose globally
window.updateKaryawanMetrics = updateKaryawanMetrics;
window.filterEmpTickets = filterEmpTickets;
window.renderKaryawanDashboard = renderKaryawanDashboard;
window.renderPengajuanSayaView = renderPengajuanSayaView;
window.renderRiwayatView = renderRiwayatView;
window.renderKaryawanView = renderKaryawanView;
window.renderEmpCards = renderEmpCards;
window.renderEmpTable = renderEmpTable;
window.buildActivePermitTimeline = buildActivePermitTimeline;
window.deleteEmpTicket = deleteEmpTicket;
window.deleteAllEmpRiwayat = deleteAllEmpRiwayat;
window.formatTicketScheduleWithDay = formatTicketScheduleWithDay;
window.getCleanEmpStatus = getCleanEmpStatus;

// ===================================================================
// KARYAWAN MOBILE DASHBOARD CONTROLLER (SESUAI PDF HALAMAN 1 & 4)
// ===================================================================
function renderKaryawanMobileDashboard() {
  const mobileContainer = document.getElementById('mobileAppContainer');
  if (!mobileContainer) return;

  const empActor = (typeof window.getCurrentEmployeeUser === 'function') 
    ? window.getCurrentEmployeeUser() 
    : { name: 'Budi Pratama, S.T.', nip: 'PK-2024-8841', role: 'Staf Rekayasa Mesin', dept: 'Departemen Rekayasa & Pemeliharaan' };

  // 1. Update Hero Greeting & Info
  const now = new Date();
  const nowH = now.getHours();
  let timeGreeting = 'pagi';
  if (nowH >= 11 && nowH < 15) timeGreeting = 'siang';
  else if (nowH >= 15 && nowH < 18) timeGreeting = 'sore';
  else if (nowH >= 18 || nowH < 5) timeGreeting = 'malam';

  const heroNameEl = document.getElementById('mobileHeroEmpName');
  if (heroNameEl) {
    heroNameEl.textContent = `${empActor.name} 👋`;
  }
  const heroRoleEl = document.getElementById('mobileHeroEmpRole');
  if (heroRoleEl) {
    heroRoleEl.textContent = empActor.role || 'Staf Rekayasa Mesin';
  }
  const heroDeptEl = document.getElementById('mobileHeroEmpDept');
  if (heroDeptEl) {
    heroDeptEl.textContent = empActor.dept || 'Departemen Rekayasa & Pemeliharaan';
  }
  const primaryApprover = (typeof window.getPrimaryApprover === 'function') 
    ? window.getPrimaryApprover() 
    : { name: 'Ir. Hendra Gunawan, M.T.' };
  const heroApproverEl = document.getElementById('mobileHeroEmpApprover');
  if (heroApproverEl) {
    heroApproverEl.textContent = `Atasan: ${primaryApprover.name}`;
  }

  // 2. Active Ticket Data
  const ticketsList = window.ticketsList || [];
  const empTickets = ticketsList.filter(t => !t.deletedByKaryawan && (t.employeeName === empActor.name || t.employeeNip === empActor.nip || (!t.employeeName && t.employeeId === 'EMP-001')));

  const activeTicket = empTickets.find(t => 
    t.status === 'Sedang di Luar' || 
    t.status === 'Disetujui' || 
    t.status === 'Menunggu Persetujuan' || 
    t.status === 'Menunggu Otorisasi Darurat' ||
    t.status === 'Terlambat'
  );

  // 3. Render Hero Active Strip
  const heroActiveStripWrap = document.getElementById('mobileHeroActiveStripWrap');
  if (heroActiveStripWrap) {
    if (activeTicket) {
      const isOutside = activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat';
      const scanOutStr = activeTicket.scanOutTime ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
      const returnStr = activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '-';

      heroActiveStripWrap.innerHTML = `
        <div class="mobile-hero-active-box">
          <div style="font-weight: 700; color: #a7f3d0; display: flex; align-items: center;">
            <span>Izin Aktif · ${activeTicket.id}</span>
          </div>
          <div style="color: #ffffff; font-size: 0.775rem; margin-top: 3px; font-weight: 600;">
            ${activeTicket.category} • ${isOutside ? 'Scan Out ' + scanOutStr : 'Rencana ' + scanOutStr}
          </div>
          <div style="color: #d1fae5; font-size: 0.725rem; margin-top: 2px;">
            Estimasi kembali ${returnStr}
          </div>
        </div>
      `;
    } else {
      heroActiveStripWrap.innerHTML = `
        <div class="mobile-hero-active-box" style="background: rgba(255,255,255,0.05);">
          <div style="font-weight: 700; color: #a7f3d0;">Status: Tidak Ada Perizinan Aktif</div>
          <div style="color: #ecfdf5; font-size: 0.75rem; margin-top: 2px; opacity: 0.9;">
            Ajukan izin bila hendak meninggalkan area pabrik.
          </div>
        </div>
      `;
    }
  }

  // 4. Update 3-Column Stats (PDF Page 1)
  const completedTickets = empTickets.filter(t => t.status === 'Selesai');
  const lateTickets = completedTickets.filter(t => t.isLate || (t.scanInTime && t.scanInTime.includes('Terlambat')));
  const onTimeCount = completedTickets.length - lateTickets.length;

  const statTotalMonth = document.getElementById('mobileStatTotalMonth');
  if (statTotalMonth) statTotalMonth.textContent = empTickets.length || 8;

  const statCompleted = document.getElementById('mobileStatCompleted');
  if (statCompleted) statCompleted.textContent = completedTickets.length || 6;

  const statCompletedSub = document.getElementById('mobileStatCompletedSub');
  if (statCompletedSub) {
    statCompletedSub.innerHTML = `${Math.max(1, onTimeCount)} tepat waktu, ${lateTickets.length || 1} terlambat`;
  }

  const statActive = document.getElementById('mobileStatActive');
  if (statActive) statActive.textContent = activeTicket ? 1 : 0;

  const statActiveSub = document.getElementById('mobileStatActiveSub');
  if (statActiveSub) {
    statActiveSub.textContent = activeTicket ? (activeTicket.status === 'Sedang di Luar' ? 'Di luar area' : activeTicket.status) : 'Tidak ada izin';
  }

  // 5. Render Card: Izin Aktif Saya (PDF Page 1)
  const mobileCardActivePermit = document.getElementById('mobileCardActivePermit');
  if (mobileCardActivePermit) {
    if (activeTicket) {
      const isPending = activeTicket.status === 'Menunggu Persetujuan';
      const isApproved = activeTicket.status === 'Disetujui';
      const isOutside = activeTicket.status === 'Sedang di Luar' || activeTicket.status === 'Terlambat';
      const isEmergency = activeTicket.isEmergency || (activeTicket.id && activeTicket.id.includes('-EMG-')) || activeTicket.status === 'Menunggu Otorisasi Darurat';

      const col1Label = (isOutside && activeTicket.scanOutTime) ? 'Scan Out • Pos 1' : 'Rencana Keluar';
      const col1Val = (isOutside && activeTicket.scanOutTime) ? activeTicket.scanOutTime.replace(/ \(Pos 1.*\)/, '') : (activeTicket.plannedExit ? window.formatDisplayDate(activeTicket.plannedExit) : '-');
      const col2Label = activeTicket.type === 'Pulang Mendahului' ? 'Tipe Kepulangan' : 'Batas kembali';
      const col2Val = activeTicket.type === 'Pulang Mendahului' ? 'Pulang Lebih Awal' : (activeTicket.estimatedReturn ? window.formatDisplayDate(activeTicket.estimatedReturn) : '-');

      let mobileBtnsHtml = '';
      if (activeTicket.status === 'Menunggu Verifikasi Atasan') {
        mobileBtnsHtml = `
          <button type="button" class="btn-mobile-secondary" disabled style="background: #eff6ff; color: #1e40af; border: 1.5px solid #bfdbfe; font-weight: 700; cursor: not-allowed; width: 100%;">
            <span>⏳ Menunggu Verifikasi Atasan</span>
          </button>
        `;
      } else if (isApproved) {
        mobileBtnsHtml = `
          <button type="button" class="btn-mobile-primary" onclick="openTicketDetail('${activeTicket.id}', 'qr')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Buka QR Izin</span>
          </button>
          <button type="button" class="btn-mobile-danger-outline" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Izin</span>
          </button>
        `;
      } else if (isOutside) {
        const hasPendingExt = activeTicket.pendingExtension && activeTicket.pendingExtension.status === 'Menunggu Persetujuan';
        const hasUsedExtension = activeTicket.extensionApproved || (activeTicket.extensionCount && activeTicket.extensionCount >= 1);
        const isGroupDinasActive = Boolean(activeTicket.isGroupDinas && Array.isArray(activeTicket.members) && activeTicket.members.filter(m => m.status !== 'batal').length > 0);

        const isLateStatus = (activeTicket.status === 'Terlambat' || activeTicket.isLate);
        mobileBtnsHtml = `
          ${(!isLateStatus) ? (hasPendingExt ? `
            <button type="button" class="btn-mobile-secondary" disabled style="opacity: 0.7;">
              <span>Perpanjangan Sedang Ditinjau Atasan</span>
            </button>
          ` : (hasUsedExtension ? `
            <button type="button" class="btn-mobile-secondary" disabled style="opacity: 0.6; cursor: not-allowed;">
              <span>Perpanjangan Telah Digunakan (Maks. 1x)</span>
            </button>
          ` : `
            <button type="button" class="btn-mobile-secondary" onclick="openExtendDurationModal('${activeTicket.id}')">
              <span>Ajukan Perpanjangan</span>
            </button>
          `)) : ''}
          ${isGroupDinasActive ? `
            <button type="button" class="btn-mobile-primary" style="background: #2563eb; width: 100%;" onclick="window.openSimulasiTapInModal('${activeTicket.id}')">
              <span>💳 Simulasi Tap In Gerbang</span>
            </button>
          ` : `
            <button type="button" class="btn-mobile-primary" style="background: #047857;" onclick="executeScanIn('${activeTicket.id}')">
              <span>✓ Tap In Kartu Akses (Masuk)</span>
            </button>
          `}
        `;
      } else if (isPending) {
        mobileBtnsHtml = `
          <button type="button" class="btn-mobile-secondary" style="background:#0284c7; color:#ffffff; border-color:#0284c7; font-weight:700;" onclick="window.openEditTicketModal('${activeTicket.id}')"><span>Edit Pengajuan</span></button><button type="button" class="btn-mobile-danger-outline" style="background:#dc2626; color:#ffffff; border-color:#dc2626; font-weight:700;" onclick="openCancelModal('${activeTicket.id}')"><span>Batalkan Izin</span></button>
        `;
      } else if (isEmergency) {
        mobileBtnsHtml = `
          
          <button type="button" class="btn-mobile-secondary" onclick="window.openEditTicketModal('${activeTicket.id}')">
            <span>Edit Data Darurat</span>
          </button>
          <button type="button" class="btn-mobile-danger-outline" onclick="openCancelModal('${activeTicket.id}')">
            <span>Batalkan Izin</span>
          </button>
        `;
      }

      mobileCardActivePermit.innerHTML = `
        <div class="mobile-card-header">
          <h3 class="mobile-card-title">Izin aktif saya</h3>
          <a href="#" class="figma-card-link" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Detail Pengajuan</a>
        </div>
        <div>
          <div style="font-size: 1.05rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary);">${activeTicket.id}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px; font-weight: 600;">${activeTicket.category} • ${activeTicket.type}</div>
          <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-top: 10px;">Tujuan keluar</div>
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-top: 2px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(activeTicket.destination || '').replace(/"/g, '&quot;')}">${(activeTicket.destination || '-').replace(/\r?\n+/g, ' ')}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(activeTicket.reason || '').replace(/"/g, '&quot;')}">${(activeTicket.reason || '-').replace(/\r?\n+/g, ' ')}</div>
          <div style="margin-top: 8px; display: inline-flex; align-items: center;">
            ${getCleanEmpStatus(activeTicket.status, activeTicket)}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-color, #f1f5f9);">
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col1Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col1Val}</div>
          </div>
          <div>
            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${col2Label}</div>
            <div style="font-size: 0.825rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${col2Val}</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
          ${mobileBtnsHtml}
        </div>

        <a href="#" class="mobile-link-rincian" onclick="openTicketDetail('${activeTicket.id}', 'detail'); return false;">Rincian</a>
      `;
    } else {
      mobileCardActivePermit.innerHTML = `
        <div class="mobile-card-header">
          <h3 class="mobile-card-title">Izin aktif saya</h3>
        </div>
        <div style="padding: 1.25rem 0.5rem; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 0.4rem;">🏢</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">Tidak Ada Perizinan Aktif</div>
          <p style="font-size: 0.775rem; color: #64748b; margin: 4px auto 14px; max-width: 280px; line-height: 1.4;">
            Anda sedang berada di kawasan operasional pabrik.
          </p>
          <button type="button" class="btn-mobile-primary" onclick="window.setKaryawanNav('pengajuan')">
            Buat Pengajuan Izin Baru
          </button>
        </div>
      `;
    }
  }

  // 6. Render Card: Pengajuan Terbaru (PDF Page 1 - 2 items)
  const mobileRecentTicketsList = document.getElementById('mobileRecentTicketsList');
  if (mobileRecentTicketsList) {
    const pastTickets = empTickets.filter(t => !activeTicket || t.id !== activeTicket.id).slice(0, 2);
    if (pastTickets.length === 0) {
      mobileRecentTicketsList.innerHTML = `
        <div style="padding: 1rem 0; text-align: center; color: #94a3b8; font-size: 0.8rem;">
          Belum ada riwayat pengajuan sebelumnya.
        </div>
      `;
    } else {
      mobileRecentTicketsList.innerHTML = pastTickets.map((t, idx) => {
        const dateStr = t.createdAt ? t.createdAt.slice(0, 11) : '19 Okt 2026';
        const plannedStr = t.plannedExit ? t.plannedExit.slice(11, 16) : '10.00';
        const returnStr = t.estimatedReturn ? t.estimatedReturn.slice(11, 16) : '';
        const timeRange = returnStr ? `${plannedStr} s/d ${returnStr} WIB` : `${plannedStr} WIB`;

        return `
          <div style="padding: 10px 0; ${idx < pastTickets.length - 1 ? 'border-bottom: 1px solid #f1f5f9;' : ''} display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <div style="font-size: 0.9rem; font-weight: 800; font-family: var(--font-mono); color: #0f172a;">${t.id}</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                ${dateStr} • ${t.category} • ${timeRange}
              </div>
              <a href="#" onclick="openTicketDetail('${t.id}', 'detail'); return false;" style="display: inline-block; margin-top: 4px; font-size: 0.775rem; font-weight: 700; color: #059669; text-decoration: underline;">Rincian</a>
            </div>
            <div>${getCleanEmpStatus(t.status, t)}</div>
          </div>
        `;
      }).join('');
    }
  }
}

// Mobile Segment Switcher (PDF Page 1 & 4)
function switchKaryawanMobileSegment(seg) {
  const btnRingkasan = document.getElementById('btnMobileSegRingkasan');
  const btnDonut = document.getElementById('btnMobileSegDonut');
  const ringkasanCard = document.getElementById('mobileStatsRingkasanWrap');
  const donutCard = document.getElementById('mobileDonutCardWrap');

  if (seg === 'ringkasan') {
    if (btnRingkasan) btnRingkasan.classList.add('active');
    if (btnDonut) btnDonut.classList.remove('active');
    if (ringkasanCard) ringkasanCard.style.display = 'grid';
    if (donutCard) donutCard.style.display = 'none';
  } else {
    if (btnDonut) btnDonut.classList.add('active');
    if (btnRingkasan) btnRingkasan.classList.remove('active');
    if (ringkasanCard) ringkasanCard.style.display = 'none';
    if (donutCard) donutCard.style.display = 'block';
    renderKaryawanMobileDonutChart();
  }
}

// Render Donut Chart Total Pengajuan Izin untuk Mobile (PDF Page 4)
function renderKaryawanMobileDonutChart() {
  const container = document.getElementById('mobileDonutChartContainer');
  if (!container) return;

  const tickets = (window.ticketsList || []).filter(t => !t.deletedByKaryawan);
  const total = tickets.length || 8;
  const selesaiCount = tickets.filter(t => t.status === 'Selesai').length || 6;
  const aktifCount = tickets.filter(t => t.status === 'Sedang di Luar' || t.status === 'Disetujui' || t.status === 'Menunggu Persetujuan').length || 1;
  const daruratCount = tickets.filter(t => t.isEmergency || (t.id && t.id.includes('-EMG-'))).length || 1;

  const selesaiPct = Math.round((selesaiCount / total) * 100);
  const aktifPct = Math.round((aktifCount / total) * 100);
  const daruratPct = Math.round((daruratCount / total) * 100);

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-around; gap: 14px; padding: 10px 0;">
      <!-- SVG Donut Chart -->
      <div style="position: relative; width: 110px; height: 110px; flex-shrink: 0;">
        <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" stroke-width="4"></circle>
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#059669" stroke-width="4" stroke-dasharray="${selesaiPct} ${100 - selesaiPct}" stroke-dashoffset="0"></circle>
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#d97706" stroke-width="4" stroke-dasharray="${aktifPct} ${100 - aktifPct}" stroke-dashoffset="-${selesaiPct}"></circle>
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#dc2626" stroke-width="4" stroke-dasharray="${daruratPct} ${100 - daruratPct}" stroke-dashoffset="-${selesaiPct + aktifPct}"></circle>
        </svg>
        <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
          <span style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); line-height: 1;">${total}</span>
          <span style="font-size: 0.65rem; color: #64748b; font-weight: 600; margin-top: 2px;">Total</span>
        </div>
      </div>

      <!-- Legend (PDF Page 4) -->
      <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
        <div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #0f172a;">
            <span style="width: 9px; height: 9px; background: #059669; border-radius: 2px; flex-shrink: 0;"></span>
            <span>${selesaiCount} Selesai</span>
          </div>
          <div style="font-size: 0.7rem; color: #64748b; padding-left: 15px;">${selesaiPct}% dari total</div>
        </div>

        <div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #0f172a;">
            <span style="width: 9px; height: 9px; background: #d97706; border-radius: 2px; flex-shrink: 0;"></span>
            <span>${aktifCount} Sedang Aktif</span>
          </div>
          <div style="font-size: 0.7rem; color: #64748b; padding-left: 15px;">${aktifPct}% dari total</div>
        </div>

        <div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #0f172a;">
            <span style="width: 9px; height: 9px; background: #dc2626; border-radius: 2px; flex-shrink: 0;"></span>
            <span>${daruratCount} Izin Darurat</span>
          </div>
          <div style="font-size: 0.7rem; color: #64748b; padding-left: 15px;">${daruratPct}% dari total</div>
        </div>
      </div>
    </div>
  `;
}

// Mobile Dev Role Switcher Helpers (Delegated to mobile_app.js)
function openMobileRoleSheet() {
  if (typeof window.openMobileRoleSheet === 'function' && window.openMobileRoleSheet !== openMobileRoleSheet) {
    window.openMobileRoleSheet();
    return;
  }
  const sheet = document.getElementById('mobileRoleSheet');
  const backdrop = document.getElementById('mobileModalBackdrop') || document.getElementById('mobileRoleSheetBackdrop');
  if (sheet) sheet.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
}

function closeMobileRoleSheet() {
  if (typeof window.closeMobileRoleSheet === 'function' && window.closeMobileRoleSheet !== closeMobileRoleSheet) {
    window.closeMobileRoleSheet();
    return;
  }
  const sheet = document.getElementById('mobileRoleSheet');
  const backdrop = document.getElementById('mobileModalBackdrop') || document.getElementById('mobileRoleSheetBackdrop');
  if (sheet) sheet.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

function switchMobileRole(role) {
  if (typeof window.mobileSwitchRole === 'function') {
    window.mobileSwitchRole(role);
    return;
  }
  closeMobileRoleSheet();
}

// Expose mobile functions
window.renderKaryawanMobileDashboard = renderKaryawanMobileDashboard;
window.switchKaryawanMobileSegment = switchKaryawanMobileSegment;
window.renderKaryawanMobileDonutChart = renderKaryawanMobileDonutChart;
window.switchMobileRole = switchMobileRole;

// ========================================================
// FITUR ROMBONGAN DINAS & SURAT PERINTAH DI FORM DARURAT
// ========================================================
window._selectedEmergGroupMembers = [];
window._currentEmergSuratPerintah = null;

window.initEmergGroupDinasMembersForm = function() {
  const currentEmp = typeof getCurrentEmployeeActor === 'function' ? getCurrentEmployeeActor() : { nip: 'PK-2024-8841', department: 'Departemen Rekayasa & Pemeliharaan' };
  const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];

  const candidates = allUsers.filter(u => {
    if (u.status !== 'Aktif') return false;
    if (u.nip === currentEmp.nip) return false;
    const isEmp = (u.roleKey === 'karyawan' || u.roleKey === 'karyawan2' || (u.role && u.role.toLowerCase().includes('karyawan')) || (u.department && !u.roleKey?.includes('approver') && !u.roleKey?.includes('admin') && !u.roleKey?.includes('security')));
    if (!isEmp) return false;
    const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(u.nip) : null;
    if (activeTicket) return false;
    return true;
  });

  window._emergGroupMemberCandidates = candidates;

  const inputSearch = document.getElementById('inputSearchEmergGroupMember');
  if (inputSearch && !inputSearch._hasSearchListener) {
    inputSearch._hasSearchListener = true;
    inputSearch.addEventListener('input', (e) => {
      window.filterEmergGroupMemberSearch(e.target.value);
    });
    inputSearch.addEventListener('focus', () => {
      window.filterEmergGroupMemberSearch(inputSearch.value || '');
    });
  }

  window.renderSelectedEmergGroupMembers();
};

window.filterEmergGroupMemberSearch = function(query) {
  const dropdown = document.getElementById('emergMemberFloatingDropdown');
  const listEl = document.getElementById('emergMemberItemsList');
  const emptyEl = document.getElementById('emergMemberEmptyState');
  if (!dropdown || !listEl) return;

  const candidates = (window._emergGroupMemberCandidates || []).filter(c => 
    !window._selectedEmergGroupMembers.some(m => m.nip === c.nip)
  );

  const cleanQuery = String(query || '').trim();
  const filtered = candidates.filter(c => {
    if (!cleanQuery) return true;
    return (typeof window.matchSearchTokens === 'function')
      ? window.matchSearchTokens(cleanQuery, c.name, c.nip, c.department, c.title, c.directSupervisor || c.supervisor)
      : (c.name.toLowerCase().includes(cleanQuery.toLowerCase()) || c.nip.toLowerCase().includes(cleanQuery.toLowerCase()) || (c.department && c.department.toLowerCase().includes(cleanQuery.toLowerCase())));
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
  } else {
    if (emptyEl) emptyEl.style.display = 'none';
    listEl.innerHTML = filtered.map(c => {
      const initials = (c.name || 'KY').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      const sup = (c.directSupervisor || c.supervisor || 'Atasan Langsung');
      return `
        <div class="member-search-item" onclick="window.addEmergGroupMemberByNip('${c.nip}')" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0.55rem 0.75rem; border-radius: 6px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f1f5f9;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; border: 1px solid #bae6fd; flex-shrink: 0;">
              ${initials}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 0.8rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name} <span style="font-weight: 500; color: #64748b; font-size: 0.72rem;">(${c.nip})</span></div>
              <div style="font-size: 0.7rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.department || 'Departemen Rekayasa & Pemeliharaan'} • ${c.title || 'Karyawan'}">${c.department || 'Departemen Rekayasa & Pemeliharaan'} • ${c.title || 'Karyawan'}</div>
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <span style="font-size: 0.68rem; font-weight: 700; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 3px 8px; border-radius: 999px; display: inline-flex; align-items: center; white-space: nowrap; line-height: 1.2;">
              Atasan: ${sup.split(',')[0]}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  dropdown.style.display = 'block';
};

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('wrapSearchEmergMember');
  const dropdown = document.getElementById('emergMemberFloatingDropdown');
  if (dropdown && wrap && !wrap.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

window.addEmergGroupMemberByNip = function(nip) {
  if (!nip) return;
  if (!window._selectedEmergGroupMembers) window._selectedEmergGroupMembers = [];
  if (window._selectedEmergGroupMembers.length >= 5) {
    if (typeof window.showToast === 'function') window.showToast('Maksimal anggota tim dinas adalah 5 orang.', 'warning');
    return;
  }
  const allUsers = (typeof window.loadUsers === 'function' ? window.loadUsers() : window.MOCK_USERS) || [];
  const user = allUsers.find(u => u.nip === nip);
  if (!user) return;

  const activeTicket = typeof window.getActiveTicket === 'function' ? window.getActiveTicket(user.nip) : null;
  if (activeTicket) {
    if (typeof window.showToast === 'function') {
      window.showToast(`Karyawan (${user.name}) saat ini masih memiliki izin aktif (#${activeTicket.id}) dan tidak dapat ditambahkan ke tim dinas.`, 'warning');
    }
    return;
  }

  if (window._selectedEmergGroupMembers.some(m => String(m.nip).trim() === String(nip).trim())) return;

  window._selectedEmergGroupMembers.push({
    nip: user.nip,
    name: user.name,
    title: user.title || user.role || 'Karyawan',
    department: user.department || 'Departemen Rekayasa & Pemeliharaan',
    supervisor: user.directSupervisor || user.supervisor || 'Ir. Hendra Gunawan, M.T.'
  });

  const inputSearch = document.getElementById('inputSearchEmergGroupMember');
  if (inputSearch) inputSearch.value = '';
  const dropdown = document.getElementById('emergMemberFloatingDropdown');
  if (dropdown) dropdown.style.display = 'none';

  window.renderSelectedEmergGroupMembers();
};

window.removeEmergGroupMemberByNip = function(nip, event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
    if (typeof event.preventDefault === 'function') event.preventDefault();
  }
  window._selectedEmergGroupMembers = (window._selectedEmergGroupMembers || []).filter(m => String(m.nip).trim() !== String(nip).trim());
  window.renderSelectedEmergGroupMembers();
};

window.renderSelectedEmergGroupMembers = function() {
  const container = document.getElementById('listSelectedEmergGroupMembers');
  if (!container) return;
  const html = (window._selectedEmergGroupMembers || []).map(m => `
    <span style="display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
      <span>👤 ${m.name}</span>
      <span style="font-size: 0.68rem; color: #3b82f6; font-weight: 600;">(${(m.supervisor || '').split(',')[0]})</span>
      <button type="button" onclick="window.removeEmergGroupMemberByNip('${m.nip}', event)" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 11px; padding: 0 2px; line-height: 1; font-weight: 800;" title="Hapus ${m.name}">✕</button>
    </span>
  `).join('');

  container.innerHTML = html || '<span style="font-size: 0.72rem; color: #94a3b8; font-style: italic;">Belum ada anggota tim yang ditambahkan. Pengajuan ini bersifat perorangan jika kosong.</span>';
};

window.handleEmergSuratPerintahUpload = function(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];
  if (file.size > 5 * 1024 * 1024) {
    if (typeof window.showToast === 'function') window.showToast('Ukuran berkas melebihi batas 5 MB.', 'error');
    inputEl.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    window._currentEmergSuratPerintah = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf',
      dataUrl: e.target.result,
      uploadedAt: new Date().toISOString()
    };

    const dropzone = document.getElementById('dropzoneEmergSuratPerintah');
    const preview = document.getElementById('previewEmergSuratPerintahCard');
    const nameEl = document.getElementById('previewEmergSuratPerintahName');
    const sizeEl = document.getElementById('previewEmergSuratPerintahSize');
    const iconEl = document.getElementById('previewEmergSuratPerintahIcon');

    if (dropzone) dropzone.style.display = 'none';
    if (preview) preview.style.display = 'flex';
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = `${Math.round(file.size / 1024)} KB • Berkas Terlampir`;
    if (iconEl) iconEl.textContent = file.name.endsWith('.pdf') ? '📄' : '🖼️';

    if (typeof window.showToast === 'function') {
      window.showToast(`Surat Perintah berhasil diunggah: ${file.name}`, 'success');
    }
  };
  reader.readAsDataURL(file);
};

window.removeEmergSuratPerintahFile = function() {
  window._currentEmergSuratPerintah = null;
  const fileInput = document.getElementById('fileEmergSuratPerintah');
  if (fileInput) fileInput.value = '';

  const dropzone = document.getElementById('dropzoneEmergSuratPerintah');
  const preview = document.getElementById('previewEmergSuratPerintahCard');
  if (dropzone) dropzone.style.display = 'block';
  if (preview) preview.style.display = 'none';

  if (typeof window.showToast === 'function') {
    window.showToast('Berkas Surat Perintah dihapus.', 'info');
  }
};
