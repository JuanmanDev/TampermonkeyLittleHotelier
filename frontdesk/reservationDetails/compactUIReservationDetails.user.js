// ==UserScript==
// @name         LH Front Desk - Compact UI Reservation Details
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Compacts the UI for reservation details and makes the comments section taller
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/*house_keeping*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/compactUIReservationDetails.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/compactUIReservationDetails.user.js
// ==/UserScript==

(function() {
    'use strict';

    function compactUIReservationDetails() {
      const styles = `
        /* Make textarea for guest comments taller */
        textarea#guest_comments { min-height: 126px; }

        .reservation-panel #reservation-dialog .tab-content {
          padding-top: 0;
        }

        form div.reservation-panel .tab-content {
          padding: 0;
        }
        .alert.alert-placeholder {
          margin: 0;
        }
        hr.margin-top-0 {
          margin: 0;
        }
      `;
      const styleSheet = document.createElement("style");
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);
    }

    function ejecutar() {
        if (window.location.pathname.includes("house_keeping")) {
            compactUIReservationDetails();
            setTimeout(compactUIReservationDetails, 5000);
        }
    }

    window.onload = ejecutar;
    if (document.readyState === "complete") ejecutar();
})();
