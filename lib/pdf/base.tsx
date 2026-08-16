import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/** Shared PDF styles — Apple-like: light, generous spacing, one accent. Uses built-in Helvetica. */
export const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9.5, color: "#1D1D1F" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: -0.3 },
  sub: { fontSize: 9.5, color: "#6E6E73", marginTop: 3 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6 },
  kpis: { flexDirection: "row", gap: 8, marginTop: 14 },
  kpi: { flex: 1, backgroundColor: "#F5F5F7", borderRadius: 8, padding: 8 },
  kpiL: { fontSize: 8, color: "#6E6E73" },
  kpiV: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#E5E5EA", paddingVertical: 4, alignItems: "center" },
  rowHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#C7C7CC", paddingVertical: 4 },
  th: { fontSize: 8, color: "#6E6E73", fontFamily: "Helvetica-Bold" },
  cell: { fontSize: 9 },
  muted: { color: "#6E6E73" },
  right: { textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  green: { color: "#1a9a3f" },
  red: { color: "#D70015" },
  day: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 2 },
  tag: { fontSize: 7.5, color: "#FFFFFF", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, marginRight: 4 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#AEAEB2" },
  total: { flexDirection: "row", paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#1D1D1F", marginTop: 2 },
});

export const mxn = (v: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);
export const fdate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, ""); };

export function Footer({ title }: { title: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{title} · generado el {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiL}>{label}</Text>
      <Text style={[s.kpiV, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

export function Doc({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: string }) {
  return (
    <Document title={title} author="Finanzas">
      <Page size="LETTER" style={s.page}>
        <Text style={s.h1}>{title}</Text>
        <Text style={s.sub}>{subtitle}</Text>
        {children}
        <Footer title={footer} />
      </Page>
    </Document>
  );
}
