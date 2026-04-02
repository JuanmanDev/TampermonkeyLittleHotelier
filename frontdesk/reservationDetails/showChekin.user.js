// ==UserScript==
// @name         LH Front Desk - Show Chekin data for reservation
// @namespace    Hotelier Tools
// @version      1.4.1
// @description  Automate Checkin ID retrieval for Little Hotelier using fetch interception. Loads Checkin guest data into reservation forms, preloads reservation data from the calendar view, and batch-checks for missing Chekin registrations.
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations/*/edit*
// @match        https://application.littlehotelier.com/properties/*/calendar/*
// @match        https://dashboard.chekin.com/bookings?autosearch=true*
// @match        https://dashboard.chekin.com/bookings?autocreate=true*
// @match        https://dashboard.chekin.com/bookings?autobatchcheck=true*
// @match        https://dashboard.chekin.com/bookings?autopreloadall=true*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        window.close
// @run-at       document-start

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showChekin.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showChekin.user.js
// ==/UserScript==

function run() {
    'use strict';

    const CONFIG = {
        LH_DOMAINS: ['app.littlehotelier.com', 'application.littlehotelier.com'],
        CHEKIN_DOMAIN: 'dashboard.chekin.com',
        STORAGE_PREFIX: 'lh_chekin_cache_v2_',
        CACHE_DURATION: 1000 * 60 * 60 * 24, // 24 hours
        CALENDAR_PRELOAD_KEY: 'lh_calendar_reservations_preload',
        CALENDAR_PRELOAD_TTL: 1000 * 60 * 60 * 4 // 4 hours
    };

    // Translations
    const TRANSLATIONS = {
        en: {
            status: 'Chekin.com Status:',
            checkingCache: 'Checking cache...',
            searching: '🔍 Searching in background...',
            found: 'Found',
            guests: 'guest(s)',
            viewInChekin: 'View in Chekin',
            createReservation: 'Create Checkin Reservation',
            fillGuestBtn: 'Save Guest',
            fillAllGuestsBtn: 'Save All Guests',
            improveGuestBtn: 'Improve Data',
            guestSavedBtn: 'Saved',
            allGuestsSavedBtn: 'All checkin guests loaded',
            noGuestsYet: '⚠️ No guests registered yet.',
            noMatch: '❌ No matching reservation found in Chekin.',
            error: '❌ Error or No Data found.',
            loginRequired: '⚠️ Login Required on Chekin',
            name: 'Name',
            documentId: 'Document ID',
            phone: 'Phone',
            city: 'City',
            province: 'Province',
            country: 'Country',
            useAsPrimary: 'Use as Primary',
            guestRegistrationForm: 'Guest Registration Form:',
            open: 'Open',
            copy: 'Copy',
            email: 'Email',
            whatsapp: 'WhatsApp',
            copied: 'Copied!',
            emailSubject: 'Complete Your Guest Registration',
            emailBody: 'Hello,\n\nPlease complete your guest registration using the following link:\n\n{link}\n\nThank you!',
            whatsappMessage: 'Hello! Please complete your guest registration using this link: {link}',
            footer: '\n\nHostal Sol Zamora - https://hostalsolzamora.com/',
        },
        es: {
            status: 'Estado de Chekin.com:',
            checkingCache: 'Verificando caché...',
            searching: '🔍 Buscando en segundo plano...',
            found: 'Encontrado(s)',
            guests: 'huésped(es)',
            viewInChekin: 'Ver en Chekin',
            createReservation: 'Crear Reserva en Chekin',
            fillGuestBtn: 'Guardar Huésped',
            fillAllGuestsBtn: 'Guardar todos los huéspedes',
            improveGuestBtn: 'Mejorar Datos',
            guestSavedBtn: 'Guardado',
            allGuestsSavedBtn: 'Todos los huéspedes cargados',
            noGuestsYet: '⚠️ Aún no hay huéspedes registrados.',
            noMatch: '❌ No se encontró reserva coincidente en Chekin.',
            error: '❌ Error o No se encontraron datos.',
            loginRequired: '⚠️ Inicio de sesión requerido en Chekin',
            name: 'Nombre',
            documentId: 'ID Documento',
            phone: 'Teléfono',
            city: 'Ciudad',
            province: 'Provincia',
            country: 'País',
            useAsPrimary: 'Utilizar Documento',
            guestRegistrationForm: 'Formulario de Registro:',
            open: 'Abrir',
            copy: 'Copiar',
            email: 'Email',
            whatsapp: 'WhatsApp',
            copied: '¡Copiado!',
            emailSubject: 'Complete su Registro de Huésped',
            emailBody: 'Hola,\n\nPor favor complete su registro de huésped usando el siguiente enlace:\n\n{link}\n\n¡Gracias!',
            whatsappMessage: '¡Hola! Por favor complete su registro de huésped usando este enlace: {link}',
            footer: '\n\nHostal Sol Zamora - https://hostalsolzamora.com/',
        }
    };

    // Detect language
    const detectLanguage = () => {
        const lang = navigator.language || navigator.userLanguage;
        return lang.startsWith('es') ? 'es' : 'en';
    };

    const LANG = detectLanguage();
    const t = TRANSLATIONS[LANG];

    const currentHost = window.location.hostname;

    // ========================================================================
    // LOGIC: LITTLE HOTELIER (Main Controller)
    // ========================================================================
    if (CONFIG.LH_DOMAINS.some(d => currentHost.includes(d))) {
        console.log('🏨 LH Script Loaded');

        // ====================================================================
        // LOGIC: CALENDAR VIEW - Preload reservation data for Chekin lookups
        // ====================================================================
        const isCalendarPage = currentHost.includes('application.littlehotelier.com')
            && window.location.pathname.includes('/calendar/');

        if (isCalendarPage) {
            console.log('📅 LH Calendar: Preload mode activated');

            let latestCalendarReservations = [];
            let auditBtn = null;
            let preloadBtn = null;

            const createAuditUI = () => {
                if (document.getElementById('chekin-audit-btn')) return;

                auditBtn = document.createElement('button');
                auditBtn.id = 'chekin-audit-btn';
                auditBtn.innerText = '🔍 Audit Chekin (0)';
                auditBtn.style.position = 'fixed';
                auditBtn.style.bottom = '20px';
                auditBtn.style.right = '20px';
                auditBtn.style.zIndex = '999999';
                auditBtn.style.padding = '12px 18px';
                auditBtn.style.backgroundColor = '#1e88e5';
                auditBtn.style.color = 'white';
                auditBtn.style.border = 'none';
                auditBtn.style.borderRadius = '30px';
                auditBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
                auditBtn.style.cursor = 'pointer';
                auditBtn.style.fontFamily = 'sans-serif';
                auditBtn.style.fontWeight = 'bold';
                auditBtn.style.fontSize = '14px';
                auditBtn.style.transition = 'background 0.2s';

                auditBtn.onmouseenter = () => auditBtn.style.backgroundColor = '#1565c0';
                auditBtn.onmouseleave = () => auditBtn.style.backgroundColor = '#1e88e5';

                auditBtn.onclick = () => {
                    if (latestCalendarReservations.length === 0) {
                        alert('⏳ Please wait for the calendar reservations to load...');
                        return;
                    }
                    const btnOriginalText = auditBtn.innerText;
                    auditBtn.innerText = '⏳ Checking...';
                    auditBtn.disabled = true;

                    checkMissingChekinReservations(latestCalendarReservations, () => {
                        auditBtn.innerText = btnOriginalText;
                        auditBtn.disabled = false;
                    });
                };

                preloadBtn = document.createElement('button');
                preloadBtn.id = 'chekin-preload-btn';
                preloadBtn.innerText = '⚡ Preload Guests';
                preloadBtn.style.cssText = auditBtn.style.cssText;
                preloadBtn.style.bottom = '70px'; // Position above audit button
                preloadBtn.style.backgroundColor = '#4CAF50';

                preloadBtn.onmouseenter = () => preloadBtn.style.backgroundColor = '#388E3C';
                preloadBtn.onmouseleave = () => preloadBtn.style.backgroundColor = '#4CAF50';

                preloadBtn.onclick = () => {
                    if (latestCalendarReservations.length === 0) {
                        alert('⏳ Please wait for the calendar reservations to load...');
                        return;
                    }

                    const activeReservations = latestCalendarReservations.filter(res =>
                        res.status !== 'cancelled' && res.status !== 'declined' && res.status !== 'no_show'
                    );

                    if (activeReservations.length === 0) {
                        alert('✅ No active reservations to preload.');
                        return;
                    }

                    const checkInDates = activeReservations.map(r => r.checkInDate).filter(Boolean).sort();
                    if (checkInDates.length === 0) return;

                    const dateFrom = checkInDates[0];
                    const dateTo = checkInDates[checkInDates.length - 1];

                    // Store request to validate the popup
                    GM_setValue('chekin_preload_request', {
                        timestamp: Date.now(),
                        dateFrom,
                        dateTo
                    });

                    const preloadUrl = `https://${CONFIG.CHEKIN_DOMAIN}/bookings?autopreloadall=true&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
                    console.log('📅 Opening Chekin preload all for dates:', dateFrom, '→', dateTo);
                    GM_openInTab(preloadUrl, { active: false, insert: true, setParent: true });
                };

                // Check if audit UI is enabled via localStorage
                const isDebugEnabled = localStorage.getItem('LH_CHEKIN_DEBUG') === 'true';
                if (!isDebugEnabled) {
                    console.log('%c🔍 LH Chekin: Audit tools are hidden. To enable, run: localStorage.setItem("LH_CHEKIN_DEBUG", "true"); then refresh.', 'color: #1e88e5; font-weight: bold;');
                }

                auditBtn.style.display = isDebugEnabled ? 'block' : 'none';
                preloadBtn.style.display = 'none';

                document.body.appendChild(auditBtn);
                document.body.appendChild(preloadBtn);
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', createAuditUI);
            } else {
                createAuditUI();
            }

            /**
             * Store intercepted reservations into GM storage.
             * Called from the page context via window.postMessage.
             */
            const storeCalendarReservations = (reservations) => {
                if (!reservations || !Array.isArray(reservations)) return;

                let preloaded = GM_getValue(CONFIG.CALENDAR_PRELOAD_KEY, {});
                if (typeof preloaded === 'string') {
                    try { preloaded = JSON.parse(preloaded); } catch (e) { preloaded = {}; }
                }

                const now = Date.now();

                // Clean up expired entries
                for (const key of Object.keys(preloaded)) {
                    if (preloaded[key].timestamp && (now - preloaded[key].timestamp > CONFIG.CALENDAR_PRELOAD_TTL)) {
                        delete preloaded[key];
                    }
                }

                let newCount = 0;
                for (const res of reservations) {
                    if (!res.uuid) continue;

                    const entry = {
                        uuid: res.uuid,
                        propertyUuid: res.propertyUuid,
                        roomTypeUuid: res.roomTypeUuid,
                        roomUuid: res.roomUuid,
                        reservationRoomTypeUuid: res.reservationRoomTypeUuid,
                        checkInDate: res.checkInDate,
                        checkOutDate: res.checkOutDate,
                        bookingReferenceId: res.bookingReferenceId,
                        firstName: res.firstName,
                        lastName: res.lastName,
                        status: res.status,
                        checkedIn: res.checkedIn,
                        checkedOut: res.checkedOut,
                        paymentStatus: res.paymentStatus,
                        timestamp: now
                    };

                    // Key by UUID (used in reservation edit URLs)
                    preloaded[res.uuid] = entry;

                    // Also key by bookingReferenceId for direct booking ref lookups
                    if (res.bookingReferenceId) {
                        preloaded['ref_' + res.bookingReferenceId] = entry;
                    }

                    newCount++;
                }

                GM_setValue(CONFIG.CALENDAR_PRELOAD_KEY, preloaded);
                console.log(`📅 LH Calendar: Stored ${newCount} reservations in GM storage`);
            };

            /**
             * Batch-check which calendar reservations are missing from Chekin.
             * Opens a background Chekin tab that fetches all reservations for the
             * visible date range, then diffs against the calendar data.
             */
            const checkMissingChekinReservations = (reservations, onComplete = () => { }) => {
                if (!reservations || !Array.isArray(reservations)) {
                    onComplete();
                    return;
                }

                // Extract propertyId from the calendar URL
                const propMatch = window.location.pathname.match(/\/properties\/([^/]+)\/calendar/);
                const propertyId = propMatch ? propMatch[1] : 'UNKNOWN';

                // Filter out cancelled / declined / no-show
                const activeReservations = reservations.filter(res =>
                    res.status !== 'cancelled'
                    && res.status !== 'declined'
                    && res.status !== 'no_show'
                );

                if (activeReservations.length === 0) {
                    alert('✅ No active reservations to audit.');
                    onComplete();
                    return;
                }

                // Find the date range of visible reservations
                const checkInDates = activeReservations
                    .map(r => r.checkInDate)
                    .filter(Boolean)
                    .sort();

                if (checkInDates.length === 0) {
                    onComplete();
                    return;
                }

                const dateFrom = checkInDates[0];
                const dateTo = checkInDates[checkInDates.length - 1];

                // Store the batch request
                GM_setValue('chekin_batch_request', {
                    dateFrom,
                    dateTo,
                    reservations: activeReservations.map(r => ({
                        uuid: r.uuid,
                        bookingReferenceId: r.bookingReferenceId,
                        firstName: r.firstName,
                        lastName: r.lastName,
                        checkInDate: r.checkInDate,
                        checkOutDate: r.checkOutDate,
                        status: r.status,
                    })),
                    propertyId,
                    timestamp: Date.now()
                });

                // Clean previous response BEFORE setting up the listener
                // (otherwise deleting triggers the listener with null)
                GM_deleteValue('chekin_batch_response');

                // Listen for batch check results
                const listenerId = GM_addValueChangeListener('chekin_batch_response', (_key, _oldVal, newVal) => {
                    if (!newVal) return; // Ignore delete events
                    GM_removeValueChangeListener(listenerId);

                    console.log('📅 Batch response received:', JSON.stringify(newVal));

                    if (newVal.status === 'error') {
                        console.warn('📅 ❌ Chekin batch check failed:', newVal?.msg || 'unknown error');
                        alert('❌ Chekin batch check failed:\n' + (newVal?.msg || 'unknown error'));
                        onComplete();
                        return;
                    }

                    if (newVal.status === 'login_required') {
                        console.warn('📅 ⚠️ Chekin login required — cannot check missing reservations. Please log in to dashboard.chekin.com');
                        alert('⚠️ Chekin login required!\n\nPlease log in to dashboard.chekin.com first, then try again.');
                        GM_openInTab(`https://${CONFIG.CHEKIN_DOMAIN}/bookings`, { active: true });
                        onComplete();
                        return;
                    }

                    if (newVal.status === 'success') {
                        const chekinRefs = new Set((newVal.bookingRefs || []).map(r => r.toLowerCase().trim()));

                        // Find LH reservations NOT matched in Chekin
                        const missing = activeReservations.filter(res => {
                            if (!res.bookingReferenceId) return true; // No ref → can't match
                            return !chekinRefs.has(res.bookingReferenceId.toLowerCase().trim());
                        });

                        if (missing.length === 0) {
                            console.log('📅 ✅ All active reservations have a Chekin reservation linked!');
                            alert('✅ All active reservations currently visible have an associated Chekin registration!');
                            onComplete();
                            return;
                        }

                        console.log(
                            `%c📅 ⚠️ ${missing.length} reservation(s) missing from Chekin (${dateFrom} — ${dateTo})`,
                            'font-weight: bold; color: #ff9800; font-size: 13px'
                        );

                        // Build UI Modal
                        const uiHtml = `
                            <div id="missing-chekins-modal" style="position:fixed;top:60px;right:20px;width:350px;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.25);z-index:999999;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;border:2px solid #ff9800;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">
                                <div style="padding:15px;background:#fff3e0;border-bottom:1px solid #ffe0b2;display:flex;justify-content:space-between;align-items:center;">
                                    <h3 style="margin:0;color:#e65100;font-size:16px;display:flex;align-items:center;gap:8px;">
                                        <span style="font-size:20px;">⚠️</span> ${missing.length} Missing from Chekin
                                    </h3>
                                    <button onclick="this.closest('#missing-chekins-modal').remove()" style="background:none;border:none;font-size:24px;line-height:1;margin:0;padding:0 5px;cursor:pointer;color:#e65100;opacity:0.6;transition:opacity 0.2s;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.6'">&times;</button>
                                </div>
                                <div style="padding:0;overflow-y:auto;flex-grow:1;background:#fafafa;">
                                    <ul style="list-style:none;margin:0;padding:0;">
                                        ${missing.map(res => {
                            const editUrl = 'https://app.littlehotelier.com/extranet/properties/' + propertyId + '/reservations/' + res.uuid + '/edit';
                            const fullName = ((res.firstName || '') + ' ' + (res.lastName || '')).trim() || '(no name)';
                            return '<li style="padding:12px 15px;border-bottom:1px solid #eee;background:#fff;transition:background 0.2s;" onmouseenter="this.style.backgroundColor=\'#f5f5f5\'" onmouseleave="this.style.backgroundColor=\'#fff\'">' +
                                '<a href="' + editUrl + '" target="_blank" style="text-decoration:none;display:block;">' +
                                '<strong style="display:block;margin-bottom:4px;color:#2196F3;font-size:14px;">' + fullName + '</strong>' +
                                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                                '<span style="font-size:12px;color:#666;background:#f0f0f0;padding:2px 6px;border-radius:4px;font-family:monospace;">' + (res.bookingReferenceId || 'NO REF') + '</span>' +
                                '<span style="font-size:12px;color:#888;">' + (res.checkInDate || '?') + ' &rarr; ' + (res.checkOutDate || '?') + '</span>' +
                                '</div>' +
                                '</a>' +
                                '</li>';
                        }).join('')}
                                    </ul>
                                </div>
                            </div>
                        `;
                        const oldModal = document.getElementById('missing-chekins-modal');
                        if (oldModal) oldModal.remove();
                        document.body.insertAdjacentHTML('beforeend', uiHtml);
                        onComplete();
                    }
                });

                // Open Chekin background tab for batch checking
                const batchUrl = `https://${CONFIG.CHEKIN_DOMAIN}/bookings?autobatchcheck=true&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
                console.log('📅 Opening Chekin batch check for dates:', dateFrom, '→', dateTo);
                GM_openInTab(batchUrl, { active: false, insert: true, setParent: true });
            };

            // Listen for messages from the injected page-context interceptor
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'LH_CALENDAR_RESERVATIONS') {
                    storeCalendarReservations(event.data.reservations);

                    const activeCount = event.data.reservations.filter(res =>
                        res.status !== 'cancelled' && res.status !== 'declined' && res.status !== 'no_show'
                    ).length;

                    latestCalendarReservations = event.data.reservations;
                    if (auditBtn) auditBtn.innerText = `🔍 Audit Chekin (${activeCount})`;

                    // Auto-trigger preload, with a 2-second debounce to avoid spamming on rapid scrolls
                    clearTimeout(window._chekinPreloadTimeout);
                    window._chekinPreloadTimeout = setTimeout(() => {
                        const activeReservations = event.data.reservations.filter(res =>
                            res.status !== 'cancelled' && res.status !== 'declined' && res.status !== 'no_show'
                        );
                        if (activeReservations.length === 0) return;

                        const checkInDates = activeReservations.map(r => r.checkInDate).filter(Boolean).sort();
                        if (checkInDates.length === 0) return;
                        const dateFrom = checkInDates[0];
                        const dateTo = checkInDates[checkInDates.length - 1];

                        // Prevent re-running if we already tracked this exact range very recently (within 5 minutes)
                        const lastReq = window._lastChekinPreloadReq;
                        if (lastReq && lastReq.dateFrom === dateFrom && lastReq.dateTo === dateTo && (Date.now() - lastReq.timestamp < 300000)) {
                            return;
                        }
                        window._lastChekinPreloadReq = { timestamp: Date.now(), dateFrom, dateTo };

                        GM_setValue('chekin_preload_request', {
                            timestamp: Date.now(),
                            dateFrom,
                            dateTo
                        });
                        const preloadUrl = `https://${CONFIG.CHEKIN_DOMAIN}/bookings?autopreloadall=true&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
                        console.log('📅 Auto-Preloading guests for dates:', dateFrom, '→', dateTo);
                        GM_openInTab(preloadUrl, { active: false, insert: true, setParent: true });
                    }, 2000);
                }
            });

            // Inject fetch interceptor into the page context
            const injectCalendarInterceptor = () => {
                if (document.head || document.documentElement) {
                    const target = document.head || document.documentElement;
                    const script = document.createElement('script');
                    script.textContent = `
        (function () {
            const originalFetch = window.fetch;

            window.fetch = async function (...args) {
                const response = await originalFetch.apply(this, args);

                try {
                    const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
                    const body = args[1]?.body;

                    // Detect GraphQL reservations query
                    if (url.includes('/extranet-beef/api/graphql') && body) {
                        let parsedBody;
                        try {
                            parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
                        } catch (e) { /* not JSON */ }

                        if (parsedBody && parsedBody.operationName === 'reservations') {
                            const clone = response.clone();
                            clone.json().then(data => {
                                if (data && data.data && data.data.reservations) {
                                    const reservations = data.data.reservations;
                                    console.log('📅 LH Calendar: Intercepted ' + reservations.length + ' reservations from GraphQL');

                                    // Send to userscript context via postMessage
                                    // (page context cannot access GM_setValue)
                                    window.postMessage({
                                        type: 'LH_CALENDAR_RESERVATIONS',
                                        reservations: reservations
                                    }, '*');
                                }
                            }).catch(function (err) {
                                console.warn('📅 LH Calendar: Error parsing GraphQL response', err);
                            });
                        }
                    }
                } catch (e) {
                    // Don't break the original fetch
                }

                return response;
            };

            console.log('📅 LH Calendar: Fetch interceptor installed');
        })();
    `;
                    target.appendChild(script);
                    script.remove();
                } else {
                    requestAnimationFrame(injectCalendarInterceptor);
                }
            };

            injectCalendarInterceptor();

            // Calendar preload mode only — don't run reservation detail logic
            return;
        }

        /**
         * Look up preloaded reservation data from the calendar view.
         * The calendar script stores reservation data in localStorage keyed by UUID.
         * The reservation edit URL contains the UUID, so we can look it up directly.
         */
        const getPreloadedReservationData = () => {
            try {
                // Extract reservation UUID from the edit URL
                // URL pattern: /extranet/properties/{propId}/reservations/{resUuid}/edit
                const urlMatch = window.location.pathname.match(/\/reservations\/([0-9a-f-]+)\//i);
                if (!urlMatch) return null;

                const reservationUuid = urlMatch[1];

                // Use GM_getValue since calendar (application.littlehotelier.com)
                // and reservation edit (app.littlehotelier.com) are different origins
                let preloaded = GM_getValue(CONFIG.CALENDAR_PRELOAD_KEY, {});
                if (typeof preloaded === 'string') {
                    preloaded = JSON.parse(preloaded);
                }
                const entry = preloaded[reservationUuid];

                if (!entry) return null;

                // Check TTL
                if (entry.timestamp && (Date.now() - entry.timestamp > CONFIG.CALENDAR_PRELOAD_TTL)) {
                    console.log('📅 Preloaded data expired for', reservationUuid);
                    return null;
                }

                console.log('📅 Found preloaded reservation data:', entry);
                return entry;
            } catch (e) {
                console.warn('📅 Error reading preloaded data:', e);
                return null;
            }
        };

        // Try to set booking ref from preloaded calendar data immediately
        const preloadedData = getPreloadedReservationData();
        if (preloadedData && preloadedData.bookingReferenceId) {
            document.documentElement.setAttribute('data-lh-booking-ref', preloadedData.bookingReferenceId);
            console.log('📅 Set booking ref from calendar preload:', preloadedData.bookingReferenceId);
        }

        const injectWhenReady = () => {
            if (document.head || document.documentElement) {
                const target = document.head || document.documentElement;
                const script = document.createElement('script');
                script.textContent = `
    // Try to get ref from initial HTML headers just in case
    fetch(location.href, { method: 'HEAD' }).then(res => {
        const ref = res.headers.get('reservation_booking_ref') || res.headers.get('reservation-booking-ref');
        if (ref) {
            document.documentElement.setAttribute('data-lh-booking-ref', ref);
            console.log('🏨 Got booking ref from HEAD:', ref);
        }
    }).catch(() => { });

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.addEventListener('load', function () {
            if (typeof url === 'string' && url.includes('/reservations/') && url.includes('form-info=true')) {
                try {
                    const data = JSON.parse(this.responseText);
                    if (data && data.booking_reference_id) {
                        document.documentElement.setAttribute('data-lh-booking-ref', data.booking_reference_id);
                        console.log('🏨 Got booking reference ID from XHR API:', data.booking_reference_id);
                    }
                } catch (e) { }
            }
        });
        originalOpen.apply(this, arguments);
    };

    const originalFetchLH = window.fetch;
    if (originalFetchLH) {
        window.fetch = async function (...args) {
            const response = await originalFetchLH.apply(this, args);
            try {
                const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
                if (url.includes('/reservations/') && url.includes('form-info=true')) {
                    const clone = response.clone();
                    clone.json().then(data => {
                        if (data && data.booking_reference_id) {
                            document.documentElement.setAttribute('data-lh-booking-ref', data.booking_reference_id);
                            console.log('🏨 Got booking reference ID from fetch API:', data.booking_reference_id);
                        }
                    }).catch(e => { });
                }
            } catch (e) { }
            return response;
        };
    }
    `;
                target.appendChild(script);
                script.remove();
            } else {
                requestAnimationFrame(injectWhenReady);
            }
        };
        injectWhenReady();

        const waitForElement = (selector) => {
            return new Promise(resolve => {
                if (document.querySelector(selector)) return resolve(document.querySelector(selector));
                const observer = new MutationObserver(() => {
                    if (document.querySelector(selector)) {
                        observer.disconnect();
                        resolve(document.querySelector(selector));
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            });
        };

        const getReservationData = () => {
            // Get check-in and check-out dates
            const checkInDate = document.querySelector('#check_in_date')?.value || '';
            const checkOutDate = document.querySelector('#check_out_date')?.value || '';

            // Get room numbers (filter out nulls for unassigned rooms)
            const rooms = [...document.querySelectorAll('select[name="reservation_room_types[][room_id]"]')]
                .map(e => e.querySelector("[selected]")?.text)
                .filter(Boolean);

            // Get guest details
            const firstName = document.querySelector('#guest_first_name')?.value || '';
            const lastName = document.querySelector('#guest_last_name')?.value || '';
            const fullName = `${firstName} ${lastName} `.trim();
            const email = document.querySelector('#guest_email')?.value || '';
            const phone = document.querySelector('#guest_phone_number')?.value || '';

            // Get guests count — sum across all room types for multi-room reservations
            let totalAdults = 0;
            let totalChildren = 0;

            // Strategy 1: Sum per-room adults and children from each room type block
            const roomTypeBlocks = document.querySelectorAll('.reservation-room-type, .room-type-block, [data-room-type]');
            if (roomTypeBlocks.length > 0) {
                roomTypeBlocks.forEach(block => {
                    const blockAdults = parseInt(
                        block.querySelector('input[name*="number_adults"], select[name*="number_adults"]')?.value || '0', 10
                    );
                    const blockChildren = parseInt(
                        block.querySelector('input[name*="number_children"], select[name*="number_children"]')?.value || '0', 10
                    );
                    totalAdults += blockAdults;
                    totalChildren += blockChildren;
                });
            }

            // Strategy 2: Sum from all per-room inputs matching the array naming convention
            if (totalAdults === 0) {
                const perRoomAdultsInputs = document.querySelectorAll(
                    'input[name="reservation_room_types[][number_adults]"], select[name="reservation_room_types[][number_adults]"]'
                );
                const perRoomChildrenInputs = document.querySelectorAll(
                    'input[name="reservation_room_types[][number_children]"], select[name="reservation_room_types[][number_children]"]'
                );
                perRoomAdultsInputs.forEach(input => {
                    totalAdults += parseInt(input.value || '0', 10);
                });
                perRoomChildrenInputs.forEach(input => {
                    totalChildren += parseInt(input.value || '0', 10);
                });
            }

            // Strategy 3: Fallback to reservation-level totals
            if (totalAdults === 0) {
                totalAdults = parseInt(document.querySelector('#reservation_number_adults')?.value || '0', 10);
                totalChildren = parseInt(document.querySelector('#reservation_number_children')?.value || '0', 10);
            }

            // Strategy 4: Count existing guest forms as last resort
            if (totalAdults === 0) {
                const guestForms = document.querySelectorAll('.guest-form');
                totalAdults = Math.max(guestForms.length, 1); // At least 1 guest
            }

            const numberOfGuests = Math.max(totalAdults + totalChildren, 1).toString();
            console.log(`🏨 Guest count: ${totalAdults} adults + ${totalChildren} children = ${numberOfGuests} total`);

            // Get Source / Channel
            const channelSelect = document.querySelector('#reservation_channel_id');
            const sourceName = channelSelect ? channelSelect.options[channelSelect.selectedIndex]?.text : 'Little Hotelier';

            return { checkInDate, checkOutDate, rooms, fullName, firstName, lastName, email, phone, numberOfGuests, sourceName };
        };

        const initLittleHotelier = async () => {
            await waitForElement('#guest_first_name');

            const { checkInDate, rooms, fullName } = getReservationData();

            if (!checkInDate || rooms.length === 0) {
                console.log('LH: Missing check-in date or room assignment.');
                return;
            }

            // Prepare UI Container
            const container = document.createElement('div');
            container.className = 'fade-in-ui';
            container.style.cssText = 'margin: 10px 0; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;';
            container.innerHTML = `
        <style>
        button.fill-guest, button.fill-all-guests { transition: all 0.35s ease, opacity 0.3s ease; }
        .fade-in-ui { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .chekin-spinner { display: inline-block; animation: chekinSpin 1s linear infinite; }
        @keyframes chekinSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        </style>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <img src="https://f.hubspotusercontent10.net/hubfs/8776616/Logo%20nuevo%20azul-1.png" alt="Chekin" style="height: 24px;">
                    <strong>${t.status}</strong>
                    <span id="chekin-status">${t.checkingCache}</span>
                    <a id="chekin-link" href="undefined" target="_blank" class="btn btn-sm btn-primary" style="display: none; margin-left: auto;">${t.viewInChekin}</a>
                </div>
                <div id="chekin-details" style="margin-top: 10px;"></div>
                <div id="chekin-table" style="margin-top: 10px;"></div>
                <div id="chekin-signup-form" style="margin-top: 10px;"></div>
    `;

            const commentBlock = document.querySelector(".primary-contact-panel")?.lastChild;
            if (commentBlock) {
                const containerCheckin = document.createElement('div');
                containerCheckin.className = "col-sm-12";
                commentBlock.appendChild(containerCheckin);
                containerCheckin.appendChild(container);
            }

            const apiRef = document.documentElement.getAttribute('data-lh-booking-ref') || '';
            const urlMatch = window.location.pathname.match(/\/reservations\/([^/]+)\//);
            const targetRef = apiRef || (urlMatch ? urlMatch[1] : '');

            // Create cache key based on date and room
            const cacheKey = CONFIG.STORAGE_PREFIX + btoa(`${checkInDate}_${rooms.join('_')}`);
            const cachedData = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            const now = Date.now();

            // Check Preload Cross-Domain GM storage first
            let preloadedData = null;
            if (targetRef) {
                const gmData = GM_getValue(CONFIG.STORAGE_PREFIX + 'ref_' + targetRef);
                if (gmData && gmData.data && gmData.data.length && (now - gmData.timestamp < CONFIG.CACHE_DURATION)) {
                    preloadedData = gmData;
                }
            }

            if (preloadedData) {
                console.log('✅ Loaded data from Preload GM Cache for ref:', targetRef);
                renderResults(container, preloadedData.data, preloadedData.link, preloadedData.signupFormLink);
            } else if (cachedData && cachedData?.data?.length && (now - cachedData.timestamp < CONFIG.CACHE_DURATION)) {
                renderResults(container, cachedData.data, cachedData.link, cachedData.signupFormLink);
            } else {
                startBackgroundSearch(checkInDate, rooms, container, cacheKey);
            }
        };

        const startBackgroundSearch = (checkInDate, rooms, container, cacheKey) => {
            const statusSpan = container.querySelector('#chekin-status');
            statusSpan.innerHTML = `
        <style>
        @keyframes chekinLoadingBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        </style>
        <div style="width: 100px; height: 6px; border-radius: 3px; background: #e0e0e0; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 8px; position: relative;">
            <div style="width: 40%; height: 100%; background: #f0ad4e; position: absolute; animation: chekinLoadingBar 1s infinite linear;"></div>
        </div>
                ${t.searching}
    `;
            statusSpan.style.color = 'orange';

            const checkinLink = container.querySelector('#chekin-link');
            checkinLink.style.display = 'none';

            // Clean previous communication channels
            GM_deleteValue('chekin_response');
            GM_setValue('chekin_request', {
                checkInDate,
                rooms,
                timestamp: Date.now()
            });

            // Get booking reference - prefer API-captured, fallback to URL path
            const apiRef = document.documentElement.getAttribute('data-lh-booking-ref') || '';
            const urlMatch = window.location.pathname.match(/\/reservations\/([^/]+)\//);
            const targetRef = apiRef || (urlMatch ? urlMatch[1] : '');
            console.log('🏨 Launching Chekin Search, Target Ref:', targetRef, '(API:', apiRef, ', URL:', urlMatch?.[1], ')');

            // Open Background Tab with search params
            const searchUrl = `https://${CONFIG.CHEKIN_DOMAIN}/bookings?autosearch=true&date=${encodeURIComponent(checkInDate)}&rooms=${encodeURIComponent(rooms.join(','))}&ref=${encodeURIComponent(targetRef)}`;
            GM_openInTab(searchUrl, { active: false, insert: true, setParent: true });

            let handled = false;

            const handler = (name, oldValue, newValue, remote) => {
                if (!newValue) return;

                if (newValue.status === 'success') {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: newValue.data,
                        link: newValue.link,
                        signupFormLink: newValue.signupFormLink
                    }));
                    renderResults(container, newValue.data, newValue.link, newValue.signupFormLink);


                    checkinLink.style.display = 'inline-block';
                    checkinLink.href = newValue.link;
                    checkinLink.innerText = t.viewInChekin;
                }
                else if (newValue.status === 'login_required') {
                    renderLoginButton(container);
                }
                else if (newValue.status === 'no_guests') {
                    statusSpan.innerHTML = `${t.noGuestsYet}`;
                    statusSpan.style.color = 'orange';

                    checkinLink.style.display = 'inline-block';
                    checkinLink.href = newValue.link;
                    checkinLink.innerText = t.viewInChekin;

                    if (newValue.signupFormLink) {
                        renderSignupFormLink(container, newValue.signupFormLink);
                    }
                }
                else if (newValue.status === 'not_found') {
                    statusSpan.innerText = t.noMatch;
                    statusSpan.style.color = 'red';

                    checkinLink.style.display = 'inline-block';
                    checkinLink.href = 'javascript:void(0)';
                    checkinLink.innerText = t.createReservation;
                    checkinLink.onclick = (e) => {
                        e.preventDefault();
                        startBackgroundCreate(getReservationData(), container);
                    };
                }
                else if (newValue.status === 'created') {
                    statusSpan.innerText = '✅ Reservation created in Chekin!';
                    statusSpan.style.color = 'green';

                    checkinLink.style.display = 'inline-block';
                    checkinLink.href = newValue.link;
                    checkinLink.innerText = t.viewInChekin;
                    checkinLink.onclick = null;
                    checkinLink.target = '_blank';
                }
                else if (newValue.status === 'creating') {
                    statusSpan.innerHTML = '<span class="chekin-spinner">⏳</span> Creating reservation...';
                    statusSpan.style.color = 'orange';
                    checkinLink.style.display = 'none';
                    return; // Don't remove listener yet
                }
                else {
                    statusSpan.innerText = t.error + (newValue.msg ? ': ' + newValue.msg : '');
                    statusSpan.style.color = 'red';
                }

                if (newValue.status !== 'creating') {
                    GM_removeValueChangeListener(listenerId);
                    handled = true;
                }

            }


            setTimeout(() => {
                if (handled || GM_getValue('chekin_response')?.status === 'creating') return;
                handler(null, null, { status: 'login_required' }, null);
            }, 20000);

            // Listen for response
            const listenerId = GM_addValueChangeListener('chekin_response', handler);
        };

        // Convert dd/mm/yyyy to yyyy-mm-dd for Chekin API
        const convertDateFormat = (dateStr) => {
            if (!dateStr) return '';
            // Already in yyyy-mm-dd format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
            // Convert dd/mm/yyyy to yyyy-mm-dd
            const parts = dateStr.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            return dateStr;
        };

        const startBackgroundCreate = (resData, container) => {
            // Get booking reference - prefer API-captured, fallback to URL
            const apiRef = document.documentElement.getAttribute('data-lh-booking-ref') || '';
            const urlMatch = window.location.pathname.match(/\/reservations\/([^/]+)\//);
            const targetRef = apiRef || (urlMatch ? urlMatch[1] : '');
            console.log('🏨 Create - Booking Reference:', targetRef, '(API:', apiRef, ', URL:', urlMatch?.[1], ')');
            const payload = {
                ...resData,
                checkInDate: convertDateFormat(resData.checkInDate),
                checkOutDate: convertDateFormat(resData.checkOutDate),
                targetRef,
                timestamp: Date.now()
            };

            // Set creating status and register listener for result
            GM_deleteValue('chekin_response');
            GM_setValue('chekin_create_request', payload);

            // Small delay to ensure the listener is registered before setting creating status
            setTimeout(() => {
                GM_setValue('chekin_response', { status: 'creating' });
            }, 50);

            console.log('🏨 Launching Chekin Create:', payload);

            const statusSpan = container.querySelector('#chekin-status');
            const checkinLink = container.querySelector('#chekin-link');
            statusSpan.innerHTML = '<span class="chekin-spinner">⏳</span> Creating reservation...';
            statusSpan.style.color = 'orange';
            checkinLink.style.display = 'none';

            const createUrl = `https://${CONFIG.CHEKIN_DOMAIN}/bookings?autocreate=true`;
            GM_openInTab(createUrl, { active: false, insert: true, setParent: true });

            // Listen for the creation result
            let createHandled = false;
            const createHandler = (name, oldValue, newValue, remote) => {
                if (!newValue || newValue.status === 'creating') return;

                if (newValue.status === 'created') {
                    statusSpan.innerHTML = '✅ Reservation created in Chekin!';
                    statusSpan.style.color = 'green';
                    checkinLink.style.display = 'inline-block';
                    checkinLink.href = newValue.link;
                    checkinLink.innerText = t.viewInChekin;
                    checkinLink.onclick = null;
                    checkinLink.target = '_blank';
                    if (newValue.signupFormLink) {
                        renderSignupFormLink(container, newValue.signupFormLink);
                    }
                } else if (newValue.status === 'error') {
                    statusSpan.innerHTML = '❌ Creation failed' + (newValue.msg ? ': ' + newValue.msg : '');
                    statusSpan.style.color = 'red';
                    checkinLink.style.display = 'inline-block';
                    checkinLink.href = 'javascript:void(0)';
                    checkinLink.innerText = '🔄 Retry';
                    checkinLink.onclick = (e) => {
                        e.preventDefault();
                        startBackgroundCreate(getReservationData(), container);
                    };
                } else if (newValue.status === 'login_required') {
                    renderLoginButton(container);
                }

                GM_removeValueChangeListener(createListenerId);
                createHandled = true;
            };

            const createListenerId = GM_addValueChangeListener('chekin_response', createHandler);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!createHandled) {
                    statusSpan.innerHTML = '❌ Creation timed out. Please try again.';
                    statusSpan.style.color = 'red';
                    checkinLink.style.display = 'inline-block';
                    checkinLink.href = 'javascript:void(0)';
                    checkinLink.innerText = '🔄 Retry';
                    checkinLink.onclick = (e) => {
                        e.preventDefault();
                        startBackgroundCreate(getReservationData(), container);
                    };
                    GM_removeValueChangeListener(createListenerId);
                }
            }, 30000);
        };

        const renderLoginButton = (container) => {
            const statusSpan = container.querySelector('#chekin-status');
            statusSpan.innerHTML = '';

            const btn = document.createElement('a');
            btn.className = 'btn btn-danger';
            btn.innerText = t.loginRequired;
            btn.href = `https://${CONFIG.CHEKIN_DOMAIN}`;
            btn.target = '_blank';
            btn.style.cssText = 'background: #d9534f; color: white; padding: 5px 10px; text-decoration: none; border-radius: 3px;';

            btn.onclick = () => {
                setTimeout(() => location.reload(), 5000);
            };

            container.appendChild(btn);
        };

        const renderSignupFormLink = (container, signupFormLink) => {
            const signupFormDiv = container.querySelector('#chekin-signup-form');
            signupFormDiv.innerHTML = `
                <div style="margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">${t.guestRegistrationForm}</label>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <input type="text" id="signup-form-link-input" value="${signupFormLink}" readonly
                               style="flex: 1; padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px;">
                        <button class="btn btn-sm btn-primary" id="btn-open-link" title="${t.open}">
                            🔗 ${t.open}
                        </button>
                        <button class="btn btn-sm btn-secondary" id="btn-copy-link" title="${t.copy}">
                            📋 ${t.copy}
                        </button>
                        <button class="btn btn-sm btn-info" id="btn-email-link" title="${t.email}">
                            ✉️ ${t.email}
                        </button>
                        <button class="btn btn-sm btn-success" id="btn-whatsapp-link" title="${t.whatsapp}">
                            💬 ${t.whatsapp}
                        </button>
                    </div>
                </div>
            `;

            // Add event listeners
            const btnOpen = signupFormDiv.querySelector('#btn-open-link');
            const btnCopy = signupFormDiv.querySelector('#btn-copy-link');
            const btnEmail = signupFormDiv.querySelector('#btn-email-link');
            const btnWhatsApp = signupFormDiv.querySelector('#btn-whatsapp-link');

            btnOpen.onclick = (e) => {
                window.open(signupFormLink, '_blank');
                e.preventDefault();
            };

            btnCopy.onclick = async (e) => {
                e.preventDefault();
                try {
                    await navigator.clipboard.writeText(signupFormLink);
                    const originalText = btnCopy.innerHTML;
                    btnCopy.innerHTML = `✅ ${t.copied}`;
                    setTimeout(() => {
                        btnCopy.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    // Fallback for older browsers
                    const input = signupFormDiv.querySelector('#signup-form-link-input');
                    input.select();
                    document.execCommand('copy');
                    const originalText = btnCopy.innerHTML;
                    btnCopy.innerHTML = `✅ ${t.copied}`;
                    setTimeout(() => {
                        btnCopy.innerHTML = originalText;
                    }, 2000);
                }
            };

            btnEmail.onclick = (e) => {
                e.preventDefault();
                const subject = encodeURIComponent(t.emailSubject);
                const body = encodeURIComponent(t.emailBody.replace('{link}', signupFormLink) + t.footer);
                // If #guest_email exists, we could append it to the URL to prefill recipient
                const guestEmailInput = document.getElementById('guest_email');
                let mailtoLink = `mailto:?subject=${subject}&body=${body}`;
                if (guestEmailInput && guestEmailInput.value) {
                    mailtoLink = `mailto:${encodeURIComponent(guestEmailInput.value)}?subject=${subject}&body=${body}`;
                }
                window.open(mailtoLink, '_blank');
            };

            btnWhatsApp.onclick = (e) => {
                e.preventDefault();
                const message = encodeURIComponent(t.whatsappMessage.replace('{link}', signupFormLink) + t.footer);
                // If #guest_phone_number exists, we could append it to the URL to prefill recipient
                const guestPhoneNumberInput = document.getElementById('guest_phone_number');
                let waUrl = `https://wa.me/?text=${message}`;
                if (guestPhoneNumberInput && guestPhoneNumberInput.value) {
                    waUrl = `https://wa.me/${encodeURIComponent(guestPhoneNumberInput.value)}?text=${message}`;
                }
                window.open(waUrl, '_blank');
            };
        };

        const triggerVueUpdate = (element, newValue, shouldBlur = true) => {
            if (!element) return;
            // Prevent crashes in React components by focusing element before changing values
            if (typeof element.focus === 'function') {
                try { element.focus(); } catch (e) { }
            }

            const isSelect = element.tagName === 'SELECT';
            const prototype = isSelect ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
            if (setter) {
                setter.call(element, newValue);
            } else {
                element.value = newValue; // Fallback
            }
            // Little Hotelier uses a mix of v-model and manual events. 
            // 'input' and 'change' are generally sufficient for reactivity.
            try {
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (err) {
                console.warn('Error dispatching events:', err);
            }

            // Explicit blur to dismiss any focus-triggered UI (e.g. province popovers or browser autocomplete)
            if (shouldBlur && typeof element.blur === 'function') {
                try { element.blur(); } catch (e) { }
            }
        };

        const closeExternalPopovers = () => {
            // Find the easySave popover by its unique signature (non-classed div, high z-index, grid display)
            // It often contains '.province-item' elements.
            const popovers = Array.from(document.querySelectorAll('body > div')).filter(div => {
                const style = div.style;
                const isHighZ = style.zIndex === '999999';
                const isGrid = style.display === 'grid';
                const hasProvinceItems = div.querySelector('.province-item') !== null;
                return isHighZ && (isGrid || hasProvinceItems);
            });

            popovers.forEach(p => {
                p.style.display = 'none';
                p.style.visibility = 'hidden';
            });
        };

        const normalizeString = (str) => {
            return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        };

        // Spanish provinces list — must match easySaveProvinceCountry.user.js
        const SPANISH_PROVINCES = [
            "A Coruña", "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Bizkaia", "Burgos",
            "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba", "Cuenca", "Girona", "Granada",
            "Guadalajara", "Gipuzkoa", "Huelva", "Huesca", "Illes Balears", "Jaén", "La Rioja", "Las Palmas", "León", "Lleida",
            "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca",
            "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid",
            "Zamora", "Zaragoza"
        ];

        /**
         * Try to match a province string from Chekin to one of the canonical
         * Spanish province names. Uses accent-insensitive comparison, then
         * partial/contains matching as a fallback.
         * @param {string} rawProvince - Province string from Chekin
         * @returns {string|null} Matched canonical province name, or null
         */
        const matchSpanishProvince = (rawProvince) => {
            if (!rawProvince) return null;

            // 1. Clean annotations like "Barcelona (ca) [Barcelona]" or "Alicante / Alacant"
            let cleaned = rawProvince
                .replace(/\([^)]+\)/g, ' ')   // Remove anything in parentheses
                .replace(/\[[^\]]+\]/g, ' ')  // Remove anything in brackets
                .replace(/\{[^}]+\}/g, ' ')   // Remove anything in braces
                .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ' ') // Only keep letters and spaces (removes -, /, etc.)
                .replace(/\s+/g, ' ')
                .trim();

            const normCleaned = normalizeString(cleaned);
            const normRaw = normalizeString(rawProvince);

            // 2. Direct exact match
            for (const p of SPANISH_PROVINCES) {
                const np = normalizeString(p);
                if (np === normCleaned || np === normRaw) return p;
            }

            // 3. Alternative names mapping
            const alternativeNames = {
                'vizcaya': 'Bizkaia',
                'bizkaia': 'Bizkaia',
                'guipuzcoa': 'Gipuzkoa',
                'guipúzcoa': 'Gipuzkoa',
                'araba': 'Álava',
                'la coruna': 'A Coruña',
                'orense': 'Ourense',
                'gerona': 'Girona',
                'lerida': 'Lleida',
                'baleares': 'Illes Balears',
                'islas baleares': 'Illes Balears',
                'tenerife': 'Santa Cruz de Tenerife',
                'gran canaria': 'Las Palmas',
                'lanzarote': 'Las Palmas',
                'fuerteventura': 'Las Palmas',
                'la palma': 'Santa Cruz de Tenerife',
                'la gomera': 'Santa Cruz de Tenerife',
                'el hierro': 'Santa Cruz de Tenerife',
                'ibiza': 'Illes Balears',
                'mallorca': 'Illes Balears',
                'menorca': 'Illes Balears',
                'formentera': 'Illes Balears',
                'pais vasco': 'Álava',
                'euskadi': 'Gipuzkoa',
                'castellon de la plana': 'Castellón',
                'castello': 'Castellón',
                'alicant': 'Alicante',
                'alacant': 'Alicante'
            };

            const mapped = alternativeNames[normCleaned];
            if (mapped) return mapped;

            // 4. Substring match using word boundaries (avoids "Leon" matching "Pantaleon")
            for (const p of SPANISH_PROVINCES) {
                const np = normalizeString(p);
                // Require exact word match within string
                const regex = new RegExp(`\\b${np}\\b`, 'i');
                if (regex.test(normCleaned) || regex.test(normRaw)) return p;
            }

            // Substring match for alternative names
            for (const [altKey, altVal] of Object.entries(alternativeNames)) {
                const regex = new RegExp(`\\b${altKey}\\b`, 'i');
                if (regex.test(normCleaned) || regex.test(normRaw)) return altVal;
            }

            // 5. Significant word overlap (fallback)
            const getWords = str => (str || '').split(/\s+/).filter(w => w.length > 3);
            const normWords = getWords(normCleaned).concat(getWords(normRaw));

            for (const p of SPANISH_PROVINCES) {
                const pWords = getWords(normalizeString(p));
                for (const nw of normWords) {
                    for (const pw of pWords) {
                        if (nw === pw) return p;
                    }
                }
            }

            console.log(`⚠️ Could not match province "${rawProvince}" to any Spanish province`);
            return null;
        };

        const mapDocType = (val) => {
            if (!val) return '';
            val = val.toUpperCase();
            if (val.includes('PASSPORT') || val === 'P') return 'Passport';
            if (val.includes('DRIV') || val === 'C') return "Driver's license";
            if (val.includes('RESIDENCE') || val.includes('NIE') || val.startsWith('ES_X') || val.startsWith('ES_Y') || val.startsWith('ES_Z')) return 'Spanish Residence Permit';
            return 'ID card';
        };

        const findMatchingGuestForm = (guest) => {
            const normGuestFirst = normalizeString(guest.first_name);
            const normGuestLast = normalizeString(guest.last_name + ' ' + (guest.second_surname || '')).trim();

            if (!normGuestFirst && !normalizeString(guest.last_name)) return null;

            // 1. Prioritize specific guest forms (Additional Guests list)
            // Use #guests to ensure we are in the guest list and not the totals panel
            const guestsContainer = document.getElementById('guests');
            if (!guestsContainer) return null;

            const forms = Array.from(guestsContainer.querySelectorAll('.guest-form'));
            for (const form of forms) {
                const fNameInput = form.querySelector('input[name="first_name"]');
                const lNameInput = form.querySelector('input[name="last_name"]');
                if (!fNameInput && !lNameInput) continue;

                const normFName = normalizeString(fNameInput.value);
                const normLName = normalizeString(lNameInput.value);

                if (normFName && normLName && normFName !== '_' && normLName !== '_') {
                    if (normFName.includes(normGuestFirst) || normGuestFirst.includes(normFName)) {
                        const isMatchLName = normLName.includes(normalizeString(guest.last_name)) || normalizeString(guest.last_name).includes(normLName);
                        if (isMatchLName) return form;
                    }
                }
            }

            return null;
        };

        const updateGuestButtonsState = (container, data) => {
            const fillButtons = container.querySelectorAll('button.fill-guest');
            if (!fillButtons.length) return;

            let allFullyLoaded = true;

            data.forEach((guest, index) => {
                const btn = fillButtons[index];
                if (!btn) return;

                const matchingForm = findMatchingGuestForm(guest);
                if (matchingForm) {
                    // For Spain guests, resolve the province to canonical name
                    // Check both Chekin's country AND the form's current country value
                    const guestIsSpain = normalizeString(guest.country || '').match(/^(spain|espana|españa|es)$/);
                    const formCountryInput = matchingForm.querySelector('input[name="country"], select[name="country"]')
                        || document.getElementById('guest_country');
                    const formIsSpain = formCountryInput && normalizeString(formCountryInput.value || '').match(/^(spain|espana|españa|es)$/);
                    const effectivelySpain = !!(guestIsSpain || formIsSpain);
                    const resolvedProv = (effectivelySpain && guest.province) ? (matchSpanishProvince(guest.province) || guest.province) : guest.province;

                    const checkFields = [
                        { name: 'email', val: guest.email },
                        { name: 'phone_number', val: guest.phone },
                        { name: 'id_number', val: guest.document_number },
                        { name: 'nationality', val: guest.nationality },
                        { name: 'date_of_birth', val: guest.date_of_birth },
                        { name: 'city', val: guest.city },
                        { name: 'state', val: resolvedProv, isProvince: true, isSpain: effectivelySpain },
                        { name: 'country', val: guest.country }
                    ];

                    let canImprove = false;
                    for (const field of checkFields) {
                        if (field.val) {
                            const input = matchingForm.querySelector(`input[name="${field.name}"], select[name="${field.name}"]`);
                            if (input && !input.value) {
                                canImprove = true;
                                break;
                            }
                            // For Spain province: check the value matches a canonical province
                            if (field.isProvince && field.isSpain && input && input.value) {
                                const matchedProv = matchSpanishProvince(input.value);
                                if (!matchedProv) {
                                    canImprove = true;
                                    break;
                                }
                            }
                        }
                    }

                    // Additional check: For Spanish guests, LH REQUIRES a valid province.
                    // Even if Chekin doesn't have province data (field.val is null),
                    // we must still flag as improvable if the LH form's state field is empty
                    // or contains an unrecognized value.
                    if (!canImprove && effectivelySpain) {
                        const stateInput = matchingForm.querySelector('input[name="state"], select[name="state"]')
                            || document.getElementById('guest_state');
                        if (stateInput) {
                            const currentState = (stateInput.value || '').trim();
                            if (!currentState || !matchSpanishProvince(currentState)) {
                                console.log(`⚠️ Spain guest "${guest.first_name} ${guest.last_name}" is missing a valid province in LH (current: "${currentState}")`);
                                canImprove = true;
                            }
                        }
                    }

                    if (canImprove) {
                        btn.className = 'btn btn-sm btn-warning fill-guest';
                        btn.innerHTML = `🔄 ${t.improveGuestBtn || 'Improve Data'}`;
                        allFullyLoaded = false;
                    } else {
                        btn.className = 'btn btn-sm btn-default fill-guest';
                        btn.innerHTML = `✅ ${t.guestSavedBtn || 'Saved'}`;
                        btn.disabled = true;
                        btn.style.opacity = '0.7';
                        btn.style.cursor = 'not-allowed';
                    }
                } else {
                    btn.className = 'btn btn-sm btn-success fill-guest';
                    btn.innerHTML = `${t.fillGuestBtn || 'Save Guest'}`;
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    allFullyLoaded = false;
                }
            });

            const addAllBtn = container.querySelector('.fill-all-guests');
            if (addAllBtn) {
                if (allFullyLoaded) {
                    addAllBtn.className = 'btn btn-sm btn-default fill-all-guests';
                    addAllBtn.innerHTML = `✅ ${t.allGuestsSavedBtn || 'All guests loaded'}`;
                    addAllBtn.disabled = true;
                    addAllBtn.style.opacity = '0.7';
                    addAllBtn.style.cursor = 'not-allowed';
                } else {
                    addAllBtn.className = 'btn btn-sm btn-success fill-all-guests';
                    addAllBtn.innerHTML = t.fillAllGuestsBtn || 'Save All Guests';
                    addAllBtn.disabled = false;
                    addAllBtn.style.opacity = '1';
                    addAllBtn.style.cursor = 'pointer';
                }
            }
        };

        const fillGuestForm = async (guest, index = null) => {
            const guestsContainer = document.getElementById('guests');
            if (!guestsContainer) {
                console.warn("[Chekin] Guests container (#guests) not found");
            }
            let forms = Array.from((guestsContainer || document).querySelectorAll('.guest-form'));
            let targetForm = null;

            // 1. If explicit index provided, use it to target the form in the guest list
            if (index !== null) {
                // We no longer target .primary-contact-panel for index === 0.
                // Instead, we just use the index in the forms array within #guests.
                if (forms[index]) {
                    targetForm = forms[index];
                }
            }

            // 2. Fallback to name-based matching if index failed or wasn't provided
            if (!targetForm) {
                targetForm = findMatchingGuestForm(guest);
            }

            if (!targetForm) {
                for (let i = forms.length - 1; i >= 0; i--) {
                    const fname = (forms[i].querySelector('input[name="first_name"]')?.value || '').trim();
                    const lname = (forms[i].querySelector('input[name="last_name"]')?.value || '').trim();
                    const isFnameEmpty = !fname || fname === '_';
                    const isLnameEmpty = !lname || lname === '_';
                    if (isFnameEmpty && isLnameEmpty) {
                        targetForm = forms[i];
                        break;
                    }
                }
            }

            if (!targetForm) {
                const btns = Array.from(document.querySelectorAll('button.btn-link'));
                const addBtn = btns.find(b => b.textContent.includes('Añadir nuevo huésped') || b.textContent.includes('Add new guest') || b.querySelector('.fa-plus'));
                if (addBtn) {
                    addBtn.click();
                    await new Promise(r => setTimeout(r, 400));
                    forms = Array.from((guestsContainer || document).querySelectorAll('.guest-form'));
                    targetForm = forms[forms.length - 1];
                }
            }

            if (!targetForm) {
                console.error("Could not find or create a guest form");
                return;
            }

            const expandBtn = targetForm.querySelector('button.btn-expand');
            if (expandBtn && expandBtn.querySelector('.fa-chevron-circle-down')) {
                expandBtn.click();
                await new Promise(r => setTimeout(r, 300));
            }

            // If country is Spain, try to match the province to the canonical list
            const isSpain = normalizeString(guest.country || '').match(/^(spain|espana|españa|es)$/);
            let resolvedProvince = guest.province;
            if (isSpain && guest.province) {
                const matched = matchSpanishProvince(guest.province);
                if (matched) {
                    console.log(`🇪🇸 Province matched: "${guest.province}" → "${matched}"`);
                    resolvedProvince = matched;
                }
            }

            const firstPhaseFields = [
                { name: 'first_name', id: 'guest_first_name', val: guest.first_name },
                { name: 'last_name', id: 'guest_last_name', val: guest.last_name },
                { name: 'second_surname', val: guest.second_surname },
                { name: 'email', id: 'guest_email', val: guest.email },
                { name: 'phone_number', id: 'guest_phone_number', val: guest.phone },
                { name: 'gender', val: guest.gender },
                { name: 'id_document_type', id: 'guest_id_document_type', val: mapDocType(guest.document_type_raw) },
                { name: 'id_number', id: 'guest_id_number', val: guest.document_number },
                { name: 'nationality', id: 'guest_nationality', val: guest.nationality },
                { name: 'date_of_issue', id: 'guest_date_of_issue', val: guest.date_of_issue },
                { name: 'expiry_date', id: 'guest_expiry_date', val: guest.expiry_date },
                { name: 'date_of_birth', id: 'guest_date_of_birth', val: guest.date_of_birth },
                { name: 'country', id: 'guest_country', val: guest.country }
            ];

            const secondPhaseFields = [
                { name: 'address', id: 'guest_address', val: guest.address },
                { name: 'city', id: 'guest_city', val: guest.city },
                { name: 'state', id: 'guest_state', val: resolvedProvince },
                { name: 'post_code', id: 'guest_post_code', val: guest.post_code }
            ];

            const fillFields = (fields) => {
                for (const field of fields) {
                    const valueToSet = field.val || '';
                    let input = targetForm.querySelector(`input[name="${field.name}"], select[name="${field.name}"], input[id="${field.id}"], select[id="${field.id}"]`);

                    if (input) {
                        const isContactsTotalsPanel = input.closest('.contacts-totals-panel') !== null;
                        if (isContactsTotalsPanel) {
                            if (field.name !== 'id_document_type' && field.name !== 'id_number') {
                                continue;
                            }
                        }

                        const currentValue = input.value ? input.value.trim() : '';
                        if (currentValue && currentValue !== '_' && currentValue !== 'none') {
                            continue;
                        }

                        // Hack for validation: If the input is empty and it's a name field, we set '_' first 
                        // to ensure the form registers as 'active/edited' if no real name was provided.
                        if (!valueToSet && (field.name?.includes('name') || field.id?.includes('name'))) {
                            triggerVueUpdate(input, '_', true);
                        } else if (valueToSet) {
                            triggerVueUpdate(input, valueToSet, true);
                        }
                    }
                }
            };

            // Phase 1: Personal info + Country (setting country makes Vue re-render geo fields)
            fillFields(firstPhaseFields);

            // Phase 2: Shorter delay (consistent with easySave's working logic)
            // Setting the province needs to happen after Vue's country-watcher finishes its re-render.
            await new Promise(r => setTimeout(r, 150));
            fillFields(secondPhaseFields);

            // Re-apply province after delay to survive Vue's re-render
            // When country changes to Spain, Vue re-renders and REPLACES the state input element.
            // We must re-query the DOM inside each callback — a captured reference goes stale.
            if (resolvedProvince) {
                /**
                 * Re-query the state input from the live DOM. The element captured before
                 * the country change is detached by Vue's re-render, so we always query fresh.
                 */
                const findStateInput = () => {
                    // Strictly scope to the target form's sub-tree to avoid picking primary contact fields.
                    return targetForm.querySelector('input[name="state"], select[name="state"]')
                        || targetForm.querySelector('input[id="guest_state"], select[id="guest_state"]');
                };

                const applyProvince = (delay) => {
                    setTimeout(() => {
                        const currentInput = findStateInput();
                        if (!currentInput) {
                            console.warn(`🇪🇸 State input not found after ${delay}ms — DOM may not be ready yet`);
                            return;
                        }

                        const isContactsTotalsPanel = currentInput.closest('.contacts-totals-panel') !== null;
                        if (isContactsTotalsPanel) {
                            return;
                        }

                        // Close external popovers that might have been triggered by focus/expansion
                        closeExternalPopovers();

                        const currentValue = currentInput.value ? currentInput.value.trim() : '';
                        if (!currentValue || currentValue === '_' || currentValue === 'none') {
                            console.log(`🇪🇸 Re-applying province "${resolvedProvince}" after ${delay}ms delay (input value was "${currentInput.value}")`);
                            triggerVueUpdate(currentInput, resolvedProvince, true);
                        }
                    }, delay);
                };

                // Multiple re-applications at staggered intervals to survive Vue re-renders
                // Longer delays needed because Vue's country-change re-render can take 500ms+
                for (const delay of [100, 300, 600, 1000, 1500]) {
                    applyProvince(delay);
                }

                // Also watch for DOM mutations in case Vue re-renders even later
                const observer = new MutationObserver(() => {
                    const currentInput = findStateInput();
                    if (currentInput) {
                        const isContactsTotalsPanel = currentInput.closest('.contacts-totals-panel') !== null;
                        if (isContactsTotalsPanel) {
                            return;
                        }

                        const currentValue = currentInput.value ? currentInput.value.trim() : '';
                        if (!currentValue || currentValue === '_' || currentValue === 'none') {
                            console.log(`🇪🇸 MutationObserver: Re-applying province "${resolvedProvince}"`);
                            triggerVueUpdate(currentInput, resolvedProvince);
                        }
                    }
                });
                observer.observe(targetForm, { childList: true, subtree: true });
                // Stop watching after 3 seconds to avoid performance issues
                setTimeout(() => observer.disconnect(), 3000);
            }

            console.log("Guest form filled with data:", guest);
        };

        const renderResults = (container, data, link, signupFormLink) => {
            const statusSpan = container.querySelector('#chekin-status');
            statusSpan.innerHTML = `
                <span style="color: green;">✅ ${t.found} ${data.length} ${t.guests}.</span>
            `;

            const checkinLink = container.querySelector('#chekin-link');
            checkinLink.style.display = 'inline-block';
            checkinLink.href = link;

            if (signupFormLink && data.length === 0) {
                renderSignupFormLink(container, signupFormLink);
            }

            if (data.length === 0) return;

            const table = document.createElement('table');
            table.className = 'fade-in-ui';
            table.style.cssText = 'width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 12px;';
            table.innerHTML = `
                <tr style="background:#eee; text-align:left;">
                    <th style="padding:5px; border:1px solid #ccc;">${t.name}</th>
                    <th style="padding:5px; border:1px solid #ccc;">${t.phone}</th>
                    <th style="padding:5px; border:1px solid #ccc;">${t.documentId}</th>
                    <th style="padding:5px; border:1px solid #ccc;">${t.city}</th>
                    <th style="padding:5px; border:1px solid #ccc;">${t.province}</th>
                    <th style="padding:5px; border:1px solid #ccc;">${t.country}</th>
                    <th style="padding:5px; border:1px solid #ccc; text-align: right; width: 1%;"></th>
                </tr>
            `;

            data.forEach(person => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding:5px; border:1px solid #ccc;">${person.full_name || 'N/A'}</td>
                    <td style="padding:5px; border:1px solid #ccc;">${person.phone || 'N/A'}</td>
                    <td style="padding:5px; border:1px solid #ccc;"><b>${person.document_number || 'N/A'}</b></td>
                    <td style="padding:5px; border:1px solid #ccc;">${person.city || ''}</td>
                    <td style="padding:5px; border:1px solid #ccc;">${person.province || ''}</td>
                    <td style="padding:5px; border:1px solid #ccc;">${person.country || ''}</td>
                    <td style="padding:5px; border:1px solid #ccc; text-align: right;">
                        <button class="btn btn-sm btn-primary use" style="margin-bottom:4px; width:100%;">${t.useAsPrimary}</button>
                        <button class="btn btn-sm btn-success fill-guest" style="width:100%; white-space:normal;">${t.fillGuestBtn || 'Fill Details'}</button>
                    </td>
                `;
                table.appendChild(row);
            });

            container.querySelector('#chekin-table').appendChild(table);

            if (data.length > 1) {
                const addAllBtn = document.createElement('button');
                addAllBtn.className = 'btn btn-sm btn-success fill-all-guests';
                addAllBtn.style.cssText = 'margin-top: 10px; width: 100%; font-weight: bold;';
                addAllBtn.innerText = t.fillAllGuestsBtn || 'Save All Guests';
                container.querySelector('#chekin-table').appendChild(addAllBtn);

                addAllBtn.onclick = async (evt) => {
                    evt.preventDefault();

                    // 1. Cleanup duplicate "phantom" autofilled guests before filling!
                    const guestsContainerWrapper = document.getElementById('guests');
                    if (guestsContainerWrapper) {
                        const localForms = Array.from(guestsContainerWrapper.querySelectorAll('.guest-form'));
                        const seen = new Set();
                        for (let form of localForms) {
                            const fname = (form.querySelector('input[name="first_name"]')?.value || '').trim();
                            const lname = (form.querySelector('input[name="last_name"]')?.value || '').trim();
                            if (fname.length > 2 || lname.length > 2) {
                                const key = (fname + '|' + lname).toLowerCase();
                                if (seen.has(key)) {
                                    const closeBtn = form.querySelector('.close-rrt:not(.hidden)');
                                    if (closeBtn) {
                                        console.log(`🗑️ Removing duplicate guest: ${fname} ${lname}`);
                                        closeBtn.click();
                                        await new Promise(r => setTimeout(r, 600));
                                    } else {
                                        console.log(`⚠️ Cannot remove duplicate guest: ${fname} ${lname} (button hidden). Clearing instead.`);
                                        triggerVueUpdate(form.querySelector('input[name="first_name"]'), '_');
                                        triggerVueUpdate(form.querySelector('input[name="last_name"]'), '_');
                                        await new Promise(r => setTimeout(r, 400));
                                    }
                                } else {
                                    seen.add(key);
                                }
                            }
                        }
                    }

                    // 2. Pre-create enough blank forms for our data BEFORE we start filling
                    // This prevents React from completely re-rendering and throwing away data mid-loop
                    if (guestsContainerWrapper) {
                        const countForms = Array.from(guestsContainerWrapper.querySelectorAll('.guest-form'));
                        let matchingOrEmpty = 0;
                        for (let form of countForms) {
                            const fname = (form.querySelector('input[name="first_name"]')?.value || '').trim();
                            const lname = (form.querySelector('input[name="last_name"]')?.value || '').trim();

                            const isFnameEmpty = !fname || fname === '_';
                            const isLnameEmpty = !lname || lname === '_';

                            if (isFnameEmpty && isLnameEmpty) {
                                matchingOrEmpty++;
                                continue;
                            }

                            for (let guest of data) {
                                const normGuestFirst = normalizeString(guest.first_name);
                                const normGuestLast = normalizeString(guest.last_name + ' ' + (guest.second_surname || '')).trim();
                                const normFName = normalizeString(fname);
                                const normLName = normalizeString(lname);
                                if (normFName && normGuestFirst && (normFName.includes(normGuestFirst) || normGuestFirst.includes(normFName))) {
                                    if (normLName.includes(normalizeString(guest.last_name)) || normalizeString(guest.last_name).includes(normLName)) {
                                        matchingOrEmpty++;
                                        break;
                                    }
                                }
                            }
                        }

                        let formsToCreate = data.length - matchingOrEmpty;
                        if (formsToCreate > 0) {
                            console.log(`🤖 Auto-creating ${formsToCreate} new guest forms ahead of time...`);
                            for (let i = 0; i < formsToCreate; i++) {
                                const btns = Array.from(document.querySelectorAll('button.btn-link'));
                                const addBtn = btns.find(b => b.textContent.includes('Añadir nuevo huésped') || b.textContent.includes('Add new guest') || b.querySelector('.fa-plus'));
                                if (addBtn) {
                                    addBtn.click();
                                    await new Promise(r => setTimeout(r, 1000)); // Important: wait for React to process the addition
                                }
                            }
                        }
                    }

                    // 3. Fill forms sequentially
                    for (let i = 0; i < data.length; i++) {
                        await fillGuestForm(data[i], null);
                        // Wait for Vue/React re-render + province re-application (longest delay is 1500ms)
                        await new Promise(r => setTimeout(r, 2000));
                        updateGuestButtonsState(container, data);
                    }
                };
            }

            let buttons = container.querySelectorAll('button.use');
            let fillButtons = container.querySelectorAll('button.fill-guest');

            fillButtons.forEach((btn, index) => {
                btn.onclick = async (evt) => {
                    evt.preventDefault();
                    await fillGuestForm(data[index], index);
                    // Wait for Vue re-render + province re-application (longest delay is 1500ms)
                    await new Promise(r => setTimeout(r, 2000));
                    updateGuestButtonsState(container, data);
                };
            });

            buttons.forEach((btn, index) => {
                btn.onclick = (evt) => {
                    evt.preventDefault();

                    const id = data[index].document_number;
                    const input = document.getElementById('guest_id_number');

                    if (!input) {
                        console.error("Input element not found");
                        return;
                    }

                    // Get the native setter from HTMLInputElement prototype
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        "value"
                    ).set;

                    // Focus first (some frameworks listen to focus events)
                    input.focus();

                    // Set value using native setter
                    nativeInputValueSetter.call(input, id);

                    // Dispatch events in order: input -> change -> blur
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));

                    // For Vue 3, sometimes you need to trigger a focusout
                    input.dispatchEvent(new Event('focusout', { bubbles: true }));

                    console.log("Input updated:", id);
                };
            });

            // Initial state evaluation once rendered
            setTimeout(() => {
                updateGuestButtonsState(container, data);
            }, 500);
        };

        const interval = setInterval(() => {
            const check_in = document.querySelector('#check_in_date');
            if (check_in?.value) {
                clearInterval(interval);
                initLittleHotelier();
            }
        }, 200);

    }

    // ========================================================================
    // LOGIC: CHEKIN DASHBOARD (Background Worker with Fetch Interception)
    // ========================================================================
    else if (currentHost.includes(CONFIG.CHEKIN_DOMAIN)) {
        console.log('🤖 Chekin Worker Loaded');

        // Get search params from URL
        const urlParams = new URLSearchParams(window.location.search);
        const isAutoSearch = urlParams.get('autosearch') === 'true';
        const isAutoCreate = urlParams.get('autocreate') === 'true';
        const isAutoBatchCheck = urlParams.get('autobatchcheck') === 'true';
        const isAutoPreloadAll = urlParams.get('autopreloadall') === 'true';
        const targetDate = urlParams.get('date');
        const targetRooms = urlParams.get('rooms')?.split(',') || [];
        const targetRef = urlParams.get('ref') || '';

        if (!isAutoSearch && !isAutoCreate && !isAutoBatchCheck && !isAutoPreloadAll) return;

        console.log('🔍 Chekin mode:', { isAutoSearch, isAutoCreate, isAutoBatchCheck, targetDate, targetRooms, targetRef });

        // ====================================================================
        // BATCH CHECK MODE — Fetch all Chekin reservations for a date range
        // and return booking references to the calendar page
        // ====================================================================
        if (isAutoBatchCheck) {
            const dateFrom = urlParams.get('dateFrom');
            const dateTo = urlParams.get('dateTo');
            console.log('📋 Batch check mode for:', dateFrom, '→', dateTo);

            // Validate request freshness
            const batchRequest = GM_getValue('chekin_batch_request');
            if (!batchRequest || (Date.now() - batchRequest.timestamp > 90000)) {
                console.log('🚫 Batch request expired or not found');
                return;
            }

            // Check login status after page loads
            const checkBatchLogin = () => {
                if (document.querySelector('input[type="password"]') ||
                    document.body.innerText.includes('Login') ||
                    document.body.innerText.includes('Sign in')) {
                    GM_setValue('chekin_batch_response', { status: 'login_required' });
                    return true;
                }
                return false;
            };

            let batchProcessed = false;
            const originalFetchBatch = unsafeWindow.fetch;

            unsafeWindow.fetch = async function (input, init) {
                let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');

                // Intercept the reservations API call and expand date range
                if (url.includes('/api/v4/status/reservations/') && !batchProcessed) {
                    try {
                        const urlObj = new URL(url);
                        urlObj.searchParams.set('page_size', '200');
                        urlObj.searchParams.set('check_in_date_from', dateFrom + 'T00:00:00');
                        urlObj.searchParams.set('check_in_date_until', dateTo + 'T23:59:59');

                        const modifiedUrl = urlObj.toString();
                        console.log('📋 Batch check: Fetching Chekin reservations for date range:', modifiedUrl);

                        if (input instanceof Request) {
                            input = new Request(modifiedUrl, input);
                        } else {
                            input = modifiedUrl;
                        }
                    } catch (e) {
                        console.error('Error modifying batch check URL:', e);
                    }
                }

                const response = await originalFetchBatch(input || url, init);

                // Capture the reservations response for batch checking
                if (url.includes('/api/v4/status/reservations/') && !batchProcessed) {
                    const clone = response.clone();
                    clone.json().then(data => {
                        if (batchProcessed) return;
                        batchProcessed = true;

                        console.log('📋 Batch check: Received Chekin reservations:', data);

                        if (data.results) {
                            // Collect all booking references from Chekin reservations
                            const bookingRefs = [];
                            for (const res of data.results) {
                                if (res.external_id) bookingRefs.push(res.external_id);
                                if (res.booking_reference) bookingRefs.push(res.booking_reference);
                                if (res.external_booking_reference) bookingRefs.push(res.external_booking_reference);
                                if (res.reference) bookingRefs.push(res.reference);
                            }

                            console.log(`📋 Batch check: Found ${data.results.length} Chekin reservations with refs:`, bookingRefs);

                            GM_setValue('chekin_batch_response', {
                                status: 'success',
                                bookingRefs: [...new Set(bookingRefs)], // Deduplicate
                                totalChekinReservations: data.results.length
                            });
                        } else {
                            GM_setValue('chekin_batch_response', {
                                status: 'success',
                                bookingRefs: [],
                                totalChekinReservations: 0
                            });
                        }

                        console.log('📋 Batch check: DONE — response sent. Closing tab.');
                        setTimeout(() => window.close(), 2000);
                    }).catch(err => {
                        console.error('📋 Batch check: Error parsing response:', err);
                        GM_setValue('chekin_batch_response', { status: 'error', msg: err.message });
                        setTimeout(() => window.close(), 2000);
                    });
                }

                return response;
            };

            // Check login after page loads
            setTimeout(() => {
                if (checkBatchLogin()) {
                    setTimeout(() => window.close(), 2000);
                }
            }, 5000);

            return; // Don't execute normal search/create logic
        }

        // ====================================================================
        // PRELOAD ALL MODE — Fetch full guest data for all reservations in range
        // ====================================================================
        if (isAutoPreloadAll) {
            const dateFrom = urlParams.get('dateFrom');
            const dateTo = urlParams.get('dateTo');
            console.log('📋 Preload All mode for:', dateFrom, '→', dateTo);

            // Validate request freshness
            const preloadRequest = GM_getValue('chekin_preload_request');
            if (!preloadRequest || (Date.now() - preloadRequest.timestamp > 90000)) {
                console.log('🚫 Preload request expired or not found');
                return;
            }

            // Check login status after page loads
            const checkPreloadLogin = () => {
                if (document.querySelector('input[type="password"]') ||
                    document.body.innerText.includes('Login') ||
                    document.body.innerText.includes('Sign in')) {
                    // If login needed we don't alert loudly as this is a background speedup task
                    console.warn('⚠️ Login needed for preload data.');
                    return true;
                }
                return false;
            };

            let preloadProcessed = false;
            let authToken = null;
            const originalFetchPreload = unsafeWindow.fetch;

            // Reusable extractToken logic
            const extractTokenInner = (initObj) => {
                if (authToken) return;
                if (initObj && initObj.headers) {
                    if (typeof initObj.headers.get === 'function') {
                        const auth = initObj.headers.get('Authorization') || initObj.headers.get('authorization');
                        if (auth && auth.startsWith('JWT ')) authToken = auth;
                    } else {
                        const hdrs = Array.isArray(initObj.headers) ? initObj.headers : Object.entries(initObj.headers);
                        for (const [k, v] of hdrs) {
                            if (k.toLowerCase() === 'authorization' && v.startsWith('JWT ')) {
                                authToken = v;
                                break;
                            }
                        }
                    }
                }
            };

            unsafeWindow.fetch = async function (input, init) {
                let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');

                extractTokenInner(init);
                if (input instanceof Request) {
                    extractTokenInner(input);
                }

                // Intercept the reservations API call and expand date range
                if (url.includes('/api/v4/status/reservations/') && !preloadProcessed) {
                    try {
                        const urlObj = new URL(url);
                        urlObj.searchParams.set('page_size', '200');
                        urlObj.searchParams.set('check_in_date_from', dateFrom + 'T00:00:00');
                        urlObj.searchParams.set('check_in_date_until', dateTo + 'T23:59:59');

                        const modifiedUrl = urlObj.toString();
                        console.log('📋 Preload All: Fetching reservations batch:', modifiedUrl);

                        if (input instanceof Request) {
                            input = new Request(modifiedUrl, input);
                        } else {
                            input = modifiedUrl;
                        }
                    } catch (e) {
                        console.error('Error modifying preload check URL:', e);
                    }
                }

                const response = await originalFetchPreload(input || url, init);

                if (url.includes('/api/v4/status/reservations/') && !preloadProcessed) {
                    const clone = response.clone();
                    clone.json().then(async data => {
                        if (preloadProcessed) return;
                        preloadProcessed = true;

                        if (!authToken) {
                            console.warn('📋 Preload All: Auth token not captured, cannot fetch guest details!');
                            setTimeout(() => window.close(), 2000);
                            return;
                        }

                        if (data.results && data.results.length > 0) {
                            console.log(`📋 Preload All: Processing ${data.results.length} reservations...`);

                            let concurrentLimit = 3; // Keep concurrency low to avoid rate limits

                            for (let i = 0; i < data.results.length; i += concurrentLimit) {
                                const chunk = data.results.slice(i, i + concurrentLimit);

                                const chunkPromises = chunk.map(async (res) => {
                                    // Skip if no guests
                                    if (!res.guests || res.guests.startsWith("0/")) return;

                                    try {
                                        const guestRes = await originalFetchPreload(
                                            "https://a.chekin.io/api/v3/guest-groups/" + res.guest_group_id + "/",
                                            init
                                        );

                                        if (!guestRes.ok) return;
                                        const guestDataJson = await guestRes.json();

                                        if (guestDataJson.members && guestDataJson.members.length > 0) {
                                            const mappedGuestData = guestDataJson.members.map(guest => ({
                                                full_name: guest.full_name || ((guest.name || '') + ' ' + (guest.surname || '')).trim(),
                                                first_name: guest.name || '',
                                                last_name: guest.surname || '',
                                                second_surname: guest.second_surname || '',
                                                email: guest.email || '',
                                                phone: guest.phone?.number ? ((guest.phone.code || '') + guest.phone.number).replace(/\s+/g, '') : (typeof guest.phone === 'string' ? guest.phone.replace(/\s+/g, '') : ''),
                                                gender: guest.gender?.value === 'M' ? 'Male' : (guest.gender?.value === 'F' ? 'Female' : (guest.gender?.value === 'O' ? 'Other' : '')),
                                                document_type_raw: guest.document_type?.value || guest.document_type?.label || '',
                                                document_number: guest.document_number || guest.document?.number || 'N/A',
                                                nationality: guest.nationality?.name || '',
                                                date_of_birth: guest.birth_date ? guest.birth_date.split('-').reverse().join('/') : '',
                                                date_of_issue: guest.document_issue_date ? guest.document_issue_date.split('-').reverse().join('/') : '',
                                                expiry_date: guest.document_expiration_date ? guest.document_expiration_date.split('-').reverse().join('/') : '',
                                                address: guest.residence_address || guest.residence?.address || '',
                                                city: guest.residence_city || guest.residence?.city || '',
                                                province: guest.residence_province?.name || guest.residence?.details?.division_level_2?.name_es || guest.residence?.details?.division_level_2?.name_eng || '',
                                                country: guest.residence_country?.name || guest.residence?.country?.name || '',
                                                country_code: guest.residence_country?.alpha_3 || guest.residence?.country?.alpha_3 || '',
                                                post_code: guest.residence_postal_code || guest.residence?.postal_code || '',
                                                raw_data: guest
                                            }));

                                            const link = "https://dashboard.chekin.com/bookings/" + res.id;

                                            const entry = {
                                                status: 'success',
                                                timestamp: Date.now(),
                                                data: mappedGuestData,
                                                link: link,
                                                signupFormLink: null
                                            };

                                            // Save to GM storage just like showChekin expects 'chekin_response' format!
                                            if (res.booking_reference) GM_setValue(CONFIG.STORAGE_PREFIX + 'ref_' + res.booking_reference, entry);
                                            if (res.external_id) GM_setValue(CONFIG.STORAGE_PREFIX + 'ref_' + res.external_id, entry);
                                            if (res.external_booking_reference) GM_setValue(CONFIG.STORAGE_PREFIX + 'ref_' + res.external_booking_reference, entry);
                                            if (res.reference) GM_setValue(CONFIG.STORAGE_PREFIX + 'ref_' + res.reference, entry);

                                            console.log('✅ Preloaded caching for:', res.booking_reference || res.external_id);
                                        }
                                    } catch (err) {
                                        console.error('Error preloading guest for', res.id, err);
                                    }
                                });

                                await Promise.all(chunkPromises);
                            }

                            console.log('🚀 Preload All Complete!');
                        }

                        setTimeout(() => window.close(), 2000);
                    }).catch(err => {
                        console.error('📋 Preload All: Error parsing response:', err);
                        setTimeout(() => window.close(), 2000);
                    });
                }

                return response;
            };

            // Check login after page loads
            setTimeout(() => {
                if (checkPreloadLogin()) {
                    setTimeout(() => window.close(), 2000);
                }
            }, 5000);

            return; // Don't execute normal search/create logic
        }



        // Check login status
        const checkLoginStatus = () => {
            if (document.querySelector('input[type="password"]') ||
                document.body.innerText.includes('Login') ||
                document.body.innerText.includes('Sign in')) {
                GM_setValue('chekin_response', { status: 'login_required' });
                return true;
            }
            return false;
        };

        if (isAutoSearch) {
            // Validate request freshness
            const request = GM_getValue('chekin_request');
            if (!request || (Date.now() - request.timestamp > 90000)) {
                console.log('🚫 Request expired or not found');
                return;
            }
        }

        let createRequest = null;
        if (isAutoCreate) {
            createRequest = GM_getValue('chekin_create_request');
            if (!createRequest || (Date.now() - createRequest.timestamp > 90000)) {
                console.log('🚫 Create request expired or not found');
                return;
            }
        }

        // Storage for intercepted data
        window.INTERCEPTED_RESERVATIONS = [];
        let dataProcessed = false;
        let authToken = null;

        // Save the original fetch function
        const originalFetch = unsafeWindow.fetch;

        // Extract JWT token from fetch arguments if possible
        const extractToken = (init) => {
            if (authToken) return;
            if (init && init.headers) {
                if (typeof init.headers.get === 'function') {
                    const auth = init.headers.get('Authorization') || init.headers.get('authorization');
                    if (auth && auth.startsWith('JWT ')) authToken = auth;
                } else {
                    const hdrs = Array.isArray(init.headers) ? init.headers : Object.entries(init.headers);
                    for (const [k, v] of hdrs) {
                        if (k.toLowerCase() === 'authorization' && v.startsWith('JWT ')) {
                            authToken = v;
                            break;
                        }
                    }
                }
            }
        };

        // Execute creation flow
        const executeCreation = async () => {
            if (!authToken) {
                console.error("No auth token captured yet for creation flow");
                setTimeout(executeCreation, 500); // Retry until token captured
                return;
            }
            if (dataProcessed) return;
            dataProcessed = true;

            try {
                const fetchOpts = {
                    method: "GET",
                    headers: {
                        "accept": "application/json, text/plain, */*",
                        "authorization": authToken
                    }
                };

                // 1. Fetch housings
                const housingRes = await originalFetch("https://a.chekin.io/api/v3/housings/?page=1&name=&field_set=id,name", fetchOpts);
                const housingData = await housingRes.json();
                if (!housingData.results || housingData.results.length === 0) {
                    throw new Error("No properties found in Chekin");
                }
                const housingId = housingData.results[0].id; // Pick first housing

                // 2. Fetch rooms
                const roomsRes = await originalFetch(`https://a.chekin.io/api/v4/housings-booking-page/${housingId}/`, fetchOpts);
                const roomsData = await roomsRes.json();

                // Map rooms from LH to Chekin
                const mappedRooms = [];
                const chekinRooms = roomsData.rooms || [];
                for (const lhRoom of (createRequest.rooms || [])) {
                    const lhNorm = (lhRoom || '').toString().trim().toLowerCase();
                    const match = chekinRooms.find(r =>
                        (r.external_id && r.external_id.toLowerCase() === lhNorm) ||
                        (r.number && r.number.toLowerCase() === lhNorm) ||
                        (r.name && r.name.toLowerCase() === lhNorm) ||
                        (r.name && r.name.toLowerCase().includes(lhNorm)) ||
                        (lhNorm && r.number && lhNorm.includes(r.number.toLowerCase()))
                    );
                    if (match) {
                        mappedRooms.push({ id: match.id, external_id: lhRoom });
                    } else {
                        console.warn(`⚠️ No Chekin room match for LH room "${lhRoom}". Available:`, chekinRooms.map(r => r.name || r.number));
                    }
                }

                // Default contract date to today if not provided
                const contractDate = new Date().toISOString().split('T')[0];

                // 3. Create reservation
                const numberOfGuests = parseInt(createRequest.numberOfGuests, 10) || 1;
                console.log('📦 Room mapping result:', { requestedRooms: createRequest.rooms, mappedRooms, availableRooms: roomsData.rooms?.map(r => ({ id: r.id, name: r.name, number: r.number, external_id: r.external_id })) });

                const resPayload = {
                    "default_phone_number": createRequest.phone || "",
                    "default_invite_email": createRequest.email || "",
                    "default_email_language": "spa",
                    "check_in_date": createRequest.checkInDate,
                    "check_out_date": createRequest.checkOutDate,
                    "price": null,
                    "deposit": null,
                    "default_leader_full_name": createRequest.fullName || "",
                    "housing_id": housingId,
                    "guest_group": {
                        "members": [],
                        "number_of_guests": numberOfGuests
                    },
                    "rooms": mappedRooms,
                    "source_name": createRequest.sourceName || "Little Hotelier",
                    "booking_reference": createRequest.targetRef || "",
                    "external_id": createRequest.targetRef || "",
                    "payment_method": "EFECT",
                    "contract_date": contractDate
                };

                const createRes = await originalFetch("https://a.chekin.io/api/v3/reservations/", {
                    method: "POST",
                    headers: {
                        "accept": "application/json, text/plain, */*",
                        "content-type": "application/json",
                        "authorization": authToken
                    },
                    body: JSON.stringify(resPayload)
                });

                if (!createRes.ok) {
                    const errorText = await createRes.text();
                    throw new Error("Failed to create: " + errorText);
                }

                const createdData = await createRes.json();

                // 4. Set email settings
                await originalFetch("https://a.chekin.io/api/v3/email-sending-settings/", {
                    method: "POST",
                    headers: {
                        "accept": "application/json, text/plain, */*",
                        "content-type": "application/json",
                        "authorization": authToken
                    },
                    body: JSON.stringify({
                        "is_sending_after_reservation_created_enabled": true,
                        "is_sending_one_week_before_check_in_enabled": false,
                        "is_sending_72_hours_before_check_in_enabled": true,
                        "is_sending_48_hours_before_check_in_enabled": false,
                        "is_sending_24_hours_before_check_in_enabled": true,
                        "is_sending_enabled": true,
                        "reservation": createdData.id,
                        "type": "CH_ONLINE"
                    })
                }).catch(e => console.warn("Email settings failed:", e));

                // 5. Fetch signup form link
                let signupFormLink = null;
                try {
                    const lightRes = await originalFetch(
                        `https://a.chekin.io/api/v3/light/reservations/${createdData.id}/`,
                        fetchOpts
                    );
                    const lightData = await lightRes.json();
                    signupFormLink = lightData.signup_form_link || null;
                    console.log('📋 Signup form link:', signupFormLink);
                } catch (e) {
                    console.warn('Could not fetch signup form link:', e);
                }

                // Success
                GM_setValue('chekin_response', {
                    status: 'created',
                    link: `https://dashboard.chekin.com/bookings/${createdData.id}`,
                    signupFormLink
                });
                console.log("✅ Reservation created successfully", createdData);
                setTimeout(() => window.close(), 2000);

            } catch (err) {
                console.error("Error creating reservation", err);
                GM_setValue('chekin_response', { status: 'error', msg: err.message });
                setTimeout(() => window.close(), 3000);
            }
        };

        // Overwrite fetch
        async function newFetch(input, init) {
            let url = input;

            extractToken(init);

            if (input instanceof Request) {
                url = input.url;
                extractToken(input);
            }

            if (isAutoCreate) {
                // If we are in autocreate mode, trigger execution once we capture auth
                if (authToken && !dataProcessed) {
                    executeCreation();
                }
            }

            // Intercept reservations API call
            if (typeof url === 'string' && url.includes('/api/v4/status/reservations/')) {
                console.log('🕵️ Intercepted Reservations API Call!');

                try {
                    const urlObj = new URL(url);
                    urlObj.searchParams.set('page_size', '50');
                    urlObj.searchParams.set('check_in_date_from', targetDate + 'T00:00:00');
                    urlObj.searchParams.set('check_in_date_until', targetDate + 'T23:59:59');

                    url = urlObj.toString();
                    console.log('⚡ Modified URL to:', url);

                    if (input instanceof Request) {
                        input = new Request(url, input);
                    } else {
                        input = url;
                    }
                } catch (e) {
                    console.error('Error modifying URL:', e);
                }
            }

            const response = await originalFetch(input || url, init);

            if (isAutoCreate) return response; // Skip interception payload parsing on autosearch logic if autocreating

            // Capture reservation list data
            if (isAutoSearch && typeof url === 'string' && url.includes('/api/v4/status/reservations/') && !dataProcessed) {
                const clone = response.clone();

                clone.json().then(async data => {
                    if (dataProcessed) return;

                    console.log('📦 Captured Reservations:', data);

                    if (data.results) {
                        window.INTERCEPTED_RESERVATIONS = data.results;

                        // Find reservation matching targetRef OR any of our target rooms
                        let targetReservation = null;
                        if (targetRef) {
                            // Check multiple possible field names for the booking reference
                            const matchByRef = (r) => {
                                const fields = [r.external_id, r.booking_reference, r.external_booking_reference, r.reference];
                                return fields.some(f => f && (
                                    f === targetRef ||
                                    targetRef.includes(f) ||
                                    f.includes(targetRef)
                                ));
                            };
                            targetReservation = data.results.find(matchByRef);

                            // Debug: log what reference fields each reservation has
                            console.log('🔍 Search matching - targetRef:', targetRef);
                            data.results.forEach((r, i) => {
                                console.log(`  Reservation ${i}:`, {
                                    id: r.id,
                                    external_id: r.external_id,
                                    booking_reference: r.booking_reference,
                                    external_booking_reference: r.external_booking_reference,
                                    reference: r.reference,
                                    rooms: r.rooms?.map(rm => rm.number),
                                    guests: r.guests
                                });
                            });
                        }

                        if (!targetReservation) {
                            targetReservation = data.results.find(r =>
                                r.rooms && r.rooms.some(roomObj =>
                                    targetRooms.includes(roomObj.number)
                                )
                            );
                        }

                        if (!targetReservation) {
                            console.warn(`No reservation found for rooms ${targetRooms.join(', ')} on ${targetDate}`);
                            GM_setValue('chekin_response', { status: 'not_found' });
                            setTimeout(() => window.close(), 2000);
                            return;
                        }

                        const link = "https://dashboard.chekin.com/bookings/" + targetReservation.id;
                        let signupFormLink = null;

                        // Fetch signup form link from light reservation endpoint
                        try {
                            const lightReservationResponse = await originalFetch(
                                `https://a.chekin.io/api/v3/light/reservations/${targetReservation.id}/`,
                                init
                            );
                            const lightReservationData = await lightReservationResponse.json();
                            console.log('📦 Light Reservation Data:', lightReservationData);
                            signupFormLink = lightReservationData.signup_form_link || null;
                        } catch (err) {
                            console.error('Error fetching signup form link:', err);
                        }

                        if (targetReservation.guests.startsWith("0/")) {
                            console.warn(`No guests registered yet for rooms ${targetRooms.join(', ')}`);
                            GM_setValue('chekin_response', {
                                status: 'no_guests',
                                link,
                                signupFormLink
                            });
                            setTimeout(() => window.close(), 2000);
                            return;
                        }



                        // Fetch detailed guest data
                        try {
                            const response2 = await originalFetch(
                                "https://a.chekin.io/api/v3/guest-groups/" + targetReservation.guest_group_id + "/",
                                init
                            );
                            const data2 = await response2.json();
                            console.log('📦 Guest Details:', data2);

                            if (data2.members && data2.members.length > 0) {
                                const guestData = data2.members.map(guest => ({
                                    full_name: guest.full_name || ((guest.name || '') + ' ' + (guest.surname || '')).trim(),
                                    first_name: guest.name || '',
                                    last_name: guest.surname || '',
                                    second_surname: guest.second_surname || '',
                                    email: guest.email || '',
                                    phone: guest.phone?.number ? ((guest.phone.code || '') + guest.phone.number).replace(/\s+/g, '') : (typeof guest.phone === 'string' ? guest.phone.replace(/\s+/g, '') : ''),
                                    gender: guest.gender?.value === 'M' ? 'Male' : (guest.gender?.value === 'F' ? 'Female' : (guest.gender?.value === 'O' ? 'Other' : '')),
                                    document_type_raw: guest.document_type?.value || guest.document_type?.label || '',
                                    document_number: guest.document_number || guest.document?.number || 'N/A',
                                    nationality: guest.nationality?.name || '',
                                    date_of_birth: guest.birth_date ? guest.birth_date.split('-').reverse().join('/') : '',
                                    date_of_issue: guest.document_issue_date ? guest.document_issue_date.split('-').reverse().join('/') : '',
                                    expiry_date: guest.document_expiration_date ? guest.document_expiration_date.split('-').reverse().join('/') : '',
                                    address: guest.residence_address || guest.residence?.address || '',
                                    city: guest.residence_city || guest.residence?.city || '',
                                    province: guest.residence_province?.name || guest.residence?.details?.division_level_2?.name_es || guest.residence?.details?.division_level_2?.name_eng || '',
                                    country: guest.residence_country?.name || guest.residence?.country?.name || '',
                                    country_code: guest.residence_country?.alpha_3 || guest.residence?.country?.alpha_3 || '',
                                    post_code: guest.residence_postal_code || guest.residence?.postal_code || '',
                                    raw_data: guest
                                }));

                                console.log('📝 Sending Guest Data:', guestData);
                                GM_setValue('chekin_response', {
                                    status: 'success',
                                    data: guestData,
                                    link,
                                    signupFormLink
                                });
                                dataProcessed = true;
                                setTimeout(() => window.close(), 2000);
                            }
                        } catch (err) {
                            console.error('Error fetching guest details:', err);
                            GM_setValue('chekin_response', { status: 'error', msg: err.message, link, signupFormLink });
                        }
                    }
                }).catch(err => console.error('Error reading JSON:', err));
            }

            return response;
        };

        unsafeWindow.fetch = newFetch;
        // Check login after page loads
        setTimeout(() => {
            if (checkLoginStatus()) return;
        }, 5000);
    }

}

//setTimeout(run, 4000);
run();
