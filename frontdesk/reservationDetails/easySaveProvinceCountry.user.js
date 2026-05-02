// ==UserScript==
// @name         LH Front Desk - Easy Save Province/Country
// @namespace    Hotelier Tools
// @version      0.2.0
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

    /**
     * Comprueba si el selector de país para un elemento específico permite mostrar
     * las funcionalidades específicas de España (vacío o "Spain").
     */
    function isCountryAllowedForTarget(target) {
        if (!target) return true;
        const container = target.closest('.guest-form') || target.closest('.contacts-totals-panel') || target.closest('.primary-contact-panel') || document;
        const countrySelect = container.querySelector('select[name="country"], select[id="guest_country"]');

        if (countrySelect) {
            const val = countrySelect.value;
            if (val !== '' && val !== 'Spain') {
                return false;
            }
        }
        return true;
    }

    /**
     * Rellena automáticamente el nombre y apellido con los valores de la reserva principal
     * si están vacíos o contienen el marcador de posición "_".
     */
    function autoFillGuestNames(container) {
        const guestForm = container.closest('.guest-form') || container.closest('.contacts-totals-panel') || container.closest('.primary-contact-panel') || document.body;
        const mainFirstName = document.querySelector('#guest_first_name')?.value || '_';
        const mainLastName = document.querySelector('#guest_last_name')?.value || '_';

        const nameSelectors = [
            'input[name="first_name"]',
            'input[name="last_name"]',
            'input[id="guest_first_name"]',
            'input[id="guest_last_name"]'
        ];
        const nameInputs = guestForm.querySelectorAll(nameSelectors.join(','));

        nameInputs.forEach(input => {
            const currentVal = input.value.trim();
            if (currentVal === '' || currentVal === '_') {
                const isFirst = input.name === 'first_name' || input.id === 'guest_first_name';
                const fallback = isFirst ? mainFirstName : mainLastName;
                triggerVueUpdate(input, fallback);
            }
        });
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
    .reservation-guests-panel {
        min-height: 75vh;
    }
    .alert.alert-placeholder {
        margin: 0;
    }

    /* Estilos personalizados para el panel de huéspedes */
    .reservation-guests-panel > .guest-room-type:first-of-type .guest-row { 
        width: 100% !important; 
        max-width: 100%; 
    }
    .reservation-guests-panel > .guest-room-type:first-of-type .row { 
        display: flex !important; 
        flex-wrap: nowrap; 
        justify-content: space-between; 
        align-items: center; 
        width: 100%; 
    }
    .reservation-guests-panel > .guest-room-type:first-of-type .row > [class="col-sm-"] { 
        float: none !important; 
        width: auto !important; 
        flex: 1 1 auto; 
        min-width: 0; 
    }
    .reservation-guests-panel > .guest-room-type:first-of-type .row > .pull-right { 
        flex: 0 0 auto; 
        margin-left: auto; 
        display: flex; 
        justify-content: flex-end; 
    }

    @media (min-width: 1100px) {
        .guest-row > .row > .col-sm-6,
        .guest-row > .row > .col-sm-4 {
            width: auto;
        }
        .guest-row { height: 100%; }
        .text-primary.room-type-name,
        .guest-row .count-label { font-size: 3rem; }
    }
    .reservation-guests-panel > .guest-room-type { margin-bottom: 0px; }
    .guest-room-type > .guest-form { margin: 0; }

    .popover-filter-container {
        padding: 10px;
        border-bottom: 1px solid #eee;
        position: sticky;
        top: 0;
        background: white;
        z-index: 2;
    }
    .popover-filter-input {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #d0d7de;
        border-radius: 6px;
        font-size: 16px;
        outline: none;
        box-sizing: border-box;
    }
    .popover-filter-input:focus {
        border-color: #0969da;
        box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
    }
    .province-item {
        background-color: #f0f7ff;
        transition: background-color 0.1s ease;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        border: 1px solid #e1e4e8;
    }
    .province-item:hover {
        background-color: #cfe5ff;
        border-color: #0969da;
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

                    if (!isCountryAllowedForTarget(container)) {
                        return; // No auto-enfocar si el país no es España o vacío
                    }

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
    // 4. DATOS Y POPOVER MULTIPROPÓSITO
    // =========================================================================
    const provinces = [
        "A Coruña", "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Bizkaia", "Burgos",
        "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba", "Cuenca", "Girona", "Granada",
        "Guadalajara", "Gipuzkoa", "Huelva", "Huesca", "Illes Balears", "Jaén", "La Rioja", "Las Palmas", "León", "Lleida",
        "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca",
        "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid",
        "Zamora", "Zaragoza"
    ].sort((a, b) => a.localeCompare(b, 'es'));

    const countries = ["Australia", "Canada", "New Zealand", "South Africa", "Spain", "United Kingdom", "United States", "Afghanistan", "Aland Islands", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla", "Antarctica", "Antigua And Barbuda", "Argentina", "Armenia", "Aruba", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Bouvet Island", "Brazil", "British Indian Ocean Territory", "Brunei Darussalam", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Cape Verde", "Cayman Islands", "Central African Republic", "Chad", "Chile", "China", "Christmas Island", "Cocos (Keeling) Islands", "Colombia", "Comoros", "Congo", "Congo, the Democratic Republic of the", "Cook Islands", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Curacao", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Falkland Islands (Malvinas)", "Faroe Islands", "Fiji", "Finland", "France", "French Guiana", "French Polynesia", "French Southern Territories", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Gibraltar", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guam", "Guatemala", "Guernsey", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Heard and McDonald Islands", "Holy See (Vatican City State)", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran, Islamic Republic of", "Iraq", "Ireland", "Isle of Man", "Israel", "Italy", "Jamaica", "Japan", "Jersey", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, Democratic People's Republic of", "Korea, Republic of", "Kuwait", "Kyrgyzstan", "Lao People's Democratic Republic", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libyan Arab Jamahiriya", "Liechtenstein", "Lithuania", "Luxembourg", "Macao", "Macedonia, The Former Yugoslav Republic Of", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique", "Mauritania", "Mauritius", "Mayotte", "Mexico", "Micronesia, Federated States of", "Moldova, Republic of", "Monaco", "Mongolia", "Montenegro", "Montserrat", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Caledonia", "Nicaragua", "Niger", "Nigeria", "Niue", "Norfolk Island", "Northern Mariana Islands", "Norway", "Oman", "Pakistan", "Palau", "Palestinian Territory, Occupied", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Pitcairn", "Poland", "Portugal", "Puerto Rico", "Qatar", "Reunion", "Romania", "Russian Federation", "Rwanda", "Saint Barthelemy", "Saint Helena", "Saint Kitts and Nevis", "Saint Lucia", "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Sint Maarten", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Georgia and the South Sandwich Islands", "Sri Lanka", "Sudan", "Suriname", "Svalbard and Jan Mayen", "Swaziland", "Sweden", "Switzerland", "Syrian Arab Republic", "Taiwan", "Tajikistan", "Tanzania, United Republic of", "Thailand", "Timor-Leste", "Togo", "Tokelau", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos Islands", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United States Minor Outlying Islands", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Viet Nam", "Virgin Islands, British", "Virgin Islands, U.S.", "Wallis and Futuna", "Western Sahara", "Yemen", "Zambia", "Zimbabwe"];

    const countryTranslations = {
        'Afghanistan': 'Afganistán', 'Albania': 'Albania', 'Algeria': 'Argelia', 'Andorra': 'Andorra', 'Angola': 'Angola',
        'Antigua And Barbuda': 'Antigua y Barbuda', 'Argentina': 'Argentina', 'Armenia': 'Armenia', 'Australia': 'Australia',
        'Austria': 'Austria', 'Azerbaijan': 'Azerbaiyán', 'Bahamas': 'Bahamas', 'Bahrain': 'Baréin', 'Bangladesh': 'Bangladés',
        'Barbados': 'Barbados', 'Belarus': 'Bielorrusia', 'Belgium': 'Bélgica', 'Belize': 'Belice', 'Benin': 'Benín',
        'Bhutan': 'Bután', 'Bolivia': 'Bolivia', 'Bosnia and Herzegovina': 'Bosnia y Herzegovina', 'Botswana': 'Botsuana',
        'Brazil': 'Brasil', 'Brunei Darussalam': 'Brunéi', 'Bulgaria': 'Bulgaria', 'Burkina Faso': 'Burkina Faso',
        'Burundi': 'Burundi', 'Cambodia': 'Camboya', 'Cameroon': 'Camerún', 'Canada': 'Canadá', 'Cape Verde': 'Cabo Verde',
        'Central African Republic': 'República Centroafricana', 'Chad': 'Chad', 'Chile': 'Chile', 'China': 'China',
        'Colombia': 'Colombia', 'Comoros': 'Comoras', 'Congo': 'Congo', 'Congo, the Democratic Republic of the': 'República Democrática del Congo',
        'Costa Rica': 'Costa Rica', 'Cote d\'Ivoire': 'Costa de Marfil', 'Croatia': 'Croacia', 'Cuba': 'Cuba',
        'Cyprus': 'Chipre', 'Czech Republic': 'República Checa', 'Denmark': 'Dinamarca', 'Djibouti': 'Yibuti',
        'Dominica': 'Dominica', 'Dominican Republic': 'República Dominicana', 'Ecuador': 'Ecuador', 'Egypt': 'Egipto',
        'El Salvador': 'El Salvador', 'Equatorial Guinea': 'Guinea Ecuatorial', 'Eritrea': 'Eritrea', 'Estonia': 'Estonia',
        'Ethiopia': 'Etiopía', 'Fiji': 'Fiyi', 'Finland': 'Finlandia', 'France': 'Francia', 'Gabon': 'Gabón',
        'Gambia': 'Gambia', 'Georgia': 'Georgia', 'Germany': 'Alemania', 'Ghana': 'Ghana', 'Greece': 'Grecia',
        'Grenada': 'Granada', 'Guatemala': 'Guatemala', 'Guinea': 'Guinea', 'Guinea-Bissau': 'Guinea-Bisáu',
        'Guyana': 'Guyana', 'Haiti': 'Haití', 'Holy See (Vatican City State)': 'Vaticano', 'Honduras': 'Honduras',
        'Hungary': 'Hungría', 'Iceland': 'Islandia', 'India': 'India', 'Indonesia': 'Indonesia', 'Iran, Islamic Republic of': 'Irán',
        'Iraq': 'Irak', 'Ireland': 'Irlanda', 'Israel': 'Israel', 'Italy': 'Italia', 'Jamaica': 'Jamaica',
        'Japan': 'Japón', 'Jordan': 'Jordania', 'Kazakhstan': 'Kazajistán', 'Kenya': 'Kenia', 'Kiribati': 'Kiribati',
        'Korea, Democratic People\'s Republic of': 'Corea del Norte', 'Korea, Republic of': 'Corea del Sur',
        'Kuwait': 'Kuwait', 'Kyrgyzstan': 'Kirguistán', 'Lao People\'s Democratic Republic': 'Laos', 'Latvia': 'Letonia',
        'Lebanon': 'Líbano', 'Lesotho': 'Lesoto', 'Liberia': 'Liberia', 'Libyan Arab Jamahiriya': 'Libia',
        'Liechtenstein': 'Liechtenstein', 'Lithuania': 'Lituania', 'Luxembourg': 'Luxemburgo',
        'Macedonia, The Former Yugoslav Republic Of': 'Macedonia del Norte', 'Madagascar': 'Madagascar', 'Malawi': 'Malaui',
        'Malaysia': 'Malasia', 'Maldives': 'Maldivas', 'Mali': 'Mali', 'Malta': 'Malta', 'Marshall Islands': 'Islas Marshall',
        'Mauritania': 'Mauritania', 'Mauritius': 'Mauricio', 'Mexico': 'México', 'Micronesia, Federated States of': 'Micronesia',
        'Moldova, Republic of': 'Moldavia', 'Monaco': 'Mónaco', 'Mongolia': 'Mongolia', 'Montenegro': 'Montenegro',
        'Morocco': 'Marruecos', 'Mozambique': 'Mozambique', 'Myanmar': 'Myanmar', 'Namibia': 'Namibia', 'Nauru': 'Nauru',
        'Nepal': 'Nepal', 'Netherlands': 'Países Bajos', 'New Zealand': 'Nueva Zelanda', 'Nicaragua': 'Nicaragua',
        'Niger': 'Níger', 'Nigeria': 'Nigeria', 'Norway': 'Noruega', 'Oman': 'Omán', 'Pakistan': 'Pakistán',
        'Palau': 'Palaos', 'Panama': 'Panamá', 'Papua New Guinea': 'Papúa Nueva Guinea', 'Paraguay': 'Paraguay',
        'Peru': 'Perú', 'Philippines': 'Filipinas', 'Poland': 'Polonia', 'Portugal': 'Portugal', 'Qatar': 'Catar',
        'Romania': 'Rumanía', 'Russian Federation': 'Rusia', 'Rwanda': 'Ruanda', 'Saint Kitts and Nevis': 'San Cristóbal y Nieves',
        'Saint Lucia': 'Santa Lucía', 'Saint Vincent and the Grenadines': 'San Vicente y las Granadinas', 'Samoa': 'Samoa',
        'San Marino': 'San Marino', 'Sao Tome and Principe': 'Santo Tomé y Príncipe', 'Saudi Arabia': 'Arabia Saudita',
        'Senegal': 'Senegal', 'Serbia': 'Serbia', 'Seychelles': 'Seychelles', 'Sierra Leone': 'Sierra Leona',
        'Singapore': 'Singapur', 'Slovakia': 'Eslovaquia', 'Slovenia': 'Eslovenia', 'Solomon Islands': 'Islas Salomón',
        'Somalia': 'Somalia', 'South Africa': 'Sudáfrica', 'Spain': 'España', 'Sri Lanka': 'Sri Lanka',
        'Sudan': 'Sudán', 'Suriname': 'Surinam', 'Sweden': 'Suecia', 'Switzerland': 'Suiza',
        'Syrian Arab Republic': 'Siria', 'Tajikistan': 'Tayikistán', 'Tanzania, United Republic of': 'Tanzania',
        'Thailand': 'Tailandia', 'Timor-Leste': 'Timor Oriental', 'Togo': 'Togo', 'Tonga': 'Tonga',
        'Trinidad and Tobago': 'Trinidad y Tobago', 'Tunisia': 'Túnez', 'Turkey': 'Turquía', 'Turkmenistan': 'Turkmenistán',
        'Tuvalu': 'Tuvalu', 'Uganda': 'Uganda', 'Ukraine': 'Ucrania', 'United Arab Emirates': 'Emiratos Árabes Unidos',
        'United Kingdom': 'Reino Unido', 'United States': 'Estados Unidos', 'Uruguay': 'Uruguay', 'Uzbekistan': 'Uzbekistán',
        'Vanuatu': 'Vanuatu', 'Venezuela': 'Venezuela', 'Viet Nam': 'Vietnam', 'Yemen': 'Yemen', 'Zambia': 'Zambia',
        'Zimbabwe': 'Zimbabue', 'Puerto Rico': 'Puerto Rico'
    };

    let popover = null;
    let popoverList = null;
    let popoverFilterInput = null;
    let popoverType = 'province'; // 'province' o 'country'
    let currentTargetElement = null;

    function createPopover() {
        if (popover) return;

        popover = document.createElement('div');
        popover.style.position = 'absolute';
        popover.style.zIndex = '999999';
        popover.style.background = '#ffffff';
        popover.style.border = '1px solid #ddd';
        popover.style.borderRadius = '8px';
        popover.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
        popover.style.maxHeight = '80vh';
        popover.style.overflow = 'hidden';
        popover.style.display = 'none';
        popover.style.boxSizing = 'border-box';
        popover.style.flexDirection = 'column';

        // Filter container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'popover-filter-container';

        popoverFilterInput = document.createElement('input');
        popoverFilterInput.type = 'text';
        popoverFilterInput.className = 'popover-filter-input';
        popoverFilterInput.placeholder = 'Buscar...';
        popoverFilterInput.autocomplete = 'off';

        filterContainer.appendChild(popoverFilterInput);
        popover.appendChild(filterContainer);

        // List container
        popoverList = document.createElement('div');
        popoverList.style.flex = '1';
        popoverList.style.overflowY = 'auto';
        popoverList.style.display = 'flex';
        popoverList.style.flexWrap = 'wrap';
        popoverList.style.gap = '8px';
        popoverList.style.padding = '12px';
        popover.appendChild(popoverList);

        document.body.appendChild(popover);

        popover.addEventListener('mousedown', function (e) {
            if (e.target !== popoverFilterInput) {
                e.preventDefault();
            }
        });

        popoverFilterInput.addEventListener('input', function () {
            renderList(popoverFilterInput.value);
        });

        popover.addEventListener('click', function (e) {
            const item = e.target.closest('.province-item');
            if (item) {
                const selectedValue = item.dataset.value;
                if (currentTargetElement) {
                    const savedElement = currentTargetElement;

                    if (popoverType === 'province') {
                        triggerVueUpdate(savedElement, selectedValue);

                        // Auto-relleno de nombres
                        autoFillGuestNames(savedElement);

                        const guestForm = savedElement.closest('.guest-form') || savedElement.closest('.contacts-totals-panel') || savedElement.closest('.primary-contact-panel') || document.body;
                        const countrySelect = guestForm.querySelector('select[name="country"], select[id="guest_country"]');
                        if (countrySelect) {
                            triggerVueUpdate(countrySelect, 'Spain');
                        }

                        setTimeout(() => {
                            triggerVueUpdate(savedElement, selectedValue);
                            savedElement.blur();
                        }, 50);
                    } else {
                        // Selección de país
                        triggerVueUpdate(savedElement, selectedValue);

                        // Si se selecciona un país (y no está vacío), auto-rellenamos nombres
                        if (selectedValue) {
                            autoFillGuestNames(savedElement);
                        }

                        savedElement.blur();
                    }
                }
                hidePopover();
            }
        });
    }

    function updatePosition() {
        if (popover && popover.style.display !== 'none' && currentTargetElement) {
            const inputRect = currentTargetElement.getBoundingClientRect();

            let container = currentTargetElement.closest('.row');
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

    function showPopover(element, type = 'province') {
        createPopover();
        currentTargetElement = element;
        popoverType = type;

        if (type === 'province') {
            popoverFilterInput.parentElement.style.display = 'none';
            renderList(element.value);
        } else {
            popoverFilterInput.parentElement.style.display = 'block';
            popoverFilterInput.value = '';
            renderList('');
            setTimeout(() => popoverFilterInput.focus(), 50);
        }

        popover.style.display = 'flex';
        updatePosition();
    }

    function hidePopover() {
        if (popover) {
            popover.style.display = 'none';
            currentTargetElement = null;
        }
    }

    const normalizeString = (str) => {
        return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const alternativeNames = {
        'vizcaya': 'Bizkaia', 'bizkaia': 'Bizkaia', 'guipuzcoa': 'Gipuzkoa', 'gipuzcoa': 'Gipuzkoa',
        'araba': 'Álava', 'alava': 'Álava', 'coruna': 'A Coruña', 'la coruna': 'A Coruña',
        'corunna': 'A Coruña', 'orense': 'Ourense', 'gerona': 'Girona', 'lerida': 'Lleida',
        'baleares': 'Illes Balears', 'islas baleares': 'Illes Balears', 'tenerife': 'Santa Cruz de Tenerife',
        'gran canaria': 'Las Palmas', 'lanzarote': 'Las Palmas', 'fuerteventura': 'Las Palmas',
        'la palma': 'Santa Cruz de Tenerife', 'la gomera': 'Santa Cruz de Tenerife', 'el hierro': 'Santa Cruz de Tenerife',
        'ibiza': 'Illes Balears', 'mallorca': 'Illes Balears', 'menorca': 'Illes Balears', 'formentera': 'Illes Balears',
        'pais vasco': 'Bizkaia', 'basque country': 'Bizkaia', 'euskadi': 'Gipuzkoa', 'castellon de la plana': 'Castellón',
        'castello': 'Castellón', 'alicant': 'Alicante', 'alacant': 'Alicante', 'seville': 'Sevilla',
        'saragossa': 'Zaragoza', 'navarre': 'Navarra', 'nafarroa': 'Navarra', 'logrono': 'La Rioja',
        'oviedo': 'Asturias', 'principado de asturias': 'Asturias', 'santander': 'Cantabria'
    };

    function renderList(filterText = '') {
        if (!popoverList) return;
        popoverList.innerHTML = '';

        const normFilter = normalizeString(filterText);
        const dataSet = popoverType === 'province' ? provinces : countries;

        const filtered = dataSet.filter(item => {
            if (!normFilter) return true;
            const label = popoverType === 'country' ? (countryTranslations[item] || item) : item;

            const itemNorm = normalizeString(item);
            const labelNorm = normalizeString(label);

            // Búsqueda flexible: dividimos por espacios y comprobamos que todas las palabras coincidan
            const searchWords = normFilter.split(/\s+/);
            const matchesAll = searchWords.every(word =>
                labelNorm.includes(word) || itemNorm.includes(word)
            );

            if (matchesAll) return true;

            if (popoverType === 'province') {
                for (const [altName, officialName] of Object.entries(alternativeNames)) {
                    if (officialName === item && searchWords.every(word => normalizeString(altName).includes(word))) {
                        return true;
                    }
                }
            }
            return false;
        });

        if (filtered.length === 0) return;

        popover.style.display = 'flex';
        filtered.forEach(p => {
            const item = document.createElement('div');
            const translation = popoverType === 'country' ? (countryTranslations[p] || p) : p;

            if (popoverType === 'country' && translation !== p) {
                item.innerHTML = `<div style="font-weight: 600; font-size: 15px;">${translation}</div><div style="font-size: 11px; opacity: 0.7;">${p}</div>`;
            } else {
                item.textContent = translation;
                item.style.fontWeight = '600';
            }

            item.dataset.value = p;
            item.className = 'province-item';
            item.style.padding = '12px 10px';
            item.style.cursor = 'pointer';
            item.style.borderRadius = '6px';
            item.style.fontFamily = 'Lato, sans-serif';
            item.style.wordBreak = 'break-word';
            item.style.flex = '1 1 180px';
            item.style.minHeight = '50px';

            popoverList.appendChild(item);
        });
    }

    function isStateInput(target) {
        const isState = target && target.tagName === 'INPUT' && target.type === 'text' &&
            (target.name === 'state' || target.id === 'guest_state' || target.placeholder === 'Provincia/Región');

        if (!isState) return false;

        return isCountryAllowedForTarget(target);
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

    function isCountrySelect(target) {
        return target && target.tagName === 'SELECT' &&
            (target.name === 'country' || target.id === 'guest_country');
    }

    document.addEventListener('click', function (e) {
        // Cerrar si se hace clic fuera del popover y del elemento que lo activó
        if (popover && popover.style.display !== 'none') {
            if (!popover.contains(e.target) && e.target !== currentTargetElement) {
                hidePopover();
                return; // Evitamos procesar más si acabamos de cerrar
            }
        }

        if (!e.target.closest('.province-item') && !e.target.closest('.popover-filter-container')) {
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
        if (isStateInput(e.target)) showPopover(e.target, 'province');
        else if (isCountrySelect(e.target)) showPopover(e.target, 'country');
    });

    document.addEventListener('focusout', function (e) {
        if (isStateInput(e.target) || isCountrySelect(e.target)) {
            setTimeout(() => {
                if (document.activeElement !== e.target &&
                    (!popover || !popover.contains(document.activeElement))) {
                    hidePopover();
                }
            }, 150);
        }
    });

    document.addEventListener('input', function (e) {
        if (isStateInput(e.target)) {
            if (popover && popover.style.display !== 'none' && currentTargetElement === e.target && popoverType === 'province') {
                renderList(e.target.value);
            } else {
                showPopover(e.target, 'province');
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
