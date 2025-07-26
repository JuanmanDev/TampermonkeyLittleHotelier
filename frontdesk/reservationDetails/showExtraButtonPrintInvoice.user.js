// ==UserScript==
// @name         LH Front Desk - Extra Invoice Print Button
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Adds an extra button to print the invoice directly without opening menus
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showExtraButtonPrintInvoice.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showExtraButtonPrintInvoice.user.js
// ==/UserScript==

(function() {
    'use strict';

    function showExtraButtonPrintInvoice() {
      // Find the original element
      const originalElement = document.querySelector('a.btn.btn-sm.pull-right.text-blue[data-ref="print"]');

      if (originalElement) {
        // Clone the original element
        const newElement = originalElement.cloneNode(true);

        // Modify the new element's properties
        newElement.querySelector('.fa-caret-down').remove(); // Remove the caret icon
        newElement.innerHTML = `<i class="fa fa-file" data-ref="print"></i> Imprimir Factura`; // Update the icon and text content

        // Attach the click event to trigger the other element's click
        newElement.addEventListener('click', () => {
          const invoiceTrigger = document.querySelector('.invoice_trigger.heap-print-invoice-link');
          if (invoiceTrigger) {
            invoiceTrigger.click();
          }
        });

        // Insert the new element after the original element
        originalElement.parentNode.insertBefore(newElement, originalElement.nextSibling);
      }
    }

    function ejecutar() {
        setTimeout(showExtraButtonPrintInvoice, 1500);
    }

    window.onload = ejecutar;
    if (document.readyState === "complete") ejecutar();
})();
