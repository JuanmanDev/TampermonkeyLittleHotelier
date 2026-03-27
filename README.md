# Tampermonkey Scripts for Little Hotelier

Collection of Tampermonkey scripts that improve the visual experience and user interface of the Little Hotelier platform.

## What is this?

This repository contains user scripts for the Tampermonkey extension that modify and enhance the Little Hotelier user interface, making it more friendly and efficient.

🌍 **[Visit Hotelier.Tools](https://hotelier.tools/tools/ui)** where you will find detailed descriptions, screenshots of every script, and more useful information.

## Available Scripts

### Front Desk Scripts
#### Reservation Table
- **[Full Width Reservation Table](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/fullWidthReservationTable.user.js)**: Makes the reservation table wider to see more information without horizontal scrolling.

#### Reservation Details
- **[Update Number Adults](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/updateNumberAdults.user.js)**: Sets the number of adults to 2 by default to prevent errors with 0 adults.
- **[Update Payment Link Button](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/updateGeneratePaymentLinkButton.user.js)**: Improves payment link button with better text and automatically adds phone number from input field.
- **[Extra Invoice Print Button](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/showExtraButtonPrintInvoice.user.js)**: Adds an extra button to print the invoice directly without opening menus.
- **[Bank Transfer Email Button](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/showExtraButtonEmailBank.user.js)**: Adds a button for sending bank transfer details via email with pre-filled content.
- **[Show Booking.com Commissions](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/showComissions.user.js)**: Shows estimation for commissions breakdown for Booking.com reservations.
- **[Show Chekin Data](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/showChekin.user.js)**: Automatically retrieves and displays guest registration data from Chekin.com, including guest names, phone numbers, and document IDs, with options to share registration forms via email or WhatsApp. Also preloads reservation data from the calendar view for instant Chekin lookups.
- **[Improve Style For Touch Screens](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/improveStyleForTouchScreens.user.js)**: Enhances UI elements for touch screens, making buttons more accessible and menus larger.
- **[Compact UI Reservation Details](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/compactUIReservationDetails.user.js)**: Compacts the UI for reservation details and makes the comments section taller.
- **[Easy Save Province/Country](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/easySaveProvinceCountry.user.js)**: Better selection of Province/Country for Spanish guests. Adds an easy selector for Spanish provinces and automatically sets the country to Spain.

#### Calendar View
- **[Prices Display](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/prices.user.js)**: Shows room prices in the Little Hotelier calendar view by fetching data from the inventory page.

### Direct Booking Scripts
- **[Tables Full Width](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/directBooking/fullWidthTablets.user.js)**: Makes all tables in Direct Booking wider to display more information.
- **[Add Button Check on Front Desk](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/directBooking/addButtonCheckOnFrontDesk.user.js)**: Adds a button to check reservation details in Front Desk and review refunds.

## How to Install

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension in your browser
2. Click on the Tampermonkey icon and select "Create a new script"
3. Copy and paste the content of the desired script
4. Save the script (Ctrl+S or Cmd+S)
5. Navigate to Little Hotelier and enjoy the improvements

## Contributions

Contributions are welcome. If you have ideas to improve these scripts or add new ones, feel free to create a pull request.

---

# Tampermonkey Scripts para Little Hotelier

Colección de scripts para Tampermonkey que mejoran la experiencia visual y de usuario en la plataforma Little Hotelier.

## ¿Qué es esto?

Este repositorio contiene scripts de usuario para la extensión Tampermonkey que modifican y mejoran la interfaz de usuario de Little Hotelier, haciéndola más amigable y eficiente.

🌍 **[Visita Hotelier.Tools](https://hotelier.tools/tools/ui)** donde encontrarás descripciones detalladas, capturas de pantalla de cada script y más información útil.

## Scripts disponibles

### Scripts de Front Desk
#### Tabla de Reservas
- **[Tabla de Reservas a Ancho Completo](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/fullWidthReservationTable.user.js)**: Hace que la tabla de reservas sea más ancha para ver más información sin desplazamiento horizontal.

#### Detalles de Reserva
- **[Actualizar Número de Adultos](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/updateNumberAdults.user.js)**: Establece el número de adultos a 2 por defecto para evitar errores con 0 adultos.
- **[Mejorar Botón de Enlace de Pago](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/updateGeneratePaymentLinkButton.user.js)**: Mejora el botón de enlace de pago con mejor texto y añade automáticamente el número de teléfono.
- **[Botón Extra para Imprimir Factura](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/showExtraButtonPrintInvoice.user.js)**: Añade un botón adicional para imprimir la factura directamente sin abrir menús.
- **[Botón de Email para Transferencia Bancaria](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/showExtraButtonEmailBank.user.js)**: Añade un botón para enviar detalles de transferencia bancaria por correo electrónico con contenido prellenado.
- **[Mostrar Comisiones de Booking.com](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/showComissions.user.js)**: Muestra una estimación del desglose de comisiones para reservas de Booking.com.
- **[Mostrar Datos de Chekin](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/showChekin.user.js)**: Recupera y muestra automáticamente los datos de registro de huéspedes desde Chekin.com, incluyendo nombres, teléfonos y números de documento, con opciones para compartir formularios de registro por email o WhatsApp. También precarga datos de reservas desde la vista de calendario para búsquedas instantáneas en Chekin.
- **[Mejora de Estilo para Pantallas Táctiles](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/improveStyleForTouchScreens.user.js)**: Mejora los elementos de la interfaz para pantallas táctiles, haciendo los botones más accesibles y los menús más grandes.
- **[UI Compacta para Detalles de Reserva](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/compactUIReservationDetails.user.js)**: Compacta la interfaz para los detalles de reserva y hace que la sección de comentarios sea más alta.
- **[Guardado Fácil de Provincia/País](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/reservationDetails/easySaveProvinceCountry.user.js)**: Mejor selección de provincia y país para huéspedes españoles. Añade un selector para provincias españolas y establece automáticamente el país a España.

#### Vista de Calendario
- **[Visualización de Precios](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/frontdesk/prices.user.js)**: Muestra los precios de las habitaciones en la vista de calendario obteniendo datos de la página de inventario.

### Scripts de Direct Booking
- **[Tablas a Ancho Completo](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/directBooking/fullWidthTablets.user.js)**: Hace que todas las tablas en Direct Booking sean más anchas para mostrar más información.
- **[Añadir Botón de Verificación en Front Desk](https://github.com/JuanmanDev/TampermonkeyLittleHotelier/blob/main/directBooking/addButtonCheckOnFrontDesk.user.js)**: Añade un botón para verificar los detalles de la reserva en Front Desk y revisar reembolsos.

## Cómo instalar

1. Instala la extensión [Tampermonkey](https://www.tampermonkey.net/) en tu navegador
2. Haz clic en el icono de Tampermonkey y selecciona "Crear un nuevo script"
3. Copia y pega el contenido del script deseado
4. Guarda el script (Ctrl+S o Cmd+S)
5. Navega a Little Hotelier y disfruta de las mejoras

## Contribuciones

Las contribuciones son bienvenidas. Si tienes ideas para mejorar estos scripts o añadir nuevos, no dudes en crear un pull request.
