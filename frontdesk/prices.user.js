// ==UserScript==
// @name         LH Front Desk - Prices
// @namespace    Hotelier Tools
// @version      1.0.0
// @description  Shows room prices in the Little Hotelier calendar view by fetching data from the inventory page
// @author       JuanmanDev
// @match        https://application.littlehotelier.com/*
// @match        https://app.littlehotelier.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=littlehotelier.com

// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @homepageURL  https://github.com/JuanmanDev/TampermonkeyLittleHotelier/
// @supportURL   https://github.com/JuanmanDev/TampermonkeyLittleHotelier/issues
// @downloadURL  https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/prices.user.js
// @updateURL    https://raw.githubusercontent.com/JuanmanDev/TampermonkeyLittleHotelier/main/frontdesk/prices.user.js
// ==/UserScript==




async function saveLH_Prices(){
    const value = [...document.querySelectorAll("table.room_type")].map(t => ({
        name: t.querySelector("h2").innerText,
        rates: [...t.parentNode.querySelectorAll(".rate.basic")[0].querySelectorAll("input")].map(e => e.value)
    }));

    console.debug("LH_Prices GM");

    console.debug("LH_prices saved", value);
    await GM_setValue("LH_prices", value);
    console.debug("LH_prices saved FINISH", GM_getValue("LH_prices", null));

}

let lastTabOpen = null;
let pricesListenerId = null;


function calendar() {
    // Listen to back/forward navigation (popstate event)
    window.addEventListener('popstate', () => {
        console.debug('URL changed to:', window.location.href);
    });

    // Override pushState and replaceState to detect programmatic changes
    (function(history){
        const pushState = history.pushState;
        history.pushState = function(...args) {
            const result = pushState.apply(this, args);
            window.dispatchEvent(new Event('urlchange'));
            return result;
        };

        const replaceState = history.replaceState;
        history.replaceState = function(...args) {
            const result = replaceState.apply(this, args);
            window.dispatchEvent(new Event('urlchange'));
            return result;
        };
    })(window.history);

    // Listen to custom 'urlchange' event
    window.addEventListener('urlchange', () => {
        magic();
    });

    magic();
}

function isPastDate(dateStr) {
  const inputDate = new Date(dateStr);
  const today = new Date();

  // Clear the time parts for today (set to midnight)
  today.setHours(0, 0, 0, 0);

  return inputDate < today;
}


  async function magic() {
              GM_deleteValue("LH_prices");
              if (pricesListenerId !== null) {
                  GM_removeValueChangeListener(pricesListenerId);
                  pricesListenerId = null;
              }
              lastTabOpen?.close();

      const spans = document.querySelectorAll('span.room-type-text');

      spans.forEach(span => {
          const tbody = span.closest('tbody');
          if (!tbody) return;

          const trs = tbody.querySelectorAll('tr');
          if (trs.length === 0) return;

          const lastTr = trs[trs.length - 1];

          // Select all td with class 'date-cell' inside last tr
          const dateCells = lastTr.querySelectorAll('td.date-cell');

          dateCells.forEach(td => {
              // Clear the text content
              td.textContent = '';
          });
      });

      const pathname = window.location.pathname;

      const parts = pathname.split('/');

      const propertyIdIndex = parts.indexOf('properties') + 1;
      const propertyId = parts[propertyIdIndex] || null;

      console.debug(propertyId);


      const lastPart = parts[parts.length - 1];

      await GM_deleteValue("LH_prices");

      if (isPastDate(lastPart)) return;

      const url ="https://app.littlehotelier.com/extranet/properties/" + propertyId + "/inventory/edit?locale=es&script=juanma&inclusions=&start_date=" + lastPart;
      lastTabOpen = GM_openInTab(url, {
          setParent: true,
          active: false,
      });

      console.debug("Start LH_Prices GM", url);


      // Add value change listener instead of interval
      pricesListenerId = GM_addValueChangeListener("LH_prices", (name, old_value, new_value, remote) => {
          if (new_value) {
              console.debug("Found LH_Prices GM");
              console.debug(new_value);
              GM_deleteValue("LH_prices");
              GM_removeValueChangeListener(pricesListenerId);
              pricesListenerId = null;
              lastTabOpen.close();

              // Select all span.room-type-text
              const spans = document.querySelectorAll('span.room-type-text');

              spans.forEach(span => {
                  const roomName = span.textContent.trim();

                  // Find the matching object by name
                  const roomData = new_value.find(d => d.name === roomName);
                  if (!roomData) return; // no match found

                  const tbody = span.closest('tbody');
                  if (!tbody) return;

                  const trs = tbody.querySelectorAll('tr');
                  if (trs.length === 0) return;

                  const lastTr = trs[trs.length - 1];

                  // Select all td with class 'date-cell' inside the last tr
                  const dateCells = lastTr.querySelectorAll('td.date-cell');

                  dateCells.forEach((td, i) => {
                      // Check if rate exists at index i
                      if (roomData.rates[i] !== undefined) {
                          td.textContent = roomData.rates[i];
                      }
                  });
              });
          }
      });

      // Set a timeout to clean up if data never arrives
      setTimeout(() => {
          if (pricesListenerId !== null) {
              console.debug("Timeout waiting for prices, retrying");
              GM_removeValueChangeListener(pricesListenerId);
              pricesListenerId = null;
              magic();
          }
      }, 60000); // 60 seconds timeout

      const style = document.createElement('style');
      style.textContent = `
  td.date-cell.unallocated:not(:nth-child(1)) {
    font-size: 1.8rem;
    color: grey;
  }
`;
      document.head.appendChild(style);

  }


addEventListener('load', () => setTimeout(async () => {

    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    const params = new URLSearchParams(window.location.search);
    const hasScriptJuanma = params.get('script') === 'juanma';


    const hasCalendarInPath = pathname.includes('calendar');


    if (hasScriptJuanma && hostname === 'app.littlehotelier.com'){
        saveLH_Prices();
    } else if(hasCalendarInPath && hostname === 'application.littlehotelier.com') {
        calendar();
    } else {
        console.debug('LH Prices - Domain not matched', hostname, pathname, window.location);
    }


}, 4000));
