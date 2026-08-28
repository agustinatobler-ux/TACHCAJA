# Conectar la app a Google Sheets

Esta guía explica cómo hacer que **Tach Racing — Caja & Bancos** guarde los datos en una planilla de Google Sheets en vez de solo en el navegador. Una vez conectada, podés usar la app desde cualquier dispositivo y los datos van a estar seguros en tu cuenta de Google.

No hace falta programar nada nuevo: solo copiar y pegar un código ya escrito (`google-apps-script/Code.gs`) en el editor de Google.

## 1. Crear la planilla

1. Andá a [sheets.google.com](https://sheets.google.com) y creá una planilla nueva.
2. Ponele un nombre, por ejemplo **"Tach Racing - Caja y Bancos"**.
3. No hace falta crear ninguna hoja/columna a mano: el script las crea solo la primera vez que se usa.

## 2. Agregar el script (Apps Script)

1. En la planilla, andá al menú **Extensiones → Apps Script**.
2. Se abre un editor con un archivo `Código.gs` vacío (o con una función `myFunction` de ejemplo). Borrá todo su contenido.
3. Abrí el archivo [`google-apps-script/Code.gs`](google-apps-script/Code.gs) de este repositorio, copiá **todo** el contenido y pegalo en el editor de Apps Script.
4. Guardá el proyecto (ícono de disquete o `Ctrl+S`). Podés ponerle un nombre al proyecto, por ejemplo "Tach Racing API".

## 3. Publicar como aplicación web

1. En el editor de Apps Script, arriba a la derecha, hacé clic en **Implementar → Nueva implementación**.
2. En "Selecciona el tipo", elegí el ícono de engranaje y seleccioná **Aplicación web**.
3. Configurá:
   - **Descripción**: lo que quieras, ej. "API Caja Tach Racing".
   - **Ejecutar como**: *Yo (tu cuenta de Google)*.
   - **Quién tiene acceso**: *Cualquier usuario*. (Es necesario para que la app pueda leer y escribir datos sin pedir login cada vez. El enlace no es público a menos que lo compartas: solo funciona si alguien tiene la URL exacta.)
4. Hacé clic en **Implementar**.
5. Google va a pedir autorización la primera vez: elegí tu cuenta, aceptá los permisos (va a avisar que es un script no verificado — es normal porque lo escribiste/pegaste vos mismo; hacé clic en "Avanzado" → "Ir a [nombre del proyecto] (no seguro)" → "Permitir").
6. Copiá la **URL de la aplicación web** que te muestra al final. Es algo así:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

## 4. Conectar la app

1. Abrí `tach_racing_caja.html` en el navegador.
2. Andá a **Configuración** (menú lateral).
3. Pegá la URL copiada en el campo **"URL de la Web App (Google Apps Script)"**.
4. Hacé clic en **Conectar**. Si todo está bien, vas a ver el mensaje "Conectado correctamente ✓" y el indicador en la esquina superior derecha va a quedar en verde ("Conectado a Sheets").

Listo. Desde ahora, cada movimiento, empleado o categoría que cargues se guarda directamente en la planilla. Podés compartir la misma URL en otro dispositivo (celular, otra computadora) para seguir cargando desde ahí y ver siempre los mismos datos.

## Notas importantes

- **Varias personas cargando datos a la vez**: no hay problema, cada movimiento se agrega como una fila nueva en la planilla.
- **Sin conexión a internet**: la app muestra la última copia de los datos que pudo sincronizar (guardada en el navegador como respaldo), pero para cargar movimientos nuevos necesita conexión.
- **Ver o editar los datos directamente**: podés abrir la planilla de Google Sheets en cualquier momento y ver las hojas `Movimientos`, `Empleados` y `Categorias`. Si editás algo ahí a mano, se refleja en la app la próxima vez que sincronice.
- **Volver a modo local**: en Configuración hay un botón "Desconectar" que hace que la app vuelva a guardar todo solo en el navegador (como antes).
- **Si cambiás el código del script**: después de editar `Code.gs` en el editor de Apps Script, tenés que hacer **Implementar → Administrar implementaciones → editar (lápiz) → Nueva versión → Implementar** para que los cambios se apliquen a la URL existente.
