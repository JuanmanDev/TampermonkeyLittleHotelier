// ==UserScript==
// @name         LH Front Desk - Ensure Reservation Save
// @namespace    Hotelier Tools
// @version      0.1.0
// @description  Prevents closing the reservation edit modal if there are unsaved changes. Embeds the edit page in an iframe for a seamless experience.
// @author       JuanmanDev
// @match        https://application.littlehotelier.com/properties/*/calendar/*
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations/*/edit*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @run-at       document-idle
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

        const updateState = () => {
            const saveBtn = document.querySelector('button.btn-controls');
            const isDirty = !!saveBtn && saveBtn.offsetParent !== null && (saveBtn.textContent.includes('Guardar') || saveBtn.textContent.includes('Save'));
            const state = isDirty ? 'DIRTY' : 'CLEAN';

            if (state !== lastState) {
                lastState = state;
                GM_setValue(`lh_save_state_${uuid}`, { state, timestamp: Date.now() });
                console.log(`📝 LH Ensure Save: State changed to ${state}`);
            }
        };

        new MutationObserver(updateState).observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
        setInterval(updateState, 1500);

        // Intercept close buttons inside the edit page
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('a.reservation-close, .reservation-modal-popup__header-close-button, .close-button');
            if (closeBtn) {
                updateState();
                if (lastState === 'DIRTY' && !forceAllowClose) {
                    console.log('📝 LH Ensure Save: Changes detected on close attempt');
                    e.preventDefault();
                    e.stopPropagation();
                    if (isIframe) {
                        GM_setValue(`lh_close_request_${uuid}`, { timestamp: Date.now() });
                    }
                }
            }
        }, true);

        // Safety for tab close
        window.addEventListener('beforeunload', (e) => {
            if (forceAllowClose) return;
            // Re-check state one last time
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
                console.log('📝 LH Ensure Save: Force close signal received');
                forceAllowClose = true;
                // Also clear beforeunload manually just in case
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
            console.log('📅 LH Ensure Save: Finalizing close');

            if (activeUuid) {
                GM_setValue(`lh_save_command_${activeUuid}`, { action: 'FORCE_CLOSE', timestamp: Date.now() });
                // Short delay to ensure message propagation to iframe before it's destroyed
                await new Promise(r => setTimeout(r, 150));
            }

            const overlay = document.querySelector('.lh-iframe-modal-overlay');
            if (overlay) overlay.remove();
            document.body.style.overflow = '';

            isBypassing = true;
            const nativeCloseBtn = document.querySelector('.reservation-modal-popup__header-close-button');
            if (nativeCloseBtn) {
                nativeCloseBtn.click();
            } else {
                const backdrop = document.querySelector('.el-dialog__wrapper.reservation-modal-popup');
                if (backdrop) backdrop.click();
            }

            activeUuid = null;
            isDirty = false;
            setTimeout(() => { isBypassing = false; }, 300);
        };

        const attemptClose = () => {
            if (!activeUuid) {
                const iframe = document.querySelector('.reservation-modal-popup iframe, .lh-iframe-modal-content');
                if (iframe && iframe.src) activeUuid = getReservationUuidFromUrl(iframe.src);
                else if (lastClickedUuid) activeUuid = lastClickedUuid;
            }

            if (activeUuid) {
                const storedData = GM_getValue(`lh_save_state_${activeUuid}`);
                if (storedData) isDirty = (storedData.state === 'DIRTY');
            }

            if (isDirty) {
                const confirmOverlay = document.createElement('div');
                confirmOverlay.className = 'lh-confirm-overlay';
                confirmOverlay.innerHTML = `
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
                confirmOverlay.querySelector('.lh-confirm-btn-save').onclick = () => {
                    GM_setValue(`lh_save_command_${activeUuid}`, { action: 'SAVE', timestamp: Date.now() });
                    const box = confirmOverlay.querySelector('.lh-confirm-box');
                    box.innerHTML = `<h2>Guardando...</h2><p>Por favor espere unos segundos mientras se procesan los cambios.</p>`;
                    let checks = 0;
                    const itv = setInterval(() => {
                        const data = GM_getValue(`lh_save_state_${activeUuid}`);
                        if (data && data.state === 'CLEAN') { clearInterval(itv); confirmOverlay.remove(); closeModal(); }
                        if (++checks > 30) { clearInterval(itv); box.innerHTML = `<h2>No se pudo confirmar el guardado</h2><p>Es posible que haya tardado demasiado. ¿Desea cerrar de todos modos?</p><div class="lh-confirm-options"><button class="lh-confirm-btn lh-confirm-btn-discard">Cerrar igual</button><button class="lh-confirm-btn lh-confirm-btn-back">Volver</button></div>`; box.querySelector('.lh-confirm-btn-discard').onclick = () => { confirmOverlay.remove(); isDirty = false; closeModal(); }; box.querySelector('.lh-confirm-btn-back').onclick = () => confirmOverlay.remove(); }
                    }, 200);
                };
                confirmOverlay.querySelector('.lh-confirm-btn-discard').onclick = () => { confirmOverlay.remove(); isDirty = false; closeModal(); };
                confirmOverlay.querySelector('.lh-confirm-btn-back').onclick = () => confirmOverlay.remove();
                document.body.appendChild(confirmOverlay);
            } else {
                closeModal();
            }
        };

        window.addEventListener('click', (e) => {
            if (isBypassing) return;
            const isClose = e.target.closest('.reservation-modal-popup__header-close-button');
            const isBackdrop = e.target.classList.contains('el-dialog__wrapper') && e.target.classList.contains('reservation-modal-popup');
            if (isClose || isBackdrop) { e.preventDefault(); e.stopPropagation(); attemptClose(); }
        }, true);

        window.addEventListener('keydown', (e) => {
            if (isBypassing) return;
            if (e.key === 'Escape') {
                const modal = document.querySelector('.reservation-modal-popup, .lh-iframe-modal-overlay');
                if (modal && modal.offsetParent !== null) { e.preventDefault(); e.stopPropagation(); attemptClose(); }
            }
        }, true);

        new MutationObserver(async () => {
            const header = document.querySelector('.reservation-modal-popup__header');
            if (!header || header.dataset.lhProcessed) return;
            header.dataset.lhProcessed = 'true';
            let foundUuid = null;
            let attempts = 0;
            while (attempts < 10 && !foundUuid) {
                const iframe = document.querySelector('.reservation-modal-popup iframe');
                if (iframe && iframe.src) foundUuid = getReservationUuidFromUrl(iframe.src);
                const link = document.querySelector('.reservation-modal-popup a[href*="/reservations/"]');
                if (link && link.href) foundUuid = getReservationUuidFromUrl(link.href);
                if (!foundUuid) { attempts++; await new Promise(r => setTimeout(r, 300)); }
            }
            if (!foundUuid) foundUuid = lastClickedUuid;
            activeUuid = foundUuid;
            if (activeUuid) setupStateListener(activeUuid);
        }).observe(document.body, { childList: true, subtree: true });
    }

})();
