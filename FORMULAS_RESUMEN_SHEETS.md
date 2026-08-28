# Fórmulas de Resumen Mensual en Google Sheets

Estas fórmulas van en una **hoja nueva** de tu planilla llamada `Resumen` (no la mezcles con `Movimientos`, `Empleados`, `Categorias` ni `Arqueos`, que usa la app).

Están escritas con **punto y coma (;)** como separador, que es lo normal en Google Sheets configurado en español/Argentina. Si tu planilla usa coma (,), reemplazá todos los `;` por `,`.

## Mapa de columnas de `Movimientos` (para referencia)

| Columna | Campo |
|---|---|
| A | id |
| B | tipo (ingreso / egreso / transferencia / sueldo / compra / aporte) |
| C | fecha |
| D | monto |
| E | moneda |
| F | descripcion |
| G | cuenta |
| H | cuentaOrigen |
| I | cuentaDestino |
| J | categoria |
| K | empleado |
| L | socio |
| M | subTipo |

## 1. Crear la hoja "Resumen"

Click derecho en las pestañas de abajo → Insertar hoja → renombrala `Resumen`.

## 2. Encabezados (fila 2, texto normal, sin fórmula)

`A2: Mes` — `B2: Ingresos` — `C2: Egresos` — `D2: Sueldos / Retiros empleados` — `E2: Aportes de socios` — `F2: Retiros de socios` — `G2: Resultado neto`

## 3. Lista de meses (dinámica, en A3)

```
=SORT(UNIQUE(FILTER(TEXT(Movimientos!$C$2:$C;"YYYY-MM");Movimientos!$C$2:$C<>"")))
```

Esto se "derrama" solo hacia abajo con todos los meses que tengan datos, ordenados. A medida que cargues meses nuevos, esta lista se actualiza sola.

## 4. Fórmulas por mes (fila 3, después arrastrar hacia abajo)

**B3 — Ingresos:**
```
=IF($A3="";"";SUMIFS(Movimientos!$D:$D;Movimientos!$B:$B;"ingreso";Movimientos!$C:$C;">="&DATEVALUE($A3&"-01");Movimientos!$C:$C;"<"&EDATE(DATEVALUE($A3&"-01");1);Movimientos!$E:$E;"ARS")+SUMIFS(Movimientos!$D:$D;Movimientos!$B:$B;"aporte";Movimientos!$M:$M;"Aporte entrada";Movimientos!$C:$C;">="&DATEVALUE($A3&"-01");Movimientos!$C:$C;"<"&EDATE(DATEVALUE($A3&"-01");1);Movimientos!$E:$E;"ARS"))
```

**C3 — Egresos** (operativos, sin contar sueldos ni retiros de socios por separado):
```
=IF($A3="";"";SUMIFS(Movimientos!$D:$D;Movimientos!$B:$B;"egreso";Movimientos!$C:$C;">="&DATEVALUE($A3&"-01");Movimientos!$C:$C;"<"&EDATE(DATEVALUE($A3&"-01");1);Movimientos!$E:$E;"ARS")+SUMIFS(Movimientos!$D:$D;Movimientos!$B:$B;"compra";Movimientos!$C:$C;">="&DATEVALUE($A3&"-01");Movimientos!$C:$C;"<"&EDATE(DATEVALUE($A3&"-01");1);Movimientos!$E:$E;"ARS")-SUMIFS(Movimientos!$D:$D;Movimientos!$J:$J;"Sueldos";Movimientos!$C:$C;">="&DATEVALUE($A3&"-01");Movimientos!$C:$C;"<"&EDATE(DATEVALUE($A3&"-01");1);Movimientos!$E:$E;"ARS"))
```

**D3 — Sueldos / Retiros empleados** (junta `tipo=sueldo` de las entradas nuevas + `categoria=Sueldos` de los datos viejos):
```
=IF($A3="";"";SUMIFS(Movimientos!$D:$D;Movimientos!$B:$B;"sueldo";Movimientos!$C:$C;">="&DATEVALUE($A3&"-01");Movimientos!$C:$C;"<"&EDATE(DATEVALUE($A3&"-01");1);Movimientos!$E:$E;"ARS")+SUMIFS(Movimientos!$D:$D;Movimientos!$J:$J;"Sueldos";Movimientos!$C:$C;">="&DATEVALUE($A3&"-01");Movimientos!$C:$C;"<"&EDATE(DATEVALUE($A3&"-01");1);Movimientos!$E:$E;"ARS"))
```

**E3 — Aportes de socios:**
```
=IF($A3="";"";SUMIFS(Movimientos!$D:$D;Movimientos!$B:$B;"aporte";Movimientos!$M:$M;"Aporte entrada";Movimientos!$C:$C;">="&DATEVALUE($A3&"-01");Movimientos!$C:$C;"<"&EDATE(DATEVALUE($A3&"-01");1);Movimientos!$E:$E;"ARS"))
```

**F3 — Retiros de socios:**
```
=IF($A3="";"";SUMIFS(Movimientos!$D:$D;Movimientos!$B:$B;"aporte";Movimientos!$M:$M;"<>Aporte entrada";Movimientos!$C:$C;">="&DATEVALUE($A3&"-01");Movimientos!$C:$C;"<"&EDATE(DATEVALUE($A3&"-01");1);Movimientos!$E:$E;"ARS"))
```

**G3 — Resultado neto** (igual que lo calcula la app: Ingresos − Egresos − Sueldos):
```
=IF($A3="";"";B3-C3-D3)
```

**Cómo extenderlo:** seleccioná `B3:G3`, copiá (Ctrl+C), seleccioná `B4:G40` (o hasta la fila que quieras, dejate margen para 2-3 años) y pegá (Ctrl+V). Los meses sin datos todavía van a mostrar 0 o vacío, y se van a ir completando solos a medida que cargues movimientos nuevos — no hace falta que vuelvas a tocar esto.

## 5. Verificación por texto (opcional, columna H) — para el problema de "STAFF" vs "Sueldos"

Esta suma los egresos en ARS donde la descripción contiene "EMPLEADOS" o "STAFF", sin importar la categoría. Comparala con la columna D: si te da un número más alto, es porque hay pagos a personal categorizados como "Servicios" en vez de "Sueldos".

**H3:**
```
=IF($A3="";"";SUMPRODUCT((Movimientos!$C$2:$C>=DATEVALUE($A3&"-01"))*(Movimientos!$C$2:$C<EDATE(DATEVALUE($A3&"-01");1))*(Movimientos!$E$2:$E="ARS")*(Movimientos!$B$2:$B="egreso")*((ISNUMBER(SEARCH("EMPLEADOS";Movimientos!$F$2:$F)))+(ISNUMBER(SEARCH("STAFF";Movimientos!$F$2:$F))))*Movimientos!$D$2:$D))
```

Si querés corregirlo de raíz: en la hoja `Movimientos`, buscá las filas con "STAFF" en la descripción y cambiá manualmente el valor de la columna `categoria` (J) a `Sueldos`. Es un cambio de valor de celda, no rompe nada de la app.

## 6. Saldos actuales por cuenta (para comparar contra la caja/banco real)

Esto no es mensual, es el **saldo acumulado a hoy** — el mismo cálculo que usa la app en la pantalla de Inicio, para que puedas cruzarlo.

Poné, por ejemplo en `J2:J5`, los nombres: `BANCO`, `CAJA EFECTIVO`, `MERCADO`, `CAJA DOLARES`.

**K2 (al lado de BANCO):**
```
=SUMIFS(Movimientos!$D:$D;Movimientos!$G:$G;$J2;Movimientos!$B:$B;"ingreso";Movimientos!$E:$E;"ARS")+SUMIFS(Movimientos!$D:$D;Movimientos!$G:$G;$J2;Movimientos!$B:$B;"aporte";Movimientos!$M:$M;"Aporte entrada";Movimientos!$E:$E;"ARS")-SUMIFS(Movimientos!$D:$D;Movimientos!$G:$G;$J2;Movimientos!$B:$B;"egreso";Movimientos!$E:$E;"ARS")-SUMIFS(Movimientos!$D:$D;Movimientos!$G:$G;$J2;Movimientos!$B:$B;"sueldo";Movimientos!$E:$E;"ARS")-SUMIFS(Movimientos!$D:$D;Movimientos!$G:$G;$J2;Movimientos!$B:$B;"compra";Movimientos!$E:$E;"ARS")-SUMIFS(Movimientos!$D:$D;Movimientos!$G:$G;$J2;Movimientos!$B:$B;"aporte";Movimientos!$M:$M;"<>Aporte entrada";Movimientos!$E:$E;"ARS")-SUMIFS(Movimientos!$D:$D;Movimientos!$H:$H;$J2;Movimientos!$B:$B;"transferencia";Movimientos!$E:$E;"ARS")+SUMIFS(Movimientos!$D:$D;Movimientos!$I:$I;$J2;Movimientos!$B:$B;"transferencia";Movimientos!$E:$E;"ARS")
```

Como usa `$J2` (referencia relativa a la fila, columna fija), **copiá K2 y pegalo en K3, K4 y K5** — se ajusta solo a "CAJA EFECTIVO", "MERCADO" y "CAJA DOLARES" de cada fila.

**K6 — Total ARS:**
```
=SUM(K2:K5)
```

Este total tiene que coincidir exactamente con lo que ves en "Inicio" en la app. Si no coincide, avisame y lo revisamos.
