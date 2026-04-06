// ==UserScript==
// @name         LH Front Desk - Easy Save Province/Country
// @namespace    Hotelier Tools
// @version      0.1.3
// @description  Better selection of Province/Country for Spanish guests and improve UI for mobile/tablet. Add a easy selector for the provice, when focus proivince display a list of provinces in spanish of Spain to select and mark country Spain and set a _ name and surname to be able to save it.
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations/*/edit*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// @homepageURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL    https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL   https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/easySaveProvinceCountry.user.js
// @updateURL     https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/reservationDetails/easySaveProvinceCountry.user.js


(function () {

    // =========================================================================
    // 1. FUNCIONES AUXILIARES PARA ENGAÑAR A VUE.JS
    // =========================================================================
    // Vue intercepta los "setters" de los inputs. Esta función invoca el  
    // setter nativo de base para obligar a Vue a registrar que el 
    // usuario (y no solo código) ha modificado el valor (lo marca Dirty).
    function triggerVueUpdate(element, newValue) {
        if (!element) return;

        const isSelect = element.tagName === 'SELECT';
        const prototype = isSelect ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

        if (setter) {
            setter.call(element, newValue);
        } else {
            element.value = newValue; // Fallback de seguridad
        }

        // Disparamos ambos eventos por si el binding usa v-model.lazy (change) o estándar (input)
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // =========================================================================
    // 2. INYECCIÓN DE ESTILOS Y CORRECCIONES VISUALES
    // =========================================================================
    const style = document.createElement('style');
    style.textContent = `
    /* Mejorar botón "Añadir nuevo huésped" para uso táctil */
    button.btn-link:has(.fa-plus), 
    button.btn-link.text-blue.pad-top-0 {
        font-size: 16px !important;
        padding: 12px 20px !important;
        background-color: #f4f6f8 !important;
        border: 1px solid #d0d7de !important;
        border-radius: 8px !important;
        text-decoration: none !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin-top: 10px !important;
        margin-bottom: 15px !important;
        font-weight: 600 !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
    }

    /* Aagrandar el CIRCULO para contraer/desplegar el huésped (Chevron) */
    button.btn-expand i.fa-chevron-circle-down,
    button.btn-expand i.fa-chevron-circle-up {
        font-size: 28px !important;
        vertical-align: middle !important;
    }
    button.btn-expand {
        padding: 6px 14px !important;
    }
    
    /* Mostrar SIEMPRE la cruz roja ("X") para eliminar huésped */
    .guest-form button.close.close-rrt,
    .guest-form button.close.close-rrt.hidden,
    button.close.close-rrt.hidden {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        background-color: transparent !important;
        color: #d9534f !important;
        padding: 8px 12px !important;
        font-size: 24px !important;
        margin-top: -5px !important;
    }

    .reservation-panel #reservation-dialog form > .tab-content {
        min-height: 75vh;
    }
  `;
    document.head.appendChild(style);

    // =========================================================================
    // 3. AUTOMATIZACIONES DEL FORMULARIO DE HUÉSPEDES
    // =========================================================================

    // Función para procesar y auto-expandir botones
    function checkAndExpandGuests() {
        const expandBtns = document.querySelectorAll('button.btn-expand');
        expandBtns.forEach(btn => {
            // Si es la primera vez que detectamos este botón
            if (!btn.dataset.autoExpanded) {
                btn.dataset.autoExpanded = 'true'; // Lo marcamos para no volver a hacer click

                const isClosed = btn.querySelector('.fa-chevron-circle-down');
                if (isClosed) {
                    btn.click(); // Expandimos la opción
                }

                // Esperamos un instante a que se renderice el formulario HTML
                setTimeout(() => {
                    // Buscar el input de provincia 
                    // (buscamos a partir del padre común o a nivel global si está separado)
                    let container = btn.closest('.guest-form') || document;
                    const allStateInputs = container.querySelectorAll('input[name="state"].form-control');

                    if (allStateInputs.length > 0) {
                        // Enfocar el último input renderizado (habitualmente el que acabamos de abrir)
                        const targetInput = allStateInputs[allStateInputs.length - 1];
                        targetInput.focus();
                    }
                }, 250);
            }
        });
    }

    // Observador para revisar componentes añadidos dinámicamente
    const observer = new MutationObserver((mutations) => {
        // Solo revisamos si se añaden nodos al DOM
        const hasAddedNodes = mutations.some(mutation => mutation.addedNodes.length > 0);
        if (hasAddedNodes) {
            checkAndExpandGuests();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Revisión inicial por si los elementos ya están en el DOM al cargar
    setTimeout(checkAndExpandGuests, 500);


    // =========================================================================
    // 4. POPOVER DE PROVINCIAS EFICIENTE
    // =========================================================================
    const provinces = [
        "A Coruña", "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Bizkaia", "Burgos",
        "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba", "Cuenca", "Girona", "Granada",
        "Guadalajara", "Gipuzkoa", "Huelva", "Huesca", "Illes Balears", "Jaén", "La Rioja", "Las Palmas", "León", "Lleida",
        "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca",
        "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid",
        "Zamora", "Zaragoza"
    ].sort((a, b) => a.localeCompare(b, 'es'));

    let popover = null;
    let currentTargetInput = null;

    function createPopover() {
        if (popover) return;

        popover = document.createElement('div');
        popover.style.position = 'absolute';
        popover.style.zIndex = '999999';
        popover.style.background = '#ffffff';
        popover.style.border = '1px solid #ddd';
        popover.style.borderRadius = '6px';
        popover.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
        popover.style.maxHeight = '75vh';
        popover.style.overflowY = 'auto';
        popover.style.display = 'none';
        popover.style.boxSizing = 'border-box';

        popover.style.gridTemplateColumns = 'repeat(auto-fill, minmax(170px, 1fr))';
        popover.style.gap = '6px';
        popover.style.padding = '12px';

        document.body.appendChild(popover);

        popover.addEventListener('mousedown', function (e) { e.preventDefault(); });

        popover.addEventListener('click', function (e) {
            if (e.target.classList.contains('province-item')) {
                const selectedValue = e.target.textContent;
                if (currentTargetInput) {

                    // Guardamos referencia antes de que hidePopover() la borre
                    const savedInput = currentTargetInput;

                    // ✔ Actualización Forzada de Vue (para que lo marque como DIRTY)
                    triggerVueUpdate(savedInput, selectedValue);

                    // Buscar el contenedor del formulario (huésped secundario o contacto principal)
                    // Para el form principal: #guest_state está fuera de .primary-contact-panel
                    // pero dentro de .contacts-totals-panel junto con #guest_country
                    const guestForm = savedInput.closest('.guest-form') || savedInput.closest('.contacts-totals-panel') || savedInput.closest('.primary-contact-panel') || document.body;

                    // Rellenar vacíos con "_" asegurando que Vue registre el cambio
                    // Soportamos name="first_name" (secundarios) e id="guest_first_name" (principal)
                    const nameSelectors = [
                        'input[name="first_name"]',
                        'input[name="last_name"]',
                        'input[id="guest_first_name"]',
                        'input[id="guest_last_name"]'
                    ];
                    const nameInputs = guestForm.querySelectorAll(nameSelectors.join(','));

                    nameInputs.forEach(input => {
                        if (input.value.trim() === '') {
                            // ✔ Usamos el mismo hack superior de Vue para validar estos inputs
                            triggerVueUpdate(input, '_');
                        }
                    });

                    // Cambiar a España asegurando validación
                    // Buscamos el select de país dentro del mismo contenedor
                    const countrySelect = guestForm.querySelector('select[name="country"], select[id="guest_country"]');
                    if (countrySelect) {
                        triggerVueUpdate(countrySelect, 'Spain');
                    }

                    // ✔ Re-aplicar provincia tras un breve delay para sobrevivir al
                    // re-render de Vue provocado al cambiar país/nombres
                    setTimeout(() => {
                        triggerVueUpdate(savedInput, selectedValue);
                        savedInput.blur();
                    }, 50);

                }
                hidePopover();
            }
        });
    }

    function updatePosition() {
        if (popover && popover.style.display !== 'none' && currentTargetInput) {
            const inputRect = currentTargetInput.getBoundingClientRect();

            let container = currentTargetInput.closest('.row');
            while (container && container.parentElement && container.parentElement.closest('.row')) {
                container = container.parentElement.closest('.row');
            }

            let finalWidth = 850;
            let leftPos = inputRect.left;

            if (container) {
                const containerRect = container.getBoundingClientRect();
                if (containerRect.width > 500) {
                    finalWidth = containerRect.width;
                    leftPos = containerRect.left;
                }
            }

            finalWidth = Math.min(finalWidth, window.innerWidth - 40);
            if (leftPos + finalWidth > window.innerWidth - 20) {
                leftPos = window.innerWidth - finalWidth - 20;
            }
            if (leftPos < 20) { leftPos = 20; }

            popover.style.top = (inputRect.bottom + window.scrollY + 6) + 'px';
            popover.style.left = (leftPos + window.scrollX) + 'px';
            popover.style.width = finalWidth + 'px';
        }
    }

    function showPopover(inputElement) {
        createPopover();
        currentTargetInput = inputElement;

        currentTargetInput.setAttribute('autocomplete', 'new-password');
        currentTargetInput.setAttribute('data-lpignore', 'true');
        currentTargetInput.setAttribute('data-form-type', 'other');

        renderList(inputElement.value);

        popover.style.display = 'grid';
        updatePosition();
    }

    function hidePopover() {
        if (popover) {
            popover.style.display = 'none';
            currentTargetInput = null;
        }
    }

    const normalizeString = (str) => {
        return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const alternativeNames = {
        'vizcaya': 'Bizkaia',
        'bizkaia': 'Bizkaia',
        'guipuzcoa': 'Gipuzkoa',
        'gipuzcoa': 'Gipuzkoa',
        'araba': 'Álava',
        'alava': 'Álava',
        'coruna': 'A Coruña',
        'la coruna': 'A Coruña',
        'corunna': 'A Coruña',
        'orense': 'Ourense',
        'gerona': 'Girona',
        'lerida': 'Lleida',
        'baleares': 'Illes Balears',
        'islas baleares': 'Illes Balears',
        'tenerife': 'Santa Cruz de Tenerife',
        'gran canaria': 'Las Palmas',
        'lanzarote': 'Las Palmas',
        'fuerteventura': 'Las Palmas',
        'la palma': 'Santa Cruz de Tenerife',
        'la gomera': 'Santa Cruz de Tenerife',
        'el hierro': 'Santa Cruz de Tenerife',
        'ibiza': 'Illes Balears',
        'mallorca': 'Illes Balears',
        'menorca': 'Illes Balears',
        'formentera': 'Illes Balears',
        'pais vasco': 'Bizkaia',
        'basque country': 'Bizkaia',
        'euskadi': 'Gipuzkoa',
        'castellon de la plana': 'Castellón',
        'castello': 'Castellón',
        'alicant': 'Alicante',
        'alacant': 'Alicante',
        'seville': 'Sevilla',
        'saragossa': 'Zaragoza',
        'navarre': 'Navarra',
        'nafarroa': 'Navarra',
        'logrono': 'La Rioja',
        'oviedo': 'Asturias',
        'principado de asturias': 'Asturias',
        'santander': 'Cantabria'
    };

    function renderList(filterText = '') {
        if (!popover) return;
        popover.innerHTML = '';

        const normFilter = normalizeString(filterText);
        const filtered = provinces.filter(p => {
            if (!normFilter) return true;
            if (normalizeString(p).includes(normFilter)) return true;

            // Check alternative names
            for (const [altName, officialName] of Object.entries(alternativeNames)) {
                if (officialName === p && altName.includes(normFilter)) {
                    return true;
                }
            }
            return false;
        });

        if (filtered.length === 0) {
            hidePopover();
            return;
        }

        popover.style.display = 'grid';
        filtered.forEach(p => {
            const item = document.createElement('div');
            item.textContent = p;
            item.className = 'province-item';
            item.style.padding = '8px 12px';
            item.style.cursor = 'pointer';
            item.style.borderRadius = '4px';
            item.style.fontSize = '14.5px';
            item.style.fontFamily = 'Lato, sans-serif';
            item.style.transition = 'background-color 0.1s ease';
            item.style.wordBreak = 'break-word';

            item.addEventListener('mouseenter', () => item.style.backgroundColor = '#e8f0fe');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');

            popover.appendChild(item);
        });
    }

    function isStateInput(target) {
        return target && target.tagName === 'INPUT' && target.type === 'text' &&
            (target.name === 'state' || target.id === 'guest_state' || target.placeholder === 'Provincia/Región');
    }

    // click logic to make the whole container clickable
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.province-item')) {
            const container = e.target.closest('.form-group') || e.target.closest('.col-sm-3');
            if (container) {
                const stateInput = container.querySelector('input[name="state"], input[id="guest_state"]');
                if (stateInput && e.target !== stateInput) {
                    stateInput.focus();
                }
            }
        }
    });

    document.addEventListener('focusin', function (e) {
        if (isStateInput(e.target)) showPopover(e.target);
    });

    document.addEventListener('focusout', function (e) {
        if (isStateInput(e.target)) {
            setTimeout(() => {
                if (document.activeElement !== e.target && (!popover || !popover.contains(document.activeElement))) {
                    hidePopover();
                }
            }, 150);
        }
    });

    document.addEventListener('input', function (e) {
        if (isStateInput(e.target)) {
            if (popover && popover.style.display !== 'none' && currentTargetInput === e.target) {
                renderList(e.target.value);
                if (popover.style.display !== 'grid' && e.target.value.length >= 0) {
                    popover.style.display = 'grid';
                }
            } else {
                showPopover(e.target);
            }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && popover && popover.style.display !== 'none') hidePopover();
    });

    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
    window.addEventListener('resize', updatePosition);


    console.log('🏨 LH Script Loaded - Easy Save Province/Country');

})();
