// ==UserScript==
// @name         LH Front Desk - Show Booking.com Commissions
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Shows estimation for commissions breakdown for booking.com reservations
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showComissions.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showComissions.user.js
// ==/UserScript==

(function() {
    'use strict';

    function showComissions() {
      let data = {}, source = document.getElementById("booking_source").value,
          total = +document.querySelector(".total").innerText.split(" ")[0].replace(",", "."),
          tax = +document.querySelector(".total_percentage_taxes").innerText.split(" ")[0].replace(",", ".");

      if (source === "Booking.com") {
        const transfer = total * 0.013, comissions = total * 0.17, totalToLose = transfer + comissions + tax,
              net = total - totalToLose;
        data = {
          "Cargo por transferencia (1.3%)": transfer.toFixed(2) + " €",
          "Comisiones Booking (17%)": comissions.toFixed(2) + " €",
          "Total comisiones con IVA": totalToLose.toFixed(2) + " €",
          "Neto Bruto (Aprox.)": net.toFixed(2) + " €"
        };
      }

      const hrElement = document.querySelector('hr.d1');
      if (hrElement && Object.keys(data).length > 0) {
        Object.keys(data).forEach(key => {
          const row = document.createElement('div');
          row.classList.add('row');
          row.innerHTML = `<div class="col-xs-6 pad-bottom-5">${key}</div><div class="col-xs-6"><span class="pull-right">${data[key]}</span></div>`;
          hrElement.insertAdjacentElement('beforeBegin', row);
        });
      }
    }

    function ejecutar() {
        setTimeout(showComissions, 2500);
    }

    window.onload = ejecutar;
    if (document.readyState === "complete") ejecutar();
})();
