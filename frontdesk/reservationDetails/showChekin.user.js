// ==UserScript==
// @name         LH Front Desk - Show Chekin data for reservation
// @namespace    Hotelier Tools
// @version      1.5.0
// @description  Automate Checkin ID retrieval for Little Hotelier. Calls the Chekin API directly with the dashboard session (falls back to a background Chekin tab), loads Checkin guest data into reservation forms, preloads reservation data from the calendar view, and batch-checks for missing Chekin registrations.
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations/*/edit*
// @match        https://application.littlehotelier.com/properties/*/calendar/*
// @match        https://dashboard.chekin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        window.close
// @connect      a.chekin.io
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
            waitingPlease: 'Please wait, do not close the reservation until finished',
            allSaved: 'All data saved, press the save button to confirm',
            noResponse: '⚠️ Chekin did not respond. Your Chekin session has probably expired.',
            loginHint: 'Log in to Chekin and this panel will refresh automatically.',
            retry: '🔄 Retry',
            creating: 'Creating reservation in Chekin...',
            created: '✅ Reservation created in Chekin!',
            creationFailed: '❌ Creation failed',
            guestsFromOtherBooking: 'ℹ️ Guests loaded from Chekin booking {source} ({name}). The Chekin booking {primary} linked to this reservation has no guests — it may be a duplicate.',
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
            waitingPlease: 'Espere por favor, no cierre la reserva hasta terminar',
            allSaved: 'Todos los datos guardados, pulse el boton de guardar para confirmar',
            noResponse: '⚠️ Chekin no respondió. Probablemente la sesión de Chekin ha caducado.',
            loginHint: 'Inicie sesión en Chekin y este panel se actualizará automáticamente.',
            retry: '🔄 Reintentar',
            creating: 'Creando reserva en Chekin...',
            created: '✅ ¡Reserva creada en Chekin!',
            creationFailed: '❌ Error al crear',
            guestsFromOtherBooking: 'ℹ️ Huéspedes cargados desde la reserva de Chekin {source} ({name}). La reserva de Chekin {primary} vinculada a esta reserva no tiene huéspedes — puede ser un duplicado.',
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

    const normalizeString = (str) => {
        return (str || '').normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    };

    // ========================================================================
    // SHARED: Chekin API client
    // The Chekin dashboard keeps a short-lived JWT (~1 hour) in localStorage.user.
    // Any dashboard tab copies it into GM storage, so LH pages can call the API
    // directly with GM_xmlhttpRequest. Without a fresh token, jobs run in a
    // background dashboard tab instead (see runChekinJobInTab / CHEKIN WORKER).
    // ========================================================================
    const CHEKIN_API = 'https://a.chekin.io/api';
    const CHEKIN_BOOKING_URL = `https://${CONFIG.CHEKIN_DOMAIN}/bookings/`;
    const CHEKIN_TOKEN_KEY = 'chekin_auth_token';
    const CHEKIN_JOB_PREFIX = 'chekin_job_';
    const CHEKIN_RESULT_PREFIX = 'chekin_job_result_';

    const getJwtExpiry = (token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            return payload.exp ? payload.exp * 1000 : 0;
        } catch (e) {
            return 0;
        }
    };

    // Keep a margin so a job never starts with a token that expires mid-way
    const isTokenFresh = (token, marginMs = 2 * 60 * 1000) => !!token && getJwtExpiry(token) - marginMs > Date.now();

    const getCachedChekinToken = () => {
        const token = GM_getValue(CHEKIN_TOKEN_KEY, null);
        return isTokenFresh(token) ? token : null;
    };

    const chekinRequest = (token, path, { method = 'GET', body = null } = {}) => new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method,
            url: CHEKIN_API + path,
            headers: {
                'accept': 'application/json, text/plain, */*',
                'authorization': 'JWT ' + token,
                ...(body ? { 'content-type': 'application/json' } : {})
            },
            data: body ? JSON.stringify(body) : undefined,
            timeout: 30000,
            onload: (res) => {
                if (res.status === 401) {
                    const err = new Error('Chekin session expired');
                    err.authError = true;
                    return reject(err);
                }
                if (res.status < 200 || res.status >= 300) {
                    const err = new Error(`Chekin API HTTP ${res.status}: ${(res.responseText || '').slice(0, 300)}`);
                    err.httpStatus = res.status;
                    return reject(err);
                }
                try {
                    resolve(res.responseText ? JSON.parse(res.responseText) : null);
                } catch (e) {
                    reject(new Error('Invalid JSON from Chekin API'));
                }
            },
            onerror: () => reject(new Error('Network error calling Chekin API')),
            ontimeout: () => reject(new Error('Chekin API request timed out'))
        });
    });

    const fetchChekinReservations = async (token, dateFrom, dateTo) => {
        const PAGE_SIZE = 100;
        const MAX_PAGES = 10;
        const all = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
            const qs = new URLSearchParams({
                page: String(page),
                page_size: String(PAGE_SIZE),
                check_in_date_from: dateFrom + 'T00:00:00',
                check_in_date_until: dateTo + 'T23:59:59',
                is_housing_deactivated: 'true'
            });
            let data;
            try {
                data = await chekinRequest(token, '/v4/status/reservations/?' + qs);
            } catch (err) {
                if (page > 1 && err.httpStatus === 404) break; // Past the last page
                throw err;
            }
            const results = data?.results || [];
            all.push(...results);
            // `count` is not reliable (the API reports 999999999), so stop on a short page
            if (results.length < PAGE_SIZE) break;
        }
        return all;
    };

    const mapChekinGuest = (guest) => ({
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
        post_code: guest.residence_postal_code || guest.residence?.postal_code || ''
    });

    const fetchChekinGuests = async (token, guestGroupId) => {
        if (!guestGroupId) return [];
        const group = await chekinRequest(token, `/v3/guest-groups/${guestGroupId}/`);
        return (group?.members || []).map(mapChekinGuest);
    };

    const fetchChekinSignupLink = async (token, reservationId) => {
        try {
            const light = await chekinRequest(token, `/v3/light/reservations/${reservationId}/`);
            return light?.signup_form_link || null;
        } catch (e) {
            console.warn('Could not fetch signup form link:', e);
            return null;
        }
    };

    // "2/3" → 2 guests registered
    const registeredGuests = (res) => parseInt(String(res?.guests || '0').split('/')[0], 10) || 0;

    const getChekinRefs = (res) => [res.external_id, res.booking_reference, res.external_booking_reference, res.reference]
        .filter(Boolean).map(String);

    const chekinRefMatches = (res, ref) => {
        const target = (ref || '').toLowerCase().trim();
        if (!target) return false;
        return getChekinRefs(res).some(field => {
            const value = field.toLowerCase().trim();
            if (value === target) return true;
            // Partial match only for long refs (e.g. "BDC-5302455580" vs "5302455580")
            return value.length >= 6 && target.length >= 6 && (value.includes(target) || target.includes(value));
        });
    };

    // Keys used for the per-ref guest cache: the raw refs plus refs without a channel prefix ("BDC-123" → "123")
    const chekinCacheRefs = (res) => {
        const refs = new Set();
        for (const ref of getChekinRefs(res)) {
            refs.add(ref);
            const unprefixed = ref.match(/^[A-Za-z]{2,5}-(.{6,})$/);
            if (unprefixed) refs.add(unprefixed[1]);
        }
        return [...refs];
    };

    const nameTokens = (name) => normalizeString(name).split(/[^a-z0-9]+/).filter(w => w.length >= 3);

    // Chekin and LH often spell the leader name differently ("MIRIAn CAMPOS DIEZ" vs "Miriam Campos Díez"),
    // so compare significant words instead of the whole string.
    const namesLikelySamePerson = (a, b) => {
        const ta = nameTokens(a);
        const tb = nameTokens(b);
        if (!ta.length || !tb.length) return false;
        const shared = ta.filter(w => tb.includes(w)).length;
        if (ta.length >= 2 && tb.length >= 2) return shared >= 2;
        return ta.length === tb.length && shared === ta.length;
    };

    const buildOtherBookingNotice = (primary, source) => ({
        primary: getChekinRefs(primary)[0] || primary.id,
        source: getChekinRefs(source)[0] || source.id,
        name: source.guest_leader_name || ''
    });

    const chekinSearch = async (token, { date, rooms = [], ref = '', guestName = '' }) => {
        const list = await fetchChekinReservations(token, date, date);
        console.log(`🔍 Chekin search ${date} ref=${ref} name=${guestName}:`, list.map(r => ({
            id: r.id, refs: getChekinRefs(r), name: r.guest_leader_name, rooms: r.rooms?.map(rm => rm.number), guests: r.guests
        })));

        const byRef = list.find(r => chekinRefMatches(r, ref)) || null;
        const byName = list.filter(r => r !== byRef && namesLikelySamePerson(r.guest_leader_name, guestName));
        const byRoom = list.find(r => (r.rooms || []).some(rm => rooms.includes(String(rm.number))));

        const primary = byRef || byName.find(r => registeredGuests(r) > 0) || byName[0] || byRoom;
        if (!primary) return { status: 'not_found' };

        // Guests often register on the OTA booking (e.g. BDC-...) while LH points to an empty duplicate
        const source = registeredGuests(primary) > 0
            ? primary
            : (byName.find(r => r !== primary && registeredGuests(r) > 0) || null);

        const signupFormLink = await fetchChekinSignupLink(token, primary.id);
        const primaryLink = CHEKIN_BOOKING_URL + primary.id;

        if (!source) return { status: 'no_guests', link: primaryLink, signupFormLink };

        const data = await fetchChekinGuests(token, source.guest_group_id);
        if (!data.length) return { status: 'no_guests', link: primaryLink, signupFormLink };

        return {
            status: 'success',
            data,
            link: CHEKIN_BOOKING_URL + source.id,
            signupFormLink,
            notice: source !== primary ? buildOtherBookingNotice(primary, source) : null
        };
    };

    const chekinCreate = async (token, request) => {
        // 1. Housing (first property of the account)
        const housingData = await chekinRequest(token, '/v3/housings/?page=1&name=&field_set=id,name');
        if (!housingData?.results?.length) throw new Error('No properties found in Chekin');
        const housingId = housingData.results[0].id;

        // 2. Map LH rooms to Chekin rooms
        const roomsData = await chekinRequest(token, `/v4/housings-booking-page/${housingId}/`);
        const chekinRooms = roomsData?.rooms || [];
        const mappedRooms = [];
        for (const lhRoom of (request.rooms || [])) {
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

        // 3. Create reservation
        const created = await chekinRequest(token, '/v3/reservations/', {
            method: 'POST',
            body: {
                "default_phone_number": request.phone || "",
                "default_invite_email": request.email || "",
                "default_email_language": "spa",
                "check_in_date": request.checkInDate,
                "check_out_date": request.checkOutDate,
                "price": null,
                "deposit": null,
                "default_leader_full_name": request.fullName || "",
                "housing_id": housingId,
                "guest_group": {
                    "members": [],
                    "number_of_guests": parseInt(request.numberOfGuests, 10) || 1
                },
                "rooms": mappedRooms,
                "source_name": request.sourceName || "Little Hotelier",
                "booking_reference": request.targetRef || "",
                "external_id": request.targetRef || "",
                "payment_method": "EFECT",
                "contract_date": new Date().toISOString().split('T')[0]
            }
        });

        // 4. Email settings (non-blocking)
        await chekinRequest(token, '/v3/email-sending-settings/', {
            method: 'POST',
            body: {
                "is_sending_after_reservation_created_enabled": true,
                "is_sending_one_week_before_check_in_enabled": false,
                "is_sending_72_hours_before_check_in_enabled": true,
                "is_sending_48_hours_before_check_in_enabled": false,
                "is_sending_24_hours_before_check_in_enabled": true,
                "is_sending_enabled": true,
                "reservation": created.id,
                "type": "CH_ONLINE"
            }
        }).catch(e => console.warn('Email settings failed:', e));

        console.log('✅ Reservation created in Chekin', created);
        return {
            status: 'created',
            link: CHEKIN_BOOKING_URL + created.id,
            signupFormLink: await fetchChekinSignupLink(token, created.id)
        };
    };

    const chekinBatchCheck = async (token, { dateFrom, dateTo }) => {
        const list = await fetchChekinReservations(token, dateFrom, dateTo);
        return {
            status: 'success',
            reservations: list.map(r => ({
                external_id: r.external_id,
                booking_reference: r.booking_reference,
                external_booking_reference: r.external_booking_reference,
                reference: r.reference,
                guest_leader_name: r.guest_leader_name || '',
                check_in_date: (r.check_in_date || '').slice(0, 10)
            }))
        };
    };

    const chekinPreloadAll = async (token, { dateFrom, dateTo }) => {
        const list = await fetchChekinReservations(token, dateFrom, dateTo);
        const withGuests = list.filter(r => registeredGuests(r) > 0);
        const guestsById = new Map();

        const CONCURRENCY = 3; // Keep concurrency low to avoid rate limits
        for (let i = 0; i < withGuests.length; i += CONCURRENCY) {
            await Promise.all(withGuests.slice(i, i + CONCURRENCY).map(async (res) => {
                try {
                    guestsById.set(res.id, await fetchChekinGuests(token, res.guest_group_id));
                } catch (err) {
                    if (err.authError) throw err;
                    console.error('Error preloading guests for', res.id, err);
                }
            }));
        }

        let stored = 0;
        for (const res of list) {
            const sameDay = (o) => (o.check_in_date || '').slice(0, 10) === (res.check_in_date || '').slice(0, 10);
            const source = registeredGuests(res) > 0
                ? res
                : withGuests.find(o => o !== res && sameDay(o) && namesLikelySamePerson(o.guest_leader_name, res.guest_leader_name));
            const data = source && guestsById.get(source.id);
            if (!data?.length) continue;

            const entry = {
                status: 'success',
                timestamp: Date.now(),
                data,
                link: CHEKIN_BOOKING_URL + source.id,
                signupFormLink: null,
                notice: source !== res ? buildOtherBookingNotice(res, source) : null
            };
            for (const ref of chekinCacheRefs(res)) {
                GM_setValue(CONFIG.STORAGE_PREFIX + 'ref_' + ref, entry);
            }
            stored++;
        }

        console.log(`🚀 Chekin preload complete: ${stored} reservations cached (${list.length} in range)`);
        return { status: 'success', stored };
    };

    const CHEKIN_JOBS = {
        search: chekinSearch,
        create: chekinCreate,
        batch: chekinBatchCheck,
        preload: chekinPreloadAll
    };

    /**
     * Run a job in a background Chekin dashboard tab. The worker in that tab reads the
     * dashboard session, runs the job and posts the result back through GM storage.
     */
    const runChekinJobInTab = (kind, params, { timeoutMs = 60000 } = {}) => new Promise((resolve) => {
        const jobId = kind + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const jobKey = CHEKIN_JOB_PREFIX + jobId;
        const resultKey = CHEKIN_RESULT_PREFIX + jobId;
        let settled = false;
        let timer = null;

        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            GM_removeValueChangeListener(listenerId);
            GM_deleteValue(jobKey);
            GM_deleteValue(resultKey);
            resolve(result);
        };
        const arm = (ms, result) => {
            clearTimeout(timer);
            timer = setTimeout(() => finish(result), ms);
        };

        const listenerId = GM_addValueChangeListener(resultKey, (_key, _oldVal, newVal) => {
            if (!newVal) return;
            if (newVal.status === 'working') {
                arm(timeoutMs, { status: 'error', msg: 'Chekin took too long to answer' });
                return;
            }
            finish(newVal);
        });

        GM_setValue(jobKey, { kind, params, timestamp: Date.now() });
        // The worker acknowledges within a few seconds. Silence means the tab never reached the
        // dashboard (e.g. redirected to the chekin.com login page, where this script doesn't run).
        arm(20000, { status: 'no_response' });
        GM_openInTab(`https://${CONFIG.CHEKIN_DOMAIN}/bookings?lhjob=${encodeURIComponent(jobId)}`, { active: false, insert: true, setParent: true });
    });

    /**
     * Run a Chekin job directly with the cached token, or in a background tab when
     * there is no fresh token. Always resolves with a { status, ... } object.
     */
    const runChekinJob = async (kind, params, options = {}) => {
        const token = getCachedChekinToken();
        if (token) {
            try {
                return await CHEKIN_JOBS[kind](token, params);
            } catch (err) {
                if (!err.authError) return { status: 'error', msg: err.message };
                console.warn('🔑 Cached Chekin token rejected, falling back to a Chekin tab');
                GM_deleteValue(CHEKIN_TOKEN_KEY);
            }
        }
        return runChekinJobInTab(kind, params, options);
    };

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

                    console.log('📅 Preloading Chekin guests for dates:', dateFrom, '→', dateTo);
                    runChekinJob('preload', { dateFrom, dateTo }, { timeoutMs: 120000 })
                        .then(result => console.log('📅 Chekin preload result:', result));
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

                console.log('📅 Checking Chekin reservations for dates:', dateFrom, '→', dateTo);
                runChekinJob('batch', { dateFrom, dateTo }).then(newVal => {
                    console.log('📅 Batch response received:', newVal);

                    if (newVal.status === 'login_required' || newVal.status === 'no_response') {
                        console.warn('📅 ⚠️ Chekin login required — cannot check missing reservations. Please log in to dashboard.chekin.com');
                        alert('⚠️ Chekin login required!\n\nPlease log in to dashboard.chekin.com first, then try again.');
                        GM_openInTab(`https://${CONFIG.CHEKIN_DOMAIN}/bookings`, { active: true });
                        onComplete();
                        return;
                    }

                    if (newVal.status !== 'success') {
                        console.warn('📅 ❌ Chekin batch check failed:', newVal?.msg || 'unknown error');
                        alert('❌ Chekin batch check failed:\n' + (newVal?.msg || 'unknown error'));
                        onComplete();
                        return;
                    }

                    const chekinReservations = newVal.reservations || [];

                    // Find LH reservations NOT matched in Chekin (by booking ref, or by guest name on the same check-in date)
                    const missing = activeReservations.filter(res => {
                        const fullName = ((res.firstName || '') + ' ' + (res.lastName || '')).trim();
                        return !chekinReservations.some(c =>
                            (res.bookingReferenceId && chekinRefMatches(c, res.bookingReferenceId)) ||
                            (c.check_in_date === res.checkInDate && namesLikelySamePerson(c.guest_leader_name, fullName))
                        );
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
                });
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
                        // Logged out of Chekin: don't keep opening background tabs on every calendar move
                        if (!getCachedChekinToken() && Date.now() - (window._chekinLoggedOutAt || 0) < 30 * 60 * 1000) {
                            console.log('📅 Skipping Chekin auto-preload: Chekin session expired (log in to dashboard.chekin.com)');
                            return;
                        }
                        window._lastChekinPreloadReq = { timestamp: Date.now(), dateFrom, dateTo };

                        console.log('📅 Auto-Preloading guests for dates:', dateFrom, '→', dateTo);
                        runChekinJob('preload', { dateFrom, dateTo }, { timeoutMs: 120000 }).then(result => {
                            console.log('📅 Chekin auto-preload result:', result);
                            if (result.status === 'login_required' || result.status === 'no_response') {
                                window._chekinLoggedOutAt = Date.now();
                            }
                        });
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
        
        /* Unified Loading Bar Styles */
        .chekin-loading-row {
            height: 0;
            overflow: hidden;
            opacity: 0;
            transition: height 0.5s ease, opacity 0.3s ease, margin 0.3s ease;
            margin: 0;
        }
        .chekin-loading-row.active {
            height: 45px;
            opacity: 1;
            margin: 10px 0;
        }
        .chekin-progress-container {
            width: 100%;
            height: 8px;
            background: #eee;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
            margin-bottom: 5px;
        }
        .chekin-progress-bar {
            width: 40%;
            height: 100%;
            background: #f0ad4e;
            position: absolute;
            animation: chekinLoadingBar 1.5s infinite linear;
        }
        @keyframes chekinLoadingBar { 
            0% { transform: translateX(-100%); } 
            100% { transform: translateX(250%); } 
        }
        .chekin-loading-text {
            font-size: 13px;
            font-weight: bold;
            color: #666;
            text-align: center;
            display: block;
        }
        </style>
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 5px; position: relative;">
                    <img src="https://f.hubspotusercontent10.net/hubfs/8776616/Logo%20nuevo%20azul-1.png" alt="Chekin" style="height: 24px; position: absolute; left: 0;">
                    <span id="chekin-status" style="font-weight: bold;">${t.checkingCache}</span>
                    <a id="chekin-link" href="undefined" target="_blank" class="btn btn-sm btn-primary" style="display: none; position: absolute; right: 0;">${t.viewInChekin}</a>
                </div>
                <div id="chekin-loading-row" class="chekin-loading-row">
                    <div class="chekin-progress-container">
                        <div class="chekin-progress-bar"></div>
                    </div>
                    <span id="chekin-loading-message" class="chekin-loading-text"></span>
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

            // The booking ref arrives asynchronously (XHR form-info); give it a moment before falling back to the URL UUID
            await waitForBookingRef(3000);
            const targetRef = getTargetRef();

            // Create cache key based on date, room, and ref to isolate per reservation
            const cacheKey = CONFIG.STORAGE_PREFIX + targetRef + '_' + btoa(`${checkInDate}_${rooms.join('_')}`);
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
                renderResults(container, preloadedData.data, preloadedData.link, preloadedData.signupFormLink, preloadedData.notice);
            } else if (cachedData && cachedData?.data?.length && (now - cachedData.timestamp < CONFIG.CACHE_DURATION)) {
                renderResults(container, cachedData.data, cachedData.link, cachedData.signupFormLink, cachedData.notice);
            } else {
                startBackgroundSearch(checkInDate, rooms, container, cacheKey);
            }
        };

        const showLoadingBar = (container, message) => {
            const loadingRow = container.querySelector('#chekin-loading-row');
            const messageSpan = container.querySelector('#chekin-loading-message');
            if (loadingRow && messageSpan) {
                messageSpan.innerText = message || '';
                loadingRow.classList.add('active');
            }
        };

        const hideLoadingBar = (container) => {
            const loadingRow = container.querySelector('#chekin-loading-row');
            if (loadingRow) {
                loadingRow.classList.remove('active');
            }
        };

        // Booking reference - prefer API-captured, fallback to URL path
        const getTargetRef = () => {
            const apiRef = document.documentElement.getAttribute('data-lh-booking-ref') || '';
            const urlMatch = window.location.pathname.match(/\/reservations\/([^/]+)\//);
            return apiRef || (urlMatch ? urlMatch[1] : '');
        };

        const waitForBookingRef = async (maxMs) => {
            const start = Date.now();
            while (!document.documentElement.getAttribute('data-lh-booking-ref') && Date.now() - start < maxMs) {
                await new Promise(r => setTimeout(r, 150));
            }
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

        const setChekinLink = (container, { href, text = t.viewInChekin, onClick = null }) => {
            const checkinLink = container.querySelector('#chekin-link');
            checkinLink.style.display = 'inline-block';
            checkinLink.href = href || 'javascript:void(0)';
            checkinLink.innerText = text;
            checkinLink.target = onClick ? '' : '_blank';
            checkinLink.onclick = onClick ? (e) => { e.preventDefault(); onClick(); } : null;
        };

        const startBackgroundSearch = async (checkInDate, rooms, container, cacheKey) => {
            const statusSpan = container.querySelector('#chekin-status');
            statusSpan.innerHTML = t.searching;
            statusSpan.style.color = 'orange';
            showLoadingBar(container, ''); // Show animation without duplicating the text
            container.querySelector('#chekin-link').style.display = 'none';
            container.querySelectorAll('.btn-login-chekin').forEach(el => el.remove());

            const targetRef = getTargetRef();
            const { fullName } = getReservationData();
            const retry = () => startBackgroundSearch(checkInDate, rooms, container, cacheKey);
            console.log('🏨 Launching Chekin Search, Target Ref:', targetRef, 'Guest:', fullName);

            const result = await runChekinJob('search', {
                date: convertDateFormat(checkInDate),
                rooms,
                ref: targetRef,
                guestName: fullName
            });
            console.log('🏨 Chekin search result:', result);
            hideLoadingBar(container);

            if (result.status === 'success') {
                localStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: Date.now(),
                    data: result.data,
                    link: result.link,
                    signupFormLink: result.signupFormLink,
                    notice: result.notice
                }));
                renderResults(container, result.data, result.link, result.signupFormLink, result.notice);
            }
            else if (result.status === 'no_guests') {
                statusSpan.innerHTML = `${t.noGuestsYet}`;
                statusSpan.style.color = 'orange';
                setChekinLink(container, { href: result.link });
                if (result.signupFormLink) {
                    renderSignupFormLink(container, result.signupFormLink);
                }
            }
            else if (result.status === 'not_found') {
                statusSpan.innerText = t.noMatch;
                statusSpan.style.color = 'red';
                setChekinLink(container, {
                    text: t.createReservation,
                    onClick: () => startBackgroundCreate(getReservationData(), container)
                });
            }
            else if (result.status === 'login_required' || result.status === 'no_response') {
                renderLoginButton(container, result.status === 'no_response' ? t.noResponse : '', retry);
            }
            else {
                statusSpan.innerText = t.error + (result.msg ? ': ' + result.msg : '');
                statusSpan.style.color = 'red';
                setChekinLink(container, { text: t.retry, onClick: retry });
            }
        };

        const startBackgroundCreate = async (resData, container) => {
            const targetRef = getTargetRef();
            console.log('🏨 Create - Booking Reference:', targetRef);
            const payload = {
                ...resData,
                checkInDate: convertDateFormat(resData.checkInDate),
                checkOutDate: convertDateFormat(resData.checkOutDate),
                targetRef
            };
            const retry = () => startBackgroundCreate(getReservationData(), container);

            const statusSpan = container.querySelector('#chekin-status');
            statusSpan.innerHTML = '⏳ ' + t.creating;
            statusSpan.style.color = 'orange';
            showLoadingBar(container, t.creating);
            container.querySelector('#chekin-link').style.display = 'none';
            container.querySelectorAll('.btn-login-chekin').forEach(el => el.remove());

            console.log('🏨 Launching Chekin Create:', payload);
            const result = await runChekinJob('create', payload, { timeoutMs: 90000 });
            hideLoadingBar(container);

            if (result.status === 'created') {
                statusSpan.innerHTML = t.created;
                statusSpan.style.color = 'green';
                setChekinLink(container, { href: result.link });
                if (result.signupFormLink) {
                    renderSignupFormLink(container, result.signupFormLink);
                }
            } else if (result.status === 'login_required' || result.status === 'no_response') {
                renderLoginButton(container, result.status === 'no_response' ? t.noResponse : '', retry);
            } else {
                statusSpan.innerText = t.creationFailed + (result.msg ? ': ' + result.msg : '');
                statusSpan.style.color = 'red';
                setChekinLink(container, { text: t.retry, onClick: retry });
            }
        };

        /**
         * Show the "Login required" button. Once the user logs in to the Chekin dashboard
         * (in any tab), the fresh token lands in GM storage and `onLoggedIn` re-runs the job.
         */
        const renderLoginButton = (container, message, onLoggedIn) => {
            const statusSpan = container.querySelector('#chekin-status');
            if (statusSpan) {
                statusSpan.innerText = message || '';
                statusSpan.style.color = 'red';
            }

            container.querySelectorAll('.btn-login-chekin').forEach(el => el.remove());
            if (container._chekinLoginListener) GM_removeValueChangeListener(container._chekinLoginListener);

            const btn = document.createElement('a');
            btn.className = 'btn btn-danger btn-login-chekin';
            btn.innerText = t.loginRequired;
            btn.href = `https://${CONFIG.CHEKIN_DOMAIN}/bookings`;
            btn.target = '_blank';
            btn.style.cssText = 'display: block; width: fit-content; margin: 10px auto; background: #d9534f; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; font-weight: bold;';
            container.appendChild(btn);

            const hint = document.createElement('div');
            hint.className = 'btn-login-chekin';
            hint.innerText = t.loginHint;
            hint.style.cssText = 'text-align: center; font-size: 12px; color: #666;';
            container.appendChild(hint);

            container._chekinLoginListener = GM_addValueChangeListener(CHEKIN_TOKEN_KEY, (_key, _oldVal, token) => {
                if (!isTokenFresh(token)) return;
                GM_removeValueChangeListener(container._chekinLoginListener);
                container._chekinLoginListener = null;
                container.querySelectorAll('.btn-login-chekin').forEach(el => el.remove());
                console.log('🔑 Chekin login detected, retrying');
                onLoggedIn();
            });
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
                'gipuzcoa': 'Gipuzkoa',
                'araba': 'Álava',
                'alava': 'Álava',
                'coruna': 'A Coruña',
                'la coruna': 'A Coruña',
                'corunna': 'A Coruña',
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
                'pais vasco': 'Bizkaia',
                'basque country': 'Bizkaia',
                'euskadi': 'Gipuzkoa',
                'castellon de la plana': 'Castellón',
                'castello': 'Castellón',
                'alicant': 'Alicante',
                'alacant': 'Alicante',
                'seville': 'Sevilla',
                'saragossa': 'Zaragoza',
                'navarre': 'Navarra',
                'nafarroa': 'Navarra',
                'logrono': 'La Rioja',
                'logroño': 'La Rioja',
                'oviedo': 'Asturias',
                'principado de asturias': 'Asturias',
                'santander': 'Cantabria'
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
                    addAllBtn.className = 'btn btn-sm btn-success fill-all-guests';
                    const confirmText = LANG === 'es' ? 'Pulse Guardar para confirmar' : 'Press Save to confirm';
                    addAllBtn.innerHTML = `✅ ${t.allGuestsSavedBtn || 'All guests loaded'} - ${confirmText}`;
                    addAllBtn.disabled = true;
                    addAllBtn.style.opacity = '1';
                    addAllBtn.style.backgroundColor = '#28a745';
                    addAllBtn.style.borderColor = '#28a745';
                    addAllBtn.style.color = '#fff';
                    addAllBtn.style.cursor = 'default';
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

        const renderResults = (container, data, link, signupFormLink, notice = null) => {
            const statusSpan = container.querySelector('#chekin-status');
            statusSpan.innerHTML = `
                <span style="color: green;">✅ ${t.found} ${data.length} ${t.guests}.</span>
            `;

            setChekinLink(container, { href: link });

            const details = container.querySelector('#chekin-details');
            details.textContent = '';
            if (notice) {
                const noticeDiv = document.createElement('div');
                noticeDiv.style.cssText = 'padding: 8px 10px; background: #fff8e1; border: 1px solid #ffe082; border-radius: 4px; font-size: 12px; color: #6d4c00;';
                noticeDiv.textContent = t.guestsFromOtherBooking
                    .replace('{source}', notice.source)
                    .replace('{name}', notice.name)
                    .replace('{primary}', notice.primary);
                details.appendChild(noticeDiv);
            }

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

                    showLoadingBar(container, t.waitingPlease);

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
                        showLoadingBar(container, `${t.waitingPlease} (${i + 1}/${data.length})`);
                        await fillGuestForm(data[i], null);
                        // Wait for Vue/React re-render + province re-application (longest delay is 1500ms)
                        await new Promise(r => setTimeout(r, 2000));
                        updateGuestButtonsState(container, data);
                    }
                    hideLoadingBar(container);
                };
            }

            let buttons = container.querySelectorAll('button.use');
            let fillButtons = container.querySelectorAll('button.fill-guest');

            fillButtons.forEach((btn, index) => {
                btn.onclick = async (evt) => {
                    evt.preventDefault();
                    showLoadingBar(container, t.waitingPlease);
                    await fillGuestForm(data[index], index);
                    // Wait for Vue re-render + province re-application (longest delay is 1500ms)
                    await new Promise(r => setTimeout(r, 2000));
                    updateGuestButtonsState(container, data);
                    showLoadingBar(container, t.guestSavedBtn || 'Saved');
                    setTimeout(() => hideLoadingBar(container), 3000);
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
    // LOGIC: CHEKIN DASHBOARD (token harvester + background job worker)
    // ========================================================================
    else if (currentHost.includes(CONFIG.CHEKIN_DOMAIN)) {
        const readDashboardToken = () => {
            try {
                return JSON.parse(localStorage.getItem('user') || 'null')?.token || null;
            } catch (e) {
                return null;
            }
        };

        // Share the dashboard session with LH pages, so they can call the Chekin API without opening tabs
        const harvestToken = () => {
            const token = readDashboardToken();
            if (isTokenFresh(token, 0) && token !== GM_getValue(CHEKIN_TOKEN_KEY, null)) {
                GM_setValue(CHEKIN_TOKEN_KEY, token);
                console.log('🔑 Chekin session shared with Little Hotelier');
            }
            return token;
        };
        harvestToken();
        // The app stores a new token in this same tab right after login (no `storage` event), so poll
        setInterval(harvestToken, 5000);
        window.addEventListener('storage', (e) => { if (e.key === 'user') harvestToken(); });

        const jobId = new URLSearchParams(window.location.search).get('lhjob');
        if (!jobId) return;

        console.log('🤖 Chekin Worker Loaded, job:', jobId);
        const job = GM_getValue(CHEKIN_JOB_PREFIX + jobId);
        if (!job || Date.now() - job.timestamp > 5 * 60 * 1000 || !CHEKIN_JOBS[job.kind]) {
            console.log('🚫 Chekin job expired or not found');
            return;
        }

        const resultKey = CHEKIN_RESULT_PREFIX + jobId;
        const closeSoon = (ms = 1500) => setTimeout(() => window.close(), ms);

        // An expired session makes the dashboard redirect to chekin.com (where this script doesn't run),
        // so detect it here, before the app gets the chance to navigate away.
        const token = readDashboardToken();
        if (!isTokenFresh(token, 30000)) {
            console.warn('⚠️ Chekin session expired, login required');
            GM_setValue(resultKey, { status: 'login_required' });
            closeSoon();
            return;
        }

        GM_setValue(resultKey, { status: 'working', timestamp: Date.now() });
        const heartbeat = setInterval(() => {
            GM_setValue(resultKey, { status: 'working', timestamp: Date.now() });
        }, 10000);

        CHEKIN_JOBS[job.kind](token, job.params)
            .catch(err => {
                console.error('❌ Chekin job failed', err);
                return { status: err.authError ? 'login_required' : 'error', msg: err.message };
            })
            .then(result => {
                clearInterval(heartbeat);
                console.log('📝 Chekin job result:', result);
                GM_setValue(resultKey, result);
                closeSoon();
            });
    }

}

//setTimeout(run, 4000);
run();
