// ==UserScript==
// @name         LH Front Desk - Clone Prices Below
// @namespace    Hotelier Tools
// @version      0.0.1
// @description  Clone prices from previous block of type of room
// @author       JuanmanDev
// @match        https://app.littlehotelier.com/extranet/properties/*/inventory/edit*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com
// @grant        none

// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/clonePricesBelow.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/clonePricesBelow.user.js
// ==/UserScript==

(function () {
    // 1. Buscamos los bloques principales
    const allBlocks = Array.from(document.querySelectorAll('table.outer.inventory_body > tbody > tr > td[colspan="15"]'))
        .filter(td => td.querySelectorAll('table.rate_plan').length > 0);

    allBlocks.forEach((currentTd, index) => {
        if (index === 0) return; // Saltamos el primer bloque

        // 2. Buscamos el td.name que contiene el h2
        const nameTd = currentTd.querySelector('td.name');
        if (!nameTd) return;

        // --- Ajuste de Estilo del Contenedor ---
        nameTd.style.display = 'flex';
        nameTd.style.justifyContent = 'space-between';
        nameTd.style.alignItems = 'center';
        nameTd.style.paddingRight = '0px';

        // --- Interfaz Compacta ---
        const uiContainer = document.createElement('div');
        // Se cambia border-radius a 0
        uiContainer.style.cssText = 'display: flex; gap: 8px; align-items: center; background: #f0f7ff; padding: 3px 10px;';

        const label = document.createElement('span');
        label.innerHTML = "<b>Copiar anterior:</b>";
        label.style.fontSize = "12px";
        label.style.color = "#4a90e2";

        const incInput = document.createElement('input');
        incInput.type = 'number';
        incInput.value = '0';
        // Se cambia border-radius a 0
        incInput.style.cssText = 'width: 50px; border: 1px solid #ccc; border-radius: 0; padding: 2px 5px; text-align: center;';
        incInput.title = "Incremento solo para filas .rate.basic";

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Replicar';
        copyBtn.type = 'button';
        // Se cambia border-radius a 0
        copyBtn.style.cssText = 'padding: 4px 12px; cursor: pointer; background: #4a90e2; color: white; border: none; border-radius: 0; font-weight: bold; font-size: 12px; transition: background 0.3s;';

        // --- Lógica del botón ---
        copyBtn.onclick = (e) => {
            e.preventDefault();
            const prevTd = allBlocks[index - 1];
            const prevTables = prevTd.querySelectorAll(':scope > table.rate_plan');
            const currentTables = currentTd.querySelectorAll(':scope > table.rate_plan');
            const increment = parseFloat(incInput.value) || 0;

            currentTables.forEach((targetTable, tableIdx) => {
                const sourceTable = prevTables[tableIdx];
                if (!sourceTable) return;

                const targetRows = targetTable.querySelectorAll('tr');
                const sourceRows = sourceTable.querySelectorAll('tr');

                targetRows.forEach((targetRow, rowIdx) => {
                    const sourceRow = sourceRows[rowIdx];
                    if (!sourceRow) return;

                    const isRateBasic = targetRow.classList.contains('rate') && targetRow.classList.contains('basic');

                    targetRow.querySelectorAll('input[type="text"], input[type="number"]').forEach((input, i) => {
                        const sInput = sourceRow.querySelectorAll('input[type="text"], input[type="number"]')[i];
                        if (sInput) {
                            let val = parseFloat(sInput.value.replace(',', '.'));
                            if (isRateBasic && !isNaN(val)) {
                                input.value = (val + increment).toFixed(2).toString().replace('.', ',');
                            } else {
                                input.value = sInput.value;
                            }
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });

                    targetRow.querySelectorAll('input[type="checkbox"]').forEach((check, i) => {
                        const sCheck = sourceRow.querySelectorAll('input[type="checkbox"]')[i];
                        if (sCheck && check.checked !== sCheck.checked) {
                            check.checked = sCheck.checked;
                            check.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                });
            });

            copyBtn.textContent = '✅ Hecho';
            copyBtn.style.background = '#28a745';
            setTimeout(() => {
                copyBtn.textContent = '📋 Replicar';
                copyBtn.style.background = '#4a90e2';
            }, 2000);
        };

        uiContainer.appendChild(label);
        uiContainer.appendChild(incInput);
        uiContainer.appendChild(copyBtn);

        nameTd.appendChild(uiContainer);
    });
})();

(function () {
    const styles = `
    /* Reducir el padding superior de los títulos h3 en las celdas de planes */
    td.rate_plan_name h3 {
      padding-top: 0px !important;
      margin-top: 0px !important;
    }

    /* Quitar borde y padding de las celdas de planes */
    td.rate_plan_name {
      padding: 0px !important;
      border: none !important;
    }

    /* Añadir margen superior a las tablas de tipo de habitación */
    table.room_type {
      margin-top: 20px !important;
    }
  `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
})();