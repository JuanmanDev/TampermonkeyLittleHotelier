// ==UserScript==
// @name         LH Direct Booking - Add Button Check on Front Desk
// @namespace    Hotelier Tools
// @version      1.1.0-2026-08-17
// @description  Add a button to the reservation page of Direct Booking for Little Hotelier to check the reservation in Front Desk and review refunds
// @author       JuanmanDev
// @match        https://app.thebookingbutton.com/extranet/properties/*/reservations*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=thebookingbutton.com
// @grant        none

// @homepageURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL    https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL   https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/directBooking/addButtonCheckOnFrontDesk.user.js
// @updateURL     https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/directBooking/addButtonCheckOnFrontDesk.user.js

// ==/UserScript==

(function() {
    'use strict';
    
    // Function to get language code from meta tag
    function getLanguageCode() {
        const metaLocale = document.querySelector('meta[name="locale"]');
        return metaLocale ? (metaLocale.getAttribute('content') || 'en') : 'en';
    }
    
    // Translations for button text
    const translations = {
        'en': "View reservation data in Front Desk and check refunds",
        'es': "Ver datos de la reserva en Front Desk y revisar devoluciones"
    };
    
    const langCode = getLanguageCode();
    const textButton = translations[langCode] || translations.en; 

    // Extract the exact UUID Property ID dynamically from the Front Desk link in the App Switcher
    let propertyUUID = '7aa203c9-0db2-439e-b1b1-a47197aa0842'; 
    const frontDeskLink = document.querySelector('a[href*="app.littlehotelier.com/extranet/properties/"]');
    if (frontDeskLink) {
        const match = frontDeskLink.href.match(/\/properties\/([a-zA-Z0-9\-]+)/);
        if (match) propertyUUID = match[1];
    }

    // Helper to format dates correctly for Little Hotelier's search fields
    function formatDate(date, lang) {
        const yyyyMmDd = date.toISOString().split('T')[0]; // Format: 2026-08-17
        const display = date.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', ''); // Format: 17 ago 2026
        return { standard: yyyyMmDd, display: display };
    }

    function addButtonCheckOnFrontDesk() {
        const classButton = "hotelierToolsButtonCheckOnFrontDesk";

        // Get the universal Booking Reference (e.g., BBE26081621943717)
        const bookingReferenceElement = document.querySelector(".reservations .booking_reference");
        if (!bookingReferenceElement) return;
        const reservationId = bookingReferenceElement.innerText.trim();

        const targetOl = document.querySelector("#reservation_tabs_wrapper .panes .guest.pane form fieldset.actions ol");
        if (!targetOl) return;

        const existingButton = targetOl.querySelector(`.${classButton}`);
        if (existingButton) {
            // Check if the button is already pointing to the correct reservation reference
            if (existingButton.href.includes(reservationId)) return;
            existingButton.remove(); 
        }

        // Generate a wide date range to ensure the search finds the reservation
        const today = new Date();
        const dateFromObj = new Date();
        dateFromObj.setMonth(today.getMonth() - 2); // 2 months ago
        const dateToObj = new Date();
        dateToObj.setFullYear(today.getFullYear() + 1); // 1 year from now

        const dateFrom = formatDate(dateFromObj, langCode);
        const dateTo = formatDate(dateToObj, langCode);

        // Build the complex Search URL with properly encoded dates
        const targetUrl = `https://app.littlehotelier.com/extranet/properties/${propertyUUID}/reservations?utf8=%E2%9C%93` +
            `&reservation_filter%5Bguest_last_name%5D=` +
            `&reservation_filter%5Bbooking_reference_id%5D=${reservationId}` +
            `&reservation_filter%5Binvoice_number%5D=` +
            `&reservation_filter%5Bdate_type%5D=CheckIn` +
            `&reservation_filter%5Bstatus%5D=` +
            `&reservation_filter%5Bdate_from_display%5D=${encodeURIComponent(dateFrom.display)}` +
            `&reservation_filter%5Bdate_from%5D=${dateFrom.standard}` +
            `&reservation_filter%5Bdate_to_display%5D=${encodeURIComponent(dateTo.display)}` +
            `&reservation_filter%5Bdate_to%5D=${dateTo.standard}` +
            `&channel_id=&button=`;

        // Create and add the button
        const li = document.createElement('li');
        li.innerHTML = `<a class="print fd_reservation fd_button ${classButton}" target="_blank" href="${targetUrl}"><i class="fa fa-hotel"></i> ${textButton}</a>`;
        targetOl.appendChild(li);
    }

    // Check if we are on a reservations page (allows both integer IDs and UUIDs)
    const isReservationPage = /extranet\/properties\/[a-zA-Z0-9\-]+\/reservations/.test(location.pathname);

    if (isReservationPage) {
        setInterval(addButtonCheckOnFrontDesk, 2000);
    }
})();