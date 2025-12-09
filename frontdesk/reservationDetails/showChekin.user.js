// ==UserScript==
// @name         LH Front Desk - Show Chekin data for reservation
// @namespace    Hotelier Tools
// @version      0.1.1
// @description  Automate Checkin ID retrieval for Little Hotelier using fetch interception
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations/*/edit*
// @match        https://dashboard.chekin.com/bookings?autosearch=true*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        window.close
// @run-at       document-start

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showChekin.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/showChekin.user.js
// ==/UserScript==

function run() {
    'use strict';

    const CONFIG = {
        LH_DOMAINS: ['app.littlehotelier.com'],
        CHEKIN_DOMAIN: 'dashboard.chekin.com',
        STORAGE_PREFIX: 'lh_chekin_cache_',
        CACHE_DURATION: 1000 * 60 * 60 * 24 // 24 hours
    };

    // Translations
    const TRANSLATIONS = {
        en: {
            status: 'Chekin.com Status:',
            checkingCache: 'Checking cache...',
            searching: '🔍 Searching in background...',
            found: 'Found',
            guests: 'guest(s)',
            viewInChekin: 'View in Chekin',
            noGuestsYet: '⚠️ No guests registered yet.',
            noMatch: '❌ No matching reservation found in Chekin.',
            error: '❌ Error or No Data found.',
            loginRequired: '⚠️ Login Required on Chekin',
            name: 'Name',
            documentId: 'Document ID',
            phone: 'Phone',
            useAsPrimary: 'Use as Primary',
            guestRegistrationForm: 'Guest Registration Form:',
            open: 'Open',
            copy: 'Copy',
            email: 'Email',
            whatsapp: 'WhatsApp',
            copied: 'Copied!',
            emailSubject: 'Complete Your Guest Registration',
            emailBody: 'Hello,\n\nPlease complete your guest registration using the following link:\n\n{link}\n\nThank you!',
            whatsappMessage: 'Hello! Please complete your guest registration using this link: {link}',
            footer: '\n\nHostal Sol Zamora - https://hostalsolzamora.com/',
        },
        es: {
            status: 'Estado de Chekin.com:',
            checkingCache: 'Verificando caché...',
            searching: '🔍 Buscando en segundo plano...',
            found: 'Encontrado(s)',
            guests: 'huésped(es)',
            viewInChekin: 'Ver en Chekin',
            noGuestsYet: '⚠️ Aún no hay huéspedes registrados.',
            noMatch: '❌ No se encontró reserva coincidente en Chekin.',
            error: '❌ Error o No se encontraron datos.',
            loginRequired: '⚠️ Inicio de sesión requerido en Chekin',
            name: 'Nombre',
            documentId: 'ID Documento',
            phone: 'Teléfono',
            useAsPrimary: 'Utilizar Documento',
            guestRegistrationForm: 'Formulario de Registro:',
            open: 'Abrir',
            copy: 'Copiar',
            email: 'Email',
            whatsapp: 'WhatsApp',
            copied: '¡Copiado!',
            emailSubject: 'Complete su Registro de Huésped',
            emailBody: 'Hola,\n\nPor favor complete su registro de huésped usando el siguiente enlace:\n\n{link}\n\n¡Gracias!',
            whatsappMessage: '¡Hola! Por favor complete su registro de huésped usando este enlace: {link}',
            footer: '\n\nHostal Sol Zamora - https://hostalsolzamora.com/',
        }
    };

    // Detect language
    const detectLanguage = () => {
        const lang = navigator.language || navigator.userLanguage;
        return lang.startsWith('es') ? 'es' : 'en';
    };

    const LANG = detectLanguage();
    const t = TRANSLATIONS[LANG];

    const currentHost = window.location.hostname;

    // ========================================================================
    // LOGIC: LITTLE HOTELIER (Main Controller)
    // ========================================================================
    if (CONFIG.LH_DOMAINS.some(d => currentHost.includes(d))) {
        console.log('🏨 LH Script Loaded');

        const waitForElement = (selector) => {
            return new Promise(resolve => {
                if (document.querySelector(selector)) return resolve(document.querySelector(selector));
                const observer = new MutationObserver(() => {
                    if (document.querySelector(selector)) {
                        observer.disconnect();
                        resolve(document.querySelector(selector));
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            });
        };

        const getReservationData = () => {
            // Get check-in date
            const checkInDate = document.querySelector('#check_in_date')?.value || '';

            // Get room numbers (filter out nulls for unassigned rooms)
            const rooms = [...document.querySelectorAll('select[name="reservation_room_types[][room_id]"]')]
                .map(e => e.querySelector("[selected]")?.text)
                .filter(Boolean);

            // Get guest name
            const firstName = document.querySelector('#guest_first_name')?.value || '';
            const lastName = document.querySelector('#guest_last_name')?.value || '';
            const fullName = `${firstName} ${lastName}`.trim();

            return { checkInDate, rooms, fullName, firstName, lastName };
        };

        const initLittleHotelier = async () => {
            await waitForElement('#guest_first_name');

            const { checkInDate, rooms, fullName } = getReservationData();

            if (!checkInDate || rooms.length === 0) {
                console.log('LH: Missing check-in date or room assignment.');
                return;
            }

            // Prepare UI Container
            const container = document.createElement('div');
            container.style.cssText = 'margin: 10px 0; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;';
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <img src="https://f.hubspotusercontent10.net/hubfs/8776616/Logo%20nuevo%20azul-1.png" alt="Chekin" style="height: 24px;">
                    <strong>${t.status}</strong>
                    <span id="chekin-status">${t.checkingCache}</span>
                    <a id="chekin-link" href="undefined" target="_blank" class="btn btn-sm btn-primary" style="display: none; margin-left: auto;">${t.viewInChekin}</a>
                </div>
                <div id="chekin-details" style="margin-top: 10px;"></div>
                <div id="chekin-table" style="margin-top: 10px;"></div>
                <div id="chekin-signup-form" style="margin-top: 10px;"></div>
            `;

            const commentBlock = document.querySelector(".primary-contact-panel")?.lastChild;
            if (commentBlock) {
                const containerCheckin = document.createElement('div');
                containerCheckin.className = "col-sm-12";
                commentBlock.appendChild(containerCheckin);
                containerCheckin.appendChild(container);
            }

            // Create cache key based on date and room
            const cacheKey = CONFIG.STORAGE_PREFIX + btoa(`${checkInDate}_${rooms.join('_')}`);
            const cachedData = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            const now = Date.now();

            if (cachedData && cachedData?.data?.length && (now - cachedData.timestamp < CONFIG.CACHE_DURATION)) {
                renderResults(container, cachedData.data, cachedData.link, cachedData.signupFormLink);
            } else {
                startBackgroundSearch(checkInDate, rooms, container, cacheKey);
            }
        };

        const startBackgroundSearch = (checkInDate, rooms, container, cacheKey) => {
            const statusSpan = container.querySelector('#chekin-status');
            statusSpan.innerHTML = `
                <img src="https://raw.githubusercontent.com/n3r4zzurr0/svg-spinners/refs/heads/main/svg-css/pulse-rings-multiple.svg"
                     style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;">
                ${t.searching}
            `;
            statusSpan.style.color = 'orange';

            const checkinLink = container.querySelector('#chekin-link');
            checkinLink.style.display = 'none';

            // Clean previous communication channels
            GM_deleteValue('chekin_response');
            GM_setValue('chekin_request', {
                checkInDate,
                rooms,
                timestamp: Date.now()
            });

            // Open Background Tab with search params
            const searchUrl = `https://${CONFIG.CHEKIN_DOMAIN}/bookings?autosearch=true&date=${encodeURIComponent(checkInDate)}&rooms=${encodeURIComponent(rooms.join(','))}`;
            GM_openInTab(searchUrl, { active: false, insert: true, setParent: true });

            let handled = false;

            const handler = (name, oldValue, newValue, remote) => {
                if (!newValue) return;

                if (newValue.status === 'success') {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: newValue.data,
                        link: newValue.link,
                        signupFormLink: newValue.signupFormLink
                    }));
                    renderResults(container, newValue.data, newValue.link, newValue.signupFormLink);


                    checkinLink.style.display = 'inline-block';
                    checkinLink.href = newValue.link;
                }
                else if (newValue.status === 'login_required') {
                    renderLoginButton(container);
                }
                else if (newValue.status === 'no_guests') {
                    statusSpan.innerHTML = `${t.noGuestsYet}`;
                    statusSpan.style.color = 'orange';

                    checkinLink.style.display = 'inline-block';
                    checkinLink.href = newValue.link;

                    if (newValue.signupFormLink) {
                        renderSignupFormLink(container, newValue.signupFormLink);
                    }
                }
                else if (newValue.status === 'not_found') {
                    statusSpan.innerText = t.noMatch;
                    statusSpan.style.color = 'red';
                }
                else {
                    statusSpan.innerText = t.error;
                    statusSpan.style.color = 'red';
                }

                GM_removeValueChangeListener(listenerId);
                handled = true;

            }


            setTimeout(() => {
                if (handled) return;
                handler(null, null, { status: 'login_required' }, null);
            }, 10000);

            // Listen for response
            const listenerId = GM_addValueChangeListener('chekin_response', handler);
        };

        const renderLoginButton = (container) => {
            const statusSpan = container.querySelector('#chekin-status');
            statusSpan.innerHTML = '';

            const btn = document.createElement('a');
            btn.className = 'btn btn-danger';
            btn.innerText = t.loginRequired;
            btn.href = `https://${CONFIG.CHEKIN_DOMAIN}`;
            btn.target = '_blank';
            btn.style.cssText = 'background: #d9534f; color: white; padding: 5px 10px; text-decoration: none; border-radius: 3px;';

            btn.onclick = () => {
                setTimeout(() => location.reload(), 5000);
            };

            container.appendChild(btn);
        };

        const renderSignupFormLink = (container, signupFormLink) => {
            const signupFormDiv = container.querySelector('#chekin-signup-form');
            signupFormDiv.innerHTML = `
                <div style="margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">${t.guestRegistrationForm}</label>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <input type="text" id="signup-form-link-input" value="${signupFormLink}" readonly
                               style="flex: 1; padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px;">
                        <button class="btn btn-sm btn-primary" id="btn-open-link" title="${t.open}">
                            🔗 ${t.open}
                        </button>
                        <button class="btn btn-sm btn-secondary" id="btn-copy-link" title="${t.copy}">
                            📋 ${t.copy}
                        </button>
                        <button class="btn btn-sm btn-info" id="btn-email-link" title="${t.email}">
                            ✉️ ${t.email}
                        </button>
                        <button class="btn btn-sm btn-success" id="btn-whatsapp-link" title="${t.whatsapp}">
                            💬 ${t.whatsapp}
                        </button>
                    </div>
                </div>
            `;

            // Add event listeners
            const btnOpen = signupFormDiv.querySelector('#btn-open-link');
            const btnCopy = signupFormDiv.querySelector('#btn-copy-link');
            const btnEmail = signupFormDiv.querySelector('#btn-email-link');
            const btnWhatsApp = signupFormDiv.querySelector('#btn-whatsapp-link');

            btnOpen.onclick = (e) => {
                window.open(signupFormLink, '_blank');
                e.preventDefault();
            };

            btnCopy.onclick = async (e) => {
                e.preventDefault();
                try {
                    await navigator.clipboard.writeText(signupFormLink);
                    const originalText = btnCopy.innerHTML;
                    btnCopy.innerHTML = `✅ ${t.copied}`;
                    setTimeout(() => {
                        btnCopy.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    // Fallback for older browsers
                    const input = signupFormDiv.querySelector('#signup-form-link-input');
                    input.select();
                    document.execCommand('copy');
                    const originalText = btnCopy.innerHTML;
                    btnCopy.innerHTML = `✅ ${t.copied}`;
                    setTimeout(() => {
                        btnCopy.innerHTML = originalText;
                    }, 2000);
                }
            };

            btnEmail.onclick = (e) => {
                e.preventDefault();
                const subject = encodeURIComponent(t.emailSubject);
                const body = encodeURIComponent(t.emailBody.replace('{link}', signupFormLink) + t.footer);
                // If #guest_email exists, we could append it to the URL to prefill recipient
                const guestEmailInput = document.getElementById('guest_email');
                let mailtoLink = `mailto:?subject=${subject}&body=${body}`;
                if (guestEmailInput && guestEmailInput.value) {
                    mailtoLink = `mailto:${encodeURIComponent(guestEmailInput.value)}?subject=${subject}&body=${body}`;
                }
                window.open(mailtoLink, '_blank');
            };

            btnWhatsApp.onclick = (e) => {
                e.preventDefault();
                const message = encodeURIComponent(t.whatsappMessage.replace('{link}', signupFormLink) + t.footer);
                // If #guest_phone_number exists, we could append it to the URL to prefill recipient
                const guestPhoneNumberInput = document.getElementById('guest_phone_number');
                let waUrl = `https://wa.me/?text=${message}`;
                if (guestPhoneNumberInput && guestPhoneNumberInput.value) {
                    waUrl = `https://wa.me/${encodeURIComponent(guestPhoneNumberInput.value)}?text=${message}`;
                }
                window.open(waUrl, '_blank');
            };
        };

        const renderResults = (container, data, link, signupFormLink) => {
            const statusSpan = container.querySelector('#chekin-status');
            statusSpan.innerHTML = `
                <span style="color: green;">✅ ${t.found} ${data.length} ${t.guests}.</span>
            `;

            const checkinLink = container.querySelector('#chekin-link');
            checkinLink.style.display = 'inline-block';
            checkinLink.href = link;

            if (signupFormLink && data.length === 0) {
                renderSignupFormLink(container, signupFormLink);
            }

            if (data.length === 0) return;

            const table = document.createElement('table');
            table.style.cssText = 'width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 12px;';
            table.innerHTML = `
                <tr style="background:#eee; text-align:left;">
                    <th style="padding:5px; border:1px solid #ccc;">${t.name}</th>
                    <th style="padding:5px; border:1px solid #ccc;">${t.phone}</th>
                    <th style="padding:5px; border:1px solid #ccc;">${t.documentId}</th>
                    <th style="padding:5px; border:1px solid #ccc; text-align: right; width: 1%;"></th>
                </tr>
            `;

            data.forEach(person => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding:5px; border:1px solid #ccc;">${person.full_name || 'N/A'}</td>
                    <td style="padding:5px; border:1px solid #ccc;">${person.phone || 'N/A'}</td>
                    <td style="padding:5px; border:1px solid #ccc;"><b>${person.document_number || 'N/A'}</b></td>
                    <td style="padding:5px; border:1px solid #ccc; text-align: right;">
                        <button class="btn btn-sm btn-primary use">${t.useAsPrimary}</button>
                    </td>
                `;
                table.appendChild(row);
            });

            container.querySelector('#chekin-table').appendChild(table);

            let buttons = container.querySelectorAll('button.use');
            buttons.forEach((btn, index) => {
                btn.onclick = (evt) => {
                    evt.preventDefault();

                    const id = data[index].document_number;
                    const input = document.getElementById('guest_id_number');

                    if (!input) {
                        console.error("Input element not found");
                        return;
                    }

                    // Get the native setter from HTMLInputElement prototype
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        "value"
                    ).set;

                    // Focus first (some frameworks listen to focus events)
                    input.focus();

                    // Set value using native setter
                    nativeInputValueSetter.call(input, id);

                    // Dispatch events in order: input -> change -> blur
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));

                    // For Vue 3, sometimes you need to trigger a focusout
                    input.dispatchEvent(new Event('focusout', { bubbles: true }));

                    console.log("Input updated:", id);
                };
            });
        };

        const interval = setInterval(() => {
            const check_in = document.querySelector('#check_in_date');
            if (check_in?.value) {
                clearInterval(interval);
                initLittleHotelier();
            }
        }, 200);

    }

    // ========================================================================
    // LOGIC: CHEKIN DASHBOARD (Background Worker with Fetch Interception)
    // ========================================================================
    else if (currentHost.includes(CONFIG.CHEKIN_DOMAIN)) {
        console.log('🤖 Chekin Worker Loaded');

        // Get search params from URL
        const urlParams = new URLSearchParams(window.location.search);
        const isAutoSearch = urlParams.get('autosearch') === 'true';
        const targetDate = urlParams.get('date');
        const targetRooms = urlParams.get('rooms')?.split(',') || [];

        if (!isAutoSearch) return;

        console.log('🔍 Auto-search mode:', { targetDate, targetRooms });

        // Check login status
        const checkLoginStatus = () => {
            if (document.querySelector('input[type="password"]') ||
                document.body.innerText.includes('Login') ||
                document.body.innerText.includes('Sign in')) {
                GM_setValue('chekin_response', { status: 'login_required' });
                return true;
            }
            return false;
        };

        // Validate request freshness
        const request = GM_getValue('chekin_request');
        if (!request || (Date.now() - request.timestamp > 90000)) {
            console.log('🚫 Request expired or not found');
            return;
        }

        // Storage for intercepted data
        window.INTERCEPTED_RESERVATIONS = [];
        let dataProcessed = false;

        // Save the original fetch function
        const originalFetch = unsafeWindow.fetch;

        // Overwrite fetch
        async function newFetch(input, init) {
            let url = input;

            console.log("input", input);

            if (input instanceof Request) {
                url = input.url;
            }

            // Intercept reservations API call
            if (typeof url === 'string' && url.includes('/api/v4/status/reservations/')) {
                console.log('🕵️ Intercepted Reservations API Call!');

                try {
                    const urlObj = new URL(url);
                    urlObj.searchParams.set('page_size', '50');
                    urlObj.searchParams.set('check_in_date_from', targetDate + 'T00:00:00');
                    urlObj.searchParams.set('check_in_date_until', targetDate + 'T23:59:59');

                    url = urlObj.toString();
                    console.log('⚡ Modified URL to:', url);

                    if (input instanceof Request) {
                        input = new Request(url, input);
                    } else {
                        input = url;
                    }
                } catch (e) {
                    console.error('Error modifying URL:', e);
                }
            }

            const response = await originalFetch(input || url, init);

            // Capture reservation list data
            if (typeof url === 'string' && url.includes('/api/v4/status/reservations/') && !dataProcessed) {
                const clone = response.clone();

                clone.json().then(async data => {
                    if (dataProcessed) return;

                    console.log('📦 Captured Reservations:', data);

                    if (data.results) {
                        window.INTERCEPTED_RESERVATIONS = data.results;

                        // Find reservation matching any of our target rooms
                        const targetReservation = data.results.find(r =>
                            r.rooms && r.rooms.some(roomObj =>
                                targetRooms.includes(roomObj.number)
                            )
                        );

                        if (!targetReservation) {
                            console.warn(`No reservation found for rooms ${targetRooms.join(', ')} on ${targetDate}`);
                            GM_setValue('chekin_response', { status: 'not_found' });
                            setTimeout(() => window.close(), 2000);
                            return;
                        }

                        const link = "https://dashboard.chekin.com/bookings/" + targetReservation.id;
                        let signupFormLink = null;

                        // Fetch signup form link from light reservation endpoint
                        try {
                            const lightReservationResponse = await originalFetch(
                                `https://a.chekin.io/api/v3/light/reservations/${targetReservation.id}/`,
                                init
                            );
                            const lightReservationData = await lightReservationResponse.json();
                            console.log('📦 Light Reservation Data:', lightReservationData);
                            signupFormLink = lightReservationData.signup_form_link || null;
                        } catch (err) {
                            console.error('Error fetching signup form link:', err);
                        }

                        if (targetReservation.guests.startsWith("0/")) {
                            console.warn(`No guests registered yet for rooms ${targetRooms.join(', ')}`);
                            GM_setValue('chekin_response', {
                                status: 'no_guests',
                                link,
                                signupFormLink
                            });
                            setTimeout(() => window.close(), 2000);
                            return;
                        }



                        // Fetch detailed guest data
                        try {
                            const response2 = await originalFetch(
                                "https://a.chekin.io/api/v3/guest-groups/" + targetReservation.guest_group_id + "/",
                                init
                            );
                            const data2 = await response2.json();
                            console.log('📦 Guest Details:', data2);

                            if (data2.members && data2.members.length > 0) {
                                const guestData = data2.members.map(guest => ({
                                    full_name: guest.full_name,
                                    document_number: guest.document?.number || 'N/A',
                                    phone: guest.phone || 'N/A'
                                }));

                                console.log('📝 Sending Guest Data:', guestData);
                                GM_setValue('chekin_response', {
                                    status: 'success',
                                    data: guestData,
                                    link,
                                    signupFormLink
                                });
                                dataProcessed = true;
                                setTimeout(() => window.close(), 2000);
                            }
                        } catch (err) {
                            console.error('Error fetching guest details:', err);
                            GM_setValue('chekin_response', { status: 'error', msg: err.message, link, signupFormLink });
                        }
                    }
                }).catch(err => console.error('Error reading JSON:', err));
            }

            return response;
        };

        unsafeWindow.fetch = newFetch ;
        // Check login after page loads
        setTimeout(() => {
            if (checkLoginStatus()) return;
        }, 5000);
    }

}

//setTimeout(run, 4000);
 run();
