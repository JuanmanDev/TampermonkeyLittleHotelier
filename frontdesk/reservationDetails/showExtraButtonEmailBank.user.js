// ==UserScript==
// @name         LH Front Desk - Bank Transfer Email Button
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Adds button for sending bank transfer details via email
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showExtraButtonEmailBank.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showExtraButtonEmailBank.user.js
// ==/UserScript==

(function() {
    'use strict';

    function showExtraButtonEmailBank() {
        // Select the existing ul element
        const ul = document.querySelector('.email-popover-panel ul');
        
        if (!ul) return;

        // Create a new li element
        const li = document.createElement('li');

        // Create a new a (link) element
        const a = document.createElement('a');
        a.href = "#";
        a.textContent = "Transferencia Bancaria";

        // Define the function to send the email when the link is clicked
        a.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the link from acting as a regular hyperlink

            const recipient = document.getElementById("guest_email").value;
            const cantidad = document.querySelector(".pull-right.total_outstanding").innerText.split(" ")[0];
            const check_in_date_display = document.querySelector("#check_in_date_display").value;
            const check_out_date_display = document.querySelector("#check_out_date_display").value;
            const concepto = "Reserva " + check_in_date_display + " " + document.getElementById("guest_first_name").value;

            const rooms = [...document.querySelectorAll(".reservation-room-type-panel")].map(e => e.querySelector("select option[selected]").text);

            // Contar ocurrencias de cada elemento en el array
            const conteo = rooms.reduce((acc, habitacion) => {
              acc[habitacion] = (acc[habitacion] || 0) + 1;
              return acc;
            }, {});

            // Generar las cadenas con el formato solicitado
            const rooms_text = Object.entries(conteo)
              .map(([nombreHabitacion, cantidad]) => `${cantidad} de ${nombreHabitacion}`)
              .join('\n');


            const subject = "Datos para la transferencia Bancaria";
            const body = `Hola,
A continuación, tiene los datos para realizar la transferencia:

Número de cuenta bancaria:
ES523085001110266649 3818
Swift:
BCOEESMM 085
Banco:
Caja rural de Zamora
Concepto:
${concepto}
Cantidad:
${cantidad}€
Beneficiario:
Angela Silva Rodriguez - Hostal Sol Zamora

Para garantizar la seguridad, por favor, confirme mediante llamada telefónica el número de cuenta bancaria donde va a realizar la transferencia, aunque sea solo los últimos 4 dígitos en caso de detectar cualquier posible correo electronico fraudulento.

Datos de la reserva:

Llegada: ${check_in_date_display}
Salida: ${check_out_date_display}

Es necesario que lleguen antes de las 21:00, y que presenten un documento de identidad válido cada huésped.

Habitaciones:
${rooms_text}


Puede realizar otra reserva a través de transferencia bancaria en:
https://direct-book.com/properties/hostalsoldirect?locale=es&promocode=banco

Código interno de reserva (usted no lo necesita):
${window.location.origin + window.location.pathname}

Muchas gracias,
Hostal Sol Zamora,
+34 639980253
https://hostalsolzamora.com/

`;

            const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink; // Open the email client
        });

        // Add the link (a) to the li
        li.appendChild(a);

        // Add the li to the ul
        ul.appendChild(li);

        // Find the original element
        const originalElement = document.querySelector('a.btn.btn-sm.pull-right.text-blue[data-ref="print"]');

        if (originalElement) {
            // Clone the original element
            const newElement = originalElement.cloneNode(true);

            // Modify the new element's properties
            newElement.querySelector('.fa-caret-down').remove(); // Remove the caret icon
            newElement.innerHTML = `<i class="fa fa-envelope"></i> Solicitar transferencia bancaria por email`; // Update the icon and text content

            // Attach the click event to trigger the other element's click
            newElement.addEventListener('click', () => a.click());

            // Insert the new element after the original element
            originalElement.parentNode.insertBefore(newElement, originalElement.nextSibling);
        }
    }

    function ejecutar() {
        setTimeout(showExtraButtonEmailBank, 1600);
    }

    window.addEventListener("load", ejecutar);
    if (document.readyState === "complete") ejecutar();
})();
