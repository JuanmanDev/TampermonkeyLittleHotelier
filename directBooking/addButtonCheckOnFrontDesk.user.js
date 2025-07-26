// ==UserScript==
// @name         LH Direct Booking - Add Button Check on Front Desk
// @namespace    Hotelier Tools
// @version      1.0.0-2025-06-22
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

    const textButton = "Ver datos de la reserva en Front Desk y revisar devoluciones"; // Replace with your desired button text in your language

    let idPropertyFrontDesk = 12345;
    const el = document.querySelector('li.el-dropdown-menu__item.app-switcher-item a');
    if (el) {
        const href = el.getAttribute('href');
        const lastPart = href.split('/').filter(Boolean).pop();
        idPropertyFrontDesk = lastPart;
    } else {
        console.error('LH Direct Booking - Add Button Check on Front Desk - Cannot get idPropertyFrontDesk.');
    }
    

    function addButtonCheckOnFrontDesk() {
        const classButton = "hotelierToolsButtonCheckOnFrontDesk";

        // Check if the booking reference exists
        const bookingReferenceElement = document.querySelector("#reservation_overlay .booking_reference");

        if (bookingReferenceElement) {
            const reservationId = bookingReferenceElement.innerText;
            const targetOl = document.querySelector("#reservation_tabs_wrapper > div > div.guest.pane > form > fieldset > ol");

            if (!targetOl) {
                return; // If the target element doesn't exist, exit the function
            }

            const existingButton = targetOl.querySelector(`.${classButton}`);

            if (existingButton) {
                // If the button already exists, check if is the same reservation
                if (existingButton.href.includes(reservationId)) {
                    return;
                }
            }

            // otherwise, create and add the button
            targetOl.innerHTML += 
            `<li><a class=" print fd_reservation fd_button ${classButton}" target="_blank" href="https://app.littlehotelier.com/extranet/properties/${idPropertyFrontDesk}/reservations?utf8=%E2%9C%93&reservation_filter%5Bguest_last_name%5D=&reservation_filter%5Bbooking_reference_id%5D=${reservationId}&reservation_filter%5Binvoice_number%5D=&reservation_filter%5Bdate_type%5D=CheckIn&reservation_filter%5Bstatus%5D=&reservation_filter%5Bdate_from_display%5D=&reservation_filter%5Bdate_from%5D=&reservation_filter%5Bdate_to_display%5D=&reservation_filter%5Bdate_to%5D=&button="><i class="fa fa-hotel"></i> ${textButton}</a></li>`
        }
    }

    // Check if we're on the correct page using a more flexible regex
    const isReservationPage = /extranet\/properties\/\d+\/reservations/.test(location.pathname);

    // Only set up the interval if we're on the right page
    if (isReservationPage) {
        // Check every 2 seconds
        setInterval(addButtonCheckOnFrontDesk, 2000);
    }
})();