// ==UserScript==
// @name         LH Front Desk - Copy Expedia Reservations Ids
// @namespace    Hotelier Tools
// @version      0.0.1
// @description  Copy Expedia Reservations Ids to clipboard
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL    https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL   https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/getReservationsForExpediaEasy.user.js
// @updateURL     https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/getReservationsForExpediaEasy.user.js

// ==/UserScript==


(function () {
  'use strict';

  // 1. Find the target container for our buttons
  const parentElement = document.querySelector('.lh-app__content .container .reservations');

  if (parentElement) {

    // ==========================================
    // BUTTON 1: FILTER EXPEDIA LAST 3 MONTHS
    // ==========================================
    const filterBtn = document.createElement('a');
    filterBtn.className = "export pull-left outside-border";
    filterBtn.style.marginLeft = "15px";

    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const formatDateISO = (date) => {
      const d = new Date(date);
      let month = '' + (d.getMonth() + 1);
      let day = '' + d.getDate();
      const year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    };

    const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const formatDateEs = (date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = monthsEs[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };

    const form = document.getElementById('new_reservation_filter');
    const baseUrl = form ? form.action : window.location.pathname;

    const params = new URLSearchParams({
      'utf8': '✓',
      'reservation_filter[guest_last_name]': '',
      'reservation_filter[booking_reference_id]': '',
      'reservation_filter[invoice_number]': '',
      'reservation_filter[date_type]': 'CheckIn',
      'reservation_filter[status]': '',
      'reservation_filter[date_from_display]': formatDateEs(threeMonthsAgo),
      'reservation_filter[date_from]': formatDateISO(threeMonthsAgo),
      'reservation_filter[date_to_display]': formatDateEs(today),
      'reservation_filter[date_to]': formatDateISO(today),
      'reservation_filter[channel_id]': '287',
      'button': ''
    });

    filterBtn.href = `${baseUrl}?${params.toString()}`;

    const filterIcon = document.createElement('i');
    filterIcon.className = "fa fa-calendar";
    filterBtn.appendChild(filterIcon);
    filterBtn.appendChild(document.createTextNode(" Expedia: Últimos 3 meses"));
    parentElement.append(filterBtn);

    // ==========================================
    // BUTTON 2: COPY IDs (Only shows if on Expedia)
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const isExpedia = urlParams.get('reservation_filter[channel_id]') === '287';

    if (isExpedia) {
      const copyBtn = document.createElement('a');
      copyBtn.className = "export pull-left outside-border";
      copyBtn.style.marginLeft = "15px";
      copyBtn.style.cursor = "pointer";

      const copyIcon = document.createElement('i');
      copyIcon.className = "fa fa-files-o";

      copyBtn.appendChild(copyIcon);
      copyBtn.appendChild(document.createTextNode(" Copiar IDs"));
      parentElement.append(copyBtn);

      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const ids = Array.from(document.querySelectorAll(".booking-reference"))
          .map(el => el.innerText.substring(4))
          .join("\n");

        if (!ids) {
          showNotification("No hay reservas para copiar en esta página.", "#f44336");
          return;
        }

        navigator.clipboard.writeText(ids).then(() => {
          const count = ids.split('\n').length;
          showNotification(`¡Éxito! ${count} IDs copiados al portapapeles.`, "#4CAF50");
        }).catch(err => {
          console.error("No se pudo copiar: ", err);
          showNotification("Error de permisos al copiar.", "#f44336");
        });
      });
    }
  }

  // ==========================================
  // NOTIFICATION HELPER FUNCTION
  // ==========================================
  function showNotification(message, bgColor) {
    const toast = document.createElement('div');
    toast.innerText = message;

    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: bgColor,
      color: 'white',
      padding: '16px 24px',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontFamily: 'inherit',
      fontWeight: 'bold',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity 0.3s ease-in-out'
    });

    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }


  const style = document.createElement('style');
  style.textContent = `
    .export.outside-border.pull-left:before {
        display: none !important;
    }

  `;
  document.head.appendChild(style);

})();
