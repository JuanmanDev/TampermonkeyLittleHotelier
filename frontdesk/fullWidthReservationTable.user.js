// ==UserScript==
// @name         LH Front Desk - Table full width
// @namespace    Hotelier Tools
// @version      1.0.0-2025-06-22
// @description  Make the table of the page of Reservariton for the FrontDesk for Little Hoteler Widther to see more info without horizontal scrolling
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL    https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL   https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/fullWidthReservationTable.user.js
// @updateURL     https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/fullWidthReservationTable.user.js

// ==/UserScript==

(function() {
    'use strict';
  const style = document.createElement('style');
  style.textContent = `
    body .lh-app__heading-container, .lh-app__content-container,
    .lh-app__main-content-container .container {
        max-width: 2000px !important;
    }

  `;
  document.head.appendChild(style);
})();

