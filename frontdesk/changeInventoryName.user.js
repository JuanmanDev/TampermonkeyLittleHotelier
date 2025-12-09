// ==UserScript==
// @name         LH Direct Booking - Change Inventory Name
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Changes the inventory menu name to include pricing information
// @author       JuanmanDev
// @match        https://application.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/changeInventoryName.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/changeInventoryName.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Translations for suffix text
    const translations = {
        'es': "Precios",
        'en': "Prices",
    };

    function cambiarNombreInventario() {
        const textSuffix = translations[document.documentElement.lang] || translations.en;
        try {
            // Look for the inventory menu item and add the suffix
            const menuItem = [...document.querySelectorAll(".sm-horizontal-nav-item__label")]
                .find(e => e.innerText === "Inventario" || e.innerText === "Inventory");
            
            if (menuItem && !menuItem.innerText.includes(textSuffix)) {
                menuItem.innerText += " - " + textSuffix;
            }
        } catch (error) {
            console.error("Error changing inventory name:", error);
        }
    }

    function ejecutar() {
        // Try several times as the menu might load dynamically
        setTimeout(cambiarNombreInventario, 500);
        setTimeout(cambiarNombreInventario, 1500);
        setTimeout(cambiarNombreInventario, 3000);
    }

    window.addEventListener("load", ejecutar);
    if (document.readyState === "complete") ejecutar();
})();
