// ==UserScript==
// @name         LH Front Desk - Prices
// @namespace    Hotelier Tools
// @version      1.1.0
// @description  Shows room prices in the Little Hotelier calendar view by fetching data from the inventory page
// @author       JuanmanDev
// @match        https://application.littlehotelier.com/*
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com

// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/prices.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/prices.user.js
// ==/UserScript==




async function saveLH_Prices() {
    const value = [...document.querySelectorAll("table.room_type")].map(t => ({
        name: t.querySelector("h2").innerText,
        rates: [...t.parentNode.querySelectorAll(".rate.basic")[0].querySelectorAll("input")].map(e => e.value)
    }));

    const params = new URLSearchParams(window.location.search);
    const startDate = params.get('start_date');

    const result = {
        startDate: startDate,
        rooms: value,
        timestamp: Date.now()
    };

    console.debug("LH_Prices script extracted data:", result);
    await GM_setValue("LH_prices_update", result);
}

let lastTabOpen = null;
let currentFetchPromise = null;

function calendar() {
    // Listen to back/forward navigation (popstate event)
    window.addEventListener('popstate', () => {
        console.debug('URL changed to:', window.location.href);
    });

    // Override pushState and replaceState to detect programmatic changes
    (function (history) {
        const pushState = history.pushState;
        history.pushState = function (...args) {
            const result = pushState.apply(this, args);
            window.dispatchEvent(new Event('urlchange'));
            return result;
        };

        const replaceState = history.replaceState;
        history.replaceState = function (...args) {
            const result = replaceState.apply(this, args);
            window.dispatchEvent(new Event('urlchange'));
            return result;
        };
    })(window.history);

    // Listen to custom 'urlchange' event
    window.addEventListener('urlchange', () => {
        magic();
    });

    magic();
}

function getLocalTodayStr() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function addDaysUTC(dateStr, daysToAdd) {
    const d = new Date(dateStr); // parsed as UTC midnight
    d.setUTCDate(d.getUTCDate() + daysToAdd);
    return d.toISOString().split('T')[0];
}

async function magic() {
    if (lastTabOpen) {
        lastTabOpen.close();
        lastTabOpen = null;
    }

    const pathname = window.location.pathname;
    const parts = pathname.split('/');
    const propertyIdIndex = parts.indexOf('properties') + 1;
    const propertyId = parts[propertyIdIndex] || null;

    if (!propertyId) return;

    // Ensure style is injected
    if (!document.getElementById('lh-prices-style')) {
        const style = document.createElement('style');
        style.id = 'lh-prices-style';
        style.textContent = `
            td.date-cell.unallocated:not(:nth-child(1)) {
                font-size: 1.8rem;
                color: grey;
            }
        `;
        document.head.appendChild(style);
    }

    // Default Little Hotelier calendar defaults to 14 days logic, but we can parse the URL
    // e.g. /properties/{id}/calendar/28/2026-03-28
    let calendarDays = 14;
    let calendarStartDate = parts[parts.length - 1]; // Assume last part is start_date

    const calendarIndex = parts.indexOf('calendar');
    if (calendarIndex !== -1 && parts.length >= calendarIndex + 3) {
        calendarDays = parseInt(parts[calendarIndex + 1], 10) || 14;
        calendarStartDate = parts[calendarIndex + 2];
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(calendarStartDate)) {
        return; // Valid format check
    }

    const todayStr = getLocalTodayStr();

    // Build array of dates we need for the UI
    const targetDates = [];
    for (let i = 0; i < calendarDays; i++) {
        targetDates.push(addDaysUTC(calendarStartDate, i));
    }

    // Load Cache and evict ones older than 1 hour
    let cache = await GM_getValue("LH_prices_cache", {});
    const now = Date.now();
    let cacheUpdated = false;
    for (const date in cache) {
        if (now - cache[date].timestamp > 60 * 60 * 1000) {
            delete cache[date];
            cacheUpdated = true;
        }
    }
    if (cacheUpdated) {
        await GM_setValue("LH_prices_cache", cache);
    }

    // Render immediately what we have in cache
    renderPrices(cache, targetDates, todayStr);

    // Determine missing dates (skip past dates before today)
    const missingDates = targetDates.filter(date => date >= todayStr && !cache[date]);
    if (missingDates.length === 0) {
        console.debug("All required LH prices found in cache.");
        return;
    }

    // Group missing dates into chunks based on what a single `inventory/edit` page returns (14 days)
    const chunksToFetch = [];
    let i = 0;
    while (i < missingDates.length) {
        const startFetchDate = missingDates[i];
        chunksToFetch.push(startFetchDate);
        const coveredUntil = addDaysUTC(startFetchDate, 13);

        while (i < missingDates.length && missingDates[i] <= coveredUntil) {
            i++;
        }
    }

    console.debug(`LH Prices: Need to fetch chunks starting at:`, chunksToFetch);

    // Process chunk queue sequentially
    async function processQueue() {
        if (chunksToFetch.length === 0) return;
        const fetchDate = chunksToFetch.shift();

        await GM_deleteValue("LH_prices_update");

        const url = `https://app.littlehotelier.com/extranet/properties/${propertyId}/inventory/edit?locale=es&script=juanma&inclusions=&start_date=${fetchDate}`;
        console.debug(`LH Prices: Tab opening... ${url}`);
        lastTabOpen = GM_openInTab(url, { setParent: true, active: false });

        await new Promise((resolve) => {
            let timeout;
            const listenerId = GM_addValueChangeListener("LH_prices_update", async (name, old_value, new_value, remote) => {
                if (new_value && new_value.startDate === fetchDate) {
                    clearTimeout(timeout);
                    GM_removeValueChangeListener(listenerId);
                    if (lastTabOpen) { lastTabOpen.close(); lastTabOpen = null; }
                    await processFetchedData(new_value);
                    resolve();
                }
            });

            timeout = setTimeout(() => {
                console.warn(`LH Prices: Timeout waiting for ${fetchDate}`);
                GM_removeValueChangeListener(listenerId);
                if (lastTabOpen) { lastTabOpen.close(); lastTabOpen = null; }
                resolve();
            }, 30000); // 30 seconds max wait for tab
        });

        // Continue to next chunk
        if (chunksToFetch.length > 0) {
            processQueue();
        }
    }

    processQueue();

    async function processFetchedData(data) {
        const fetchedStartDate = data.startDate;
        const fetchedRooms = data.rooms;

        let currentCache = await GM_getValue("LH_prices_cache", {});
        const updateTime = Date.now();

        // Inventory page returns exactly 14 days
        for (let k = 0; k < 14; k++) {
            const dStr = addDaysUTC(fetchedStartDate, k);
            if (!currentCache[dStr]) {
                currentCache[dStr] = { timestamp: updateTime, rooms: {} };
            } else {
                currentCache[dStr].timestamp = updateTime;
            }

            fetchedRooms.forEach(room => {
                if (room.rates[k] !== undefined) {
                    currentCache[dStr].rooms[room.name] = room.rates[k];
                }
            });
        }

        await GM_setValue("LH_prices_cache", currentCache);
        console.debug(`LH Prices: Updated cache and rendering for ${fetchedStartDate} + 14d`);
        renderPrices(currentCache, targetDates, todayStr);
    }
}

function renderPrices(cache, targetDates, todayStr) {
    const spans = document.querySelectorAll('span.room-type-text');
    spans.forEach(span => {
        const roomName = span.textContent.trim();
        const tbody = span.closest('tbody');
        if (!tbody) return;

        const trs = tbody.querySelectorAll('tr');
        if (trs.length === 0) return;

        const lastTr = trs[trs.length - 1];
        const dateCells = lastTr.querySelectorAll('td.date-cell');

        dateCells.forEach((td, i) => {
            if (i >= targetDates.length) return; // safety check
            const dateStr = targetDates[i];

            if (cache[dateStr] && cache[dateStr].rooms[roomName] !== undefined) {
                td.textContent = cache[dateStr].rooms[roomName];
            } else if (dateStr >= todayStr && !cache[dateStr]) {
                td.textContent = '...';
            } else {
                // If it's a past date or not cached (and not loading)
                td.textContent = '';
            }
        });
    });
}


addEventListener('load', () => setTimeout(async () => {

    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    const params = new URLSearchParams(window.location.search);
    const hasScriptJuanma = params.get('script') === 'juanma';


    const hasCalendarInPath = pathname.includes('calendar');


    if (hasScriptJuanma && hostname === 'app.littlehotelier.com') {
        saveLH_Prices();
    } else if (hasCalendarInPath && hostname === 'application.littlehotelier.com') {
        calendar();
    } else {
        console.debug('LH Prices - Domain not matched', hostname, pathname, window.location);
    }


}, 4000));
