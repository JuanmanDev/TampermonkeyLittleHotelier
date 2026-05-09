// ==UserScript==
// @name         LH Front Desk - Ensure Reservation Save
// @namespace    Hotelier Tools
// @version      0.2.0
// @description  Prevents closing the reservation edit modal if there are unsaved changes. Includes inactivity reminders with activity-based auto-dismiss.
// @author       JuanmanDev
// @match        https://application.littlehotelier.com/properties/*/calendar/*
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations/*/edit*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @run-at       document-idle


// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/modalEnsureSave.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/modalEnsureSave.user.js

// ==/UserScript==

(function () {
    'use strict';

    const currentHost = window.location.hostname;
    const isIframe = window.self !== window.top;

    const getReservationUuidFromUrl = (url = window.location.href) => {
        const match = url.match(/\/reservations\/([0-9a-f-]+)\//i);
        return match ? match[1] : null;
    };

    // ========================================================================
    // LOGIC: EDIT PAGE (Inside Iframe or Full Page)
    // ========================================================================
    if (currentHost.includes('app.littlehotelier.com')) {
        console.log('📝 LH Ensure Save: Edit page logic active');

        const uuid = getReservationUuidFromUrl();
        if (!uuid) return;

        let lastState = null;
        let forceAllowClose = false;
        let dirtyStartTime = null;
        let lastNotifiedMinute = 0;

        const TOAST_STYLE = `
            .lh-toast {
                position: fixed;
                top: 120px;
                left: 50%;
                transform: translateX(-50%);
                background: #FF6842;
                color: white;
                padding: 20px 40px;
                border-radius: 60px;
                z-index: 100000;
                box-shadow: 0 15px 45px rgba(0,0,0,0.4);
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 15px;
                border: 3px solid white;
                animation: lh-toast-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                font-family: sans-serif;
                font-size: 22px;
                white-space: nowrap;
                user-select: none;
            }
            @keyframes lh-toast-in {
                from { top: -120px; opacity: 0; }
                to { top: 20px; opacity: 1; }
            }
            .lh-toast-out {
                animation: lh-toast-out 0.5s ease-in forwards;
            }
            @keyframes lh-toast-out {
                to { top: -120px; opacity: 0; }
            }
            .lh-toast-close {
                cursor: pointer;
                font-size: 28px;
                line-height: 1;
                margin-left: 15px;
                opacity: 0.8;
                transition: opacity 0.2s, transform 0.1s;
            }
            .lh-toast-close:hover { opacity: 1; transform: scale(1.1); }
            .lh-toast-close:active { transform: scale(0.9); }
        `;

        const injectToastStyles = () => {
            if (document.getElementById('lh-toast-styles')) return;
            const style = document.createElement('style');
            style.id = 'lh-toast-styles';
            style.textContent = TOAST_STYLE;
            document.head.appendChild(style);
        };

        const showReminderToast = (minutes) => {
            injectToastStyles();

            // Remove existing toast if any
            const existing = document.querySelector('.lh-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = 'lh-toast';
            toast.innerHTML = `
                <span style="font-size: 30px;">⚠️</span>
                <span>¡Atención! Lleva ${minutes} minutos con cambios sin guardar.</span>
                <span class="lh-toast-close" title="Cerrar notification">×</span>
            `;
            document.body.appendChild(toast);

            // Play notification sound (Repeats 3 times)
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                let count = 0;
                audio.volume = 0.5;
                audio.play();
                audio.addEventListener('ended', () => {
                    if (count < 2) {
                        count++;
                        audio.play();
                    }
                });
            } catch (e) {
                console.warn('Could not play notification sound', e);
            }

            let removeTimeout = null;
            const scheduleRemoval = () => {
                if (removeTimeout) return;
                console.log('📝 LH Ensure Save: Activity detected, scheduling toast removal in 20s');
                removeTimeout = setTimeout(() => {
                    if (toast.parentNode) {
                        toast.classList.add('lh-toast-out');
                        setTimeout(() => toast.remove(), 500);
                    }
                }, 20000);
            };

            const onActivity = () => {
                scheduleRemoval();
                window.removeEventListener('mousemove', onActivity);
                window.removeEventListener('keydown', onActivity);
            };

            // Wait for activity to start the countdown
            window.addEventListener('mousemove', onActivity);
            window.addEventListener('keydown', onActivity);

            toast.querySelector('.lh-toast-close').onclick = () => {
                toast.classList.add('lh-toast-out');
                setTimeout(() => toast.remove(), 500);
                window.removeEventListener('mousemove', onActivity);
                window.removeEventListener('keydown', onActivity);
            };
        };

        const updateState = () => {
            const saveBtn = document.querySelector('button.btn-controls');
            const isDirty = !!saveBtn && saveBtn.offsetParent !== null && (saveBtn.textContent.includes('Guardar') || saveBtn.textContent.includes('Save'));
            const state = isDirty ? 'DIRTY' : 'CLEAN';

            if (state !== lastState) {
                lastState = state;
                GM_setValue(`lh_save_state_${uuid}`, { state, timestamp: Date.now() });
                console.log(`📝 LH Ensure Save: State changed to ${state}`);

                if (state === 'DIRTY') {
                    dirtyStartTime = Date.now();
                    lastNotifiedMinute = 0;
                } else {
                    dirtyStartTime = null;
                    const toast = document.querySelector('.lh-toast');
                    if (toast) toast.remove();
                }
            }

            if (state === 'DIRTY' && dirtyStartTime) {
                const elapsedMinutes = Math.floor((Date.now() - dirtyStartTime) / 60000);
                if (elapsedMinutes >= 15 && lastNotifiedMinute < 15) {
                    showReminderToast(15);
                    lastNotifiedMinute = 15;
                } else if (elapsedMinutes >= 10 && lastNotifiedMinute < 10) {
                    showReminderToast(10);
                    lastNotifiedMinute = 10;
                } else if (elapsedMinutes >= 5 && lastNotifiedMinute < 5) {
                    showReminderToast(5);
                    lastNotifiedMinute = 5;
                }
            }
        };

        new MutationObserver(updateState).observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
        setInterval(updateState, 1500);

        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('a.reservation-close, .reservation-modal-popup__header-close-button, .close-button');
            if (closeBtn) {
                updateState();
                if (lastState === 'DIRTY' && !forceAllowClose) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isIframe) {
                        GM_setValue(`lh_close_request_${uuid}`, { timestamp: Date.now() });
                    }
                }
            }
        }, true);

        window.addEventListener('beforeunload', (e) => {
            if (forceAllowClose) return;
            const saveBtn = document.querySelector('button.btn-controls');
            const isDirty = !!saveBtn && saveBtn.offsetParent !== null && (saveBtn.textContent.includes('Guardar') || saveBtn.textContent.includes('Save'));
            if (isDirty) {
                e.preventDefault();
                e.returnValue = 'Tiene cambios sin guardar.';
                return e.returnValue;
            }
        });

        GM_addValueChangeListener(`lh_save_command_${uuid}`, (key, oldVal, newVal) => {
            if (newVal && newVal.action === 'SAVE') {
                const saveBtn = document.querySelector('button.btn-controls');
                if (saveBtn && (saveBtn.textContent.includes('Guardar') || saveBtn.textContent.includes('Save'))) {
                    saveBtn.click();
                }
            } else if (newVal && newVal.action === 'FORCE_CLOSE') {
                forceAllowClose = true;
                window.onbeforeunload = null;
            }
        });

        if (isIframe) return;
    }

    // ========================================================================
    // LOGIC: CALENDAR PAGE (Parent)
    // ========================================================================
    if (currentHost.includes('application.littlehotelier.com')) {
        console.log('📅 LH Ensure Save: Calendar logic active');

        const STYLES = `
            .lh-iframe-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; }
            .lh-iframe-modal-container { width: 95%; height: 90%; background: white; border-radius: 8px; overflow: hidden; position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.3); display: flex; flex-direction: column; }
            .lh-iframe-modal-header { padding: 10px 20px; background: #FF6842; color: #F8EFE7; display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
            .lh-iframe-modal-close { cursor: pointer; font-size: 24px; line-height: 1; }
            .lh-iframe-modal-content { flex: 1; border: none; width: 100%; height: 100%; }
            
            .lh-confirm-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 20001; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
            .lh-confirm-box { background: #FEF8F3; color: #333333; padding: 40px; border-radius: 16px; max-width: 500px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid #FF6842; }
            .lh-confirm-box h2 { margin-top: 0; color: #FF6842; font-size: 24px; margin-bottom: 15px; }
            .lh-confirm-box p { font-size: 16px; margin-bottom: 30px; }
            .lh-confirm-options { display: flex; flex-direction: column; gap: 15px; }
            .lh-confirm-btn { padding: 14px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: transform 0.1s, opacity 0.2s; font-size: 15px; }
            .lh-confirm-btn:hover { opacity: 0.9; }
            .lh-confirm-btn:active { transform: scale(0.97); }
            .lh-confirm-btn-save { background: #FF6842; color: #F8EFE7; }
            .lh-confirm-btn-discard { background: #000000; color: #FFFFFF; }
            .lh-confirm-btn-back { background: #eeeeee; color: #333333; }

            @media (min-width: 1024px) {
                .lh-confirm-box { max-width: 700px; padding: 50px; }
                .lh-confirm-options { flex-direction: row; align-items: center; }
                .lh-confirm-btn-save { margin-left: auto; order: 3; }
                .lh-confirm-btn-discard { order: 1; }
                .lh-confirm-btn-back { order: 2; }
            }
        `;

        const style = document.createElement('style');
        style.textContent = STYLES;
        document.head.appendChild(style);

        let activeUuid = null;
        let isDirty = false;
        let currentListeners = [];
        let lastClickedUuid = null;
        let isBypassing = false;

        document.addEventListener('mousedown', (e) => {
            const res = e.target.closest('.reservation, [data-reservation-id], a[href*="/reservations/"]');
            if (res) {
                const uuid = getReservationUuidFromUrl(res.href || '') || res.dataset.reservationId;
                if (uuid) lastClickedUuid = uuid;
            }
        }, true);

        const setupStateListener = (uuid) => {
            currentListeners.forEach(id => GM_removeValueChangeListener(id));
            const l1 = GM_addValueChangeListener(`lh_save_state_${uuid}`, (k, o, n) => { if (n) isDirty = (n.state === 'DIRTY'); });
            const l2 = GM_addValueChangeListener(`lh_close_request_${uuid}`, (k, o, n) => { if (n) attemptClose(); });
            currentListeners = [l1, l2];
        };

        const closeModal = async () => {
            if (activeUuid) {
                GM_setValue(`lh_save_command_${activeUuid}`, { action: 'FORCE_CLOSE', timestamp: Date.now() });
                await new Promise(r => setTimeout(r, 150));
            }
            const overlay = document.querySelector('.lh-iframe-modal-overlay');
            if (overlay) overlay.remove();
            document.body.style.overflow = '';
            isBypassing = true;
            const nativeCloseBtn = document.querySelector('.reservation-modal-popup__header-close-button');
            if (nativeCloseBtn) nativeCloseBtn.click();
            else { const b = document.querySelector('.el-dialog__wrapper.reservation-modal-popup'); if (b) b.click(); }
            activeUuid = null;
            isDirty = false;
            setTimeout(() => { isBypassing = false; }, 300);
        };

        const attemptClose = () => {
            if (!activeUuid) {
                const f = document.querySelector('.reservation-modal-popup iframe, .lh-iframe-modal-content');
                if (f && f.src) activeUuid = getReservationUuidFromUrl(f.src);
                else if (lastClickedUuid) activeUuid = lastClickedUuid;
            }
            if (activeUuid) {
                const d = GM_getValue(`lh_save_state_${activeUuid}`);
                if (d) isDirty = (d.state === 'DIRTY');
            }
            if (isDirty) {
                const o = document.createElement('div');
                o.className = 'lh-confirm-overlay';
                o.innerHTML = `
                    <div class="lh-confirm-box">
                        <h2>¿Guardar cambios en la reserva?</h2>
                        <p>Se han detectado cambios pendientes. ¿Qué desea hacer?</p>
                        <div class="lh-confirm-options">
                            <button class="lh-confirm-btn lh-confirm-btn-discard">Cerrar sin guardar</button>
                            <button class="lh-confirm-btn lh-confirm-btn-back">Volver a revisar</button>
                            <button class="lh-confirm-btn lh-confirm-btn-save">Guardar cambios y cerrar</button>
                        </div>
                    </div>
                `;
                o.querySelector('.lh-confirm-btn-save').onclick = () => {
                    GM_setValue(`lh_save_command_${activeUuid}`, { action: 'SAVE', timestamp: Date.now() });
                    const b = o.querySelector('.lh-confirm-box');
                    b.innerHTML = `<h2>Guardando...</h2><p>Por favor espere...</p>`;
                    let c = 0;
                    const it = setInterval(() => {
                        const d = GM_getValue(`lh_save_state_${activeUuid}`);
                        if (d && d.state === 'CLEAN') { clearInterval(it); o.remove(); closeModal(); }
                        if (++c > 30) { clearInterval(it); b.innerHTML = `<h2>Error</h2><div class="lh-confirm-options"><button class="lh-confirm-btn lh-confirm-btn-discard">Cerrar igual</button></div>`; b.querySelector('.lh-confirm-btn-discard').onclick = () => { o.remove(); isDirty = false; closeModal(); }; }
                    }, 200);
                };
                o.querySelector('.lh-confirm-btn-discard').onclick = () => { o.remove(); isDirty = false; closeModal(); };
                o.querySelector('.lh-confirm-btn-back').onclick = () => o.remove();
                document.body.appendChild(o);
            } else {
                closeModal();
            }
        };

        window.addEventListener('click', (e) => {
            if (isBypassing) return;
            const c = e.target.closest('.reservation-modal-popup__header-close-button');
            const b = e.target.classList.contains('el-dialog__wrapper') && e.target.classList.contains('reservation-modal-popup');
            if (c || b) { e.preventDefault(); e.stopPropagation(); attemptClose(); }
        }, true);

        window.addEventListener('keydown', (e) => {
            if (isBypassing) return;
            if (e.key === 'Escape') {
                const m = document.querySelector('.reservation-modal-popup, .lh-iframe-modal-overlay');
                if (m && m.offsetParent !== null) { e.preventDefault(); e.stopPropagation(); attemptClose(); }
            }
        }, true);

        new MutationObserver(async () => {
            const h = document.querySelector('.reservation-modal-popup__header');
            if (!h || h.dataset.lhProcessed) return;
            h.dataset.lhProcessed = 'true';
            let u = null; let a = 0;
            while (a < 10 && !u) {
                const i = document.querySelector('.reservation-modal-popup iframe');
                if (i && i.src) u = getReservationUuidFromUrl(i.src);
                const l = document.querySelector('.reservation-modal-popup a[href*="/reservations/"]');
                if (l && l.href) u = getReservationUuidFromUrl(l.href);
                if (!u) { a++; await new Promise(r => setTimeout(r, 300)); }
            }
            if (!u) u = lastClickedUuid;
            activeUuid = u;
            if (activeUuid) setupStateListener(activeUuid);
        }).observe(document.body, { childList: true, subtree: true });
    }

})();
