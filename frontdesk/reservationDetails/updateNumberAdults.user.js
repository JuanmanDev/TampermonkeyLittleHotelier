// ==UserScript==
// @name         LH Front Desk - Update Number Adults
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Sets the number of adults to 2 by default to prevent errors with 0 adults
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/updateNumberAdults.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/updateNumberAdults.user.js
// ==/UserScript==

(function() {
    'use strict';

    function updateNumberAdults() {
      const inputAdults = document.getElementById('number_adults');
      if (inputAdults && inputAdults.value === '0') {
        inputAdults.setAttribute('value', '2');
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(inputAdults, '2');
        inputAdults.dispatchEvent(new Event('input', { bubbles: true }));
        inputAdults.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    function ejecutar() {
        setTimeout(updateNumberAdults, 500);
    }

    window.onload = ejecutar;
    if (document.readyState === "complete") ejecutar();
})();
