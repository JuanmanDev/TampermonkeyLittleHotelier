// ==UserScript==
// @name         LH Common - Auto Refresh On Inactivity
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Refreshes the page after specified period of user inactivity
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/*
// @match        https://app.thebookingbutton.com/*
// @match        https://application.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/autoRefreshOnInactivity.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/autoRefreshOnInactivity.user.js
// ==/UserScript==

(function() {
    'use strict';

    function autorefreshNoUserActivity(seconds) {
        var refresh;   
        function activityDetected() {
            console.debug("activityDetected");
            clearTimeout(refresh);
            refresh = setTimeout(function() {
               location.href = location.href;
            }, seconds * 1000);
        };
      
        const events = ["click", "touchmove", "mousemove", "scroll"];
        events.forEach(event => document.addEventListener(event, activityDetected));
        activityDetected();
    };

    function ejecutar() {
        // Refresh page after 10 minutes (600 seconds) of inactivity
        autorefreshNoUserActivity(600);
    }

    window.addEventListener("load", ejecutar);
    if (document.readyState === "complete") ejecutar();
})();