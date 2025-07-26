// ==UserScript==
// @name         LH Front Desk - Improve Style For Touch Screens
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Enhances UI elements for touch screens in Little Hotelier
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/improveStyleForTouchScreens.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/improveStyleForTouchScreens.user.js
// ==/UserScript==

(function() {
    'use strict';

    function improveStyleForTouchScreens() {
      const style = document.createElement('style');
      style.innerHTML = `
        /* Show always the button to remove a room in the reservation, not only on hover, useful for touch devices */
        .delete-rrt.img-circle, .reservation-panel .delete-rrt.img-circle { visibility: visible !important; }
        /* Make the popover menus for print and email bigger */
        .popover-list>li>a{display:block;font-size:30px!important}
        /* Add blue background for buttons */
        a.btn.btn-sm.pull-right.text-blue{background-color:#d9eeff;margin-right:15px}
        /** Hide the info icon in the email > invoice popover */
        i.fa.fa-info-circle.invoice-email-popover{display:none}
        /* Make the popover list wider */
        .reservation-panel ul.popover-list{width:auto}
      `;
      document.head.appendChild(style);
    }

    function ejecutar() {
        improveStyleForTouchScreens();
    }

    window.onload = ejecutar;
    if (document.readyState === "complete") ejecutar();
})();
