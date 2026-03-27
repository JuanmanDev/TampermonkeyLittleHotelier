// ==UserScript==
// @name         LH Front Desk - Show Chekin data for reservation
// @namespace    Hotelier Tools
// @version      1.3.0
// @description  Automate Checkin ID retrieval for Little Hotelier using fetch interception. Loads Checkin guest data into reservation forms, preloads reservation data from the calendar view, and batch-checks for missing Chekin registrations.
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations/*/edit*
// @match        https://application.littlehotelier.com/properties/*/calendar/*
// @match        https://dashboard.chekin.com/bookings?autosearch=true*
// @match        https://dashboard.chekin.com/bookings?autocreate=true*
// @match        https://dashboard.chekin.com/bookings?autobatchcheck=true*
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
            const checkMissingChekinReservations = (reservations) => {
                if (!reservations || !Array.isArray(reservations)) return;

                // Extract propertyId from the calendar URL
                const propMatch = window.location.pathname.match(/\/properties\/([^/]+)\/calendar/);
                const propertyId = propMatch ? propMatch[1] : 'UNKNOWN';

                // Filter out cancelled / declined / no-show
                const activeReservations = reservations.filter(res =>
                    res.status !== 'cancelled'
                    && res.status !== 'declined'
                    && res.status !== 'no_show'
                );

                if (activeReservations.length === 0) return;

                // Find the date range of visible reservations
                const checkInDates = activeReservations
                    .map(r => r.checkInDate)
                    .filter(Boolean)
                    .sort();

                if (checkInDates.length === 0) return;

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
                        return;
                    }

                    if (newVal.status === 'login_required') {
                        console.warn('📅 ⚠️ Chekin login required — cannot check missing reservations. Please log in to dashboard.chekin.com');
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
                            return;
                        }

                        console.log(
                            `%c📅 ⚠️ ${missing.length} reservation(s) missing from Chekin (${dateFrom} — ${dateTo})`,
                            'font-weight: bold; color: #ff9800; font-size: 13px'
                        );
                        console.groupCollapsed(`📅 Click to see ${missing.length} reservation(s) without Chekin registration`);
                        for (const res of missing) {
                            const editUrl = `https://app.littlehotelier.com/extranet/properties/${propertyId}/reservations/${res.uuid}/edit`;
                            const name = `${res.firstName || ''} ${res.lastName || ''}`.trim() || '(no name)';
                            console.log(
                                `%c${name}%c — ref: ${res.bookingReferenceId || '(none)'} — ${res.checkInDate || '?'} → ${res.checkOutDate || '?'}\n%c${editUrl}`,
                                'font-weight: bold; color: #2196F3',
                                'color: inherit',
                                'color: #666; text-decoration: underline'
                            );
                        }
                        console.groupEnd();
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
                    checkMissingChekinReservations(event.data.reservations);
                }
            });

            // Inject fetch interceptor into the page context
            const injectCalendarInterceptor = () => {
                if (document.head || document.documentElement) {
                    const target = document.head || document.documentElement;
                    const script = document.createElement('script');
                    script.textContent = `
                        (function() {
                            const originalFetch = window.fetch;

                            window.fetch = async function(...args) {
                                const response = await originalFetch.apply(this, args);

                                try {
                                    const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
                                    const body = args[1]?.body;

                                    // Detect GraphQL reservations query
                                    if (url.includes('/extranet-beef/api/graphql') && body) {
                                        let parsedBody;
                                        try {
                                            parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
                                        } catch(e) { /* not JSON */ }

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
                                            }).catch(function(err) {
                                                console.warn('📅 LH Calendar: Error parsing GraphQL response', err);
                                            });
                                        }
                                    }
                                } catch(e) {
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
                    }).catch(() => {});

                    const originalOpen = XMLHttpRequest.prototype.open;
                    XMLHttpRequest.prototype.open = function(method, url) {
                        this.addEventListener('load', function() {
                            if (typeof url === 'string' && url.includes('/reservations/') && url.includes('form-info=true')) {
                                try {
                                    const data = JSON.parse(this.responseText);
                                    if (data && data.booking_reference_id) {
                                        document.documentElement.setAttribute('data-lh-booking-ref', data.booking_reference_id);
                                        console.log('🏨 Got booking reference ID from XHR API:', data.booking_reference_id);
                                    }
                                } catch (e) {}
                            }
                        });
                        originalOpen.apply(this, arguments);
                    };

                    const originalFetchLH = window.fetch;
                    if (originalFetchLH) {
                        window.fetch = async function(...args) {
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
                                    }).catch(e => {});
                                }
                            } catch (e) {}
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
            const fullName = `${firstName} ${lastName}`.trim();
            const email = document.querySelector('#guest_email')?.value || '';
            const phone = document.querySelector('#guest_phone_number')?.value || '';

            // Get guests count
            const adults = parseInt(document.querySelector('#reservation_number_adults')?.value || '1', 10);
            const children = parseInt(document.querySelector('#reservation_number_children')?.value || '0', 10);
            const numberOfGuests = (adults + children).toString();

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

            // Create cache key based on date and room
            const cacheKey = CONFIG.STORAGE_PREFIX + btoa(`${checkInDate}_${rooms.join('_')}`);
            const cachedData = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            const now = Date.now();

            if (cachedData && cachedData?.data?.length && (now - cachedData.timestamp < CONFIG.CACHE_DURATION)) {
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

        const triggerVueUpdate = (element, newValue) => {
            if (!element) return;
            const isSelect = element.tagName === 'SELECT';
            const prototype = isSelect ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
            if (setter) {
                setter.call(element, newValue);
            } else {
                element.value = newValue; // Fallback
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            element.dispatchEvent(new Event('focusout', { bubbles: true }));
        };

        const normalizeString = (str) => {
            return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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

            const primaryForm = document.querySelector('.primary-contact-panel');
            if (primaryForm) {
                const fnameInput = primaryForm.querySelector('#guest_first_name');
                const lnameInput = primaryForm.querySelector('#guest_last_name');
                if (fnameInput && lnameInput) {
                    const normFName = normalizeString(fnameInput.value);
                    const normLName = normalizeString(lnameInput.value);
                    if (normFName && normLName) {
                        const isMatchFirst = normFName.includes(normGuestFirst) || normGuestFirst.includes(normFName);
                        const isMatchLast = normLName.includes(normalizeString(guest.last_name)) || normalizeString(guest.last_name).includes(normLName);
                        if (isMatchFirst && isMatchLast) {
                            return primaryForm;
                        }
                    }
                }
            }

            const forms = Array.from(document.querySelectorAll('.guest-form'));
            for (const form of forms) {
                const fNameInput = form.querySelector('input[name="first_name"]');
                const lNameInput = form.querySelector('input[name="last_name"]');
                if (!fNameInput && !lNameInput) continue;

                const normFName = normalizeString(fNameInput.value);
                const normLName = normalizeString(lNameInput.value);

                if (normFName && normLName) {
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
                    const checkFields = [
                        { name: 'email', val: guest.email },
                        { name: 'phone_number', val: guest.phone },
                        { name: 'id_number', val: guest.document_number },
                        { name: 'nationality', val: guest.nationality },
                        { name: 'date_of_birth', val: guest.date_of_birth },
                        { name: 'city', val: guest.city },
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

        const fillGuestForm = async (guest) => {
            let forms = document.querySelectorAll('.guest-form');
            let targetForm = findMatchingGuestForm(guest);

            if (!targetForm) {
                for (let i = forms.length - 1; i >= 0; i--) {
                    const fname = forms[i].querySelector('input[name="first_name"]')?.value;
                    const lname = forms[i].querySelector('input[name="last_name"]')?.value;
                    if (!fname && !lname) {
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
                    forms = document.querySelectorAll('.guest-form');
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

            const fieldMapping = [
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
                { name: 'address', id: 'guest_address', val: guest.address },
                { name: 'country', id: 'guest_country', val: guest.country },
                { name: 'city', id: 'guest_city', val: guest.city },
                { name: 'state', id: 'guest_state', val: guest.province },
                { name: 'post_code', id: 'guest_post_code', val: guest.post_code }
            ];

            for (const field of fieldMapping) {
                if (!field.val) continue;
                let input = targetForm.querySelector(`input[name="${field.name}"], select[name="${field.name}"], input[id="${field.id}"], select[id="${field.id}"]`);
                if (input) {
                    triggerVueUpdate(input, field.val);
                }
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
                    for (const guest of data) {
                        await fillGuestForm(guest);
                        updateGuestButtonsState(container, data);
                        await new Promise(r => setTimeout(r, 600));
                    }
                };
            }

            let buttons = container.querySelectorAll('button.use');
            let fillButtons = container.querySelectorAll('button.fill-guest');

            fillButtons.forEach((btn, index) => {
                btn.onclick = async (evt) => {
                    evt.preventDefault();
                    await fillGuestForm(data[index]);
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
        const targetDate = urlParams.get('date');
        const targetRooms = urlParams.get('rooms')?.split(',') || [];
        const targetRef = urlParams.get('ref') || '';

        if (!isAutoSearch && !isAutoCreate && !isAutoBatchCheck) return;

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

                        console.log('📋 Batch check: DONE — response sent. Tab will stay open for debugging.');
                        debugger; // ← Open DevTools in this tab to pause here and inspect logs
                        setTimeout(() => window.close(), 30000); // 30s to allow debugging
                    }).catch(err => {
                        console.error('📋 Batch check: Error parsing response:', err);
                        GM_setValue('chekin_batch_response', { status: 'error', msg: err.message });
                        debugger; // ← Open DevTools in this tab to pause here and inspect logs
                        setTimeout(() => window.close(), 30000); // 30s to allow debugging
                    });
                }

                return response;
            };

            // Check login after page loads
            setTimeout(() => {
                if (checkBatchLogin()) {
                    debugger; // ← Open DevTools in this tab to pause here and inspect logs
                    setTimeout(() => window.close(), 30000); // 30s to allow debugging
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
