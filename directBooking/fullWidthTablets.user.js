// ==UserScript==
// @name         LH Direct Booking - Tables full width
// @namespace    Hotelier Tools
// @version      1.0.0-2025-06-22
// @description  Make the all tables for the Direct Bookin for Little Hoteler Widther
// @author       JuanmanDev
// @match        https://app.thebookingbutton.com/extranet/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=thebookingbutton.com
// @grant        none

// @homepageURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL    https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL   https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/directBooking/fullWidthTablets.user.js
// @updateURL     https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/directBooking/fullWidthTablets.user.js

// ==/UserScript==

(function() {
    'use strict';

    function fullWidthTablaReservas() {
        var style = document.createElement('style');
        style.innerHTML = `
            #main DIV#content { width: auto; }
            .reservations table tbody td.name span.guest_name { width: auto;}
            .lh-app__main-content-container .container { max-width: 100% !important;}
            #content .reports { width: 100% !important; }
            #content .inventory  { max-width: 100rem; margin: auto; }
            .data tr:hover { background-color: rgba(0,0,0,0.1); }
        `;
        document.head.appendChild(style);
    }


    window.onload = fullWidthTablaReservas;
    if (document.readyState === "complete") { fullWidthTablaReservas();}
})();