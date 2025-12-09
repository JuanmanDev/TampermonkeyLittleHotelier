// ==UserScript==
// @name         LH Front Desk - Compact Calendar UI
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Compacts the UI of the calendar view in Little Hotelier to show more information
// @author       JuanmanDev
// @match        https://application.littlehotelier.com/*
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/compactCalendarUI.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/compactCalendarUI.user.js
// ==/UserScript==

(function() {
    'use strict';

    function compactCalendarUI() {
        const style = document.createElement('style');
        style.innerHTML = `
            table.calendar thead .date {
              flex-direction: row;
              display: flex;
              justify-content: space-evenly;
            }
            table.calendar thead tr th.first {
              max-height: 10px;
            }
            button.el-button.el-button--default.el-button--small.toggle-all-btn {
                padding: 0;
                margin: 0;
            }
            table.calendar tr.room-type-heading {
                display: flex;
                margin: -10px 0;
                z-index: 0;
                background: transparent;
                overflow: hidden;
            }
            table.calendar tr.room-type-heading td {
                background: transparent;
            }
            body table.calendar tbody tr.room-type-heading td {
              border: none;
            }
            .calendar-nav.el-row {
                margin-top: -10px;
            }
            .filter-options.el-col.el-col-24.el-col-md-5 {
                margin-bottom: 0;
            }
        `;
        document.head.appendChild(style);
    }

    function ejecutar() {
        compactCalendarUI();
    }

    window.addEventListener("load", ejecutar);
    if (document.readyState === "complete") ejecutar();
})();
