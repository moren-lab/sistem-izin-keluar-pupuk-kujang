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

  // Helper Pengguna Aktif
  function getActiveUserInfo() {
    const actorKey = (typeof window.getCurrentRole === 'function' ? window.getCurrentRole() : window.currentActor) || 'karyawan';
    const actors = window.ACTORS || {};
    const actor = actors[actorKey] || {};
    return {
      roleKey: actorKey,
      nip: actor.nip || (actorKey === 'karyawan' ? 'PK-2024-8841' : (actorKey === 'approver' ? 'PK-2015-1002' : 'PK-2018-4421')),
      name: actor.name || 'Pengguna'
    };
  }

  // 2. Core API: Create Notification (with Idempotency Check)
  function createNotification(payload) {
    if (!payload || !payload.title || !payload.message) return null;

    // Idempotency: Jika eventId sudah pernah dicatat, jangan duplikat
    if (payload.eventId) {
      const exists = notificationsList.some(n => n.eventId === payload.eventId);
      if (exists) return null;
    }

    const newNotif = {
      id: 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      recipientRole: payload.recipientRole || 'karyawan', // 'karyawan' | 'approver' | 'security'
      recipientNip: payload.recipientNip || null,
      recipientName: payload.recipientName || null,
      actorSource: payload.actorSource || 'system',
      type: payload.type || 'info', // 'disetujui' | 'ditolak' | 'kedaluwarsa' | 'selesai' | dll
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

  // 3. Filter Notifikasi Khusus Aktor Saat Ini (Mencegah Kebocoran Antar Pengguna)
  function getNotificationsForActiveActor() {
    const user = getActiveUserInfo();
    const list = notificationsList || [];

    return list.filter(n => {
      if (user.roleKey === 'karyawan') {
        return n.recipientRole === 'karyawan' && (!n.recipientNip || n.recipientNip === user.nip);
      }
      if (user.roleKey === 'approver' || user.roleKey === 'approver2') {
        return n.recipientRole === 'approver' && (!n.recipientNip || n.recipientNip === user.nip || (n.recipientName && n.recipientName.includes(user.name)));
      }
      if (user.roleKey === 'security') {
        return n.recipientRole === 'security';
      }
      return false;
    });
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
    notificationsList = notificationsList.filter(n => {
      let isForUser = false;
      if (user.roleKey === 'karyawan') {
        isForUser = n.recipientRole === 'karyawan' && (!n.recipientNip || n.recipientNip === user.nip);
      } else if (user.roleKey === 'approver' || user.roleKey === 'approver2') {
        isForUser = n.recipientRole === 'approver' && (!n.recipientNip || n.recipientNip === user.nip || (n.recipientName && n.recipientName.includes(user.name)));
      } else if (user.roleKey === 'security') {
        isForUser = n.recipientRole === 'security';
      }
      return !isForUser;
    });
    saveStoredNotifications(notificationsList);
    updateNotificationBadges();
  }

  window.deleteNotification = deleteNotification;
  window.clearAllNotificationsForActiveActor = clearAllNotificationsForActiveActor;

  function markAllNotificationsAsRead() {
    const user = getActiveUserInfo();
    let updatedCount = 0;

    notificationsList.forEach(n => {
      let isForUser = false;
      if (user.roleKey === 'karyawan') {
        isForUser = n.recipientRole === 'karyawan' && (!n.recipientNip || n.recipientNip === user.nip);
      } else if (user.roleKey === 'approver' || user.roleKey === 'approver2') {
        isForUser = n.recipientRole === 'approver' && (!n.recipientNip || n.recipientNip === user.nip || (n.recipientName && n.recipientName.includes(user.name)));
      } else if (user.roleKey === 'security') {
        isForUser = n.recipientRole === 'security';
      }

      if (isForUser && !n.isRead) {
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
    window._openedFromNotificationTab = fromTab;

    // Tutup dropdown notifikasi desktop jika terbuka
    closeDesktopNotifDropdown();
    if (typeof window.mobileCloseSheet === 'function') {
      window.mobileCloseSheet();
    }

    // Tutup halaman penuh notifikasi desktop jika sedang aktif
    const notifView = document.getElementById('viewNotifikasi');
    if (notifView && notifView.style.display === 'block') {
      if (typeof window.closeDesktopFullNotifikasi === 'function') {
        window.closeDesktopFullNotifikasi();
      } else {
        notifView.style.display = 'none';
      }
    }

    if (!ticketId) return;

    const user = getActiveUserInfo();
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      if (user.roleKey === 'karyawan') {
        if (typeof window.mobileOpenTicketDetail === 'function') {
          window.mobileOpenTicketDetail(ticketId);
        }
      } else if (user.roleKey === 'approver' || user.roleKey === 'approver2') {
        if (typeof window.mobileOpenAtasanDetailModal === 'function') {
          window.mobileOpenAtasanDetailModal(ticketId);
        } else if (typeof window.openTicketDetail === 'function') {
          window.openTicketDetail(ticketId);
        }
      } else if (user.roleKey === 'security') {
        if (typeof window.mobileSecurityInspectTicket === 'function') {
          window.mobileSecurityInspectTicket(ticketId);
        } else if (typeof window.openTicketDetail === 'function') {
          window.openTicketDetail(ticketId);
        }
      } else {
        if (typeof window.openTicketDetail === 'function') {
          window.openTicketDetail(ticketId);
        }
      }
    } else {
      // Desktop: semua peran langsung membuka modal detail pengajuan
      if (typeof window.openTicketDetail === 'function') {
        window.openTicketDetail(ticketId);
      }
    }
  }

  // 7. Icon Helper untuk Jenis Notifikasi
  function getNotifIconSvg(type, priority) {
    if (priority === 'high' || type === 'darurat_baru' || type === 'bawahan_terlambat') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }
    if (type === 'disetujui' || type === 'perpanjangan_disetujui' || type === 'darurat_qr_aktif') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    }
    if (type === 'ditolak' || type === 'perpanjangan_ditolak') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }
    if (type === 'kedaluwarsa' || type === 'selesai') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
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
          <div style="width: 36px; height: 36px; border-radius: 10px; background: ${isHigh ? '#fee2e2' : (isUnread ? '#dcfce7' : '#f1f5f9')}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
            ${getNotifIconSvg(n.type, n.priority)}
          </div>
          <div style="flex: 1; min-width: 0; padding-right: 36px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin-bottom: 2px;">
              <div style="font-size: 0.825rem; font-weight: 800; color: #0f172a; line-height: 1.3;">
                ${n.title}
                ${isHigh ? '<span style="background: #dc2626; color: #fff; font-size: 0.6rem; font-weight: 800; padding: 1px 5px; border-radius: 4px; margin-left: 4px; vertical-align: middle;">DARURAT</span>' : ''}
              </div>
              ${isUnread ? '<span style="width: 8px; height: 8px; border-radius: 50%; background: #059669; flex-shrink: 0; margin-top: 4px;"></span>' : ''}
            </div>
            <div style="font-size: 0.75rem; color: #334155; line-height: 1.4; margin-bottom: 4px;">
              ${n.message}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.675rem; color: #64748b; font-weight: 600;">
              <span>${n.ticketId ? `<strong style="font-family: monospace; color: #0f172a;">${n.ticketId}</strong> • ` : ''}${formatRelativeTime(n.createdAt)}</span>
              <span style="color: #059669; font-weight: 700;">Lihat →</span>
            </div>
          </div>
          <button type="button" aria-label="Hapus Notifikasi" style="position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 0; border-radius: 8px;" onclick="event.stopPropagation(); window.deleteMobileNotification('${n.id}', '${filterTab}')" title="Hapus notifikasi ini">
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
          <button type="button" aria-label="Hapus Semua Notifikasi" class="btn-clear-all-notifs" style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; background: #dc2626; color: #ffffff; border: none; border-radius: 8px; cursor: ${allNotifsCount > 0 ? 'pointer' : 'not-allowed'}; opacity: ${allNotifsCount > 0 ? '1' : '0.4'}; padding: 0;" ${allNotifsCount > 0 ? `onclick="window.confirmClearAllNotifications('${filterTab}')"` : 'disabled'} title="Hapus Semua Notifikasi">
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

    const notifs = getNotificationsForActiveActor().slice(0, 10);
    const unreadCount = getUnreadCountForActiveActor();

    if (badgeText) {
      badgeText.textContent = unreadCount > 0 ? `${unreadCount} baru` : 'Semua dibaca';
    }

    if (notifs.length === 0) {
      container.innerHTML = `
        <div style="padding: 30px 16px; text-align: center; color: #64748b;">
          <div style="font-size: 1.5rem; margin-bottom: 6px;">🔔</div>
          <div style="font-weight: 700; color: #0f172a; font-size: 0.85rem;">Belum ada notifikasi</div>
          <div style="font-size: 0.75rem; margin-top: 2px;">Pemberitahuan aktivitas perizinan akan muncul di sini.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = notifs.map(n => {
      const isHigh = n.priority === 'high';
      const isUnread = !n.isRead;
      return `
        <div class="dropdown-notif-item ${isUnread ? 'unread' : ''}" style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; gap: 10px; cursor: pointer; background: ${isUnread ? '#f0fdf4' : '#ffffff'}; transition: background 0.15s ease;" onclick="window.openTicketFromNotification('${n.ticketId || ''}', '${n.id}')">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: ${isHigh ? '#fee2e2' : (isUnread ? '#dcfce7' : '#f1f5f9')}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
            ${getNotifIconSvg(n.type, n.priority)}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="font-size: 0.8rem; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.title}</span>
              ${isUnread ? '<span style="width: 7px; height: 7px; border-radius: 50%; background: #059669; flex-shrink: 0;"></span>' : ''}
            </div>
            <div style="font-size: 0.725rem; color: #334155; line-height: 1.35; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${n.message}
            </div>
            <div style="font-size: 0.65rem; color: #64748b; font-weight: 600;">
              ${n.ticketId ? `<span style="font-family: monospace; font-weight: 700; color: #0f172a;">${n.ticketId}</span> • ` : ''}${formatRelativeTime(n.createdAt)}
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
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 16px;">
          <div>
            <div style="font-size: 0.75rem; color: #059669; font-weight: 800; text-transform: uppercase;">Pusat Pemberitahuan</div>
            <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 2px 0 0 0;">Semua Notifikasi</h1>
          </div>
          <div style="display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div class="mobile-segment-toggle" style="margin: 0; width: 210px; height: 38px; padding: 3px; display: inline-flex; align-items: center; box-sizing: border-box; border-radius: 10px;">
              <button type="button" class="mobile-seg-btn ${filterTab === 'all' ? 'active' : ''}" style="height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 8px; font-size: 0.785rem; border-radius: 7px;" onclick="window.renderDesktopFullNotifikasiPage('all')">Semua (${allNotifsList.length})</button>
              <button type="button" class="mobile-seg-btn ${filterTab === 'unread' ? 'active' : ''}" style="height: 100%; display: flex; align-items: center; justify-content: center; padding: 0 8px; font-size: 0.785rem; border-radius: 7px;" onclick="window.renderDesktopFullNotifikasiPage('unread')">Belum (${unreadCount})</button>
            </div>
            ${unreadCount > 0 ? `
              <button type="button" class="btn-card-detail" style="border: 1.5px solid #cbd5e1; background: #fff; color: #334155; font-weight: 700; height: 38px; padding: 0 14px; font-size: 0.785rem; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;" onclick="window.markAllNotificationsAsRead(); window.renderDesktopFullNotifikasiPage('${filterTab}')">
                ✓ Tandai semua dibaca
              </button>
            ` : ''}
            <button type="button" class="btn-clear-all-notifs" style="background: #dc2626; color: #ffffff; border: 1.5px solid #dc2626; font-weight: 700; height: 38px; padding: 0 14px; font-size: 0.785rem; border-radius: 10px; cursor: ${allNotifsList.length > 0 ? 'pointer' : 'not-allowed'}; opacity: ${allNotifsList.length > 0 ? '1' : '0.4'}; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; vertical-align: middle;" ${allNotifsList.length > 0 ? `onclick="window.confirmClearAllNotifications('${filterTab}')"` : 'disabled'} title="Hapus Semua Notifikasi">
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
              <div class="card" style="position: relative; padding: 16px; border-radius: 12px; background: ${isUnread ? '#f0fdf4' : '#ffffff'}; border: 1.5px solid ${isHigh ? '#fca5a5' : (isUnread ? '#a7f3d0' : '#e2e8f0')}; display: flex; align-items: flex-start; gap: 14px; cursor: pointer; transition: all 0.15s ease;" onclick="window.openTicketFromNotification('${n.ticketId || ''}', '${n.id}')">
                <div style="width: 42px; height: 42px; border-radius: 10px; background: ${isHigh ? '#fee2e2' : (isUnread ? '#dcfce7' : '#f1f5f9')}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                  ${getNotifIconSvg(n.type, n.priority)}
                </div>
                <div style="flex: 1; padding-right: 40px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">
                      ${n.title}
                      ${isHigh ? '<span style="background: #dc2626; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">DARURAT</span>' : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">${formatRelativeTime(n.createdAt)}</span>
                      ${isUnread ? '<span style="width: 9px; height: 9px; border-radius: 50%; background: #059669;"></span>' : ''}
                    </div>
                  </div>
                  <div style="font-size: 0.825rem; color: #334155; line-height: 1.5; margin-bottom: 6px;">
                    ${n.message}
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px; font-size: 0.725rem;">
                    ${n.ticketId ? `<span style="font-family: monospace; font-weight: 800; color: #0f172a; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${n.ticketId}</span>` : ''}
                    <span style="color: #059669; font-weight: 700;">Klik untuk membuka detail izin →</span>
                  </div>
                </div>
                <button type="button" aria-label="Hapus Notifikasi" style="position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; color: #dc2626; cursor: pointer; padding: 0;" onclick="event.stopPropagation(); window.deleteDesktopNotification('${n.id}', '${filterTab}')" title="Hapus notifikasi ini">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            `;
          }).join('') : `
            <div class="card" style="padding: 40px; text-align: center; border-radius: 12px;">
              <div style="font-size: 2rem; margin-bottom: 8px; color: #94a3b8;">🔔</div>
              <div style="font-weight: 800; font-size: 1rem; color: #0f172a;">Belum Ada Notifikasi</div>
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
    if (role === 'karyawan') {
      const v = document.getElementById('viewKaryawan');
      if (v) v.style.display = 'block';
    } else if (role === 'approver' || role === 'approver2') {
      const v = document.getElementById('viewApprover');
      if (v) v.style.display = 'block';
    } else if (role === 'security') {
      const v = document.getElementById('viewSecurity');
      if (v) v.style.display = 'block';
    } else if (role === 'admin') {
      const v = document.getElementById('viewAdmin');
      if (v) v.style.display = 'block';
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

  window.confirmClearAllNotifications = function(currentTab = 'all') {
    const total = typeof window.getNotificationsForActiveActor === 'function' ? window.getNotificationsForActiveActor().length : 0;
    const unread = typeof window.getUnreadCountForActiveActor === 'function' ? window.getUnreadCountForActiveActor() : 0;
    if (total === 0) return;

    const msg = `Konfirmasi Hapus Semua Notifikasi\n\nTotal notifikasi: ${total}\nBelum dibaca: ${unread}\n\nApakah Anda yakin ingin menghapus semua riwayat notifikasi ini? Tindakan ini tidak dapat dibatalkan.`;
    if (!confirm(msg)) return;

    if (typeof window.clearAllNotificationsForActiveActor === 'function') {
      window.clearAllNotificationsForActiveActor();
    }
    if (typeof window.showToast === 'function') {
      window.showToast('Seluruh riwayat notifikasi berhasil dibersihkan.', 'success');
    }

    const notifView = document.getElementById('viewNotifikasi');
    if (notifView && notifView.style.display === 'block') {
      if (typeof window.renderDesktopFullNotifikasiPage === 'function') {
        window.renderDesktopFullNotifikasiPage(currentTab);
      }
    } else {
      if (typeof window.openMobileNotificationSheet === 'function') {
        window.openMobileNotificationSheet(currentTab);
      }
    }
  };

  window.clearAllMobileNotifications = window.confirmClearAllNotifications;
