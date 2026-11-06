/**
 * SISTEM PERIZINAN KELUAR AREA KARYAWAN - PT Pupuk Kujang Cikampek
 * Notification Engine & Store (Notifications Module)
 * Mendukung Karyawan, Atasan, dan Pos Jaga di Web/PC & HP
 */

(function () {
  'use strict';

  const NOTIF_STORAGE_KEY = 'kujang_notifications';

  // 1. Data Loader & Saver
  function loadStoredNotifications() {
    try {
      const data = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
    return [];
  }

  function saveStoredNotifications(list) {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  }

  let notificationsList = loadStoredNotifications();

  // Helper Waktu Relatif (Format titik untuk waktu: 16.17 WIB)
  function formatRelativeTime(dateInput) {
    if (!dateInput) return 'Baru saja';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    const pad = n => String(n).padStart(2, '0');
    const timeFormatted = `${pad(date.getHours())}.${pad(date.getMinutes())} WIB`;

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `Hari ini, ${timeFormatted}`;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]}, ${timeFormatted}`;
  }

  // Universal Role Category Helpers (Scalable for 100+ employees and approvers)
  function isEmployeeRole(roleKey) {
    if (!roleKey) return true;
    const k = String(roleKey).toLowerCase();
    return k === 'karyawan' || k.startsWith('karyawan') || k.includes('employee') || k.includes('pemohon');
  }

  function isApproverRole(roleKey) {
    if (!roleKey) return false;
    const k = String(roleKey).toLowerCase();
    return k === 'approver' || k.startsWith('approver') || k.includes('atasan') || k.includes('manager');
  }

  function isSecurityRole(roleKey) {
    if (!roleKey) return false;
    const k = String(roleKey).toLowerCase();
    return k === 'security' || k.startsWith('security') || k.includes('satpam') || k.includes('pos');
  }

  // Helper Pengguna Aktif yang Benar-Benar Akurat (Individual)
  function getActiveUserInfo() {
    const actorKey = (typeof window.getCurrentRole === 'function' ? window.getCurrentRole() : window.currentActor) || 'karyawan';
    const actors = window.ACTORS || {};

    // 1. Cek sesi login aktif Kujang ID jika ada
    let sessionUser = null;
    if (typeof window.getKujangCurrentUser === 'function') {
      sessionUser = window.getKujangCurrentUser();
    }

    let actor = actors[actorKey];
    if (sessionUser && (sessionUser.role === actorKey || sessionUser.roleKey === actorKey)) {
      actor = sessionUser;
    }

    // 2. Jika karyawan, sinkronisasi dengan aktor karyawan aktif
    if ((!actor || !actor.nip) && isEmployeeRole(actorKey) && typeof window.getCurrentEmployeeActor === 'function') {
      actor = window.getCurrentEmployeeActor();
    }

    // 3. Jika approver, pastikan Atasan 1 vs Atasan 2 dibedakan secara tegas
    if (isApproverRole(actorKey)) {
      const isApprover2 = (actorKey === 'approver2');
      actor = isApprover2
        ? (actors.approver2 || { name: 'Dewi Sartika, S.T., M.M.', nip: 'PK-2012-0845' })
        : (actors.approver || { name: 'Ir. Hendra Gunawan, M.T.', nip: 'PK-2015-1002' });
    }

    // 4. Default NIP akurat per sub-aktor
    let defaultNip = 'PK-2024-8841';
    let defaultName = 'Budi Pratama, S.T.';

    if (actorKey === 'approver2') {
      defaultNip = 'PK-2012-0845';
      defaultName = 'Dewi Sartika, S.T., M.M.';
    } else if (actorKey === 'approver' || actorKey.startsWith('approver')) {
      defaultNip = 'PK-2015-1002';
      defaultName = 'Ir. Hendra Gunawan, M.T.';
    } else if (actorKey === 'karyawan2') {
      defaultNip = 'PK-2024-8842';
      defaultName = 'Arthur Morgan, S.Tr.T.';
    } else if (isSecurityRole(actorKey)) {
      defaultNip = 'SEC-2018-042';
      defaultName = 'Sertu Agus';
    } else if (actorKey === 'admin') {
      defaultNip = 'ADM-2016-019';
      defaultName = 'Bambang Sutrisno, S.T.';
    }

    return {
      roleKey: actorKey,
      nip: (actor && actor.nip) || defaultNip,
      name: (actor && actor.name) || defaultName
    };
  }

  // 2. Core API: Create Notification (with Idempotency Check & Individual Target Resolution)
  function createNotification(payload) {
    if (!payload || !payload.title || !payload.message) return null;

    // Idempotency: Jika eventId sudah pernah dicatat, jangan duplikat
    if (payload.eventId) {
      const exists = notificationsList.some(n => n.eventId === payload.eventId);
      if (exists) return null;
    }

    let recRole = payload.recipientRole || 'karyawan';
    let recNip = payload.recipientNip || null;
    let recName = payload.recipientName || null;

    // Resolusi otomatis target penerima jika NIP belum disertakan (khusus Atasan & Karyawan)
    if (isApproverRole(recRole)) {
      const allUsers = window.MOCK_USERS || [];
      if (!recNip && recName) {
        const rnLower = recName.toLowerCase();
        const found = allUsers.find(u => u.name && (u.name.toLowerCase() === rnLower || rnLower.includes(u.name.toLowerCase()) || u.name.toLowerCase().includes(rnLower)));
        if (found) {
          recNip = found.nip;
          recName = found.name;
        } else if (rnLower.includes('dewi') || rnLower.includes('sartika')) {
          recNip = 'PK-2012-0845';
          recName = 'Dewi Sartika, S.T., M.M.';
        } else {
          recNip = 'PK-2015-1002';
          recName = 'Ir. Hendra Gunawan, M.T.';
        }
      }
      if (!recNip && payload.ticketId) {
        const tickets = window.ticketsList || [];
        const t = tickets.find(x => x.id === payload.ticketId);
        if (t) {
          if (t.approverNip) {
            recNip = t.approverNip;
          } else if (t.approverName) {
            recName = recName || t.approverName;
            const tnLower = t.approverName.toLowerCase();
            const found = allUsers.find(u => u.name && (u.name.toLowerCase() === tnLower || tnLower.includes(u.name.toLowerCase()) || u.name.toLowerCase().includes(tnLower)));
            if (found) {
              recNip = found.nip;
              recName = found.name;
            } else if (tnLower.includes('dewi') || tnLower.includes('sartika')) {
              recNip = 'PK-2012-0845';
            } else {
              recNip = 'PK-2015-1002';
            }
          }
        }
      }
      if (!recNip) {
        recNip = 'PK-2015-1002';
        recName = recName || 'Ir. Hendra Gunawan, M.T.';
      }
    } else if (isEmployeeRole(recRole)) {
      if (!recNip && recName) {
        const rnLower = recName.toLowerCase();
        if (rnLower.includes('arthur')) {
          recNip = 'PK-2024-8842';
          recName = 'Arthur Morgan, S.Tr.T.';
        } else if (rnLower.includes('budi')) {
          recNip = 'PK-2024-8841';
          recName = 'Budi Pratama, S.T.';
        }
      }
      if (!recNip && payload.ticketId) {
        const tickets = window.ticketsList || [];
        const t = tickets.find(x => x.id === payload.ticketId);
        if (t && t.applicantNip) {
          recNip = t.applicantNip;
          recName = recName || t.applicantName;
        }
      }
      if (!recNip) {
        recNip = 'PK-2024-8841';
        recName = recName || 'Budi Pratama, S.T.';
      }
    }

    const newNotif = {
      id: 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      recipientRole: recRole, // 'karyawan' | 'approver' | 'security' | 'admin'
      recipientNip: recNip,
      recipientName: recName,
      actorSource: payload.actorSource || 'system',
      type: payload.type || 'info',
      title: payload.title,
      message: payload.message,
      ticketId: payload.ticketId || null,
      createdAt: new Date().toISOString(),
      isRead: false,
      priority: payload.priority || 'normal', // 'normal' | 'high'
      eventId: payload.eventId || null
    };

    notificationsList.unshift(newNotif);
    saveStoredNotifications(notificationsList);

    // Update UI badge jika modul UI sudah termuat
    updateNotificationBadges();

    return newNotif;
  }

  // 3. Helper Pencocokan Notifikasi Individual per Pengguna (Mencegah Kebocoran Antar Atasan/Karyawan)
  function isNotificationForUser(n, user) {
    if (!n || !user) return false;

    // 3.1. Karyawan Pemohon (Individual matching)
    if (isEmployeeRole(user.roleKey)) {
      if (!isEmployeeRole(n.recipientRole)) return false;

      // Pencocokan NIP eksak
      if (n.recipientNip && user.nip) {
        return n.recipientNip === user.nip;
      }

      // Pencocokan Nama
      if (n.recipientName && user.name) {
        const rName = n.recipientName.toLowerCase();
        const uName = user.name.toLowerCase();
        if (rName.includes('arthur') || uName.includes('arthur')) {
          return rName.includes('arthur') && uName.includes('arthur');
        }
        if (rName.includes('budi') || uName.includes('budi')) {
          return rName.includes('budi') && uName.includes('budi');
        }
        return rName.includes(uName) || uName.includes(rName);
      }

      // Cek tiket applicantNip jika ada
      if (n.ticketId) {
        const tickets = window.ticketsList || [];
        const t = tickets.find(x => x.id === n.ticketId);
        if (t && t.applicantNip) {
          return t.applicantNip === user.nip;
        }
      }

      // Default jika tanpa identitas spesifik: hanya milik akun default karyawan 1
      return user.nip === 'PK-2024-8841';
    }

    // 3.2. Atasan Peninjau (Individual: Atasan 1 TIDAK BOLEH muncul di Atasan 2 dan sebaliknya)
    if (isApproverRole(user.roleKey)) {
      if (!isApproverRole(n.recipientRole)) return false;

      // Pencocokan NIP eksak
      if (n.recipientNip && user.nip) {
        return n.recipientNip === user.nip;
      }

      // Pencocokan Nama
      if (n.recipientName && user.name) {
        const rName = n.recipientName.toLowerCase();
        const uName = user.name.toLowerCase();
        if (rName.includes('dewi') || rName.includes('sartika')) {
          return uName.includes('dewi') || uName.includes('sartika') || user.nip === 'PK-2012-0845';
        }
        if (rName.includes('hendra') || rName.includes('gunawan')) {
          return uName.includes('hendra') || uName.includes('gunawan') || user.nip === 'PK-2015-1002';
        }
        return rName.includes(uName) || uName.includes(rName);
      }

      // Cek tiket approverName jika ada
      if (n.ticketId) {
        const tickets = window.ticketsList || [];
        const t = tickets.find(x => x.id === n.ticketId);
        if (t) {
          const tAppr = (t.approverName || t.directSupervisor || '').toLowerCase();
          const uName = user.name.toLowerCase();
          if (tAppr.includes('dewi') || tAppr.includes('sartika')) {
            return uName.includes('dewi') || uName.includes('sartika') || user.nip === 'PK-2012-0845';
          }
          if (tAppr.includes('hendra') || tAppr.includes('gunawan')) {
            return uName.includes('hendra') || uName.includes('gunawan') || user.nip === 'PK-2015-1002';
          }
        }
      }

      // Default jika tanpa identitas spesifik sama sekali: hanya milik Atasan 1 (Hendra Gunawan)
      // dan TIDAK PERNAH bocor ke Atasan 2 (Dewi Sartika)!
      return user.nip === 'PK-2015-1002' && !n.recipientNip && !n.recipientName;
    }

    // 3.3. Pos Jaga Pengamanan (Shared untuk pos pengamanan gerbang)
    if (isSecurityRole(user.roleKey)) {
      return isSecurityRole(n.recipientRole);
    }

    // 3.4. Administrator Pengamanan & K3
    if (user.roleKey === 'admin') {
      return n.recipientRole === 'admin';
    }

    return false;
  }

  // 3.5. Filter Notifikasi Khusus Aktor Saat Ini (Individual)
  function getNotificationsForActiveActor() {
    const user = getActiveUserInfo();
    const list = notificationsList || [];
    return list.filter(n => isNotificationForUser(n, user));
  }

  function getUnreadCountForActiveActor() {
    const userNotifs = getNotificationsForActiveActor();
    return userNotifs.filter(n => !n.isRead).length;
  }

  // 4. Mark As Read API
  function markNotificationAsRead(notifId) {
    const notif = notificationsList.find(n => n.id === notifId);
    if (notif && !notif.isRead) {
      notif.isRead = true;
      saveStoredNotifications(notificationsList);
      updateNotificationBadges();
      return true;
    }
    return false;
  }

  // 4b. Delete Notification API (Soft Delete per Actor)
  function deleteNotification(notifId) {
    if (!notifId) return false;
    const idx = notificationsList.findIndex(n => n.id === notifId);
    if (idx !== -1) {
      notificationsList.splice(idx, 1);
      saveStoredNotifications(notificationsList);
      updateNotificationBadges();
      return true;
    }
    return false;
  }

  function clearAllNotificationsForActiveActor() {
    const user = getActiveUserInfo();
    notificationsList = notificationsList.filter(n => !isNotificationForUser(n, user));
    saveStoredNotifications(notificationsList);
    updateNotificationBadges();
  }

  window.deleteNotification = deleteNotification;
  window.clearAllNotificationsForActiveActor = clearAllNotificationsForActiveActor;

  function markAllNotificationsAsRead() {
    const user = getActiveUserInfo();
    let updatedCount = 0;

    notificationsList.forEach(n => {
      if (isNotificationForUser(n, user) && !n.isRead) {
        n.isRead = true;
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      saveStoredNotifications(notificationsList);
      updateNotificationBadges();
      if (typeof window.showToast === 'function') {
        window.showToast('Semua notifikasi telah ditandai dibaca.', 'info');
      }
    }
  }

  // 5. Update Badge di Header (Mobile & PC)
  function updateNotificationBadges() {
    const count = getUnreadCountForActiveActor();
    const displayCount = count > 9 ? '9+' : String(count);

    // Mobile Badge
    const mBadge = document.getElementById('mNotifBadge');
    if (mBadge) {
      if (count > 0) {
        mBadge.textContent = displayCount;
        mBadge.style.display = 'inline-flex';
      } else {
        mBadge.style.display = 'none';
      }
    }

    // Desktop Badge
    const dBadge = document.getElementById('desktopNotifBadge');
    if (dBadge) {
      if (count > 0) {
        dBadge.textContent = displayCount;
        dBadge.style.display = 'inline-flex';
      } else {
        dBadge.style.display = 'none';
      }
    }

    // Perbarui dropdown jika sedang terbuka di layar
    renderDesktopNotifDropdownContent();
  }

  // 6. Navigasi Buka Tiket dari Notifikasi (C1: Navigasi Kembali dari Notifikasi)
  function openTicketFromNotification(ticketId, notifId, fromTab = 'all') {
    if (notifId) {
      markNotificationAsRead(notifId);
    }

    // Set flag context C1 agar tombol kembali di detail tiket mengarahkan kembali ke notifikasi
    window._openedFromNotification = true;
    window._openedFromScannerTerminal = false;
    window._openedFromNotificationTab = fromTab;

    // Tutup dropdown notifikasi desktop jika terbuka
    closeDesktopNotifDropdown();
    if (typeof window.mobileCloseSheet === 'function') {
      window.mobileCloseSheet();
    }

    // Tetap berada di halaman notifikasi desktop (jangan tutup viewNotifikasi)

    if (!ticketId) return;

    const user = getActiveUserInfo();
    const isMobile = (window.innerWidth <= 768) || Boolean(document.getElementById('mobileAppShell')) || Boolean(window.currentMobileRole);

    // NOTE PENTING: Pada Tampilan Mobile, gunakan action sheet native mobile (Image 2)
    if (isMobile && typeof window.mobileOpenTicketDetail === 'function') {
      setTimeout(() => {
        window.mobileOpenTicketDetail(ticketId);
      }, 50);
      return;
    }

    // Tampilan Desktop (Web/PC)
    if (typeof window.openTicketDetail === 'function') {
      window.openTicketDetail(ticketId, 'readonly', { readOnlyFromNotif: true });
    }
  }

    // Helper Class Type Icon
  function getNotifIconTypeClass(type, priority) {
    if (priority === 'high' || type === 'darurat_baru' || type === 'bawahan_terlambat' || type === 'ditolak' || type === 'perpanjangan_ditolak') {
      return 'icon-danger';
    }
    if (type === 'disetujui' || type === 'perpanjangan_disetujui' || type === 'darurat_qr_aktif') {
      return 'icon-success';
    }
    if (type === 'kedaluwarsa' || type === 'selesai') {
      return 'icon-info';
    }
    return 'icon-neutral';
  }

  // 7. Icon Helper untuk Jenis Notifikasi
  function getNotifIconSvg(type, priority) {
    if (priority === 'high' || type === 'darurat_baru' || type === 'bawahan_terlambat') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }
    if (type === 'disetujui' || type === 'perpanjangan_disetujui' || type === 'darurat_qr_aktif') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    }
    if (type === 'ditolak' || type === 'perpanjangan_ditolak') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }
    if (type === 'kedaluwarsa' || type === 'selesai') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
  }

  // 8. TAMPILAN MOBILE: SHEET NOTIFIKASI LAYAR PENUH (Hal 4)
  window.openMobileNotificationSheet = function (filterTab = 'all') {
    const sheet = document.getElementById('mobileActionSheet');
    const backdrop = document.getElementById('mobileModalBackdrop');
    if (!sheet || !backdrop) return;

    const user = getActiveUserInfo();
    let notifs = getNotificationsForActiveActor();

    if (filterTab === 'unread') {
      notifs = notifs.filter(n => !n.isRead);
    }

    const allNotifsCount = getNotificationsForActiveActor().length;
    const unreadTotal = getUnreadCountForActiveActor();

    const itemsHtml = notifs.length > 0 ? notifs.map(n => {
      const isHigh = n.priority === 'high';
      const isUnread = !n.isRead;
      return `
        <div class="mobile-notif-item ${isUnread ? 'unread' : ''} ${isHigh ? 'priority-high' : ''}" style="position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 12px; background: ${isUnread ? '#f0fdf4' : '#ffffff'}; border: 1.5px solid ${isHigh ? '#fca5a5' : (isUnread ? '#a7f3d0' : '#e2e8f0')}; margin-bottom: 8px; cursor: pointer; transition: all 0.15s ease;" onclick="window.openTicketFromNotification('${n.ticketId || ''}', '${n.id}')">
          <div class="notif-icon-box ${getNotifIconTypeClass(n.type, n.priority)}" style="width: 36px; height: 36px;">
            ${getNotifIconSvg(n.type, n.priority)}
          </div>
          <div style="flex: 1; min-width: 0; padding-right: 36px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin-bottom: 2px;">
              <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a; line-height: 1.3;">
                ${n.title}
                ${isHigh ? '<span style="background: #dc2626; color: #fff; font-size: 0.6rem; font-weight: 800; padding: 1px 5px; border-radius: 4px; margin-left: 4px; vertical-align: middle;">DARURAT</span>' : ''}
              </div>
              ${isUnread ? '<span class="notif-unread-dot" style="width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;"></span>' : ''}
            </div>
            <div style="font-size: 0.75rem; color: #334155; line-height: 1.4; margin-bottom: 4px;">
              ${n.message}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.675rem; color: #64748b; font-weight: 600;">
              <span>${n.ticketId ? `<strong style="font-family: monospace; color: #0f172a;">${n.ticketId}</strong> • ` : ''}${formatRelativeTime(n.createdAt)}</span>
              <span style="color: #059669; font-weight: 700;">Lihat →</span>
            </div>
          </div>
          <button type="button" aria-label="Hapus Notifikasi" style="position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 0; border-radius: 8px;" onclick="event.stopPropagation(); window.confirmDeleteMobileNotification('${n.id}', '${filterTab}')" title="Hapus notifikasi ini">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;
    }).join('') : `
      <div style="text-align: center; padding: 40px 16px; background: #ffffff; border-radius: 14px; border: 1.5px dashed #cbd5e1; margin-top: 10px;">
        <div style="color: #94a3b8; margin-bottom: 10px;">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </div>
        <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Belum Ada Notifikasi</div>
        <div style="font-size: 0.775rem; color: #64748b; max-width: 250px; margin: 0 auto; line-height: 1.4;">
          ${filterTab === 'unread' ? 'Tidak ada notifikasi yang belum dibaca.' : 'Pemberitahuan aktivitas perizinan Anda akan muncul di sini.'}
        </div>
      </div>
    `;

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <div>
          <span style="font-size: 0.675rem; color: #059669; font-weight: 700; text-transform: uppercase;">KOTAK MASUK • ${user.roleKey.toUpperCase()}</span>
          <h3 class="mobile-sheet-title" style="font-size: 1.05rem; margin: 0; color: #0f172a;">Notifikasi</h3>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" aria-label="Hapus Semua Notifikasi" class="btn-clear-all-notifs" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #dc2626; color: #ffffff; border: none; border-radius: 8px; cursor: ${allNotifsCount > 0 ? 'pointer' : 'not-allowed'}; opacity: ${allNotifsCount > 0 ? '1' : '0.4'}; padding: 0;" ${allNotifsCount > 0 ? `onclick="window.confirmClearAllMobileNotifications('${filterTab}')"` : 'disabled'} title="Hapus Semua Notifikasi">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
          <button type="button" aria-label="Tutup" class="mobile-sheet-close" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 0;" onclick="window.mobileCloseSheet()">✕</button>
        </div>
      </div>

      <div class="mobile-sheet-body" style="padding: 14px 16px; max-height: calc(85vh - 70px); overflow-y: auto;">
        <!-- Filter Tabs & Tandai Dibaca -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 8px; flex-wrap: wrap;">
          <div class="mobile-segment-toggle" style="margin-bottom: 0; width: 170px;">
            <button type="button" class="mobile-seg-btn ${filterTab === 'all' ? 'active' : ''}" onclick="window.openMobileNotificationSheet('all')">
              Semua (${getNotificationsForActiveActor().length})
            </button>
            <button type="button" class="mobile-seg-btn ${filterTab === 'unread' ? 'active' : ''}" onclick="window.openMobileNotificationSheet('unread')">
              Belum (${unreadTotal})
            </button>
          </div>

          ${unreadTotal > 0 ? `
            <button type="button" class="mobile-btn-secondary" style="width: auto; min-height: 38px; padding: 6px 12px; font-size: 0.725rem; font-weight: 700; border-radius: 8px; border-color: #cbd5e1; color: #334155; margin: 0;" onclick="window.markAllNotificationsAsRead(); window.openMobileNotificationSheet('${filterTab}')">
              ✓ Tandai semua dibaca
            </button>
          ` : ''}
        </div>

        <!-- Daftar Notifikasi -->
        <div style="display: flex; flex-direction: column;">
          ${itemsHtml}
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    sheet.classList.add('open');
  };

  // 9. TAMPILAN WEB/PC: DROPDOWN PANEL NOTIFIKASI
  window.toggleDesktopNotifDropdown = function () {
    const dropdown = document.getElementById('desktopNotifDropdown');
    if (!dropdown) return;
    const isShowing = dropdown.style.display === 'block';
    if (isShowing) {
      dropdown.style.display = 'none';
    } else {
      renderDesktopNotifDropdownContent();
      dropdown.style.display = 'block';
    }
  };

  function closeDesktopNotifDropdown() {
    const dropdown = document.getElementById('desktopNotifDropdown');
    if (dropdown) dropdown.style.display = 'none';
  }

  function renderDesktopNotifDropdownContent() {
    const container = document.getElementById('desktopNotifDropdownList');
    const badgeText = document.getElementById('desktopNotifUnreadText');
    if (!container) return;

    const notifs = getNotificationsForActiveActor().filter(n => !n.isRead).slice(0, 10);
    const unreadCount = getUnreadCountForActiveActor();

    if (badgeText) {
      badgeText.textContent = unreadCount > 0 ? `${unreadCount} baru` : 'Semua dibaca';
    }

    if (notifs.length === 0) {
      container.innerHTML = `
        <div style="padding: 30px 16px; text-align: center; color: #64748b;">
          <div style="font-size: 1.5rem; margin-bottom: 6px;">🔔</div>
          <div style="font-weight: 700; color: var(--text-primary, #0f172a); font-size: 0.85rem;">Tidak ada notifikasi baru</div>
          <div style="font-size: 0.75rem; margin-top: 2px;">Semua notifikasi telah dibaca. Buka halaman notifikasi untuk melihat riwayat lengkap.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = notifs.map(n => {
      const isHigh = n.priority === 'high';
      const isUnread = !n.isRead;
      return `
        <div class="dropdown-notif-item ${isUnread ? 'unread' : ''}" style="padding: 10px 14px; border-bottom: 1px solid var(--border-color, #f1f5f9); display: flex; align-items: flex-start; gap: 10px; cursor: pointer; transition: background 0.15s ease;" onclick="window.openTicketFromNotification('${n.ticketId || ''}', '${n.id}')">
          <div class="dropdown-notif-icon-box ${isHigh ? 'priority-high' : (isUnread ? 'unread' : 'read')} ${getNotifIconTypeClass(n.type, n.priority)}">
            ${getNotifIconSvg(n.type, n.priority)}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span class="dropdown-notif-title" style="font-size: 0.8rem; font-weight: 800; color: var(--text-primary, #0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.title}</span>
              ${isUnread ? '<span class="notif-unread-dot" style="width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;"></span>' : ''}
            </div>
            <div class="dropdown-notif-msg" style="font-size: 0.725rem; color: var(--text-secondary, #334155); line-height: 1.35; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${n.message}
            </div>
            <div class="dropdown-notif-meta" style="font-size: 0.65rem; color: var(--text-muted, #64748b); font-weight: 600;">
              ${n.ticketId ? `<span class="notif-ticket-pill">${n.ticketId}</span> • ` : ''}${formatRelativeTime(n.createdAt)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 10. TAMPILAN WEB/PC: HALAMAN PENUH NOTIFIKASI
  function renderDesktopFullNotifikasiPage(filterTab = 'all') {
    const container = document.getElementById('viewNotifikasi');
    if (!container) return;

    const allNotifsList = getNotificationsForActiveActor();
    let notifs = allNotifsList;
    if (filterTab === 'unread') {
      notifs = notifs.filter(n => !n.isRead);
    }
    const unreadCount = getUnreadCountForActiveActor();

    container.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto; padding: 24px 16px;">
        <!-- Header Page -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; border-bottom: 1.5px solid var(--border-color, #e2e8f0); padding-bottom: 16px;">
          <div>

            <div style="margin-bottom: 8px;">
              <button type="button" class="btn-figma-secondary" onclick="window.closeDesktopFullNotifikasi()" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; font-size: 0.775rem; font-weight: 700; border-radius: 8px; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: #ffffff; color: var(--text-primary, #0f172a);" title="Kembali ke tampilan sebelumnya">
                ← Kembali
              </button>
            </div>
            <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary, #0f172a); margin: 2px 0 0 0;">Semua Notifikasi</h1>
          </div>
          <div style="display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div class="mobile-segment-toggle" style="margin: 0; width: 210px; height: 38px; padding: 3px; display: inline-flex; align-items: center; box-sizing: border-box; border-radius: 10px;">
              <button type="button" class="mobile-seg-btn ${filterTab === 'all' ? 'active' : ''}" style="height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 8px; font-size: 0.785rem; border-radius: 7px;" onclick="window.renderDesktopFullNotifikasiPage('all')">Semua (${allNotifsList.length})</button>
              <button type="button" class="mobile-seg-btn ${filterTab === 'unread' ? 'active' : ''}" style="height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 8px; font-size: 0.785rem; border-radius: 7px;" onclick="window.renderDesktopFullNotifikasiPage('unread')">Belum (${unreadCount})</button>
            </div>
            ${unreadCount > 0 ? `
              <button type="button" class="btn-card-detail btn-figma-secondary" style="font-weight: 700; height: 38px; padding: 0 14px; font-size: 0.785rem; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;" onclick="window.markAllNotificationsAsRead(); window.renderDesktopFullNotifikasiPage('${filterTab}')">
                ✓ Tandai semua dibaca
              </button>
            ` : ''}
            <button type="button" class="btn-clear-history btn-danger-solid" style="height: 38px; cursor: ${allNotifsList.length > 0 ? 'pointer' : 'not-allowed'}; opacity: ${allNotifsList.length > 0 ? '1' : '0.4'};" ${allNotifsList.length > 0 ? `onclick="window.confirmClearAllNotifications('${filterTab}')"` : 'disabled'} title="Hapus Semua Notifikasi">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              <span>Hapus Semua</span>
            </button>
          </div>
        </div>

        <!-- Daftar Notifikasi -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${notifs.length > 0 ? notifs.map(n => {
            const isHigh = n.priority === 'high';
            const isUnread = !n.isRead;
            return `
              <div class="card notif-card-full ${isUnread ? 'unread' : ''}" style="position: relative; padding: 16px; border-radius: 12px; display: flex; align-items: flex-start; gap: 14px; cursor: pointer; transition: all 0.15s ease;" onclick="window.openTicketFromNotification('${n.ticketId || ''}', '${n.id}')">
                <div class="notif-icon-box ${getNotifIconTypeClass(n.type, n.priority)}" style="width: 42px; height: 42px;">
                  ${getNotifIconSvg(n.type, n.priority)}
                </div>
                <div style="flex: 1; padding-right: 40px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary, #0f172a);">
                      ${n.title}
                      ${isHigh ? '<span style="background: #dc2626; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">DARURAT</span>' : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">${formatRelativeTime(n.createdAt)}</span>
                      ${isUnread ? '<span class="notif-unread-dot" style="width: 9px; height: 9px; border-radius: 50%;"></span>' : ''}
                    </div>
                  </div>
                  <div style="font-size: 0.825rem; color: var(--text-secondary, #334155); line-height: 1.5; margin-bottom: 6px;">
                    ${n.message}
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px; font-size: 0.725rem;">
                    ${n.ticketId ? `<span class="notif-ticket-pill">${n.ticketId}</span>` : ''}
                    <span class="notif-link-hint">Klik untuk membuka detail izin →</span>
                  </div>
                </div>
                <button type="button" class="btn-delete-notif-item" aria-label="Hapus Notifikasi" style="position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; padding: 0;" onclick="event.stopPropagation(); window.deleteDesktopNotification('${n.id}', '${filterTab}')" title="Hapus notifikasi ini">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            `;
          }).join('') : `
            <div class="card" style="padding: 40px; text-align: center; border-radius: 12px;">
              <div style="font-size: 2rem; margin-bottom: 8px; color: #94a3b8;">🔔</div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary, #0f172a);">Belum Ada Notifikasi</div>
              <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Pemberitahuan terkait aktivitas pengajuan izin akan ditampilkan di sini.</div>
            </div>
          `}
        </div>
      </div>
    `;
  };

  // Close desktop dropdown on outside click or Esc
  document.addEventListener('click', function (e) {
    const container = document.getElementById('desktopNotifContainer');
    if (container && !container.contains(e.target)) {
      closeDesktopNotifDropdown();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDesktopNotifDropdown();
    }
  });

  // Polling ringan setiap 20 detik (Hanya saat tab aktif / visible)
  let notifPollInterval = null;
  function startNotifPolling() {
    if (notifPollInterval) clearInterval(notifPollInterval);
    notifPollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        notificationsList = loadStoredNotifications();
        updateNotificationBadges();
      }
    }, 20000);
  }

  window.stopNotifPolling = function () {
    if (notifPollInterval) clearInterval(notifPollInterval);
    notifPollInterval = null;
  };

  function showDesktopFullNotifikasi() {
    ['viewKaryawan', 'viewApprover', 'viewSecurity', 'viewAdmin'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const notifView = document.getElementById('viewNotifikasi');
    if (notifView) {
      notifView.style.display = 'block';
      renderDesktopFullNotifikasiPage('all');
    }
    const breadcrumbSub = document.getElementById('breadcrumbSubpage');
    if (breadcrumbSub) breadcrumbSub.textContent = 'Semua Notifikasi';
  }

  function closeDesktopFullNotifikasi() {
    const notifView = document.getElementById('viewNotifikasi');
    if (notifView) notifView.style.display = 'none';

    const role = window.currentActor || 'karyawan';
    if (isEmployeeRole(role)) {
      const v = document.getElementById('viewKaryawan');
      if (v) v.style.display = 'block';
    } else if (isApproverRole(role)) {
      const v = document.getElementById('viewApprover');
      if (v) v.style.display = 'block';
    } else if (role === 'security') {
      const v = document.getElementById('viewSecurity');
      if (v) v.style.display = 'block';
    } else if (role === 'admin') {
      const v = document.getElementById('viewAdmin');
      if (v) v.style.display = 'block';
      const currentNav = window.currentAdminNav || 'dashboard';
      if (typeof window.setAdminNav === 'function') {
        window.setAdminNav(currentNav);
        return;
      }
    }

    const breadcrumbSub = document.getElementById('breadcrumbSubpage');
    if (breadcrumbSub) breadcrumbSub.textContent = 'Dashboard';
  }
// Handle ESC key to close full desktop notif page
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const notifView = document.getElementById('viewNotifikasi');
      if (notifView && notifView.style.display === 'block') {
        closeDesktopFullNotifikasi();
      }
    }
  });

  // Expose global APIs
  window.showDesktopFullNotifikasi = showDesktopFullNotifikasi;
  window.closeDesktopFullNotifikasi = closeDesktopFullNotifikasi;
  window.renderDesktopFullNotifikasiPage = renderDesktopFullNotifikasiPage;
  window.createNotification = createNotification;
  window.getNotificationsForActiveActor = getNotificationsForActiveActor;
  window.getUnreadCountForActiveActor = getUnreadCountForActiveActor;
  window.markNotificationAsRead = markNotificationAsRead;
  window.markAllNotificationsAsRead = markAllNotificationsAsRead;
  window.updateNotificationBadges = updateNotificationBadges;
  window.openTicketFromNotification = openTicketFromNotification;
  window.closeDesktopNotifDropdown = closeDesktopNotifDropdown;

  function resetAllNotifications() {
    notificationsList = [];
    try {
      localStorage.removeItem(NOTIF_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset stored notifications:', e);
    }
    updateNotificationBadges();
  }
  window.resetAllNotifications = resetAllNotifications;

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateNotificationBadges();
      startNotifPolling();
    });
  } else {
    updateNotificationBadges();
    startNotifPolling();
  }

})();

  window.deleteMobileNotification = function(notifId, currentTab = 'all') {
    if (typeof window.deleteNotification === 'function') {
      window.deleteNotification(notifId);
    }
    if (typeof window.showToast === 'function') {
      window.showToast('Notifikasi berhasil dihapus.', 'info');
    }
    if (typeof window.openMobileNotificationSheet === 'function') {
      window.openMobileNotificationSheet(currentTab);
    }
  };

  window.deleteDesktopNotification = function(notifId, currentTab = 'all') {
    if (typeof window.deleteNotification === 'function') {
      window.deleteNotification(notifId);
    }
    if (typeof window.showToast === 'function') {
      window.showToast('Notifikasi berhasil dihapus.', 'info');
    }
    if (typeof window.renderDesktopFullNotifikasiPage === 'function') {
      window.renderDesktopFullNotifikasiPage(currentTab);
    }
  };

  // Konfirmasi Hapus Satu Notifikasi (Mobile Bottom Sheet)
  window.confirmDeleteMobileNotification = function(notifId, currentTab = 'all') {
    const sheet = document.getElementById('mobileActionSheet');
    if (!sheet) {
      if (confirm('Hapus notifikasi ini?')) {
        window.deleteMobileNotification(notifId, currentTab);
      }
      return;
    }

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <h3 class="mobile-sheet-title" style="font-size: 1rem; margin: 0; color: #0f172a;">Konfirmasi Hapus</h3>
        <button type="button" aria-label="Tutup" class="mobile-sheet-close" style="width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1rem; color: #64748b; cursor: pointer;" onclick="window.openMobileNotificationSheet('${currentTab}')">✕</button>
      </div>
      <div class="mobile-sheet-body" style="padding: 24px 16px; text-align: center;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </div>
        <div style="font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Hapus Notifikasi?</div>
        <div style="font-size: 0.775rem; color: #64748b; margin-bottom: 20px; line-height: 1.45;">
          Apakah Anda yakin ingin menghapus notifikasi ini? Tindakan ini tidak dapat dibatalkan.
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="button" class="mobile-btn-secondary" style="flex: 1; min-height: 44px; font-weight: 700; border-radius: 10px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #334155; font-size: 0.85rem;" onclick="window.openMobileNotificationSheet('${currentTab}')">
            Batal
          </button>
          <button type="button" class="mobile-btn-danger" style="flex: 1; min-height: 44px; font-weight: 700; border-radius: 10px; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; font-size: 0.85rem; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);" onclick="window.deleteMobileNotification('${notifId}', '${currentTab}')">
            Hapus
          </button>
        </div>
      </div>
    `;
  };

  // Konfirmasi Hapus Semua Notifikasi (Mobile Bottom Sheet)
  window.confirmClearAllMobileNotifications = function(currentTab = 'all') {
    const total = typeof window.getNotificationsForActiveActor === 'function' ? window.getNotificationsForActiveActor().length : 0;
    if (total === 0) return;
    const sheet = document.getElementById('mobileActionSheet');
    if (!sheet) {
      if (confirm('Hapus semua notifikasi?')) {
        if (typeof window.clearAllNotificationsForActiveActor === 'function') window.clearAllNotificationsForActiveActor();
      }
      return;
    }

    sheet.innerHTML = `
      <div class="mobile-sheet-handle-bar"></div>
      <div class="mobile-sheet-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <h3 class="mobile-sheet-title" style="font-size: 1rem; margin: 0; color: #0f172a;">Konfirmasi Hapus Semua</h3>
        <button type="button" aria-label="Tutup" class="mobile-sheet-close" style="width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 50%; font-size: 1rem; color: #64748b; cursor: pointer;" onclick="window.openMobileNotificationSheet('${currentTab}')">✕</button>
      </div>
      <div class="mobile-sheet-body" style="padding: 24px 16px; text-align: center;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </div>
        <div style="font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Hapus Semua Notifikasi?</div>
        <div style="font-size: 0.775rem; color: #64748b; margin-bottom: 20px; line-height: 1.45;">
          Seluruh riwayat notifikasi (${total} pesan) akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="button" class="mobile-btn-secondary" style="flex: 1; min-height: 44px; font-weight: 700; border-radius: 10px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #334155; font-size: 0.85rem;" onclick="window.openMobileNotificationSheet('${currentTab}')">
            Batal
          </button>
          <button type="button" class="mobile-btn-danger" style="flex: 1; min-height: 44px; font-weight: 700; border-radius: 10px; background: #dc2626; border: 1.5px solid #dc2626; color: #ffffff; font-size: 0.85rem; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);" onclick="window.executeClearAllMobileNotifications('${currentTab}')">
            Hapus Semua
          </button>
        </div>
      </div>
    `;
  };

  window.executeClearAllMobileNotifications = function(currentTab = 'all') {
    if (typeof window.clearAllNotificationsForActiveActor === 'function') {
      window.clearAllNotificationsForActiveActor();
    }
    if (typeof window.showToast === 'function') {
      window.showToast('Seluruh riwayat notifikasi berhasil dibersihkan.', 'success');
    }
    if (typeof window.openMobileNotificationSheet === 'function') {
      window.openMobileNotificationSheet(currentTab);
    }
  };

  window.confirmClearAllNotifications = window.confirmClearAllMobileNotifications;
  window.clearAllMobileNotifications = window.confirmClearAllMobileNotifications;
