// ==UserScript==
// @name         LH Front Desk - Update Payment Link Button
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Improves payment link button with better text and adds phone number from input field
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/updateGeneratePaymentLinkButton.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/updateGeneratePaymentLinkButton.user.js
// ==/UserScript==

(function() {
    'use strict';

    function updateGeneratePaymentLinkButton() {
      /* Update the payment link with a better text and the phone number from the input field */
      function updatePaymentLink() {
        const phoneNumberInput = document.getElementById("guest_phone_number");
        const paymentButton = document.querySelector(".payment-request-button");
        if (phoneNumberInput && paymentButton) {
          let phoneNumber = phoneNumberInput.value.replace(/\s+/g, '').replace(/\+/g, '');
          let url = new URL(paymentButton.getAttribute('href'));

          if (!url.searchParams.has("phone") && phoneNumber) {
            url.searchParams.set("phone", phoneNumber);
            paymentButton.setAttribute('href', url.toString());
          }
          paymentButton.innerText = "Cobrar con tarjeta por correo electronico (Email)";
        }
      }

      document.getElementById('guest_phone_number')?.addEventListener("input", updatePaymentLink);

      const targetNode = document.body;
      const observer = new MutationObserver((mutationsList, obs) => {
        for (let mutation of mutationsList) {
          const paymentButton = document.querySelector(".payment-request-button");
          if (paymentButton) { 
            updatePaymentLink();
            new MutationObserver(() => updatePaymentLink()).observe(paymentButton, { attributes: true, attributeFilter: ['href'] });
            obs.disconnect();
          }
        }
      });
      observer.observe(targetNode, { childList: true, subtree: true });
    }

    function ejecutar() {
        updateGeneratePaymentLinkButton();
    }

    window.onload = ejecutar;
    if (document.readyState === "complete") ejecutar();
})();
