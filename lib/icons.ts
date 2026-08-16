/** Auto icon for a movement when the user didn't assign one (by concept keywords, then by type). */
const RULES: [RegExp, string][] = [
  [/gasolina|diesel|di[eé]sel|combustible|pemex/i, "⛽"],
  [/caseta|peaje|autopista/i, "🛣️"],
  [/uber|didi|taxi|estacionamiento/i, "🚕"],
  [/camioneta|lexus|vw|auto\b|coche|carro|llanta|mec[aá]nic|detallado|lavado/i, "🚗"],
  [/comida|desayuno|cena|restaurante|tacos|birria|caf[eé]|starbucks|sushi|pizza|hamburg|garcias/i, "🍽️"],
  [/costco|walmart|soriana|s[uú]per|mercado\b|la comer|heb|chedraui/i, "🛒"],
  [/amazon|mercado libre|liverpool|home depot|compra/i, "📦"],
  [/cemento|concreto|dicom|cemex|varilla|block|arena|grava|tabique|acero|estructura/i, "🧱"],
  [/herraje|pija|tornill|clavo|perfil|aluminio|tubo|pvc|cobre|cable/i, "🔩"],
  [/madera|carpinter|puerta|closet|cabsa/i, "🪵"],
  [/pintura|tablaroca|yeso|acabado/i, "🖌️"],
  [/el[eé]ctric|luz|cfe|foco|l[aá]mpara/i, "💡"],
  [/plomer|agua|tinaco|bomba/i, "🚰"],
  [/vidrio|cancel|ventana|cristal/i, "🪟"],
  [/cantera|piedra|m[aá]rmol/i, "🪨"],
  [/material\b/i, "🧰"],
  [/n[oó]mina|raya|sueldo|salario|semana/i, "👷"],
  [/flete|renta de|maquinaria|retro|grúa|grua|camión|camion/i, "🚚"],
  [/telcel|telmex|internet|celular|tel[eé]fono/i, "📱"],
  [/gas\b|gas rancho|butano|lp\b/i, "🔥"],
  [/becerr|vaquill|ganado|toro|novill|vaca|engorda|alimento|forraje|pastura/i, "🐂"],
  [/rancho|siembra|semilla|fertiliz|riego|tractor|chile|ma[ií]z/i, "🌾"],
  [/farmacia|doctor|m[eé]dic|hospital|consulta|dentista/i, "❤️"],
  [/tintorer|lavander|ropa|zapato|zara|skincare|est[eé]tica|barber/i, "👕"],
  [/pastel|regalo|revelaci|fiesta|decoraci|cumple/i, "🎁"],
  [/cine|concierto|boleto|netflix|spotify|juego/i, "🎬"],
  [/escuela|colegiatura|curso|libro|educaci/i, "📚"],
  [/c[oó]mputo|computadora|laptop|impresora|apple|software/i, "💻"],
  [/pr[eé]stamo|prestamo/i, "🤝"],
  [/ministraci|anticipo|dep[oó]sito del cliente/i, "💵"],
  [/honorario|mi pago/i, "💼"],
  [/comprobaci|ticket|factura/i, "🧾"],
  [/impuesto|sat\b|predial|tenencia|licencia|permiso|notar/i, "🏛️"],
  [/seguro|p[oó]liza/i, "🛡️"],
  [/banco|comisi[oó]n|transferencia|retiro|cajero/i, "🏦"],
];
const BY_TYPE: Record<string, string> = {
  caja_chica: "👜", pago: "👷", prestamo: "🤝", cobro_prestamo: "🤝", ministracion: "💵", venta: "🐂", aportacion: "🏦", otro_ingreso: "➕", transferencia: "⇄", ajuste: "⚖️", gasto: "•",
};
export function iconFor(note: string | null | undefined, movementType?: string | null, categoryIcon?: string | null, isFee?: boolean): string {
  if (categoryIcon) return categoryIcon;
  if (isFee) return "💼";
  const n = note ?? "";
  for (const [re, ic] of RULES) if (re.test(n)) return ic;
  return BY_TYPE[movementType ?? "gasto"] ?? "•";
}
