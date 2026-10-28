// ==UserScript==
// @name         LH Front Desk - Prices
// @namespace    Hotelier Tools
// @version      2.0.0
// @description  Shows room rates in the "Unassigned" row of each room type in the Little Hotelier calendar, plus optional reservation totals and a clearer paid / unpaid badge on every reservation. Options are in the calendar settings dialog.
// @author       JuanmanDev
// @match        https://application.littlehotelier.com/*
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @run-at       document-start

// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @connect      app.littlehotelier.com
// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/prices.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/prices.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ========================================================================
    // SETTINGS (shared through localStorage with the page-world badge script)
    // ========================================================================
    const SETTINGS_KEY = 'lhTools.calendarSettings';
    // Bumped on every settings change; both worlds watch it to re-render
    const SETTINGS_REV_ATTR = 'data-lh-tools-settings-rev';
    const DEFAULT_SETTINGS = {
        showRoomPrices: true,
        showReservationTotal: true,
        improvedPaymentStatus: true
    };

    const readSettings = () => {
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
        } catch (e) {
            return { ...DEFAULT_SETTINGS };
        }
    };

    const writeSettings = (settings) => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) { /* storage unavailable: settings only last for this page */ }
        document.documentElement.setAttribute(SETTINGS_REV_ATTR, String(Date.now()));
    };

    const getLhLanguage = () => {
        try {
            return localStorage.getItem('sm_user_preferred_language');
        } catch (e) {
            return null;
        }
    };
    const LOCALE = new URLSearchParams(location.search).get('locale') || getLhLanguage() || navigator.language || 'es';
    const IS_ES = LOCALE.toLowerCase().startsWith('es');

    const TEXTS = IS_ES ? {
        sectionTitle: 'Hotelier Tools',
        sectionDescription: 'Opciones añadidas por Hotelier Tools. Se aplican al instante (no hace falta pulsar Guardar).',
        showRoomPrices: 'Mostrar el precio de cada día',
        showRoomPricesDescription: 'Verá la tarifa de cada tipo de habitación en la fila «No asignada»',
        showReservationTotal: 'Mostrar el importe total de la reserva',
        showReservationTotalDescription: 'Verá el total de la reserva en cada reserva del calendario',
        improvedPaymentStatus: 'Mostrar claramente si está pagada',
        improvedPaymentStatusDescription: 'Verá una etiqueta de color: pagada, pago parcial (con lo que falta) o pendiente',
        paid: 'Pagada',
        unpaid: 'Pendiente',
        due: 'Falta',
        total: 'Total',
        paidAmount: 'Pagado',
        outstanding: 'Pendiente'
    } : {
        sectionTitle: 'Hotelier Tools',
        sectionDescription: 'Options added by Hotelier Tools. They apply instantly (no need to press Save).',
        showRoomPrices: 'Show the rate of each day',
        showRoomPricesDescription: 'You\'ll see each room type\'s rate in the "Unassigned" row',
        showReservationTotal: 'Show the reservation total',
        showReservationTotalDescription: 'You\'ll see the total amount on every reservation in the calendar',
        improvedPaymentStatus: 'Show clearly whether it is paid',
        improvedPaymentStatusDescription: 'You\'ll see a coloured label: paid, partially paid (with the amount due) or unpaid',
        paid: 'Paid',
        unpaid: 'Unpaid',
        due: 'Due',
        total: 'Total',
        paidAmount: 'Paid',
        outstanding: 'Outstanding'
    };

    // ========================================================================
    // INVENTORY PAGE: rates of the basic rate plan for each room type
    // ========================================================================
    const parseInventoryRooms = (doc) => [...doc.querySelectorAll('table.room_type')]
        .map(table => {
            const basic = table.parentNode.querySelector('.rate.basic');
            return {
                name: table.querySelector('h2')?.textContent.trim() || '',
                rates: basic ? [...basic.querySelectorAll('input')].map(input => input.value || input.getAttribute('value') || '') : []
            };
        })
        .filter(room => room.name && room.rates.length);

    // Fallback mode: inventory page opened in a background tab by the calendar
    const runInventoryTabMode = () => {
        const startDate = new URLSearchParams(location.search).get('start_date');
        const startedAt = Date.now();
        const timer = setInterval(() => {
            const rooms = document.readyState === 'loading' ? [] : parseInventoryRooms(document);
            if (rooms.length) {
                clearInterval(timer);
                console.debug('LH Prices: inventory data extracted', rooms);
                GM_setValue('LH_prices_update', { startDate, rooms, timestamp: Date.now() });
            } else if (Date.now() - startedAt > 20000) {
                clearInterval(timer);
            }
        }, 500);
    };

    // ========================================================================
    // CALENDAR: room rates in the "Unassigned" row
    // ========================================================================
    const PRICES_CACHE_KEY = 'LH_prices_cache_v2'; // { [propertyId]: { [date]: { timestamp, rooms: { [name]: rate } } } }
    const PRICES_TTL = 60 * 60 * 1000;
    const INVENTORY_DAYS = 14; // One inventory page shows 14 days

    const toDateStr = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const addDays = (dateStr, days) => {
        const d = new Date(dateStr + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    };

    const normalizeName = (name) => (name || '').replace(/\s+/g, ' ').trim().toLowerCase();

    const formatNumber = (value) => {
        const n = typeof value === 'number' ? value : parseFloat(value);
        if (!isFinite(n)) return String(value || '');
        return n.toLocaleString(LOCALE, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
    };

    // /properties/{propertyId}/calendar/{days}/{yyyy-mm-dd}
    const getCalendarContext = () => {
        const match = location.pathname.match(/\/properties\/([^/]+)\/calendar(?:\/(\d+)\/(\d{4}-\d{2}-\d{2}))?/);
        if (!match) return null;
        let days = parseInt(match[2], 10);
        let startDate = match[3];
        if (!startDate) {
            // Calendar opened without dates in the URL: LH keeps the last view here
            try {
                const params = JSON.parse(localStorage.getItem('CALENDAR_DATE_PARAMS') || '{}');
                startDate = params.startDate;
                days = days || params.daysToShow;
            } catch (e) { /* ignore */ }
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '')) return null;
        days = days || 14;
        return {
            propertyId: match[1],
            dates: Array.from({ length: days }, (_, i) => addDays(startDate, i))
        };
    };

    const loadPricesCache = (propertyId) => {
        const all = GM_getValue(PRICES_CACHE_KEY, {});
        const forProperty = all[propertyId] || {};
        const now = Date.now();
        for (const date of Object.keys(forProperty)) {
            if (now - forProperty[date].timestamp > PRICES_TTL) delete forProperty[date];
        }
        return forProperty;
    };

    const savePricesChunk = (propertyId, startDate, rooms) => {
        const all = GM_getValue(PRICES_CACHE_KEY, {});
        const forProperty = all[propertyId] || {};
        const timestamp = Date.now();
        for (let k = 0; k < INVENTORY_DAYS; k++) {
            const date = addDays(startDate, k);
            const day = { timestamp, rooms: {} };
            for (const room of rooms) {
                if (room.rates[k] !== undefined && room.rates[k] !== '') day.rooms[normalizeName(room.name)] = room.rates[k];
            }
            forProperty[date] = day;
        }
        all[propertyId] = forProperty;
        GM_setValue(PRICES_CACHE_KEY, all);
    };

    const inventoryUrl = (propertyId, startDate, viaTab) =>
        `https://app.littlehotelier.com/extranet/properties/${propertyId}/inventory/edit?locale=es&inclusions=&start_date=${startDate}${viaTab ? '&script=juanma' : ''}`;

    const fetchInventoryChunk = (propertyId, startDate) => new Promise((resolve) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: inventoryUrl(propertyId, startDate, false),
            timeout: 30000,
            onload: (res) => {
                if (res.status !== 200) return resolve(null);
                const rooms = parseInventoryRooms(new DOMParser().parseFromString(res.responseText, 'text/html'));
                resolve(rooms.length ? rooms : null);
            },
            onerror: () => resolve(null),
            ontimeout: () => resolve(null)
        });
    });

    // Fallback when the cross-domain request is not allowed: let the inventory page read itself
    const fetchInventoryChunkViaTab = (propertyId, startDate) => new Promise((resolve) => {
        GM_deleteValue('LH_prices_update');
        const tab = GM_openInTab(inventoryUrl(propertyId, startDate, true), { active: false, insert: true, setParent: true });
        let timeout = null;
        const listenerId = GM_addValueChangeListener('LH_prices_update', (_name, _old, value) => {
            if (!value || value.startDate !== startDate) return;
            finish(value.rooms);
        });
        const finish = (rooms) => {
            clearTimeout(timeout);
            GM_removeValueChangeListener(listenerId);
            try { tab.close(); } catch (e) { /* already closed */ }
            resolve(rooms && rooms.length ? rooms : null);
        };
        timeout = setTimeout(() => finish(null), 30000);
    });

    const failedDates = new Set(); // `${propertyId}|${date}` whose rates couldn't be loaded this session
    const inFlightChunks = new Set();

    const loadMissingPrices = async (ctx, cache) => {
        const today = toDateStr(new Date());
        const missing = ctx.dates.filter(date => date >= today && !cache[date]);
        const chunkStarts = [];
        for (const date of missing) {
            const covered = chunkStarts.some(start => date >= start && date <= addDays(start, INVENTORY_DAYS - 1));
            if (!covered) chunkStarts.push(date);
        }

        for (const startDate of chunkStarts) {
            const key = ctx.propertyId + '|' + startDate;
            if (inFlightChunks.has(key) || failedDates.has(key)) continue;
            inFlightChunks.add(key);
            try {
                let rooms = await fetchInventoryChunk(ctx.propertyId, startDate);
                if (!rooms) {
                    console.warn('LH Prices: direct inventory request failed, using a background tab for', startDate);
                    rooms = await fetchInventoryChunkViaTab(ctx.propertyId, startDate);
                }
                if (rooms) {
                    savePricesChunk(ctx.propertyId, startDate, rooms);
                } else {
                    console.warn('LH Prices: could not load rates for', startDate);
                    for (let k = 0; k < INVENTORY_DAYS; k++) failedDates.add(ctx.propertyId + '|' + addDays(startDate, k));
                }
            } finally {
                inFlightChunks.delete(key);
            }
            scheduleRefresh();
        }
    };

    const renderRoomPrices = (ctx, cache, enabled) => {
        const today = toDateStr(new Date());
        document.querySelectorAll('span.room-type-text').forEach(span => {
            const roomName = normalizeName(span.textContent);
            const tbody = span.closest('tbody');
            if (!tbody) return;
            const row = [...tbody.querySelectorAll('tr')].find(tr => tr.querySelector('td.room-label.unallocated'));
            if (!row) return;

            row.querySelectorAll('td.date-cell').forEach((td, i) => {
                const date = ctx?.dates[i];
                let text = '';
                if (enabled && date) {
                    const day = cache[date];
                    if (day && day.rooms[roomName] !== undefined) {
                        text = formatNumber(day.rooms[roomName]);
                    } else if (!day && date >= today && !failedDates.has(ctx.propertyId + '|' + date)) {
                        text = '…';
                    }
                }

                let label = td.querySelector(':scope > .lh-tools-price');
                if (!text) {
                    label?.remove();
                    return;
                }
                if (!label) {
                    label = document.createElement('span');
                    label.className = 'lh-tools-price';
                    td.appendChild(label);
                }
                if (label.textContent !== text) label.textContent = text;
            });
        });
    };

    let lastContextKey = null;
    const refreshCalendar = () => {
        const ctx = getCalendarContext();
        const settings = readSettings();
        const cache = ctx ? loadPricesCache(ctx.propertyId) : {};
        renderRoomPrices(ctx, cache, !!ctx && settings.showRoomPrices);

        if (!ctx || !settings.showRoomPrices) return;
        const contextKey = ctx.propertyId + '|' + ctx.dates[0] + '|' + ctx.dates.length;
        const needsData = ctx.dates.some(date => date >= toDateStr(new Date()) && !cache[date]);
        if (contextKey !== lastContextKey || needsData) {
            lastContextKey = contextKey;
            loadMissingPrices(ctx, cache);
        }
    };

    // Ignore DOM changes made by Hotelier Tools itself (price labels and badges)
    const OWN_CLASSES = ['lh-tools-price', 'lh-tools-badge'];
    const isOwnNode = (node) => !!node.classList && OWN_CLASSES.some(c => node.classList.contains(c));
    const isOwnMutation = (m) => m.type === 'childList' && (isOwnNode(m.target) ||
        (m.addedNodes.length + m.removedNodes.length > 0 && [...m.addedNodes, ...m.removedNodes].every(isOwnNode)));

    let refreshTimer = null;
    const scheduleRefresh = () => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            refreshCalendar();
            injectSettingsSection();
        }, 250);
    };

    // ========================================================================
    // CALENDAR SETTINGS DIALOG: our options next to LH's own
    // ========================================================================
    const SETTINGS_OPTIONS = [
        { key: 'showRoomPrices', label: TEXTS.showRoomPrices, description: TEXTS.showRoomPricesDescription },
        { key: 'showReservationTotal', label: TEXTS.showReservationTotal, description: TEXTS.showReservationTotalDescription },
        { key: 'improvedPaymentStatus', label: TEXTS.improvedPaymentStatus, description: TEXTS.improvedPaymentStatusDescription }
    ];

    const injectSettingsSection = () => {
        const dialog = document.querySelector('.calendar-preference-settings__dialog-content');
        const body = dialog?.querySelector('.sm-dialog__body');
        if (!body || body.querySelector('.lh-tools-settings')) return;

        const settings = readSettings();
        const section = document.createElement('div');
        section.className = 'lh-tools-settings';

        const title = document.createElement('h4');
        title.className = 'lh-tools-settings__title';
        title.textContent = TEXTS.sectionTitle;
        const description = document.createElement('p');
        description.className = 'lh-tools-settings__description';
        description.textContent = TEXTS.sectionDescription;
        const options = document.createElement('div');
        options.className = 'lh-tools-settings__options';
        section.append(document.createElement('hr'), title, description, options);

        for (const option of SETTINGS_OPTIONS) {
            const label = document.createElement('label');
            label.className = 'lh-tools-settings__option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !!settings[option.key];
            checkbox.dataset.lhToolsSetting = option.key;
            checkbox.addEventListener('change', () => {
                writeSettings({ ...readSettings(), [option.key]: checkbox.checked });
            });
            const text = document.createElement('span');
            const strong = document.createElement('span');
            strong.className = 'lh-tools-settings__label';
            strong.textContent = option.label;
            const small = document.createElement('span');
            small.className = 'lh-tools-settings__option-description';
            small.textContent = option.description;
            text.append(strong, small);
            label.append(checkbox, text);
            options.appendChild(label);
        }

        body.appendChild(section);
    };

    const STYLES = `
        td.date-cell.unallocated > .lh-tools-price {
            display: block;
            text-align: center;
            font-size: 1.5rem;
            font-weight: 600;
            color: #8a8a8a;
            pointer-events: none;
            user-select: none;
        }
        .lh-tools-settings > hr { margin: 12px 0; border: 0; border-top: 1px solid #e0e0e0; }
        .lh-tools-settings__title { margin: 0 0 4px; }
        .lh-tools-settings__description { margin: 0 0 8px; color: #717171; font-size: 13px; }
        .lh-tools-settings__options { background: #f5f8fe; border-radius: 4px; padding: 4px 16px; }
        .lh-tools-settings__option { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; margin: 0; font-weight: normal; cursor: pointer; }
        .lh-tools-settings__option + .lh-tools-settings__option { border-top: 1px solid #dde3ee; }
        .lh-tools-settings__option input { margin-top: 3px; width: 16px; height: 16px; accent-color: #1e6fd9; flex-shrink: 0; cursor: pointer; }
        .lh-tools-settings__label { display: block; font-weight: 600; }
        .lh-tools-settings__option-description { display: block; color: #717171; font-size: 13px; }
        .reservation-tile .lh-tools-badge {
            margin-left: auto;
            padding: 0 6px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            line-height: 16px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
            flex-shrink: 1;
        }
        .reservation-tile .lh-tools-badge--neutral { color: #333; background: rgba(255, 255, 255, 0.75); }
        .reservation-tile .lh-tools-badge--paid { color: #fff; background: #1b7b3e; }
        .reservation-tile .lh-tools-badge--partial { color: #fff; background: #d9730d; }
        .reservation-tile .lh-tools-badge--unpaid { color: #fff; background: #d11d1d; }
    `;

    // ========================================================================
    // RESERVATION BADGES (runs in the page world: needs the tiles' Vue data and LH's session)
    // ========================================================================
    function lhToolsReservationBadges(SETTINGS_KEY, SETTINGS_REV_ATTR, DEFAULT_SETTINGS, TEXTS, LOCALE) {
        const TTL = 5 * 60 * 1000;
        const BATCH_SIZE = 25;
        const totals = new Map(); // reservation uuid -> { total, outstanding, paymentStatus, at } | { failed, at }
        const inFlight = new Set();
        let currencySymbol = null;

        const readSettings = () => {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
            } catch (e) {
                return { ...DEFAULT_SETTINGS };
            }
        };

        const xsrfToken = () => decodeURIComponent((document.cookie.match(/(?:^|; )sm_xsrf_token=([^;]*)/) || [])[1] || '');

        // The calendar keeps the reservation in the `occupier` prop of a parent component
        const tilePayload = (tile) => {
            let vm = tile.__vue__;
            for (let i = 0; vm && i < 4; i++, vm = vm.$parent) {
                const payload = vm.$props?.occupier?.payload;
                if (payload?.uuid) return payload;
            }
            return null;
        };

        const money = (value) => {
            const n = Number(value) || 0;
            const text = n.toLocaleString(LOCALE, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
            return currencySymbol ? `${text} ${currencySymbol}` : text;
        };

        const fetchTotals = async (payloads) => {
            const fields = 'uuid paymentStatus paymentTotal paymentTotalOutstanding';
            const parts = payloads.map((p, i) =>
                `r${i}: reservation(input: {propertyUuid: ${JSON.stringify(p.propertyUuid)}, reservationUuid: ${JSON.stringify(p.uuid)}, reservationRoomTypeUuid: ${JSON.stringify(p.reservationRoomTypeUuid)}}) { ${fields} }`);
            if (currencySymbol === null) {
                parts.push(`property: property(propertyUuid: ${JSON.stringify(payloads[0].propertyUuid)}) { currency { symbol unit } }`);
            }

            payloads.forEach(p => inFlight.add(p.uuid));
            try {
                const res = await fetch('/extranet-beef/api/graphql', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'content-type': 'application/json', 'accept': 'application/json', 'x-xsrf-token': xsrfToken() },
                    body: JSON.stringify({ operationName: 'lhToolsReservationTotals', query: `query lhToolsReservationTotals { ${parts.join('\n')} }` })
                });
                const data = (await res.json())?.data || {};
                if (data.property) currencySymbol = data.property.currency?.unit || data.property.currency?.symbol || '';
                payloads.forEach((p, i) => {
                    const r = data['r' + i];
                    totals.set(p.uuid, r
                        ? { total: r.paymentTotal, outstanding: r.paymentTotalOutstanding, paymentStatus: p.paymentStatus, at: Date.now() }
                        : { failed: true, at: Date.now() });
                });
            } catch (err) {
                console.warn('LH Prices: could not load reservation totals', err);
                payloads.forEach(p => totals.set(p.uuid, { failed: true, at: Date.now() }));
            } finally {
                payloads.forEach(p => inFlight.delete(p.uuid));
            }
            schedule();
        };

        const badgeFor = (info, settings) => {
            const total = Number(info.total) || 0;
            const outstanding = Math.max(0, Number(info.outstanding) || 0);
            const status = outstanding < 0.005 ? 'paid' : (outstanding > total - 0.005 ? 'unpaid' : 'partial');
            const title = `${TEXTS.total}: ${money(total)} · ${TEXTS.paidAmount}: ${money(total - outstanding)} · ${TEXTS.outstanding}: ${money(outstanding)}`;

            if (!settings.improvedPaymentStatus) {
                return { text: money(total), variant: 'neutral', title };
            }
            if (settings.showReservationTotal) {
                if (status === 'paid') return { text: `✓ ${money(total)}`, variant: 'paid', title };
                if (status === 'partial') return { text: `${TEXTS.due} ${money(outstanding)} / ${money(total)}`, variant: 'partial', title };
                return { text: `✗ ${money(total)}`, variant: 'unpaid', title };
            }
            if (status === 'paid') return { text: `✓ ${TEXTS.paid}`, variant: 'paid', title };
            if (status === 'partial') return { text: `${TEXTS.due} ${money(outstanding)}`, variant: 'partial', title };
            return { text: `✗ ${TEXTS.unpaid}`, variant: 'unpaid', title };
        };

        const process = () => {
            const settings = readSettings();
            const enabled = settings.showReservationTotal || settings.improvedPaymentStatus;
            const tiles = [...document.querySelectorAll('.reservation-tile')];
            const missing = [];

            for (const tile of tiles) {
                const payload = enabled ? tilePayload(tile) : null;
                let info = payload ? totals.get(payload.uuid) : null;
                // Stale after a while, or as soon as LH reports a different payment status
                if (info && (Date.now() - info.at > TTL || (!info.failed && info.paymentStatus !== payload.paymentStatus))) {
                    totals.delete(payload.uuid);
                    info = null;
                }
                if (payload && !info && !inFlight.has(payload.uuid) && !missing.some(p => p.uuid === payload.uuid)) {
                    missing.push(payload);
                }

                let badge = tile.querySelector('.lh-tools-badge');
                if (!payload || !info || info.failed) {
                    badge?.remove();
                    continue;
                }
                const { text, variant, title } = badgeFor(info, settings);
                const container = tile.querySelector('.reservation-tile__meta') || tile.querySelector('.reservation-tile__body');
                if (!container) continue;
                if (!badge || badge.parentNode !== container) {
                    badge?.remove();
                    badge = document.createElement('span');
                    container.appendChild(badge);
                }
                const className = `lh-tools-badge lh-tools-badge--${variant}`;
                if (badge.className !== className) badge.className = className;
                if (badge.textContent !== text) badge.textContent = text;
                if (badge.title !== title) badge.title = title;
            }

            for (let i = 0; i < missing.length; i += BATCH_SIZE) {
                fetchTotals(missing.slice(i, i + BATCH_SIZE));
            }
        };

        let timer = null;
        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(process, 300);
        };

        // Ignore DOM changes made by Hotelier Tools itself (badges and price labels)
        const OWN_CLASSES = ['lh-tools-badge', 'lh-tools-price'];
        const isOwnNode = (node) => !!node.classList && OWN_CLASSES.some(c => node.classList.contains(c));
        const isOwnMutation = (m) => m.type === 'childList' && (isOwnNode(m.target) ||
            (m.addedNodes.length + m.removedNodes.length > 0 && [...m.addedNodes, ...m.removedNodes].every(isOwnNode)));

        new MutationObserver((mutations) => {
            if (!mutations.every(isOwnMutation)) schedule();
        }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: [SETTINGS_REV_ATTR] });
        schedule();
    }

    const injectPageScript = () => {
        const script = document.createElement('script');
        script.textContent = `(${lhToolsReservationBadges.toString()})(${[SETTINGS_KEY, SETTINGS_REV_ATTR, DEFAULT_SETTINGS, TEXTS, LOCALE].map(v => JSON.stringify(v)).join(', ')});`;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
    };

    // ========================================================================
    // BOOTSTRAP
    // ========================================================================
    const params = new URLSearchParams(location.search);

    if (location.hostname === 'app.littlehotelier.com') {
        if (params.get('script') === 'juanma') runInventoryTabMode();
        return;
    }

    if (location.hostname !== 'application.littlehotelier.com') return;

    GM_deleteValue('LH_prices_cache'); // v1 cache (not split by property)

    const style = document.createElement('style');
    style.id = 'lh-prices-style';
    style.textContent = STYLES;
    (document.head || document.documentElement).appendChild(style);

    injectPageScript();

    // The calendar is a SPA that re-renders rows often: re-apply whenever the DOM, the URL or the settings change
    new MutationObserver((mutations) => {
        if (!mutations.every(isOwnMutation)) scheduleRefresh();
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: [SETTINGS_REV_ATTR] });

    let lastHref = location.href;
    setInterval(() => {
        if (location.href !== lastHref) {
            lastHref = location.href;
            scheduleRefresh();
        }
    }, 500);

    scheduleRefresh();
})();
