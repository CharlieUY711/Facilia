import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { CotizacionResult } from "./calculatePrice";
import { frecuencias } from "./pricingData";

// Poppins vía Google Fonts (requiere acceso a red en build/runtime del server)


const NAVY = "#0B2A61";
const ORANGE = "#D97400";
const BLUE = "#0169F5";
const INK = "#1A2233";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: INK },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  logo: { width: 130, height: "auto" },
  metaBox: { alignItems: "flex-end" },
  metaLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  metaValue: { fontSize: 11, color: NAVY, fontWeight: 700, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 2 },
  subtitle: { fontSize: 10, color: ORANGE, fontWeight: 600, marginBottom: 20 },
  sectionTitle: {
    fontSize: 9, fontWeight: 700, color: NAVY, textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 8, marginTop: 18,
  },
  infoGrid: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12 },
  infoCol: { width: "48%" },
  infoLine: { flexDirection: "row", marginBottom: 4 },
  infoKey: { width: 70, color: MUTED, fontSize: 9 },
  infoVal: { fontSize: 9, fontWeight: 600, color: INK },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: NAVY, paddingVertical: 8, paddingHorizontal: 10 },
  tableHeaderText: { color: "#FFFFFF", fontSize: 8, fontWeight: 700, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  tableRowAlt: { backgroundColor: "#FAFAF9" },
  colConcepto: { width: "70%", fontSize: 9.5 },
  colMonto: { width: "30%", fontSize: 9.5, textAlign: "right", fontWeight: 600 },
  totalsBox: {
    marginTop: 14, alignSelf: "flex-end", width: "55%",
    borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 12,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totalLabel: { fontSize: 9, color: MUTED },
  totalValue: { fontSize: 9, fontWeight: 600, color: INK },
  grandTotalRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER,
  },
  grandTotalLabel: { fontSize: 12, fontWeight: 700, color: NAVY },
  grandTotalValue: { fontSize: 14, fontWeight: 700, color: ORANGE },
  giftBox: {
    marginTop: 18, backgroundColor: "#FDF3E6", borderRadius: 6, padding: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  giftText: { fontSize: 9.5, color: NAVY, fontWeight: 600, maxWidth: "80%" },
  conditions: { marginTop: 18, fontSize: 8, color: MUTED, lineHeight: 1.5 },
  footer: {
    position: "absolute", bottom: 30, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footerText: { fontSize: 7.5, color: MUTED },
  qr: { width: 52, height: 52 },
  signature: { marginTop: 6, fontSize: 9, color: NAVY, fontWeight: 700 },
});

export interface PdfData {
  numeroPresupuesto: string;
  fecha: string;
  cliente: { nombre?: string; email: string; telefono?: string; empresa?: string };
  cotizacion: CotizacionResult;
  logoUrl: string; // ruta absoluta o dataURL del logo FACILIA
  panelUrl: string; // URL al panel/detalle del lead, para el QR
}

async function makeQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 0, width: 200, color: { dark: NAVY, light: "#FFFFFF00" } });
}

function PresupuestoDocument({ data, qrDataUrl }: { data: PdfData; qrDataUrl: string }) {
  const { cotizacion, cliente } = data;
  const frecuenciaLabel = frecuencias[cotizacion.frecuencia].label;
  const totalM2 = cotizacion.ambientes.reduce((acc, a) => acc + a.m2, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Image src={data.logoUrl} style={styles.logo} />
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>N° de presupuesto</Text>
            <Text style={styles.metaValue}>{data.numeroPresupuesto}</Text>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>{data.fecha}</Text>
          </View>
        </View>

        <Text style={styles.title}>Presupuesto de servicio</Text>
        <Text style={styles.subtitle}>No vendemos horas. Entregamos soluciones.</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <View style={styles.infoLine}><Text style={styles.infoKey}>Nombre</Text><Text style={styles.infoVal}>{cliente.nombre || "-"}</Text></View>
            <View style={styles.infoLine}><Text style={styles.infoKey}>Empresa</Text><Text style={styles.infoVal}>{cliente.empresa || "—"}</Text></View>
            <View style={styles.infoLine}><Text style={styles.infoKey}>Email</Text><Text style={styles.infoVal}>{cliente.email}</Text></View>
            <View style={styles.infoLine}><Text style={styles.infoKey}>Teléfono</Text><Text style={styles.infoVal}>{cliente.telefono || "—"}</Text></View>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.sectionTitle}>Servicio</Text>
            {cotizacion.ambientes.map((a, i) => (
              <View style={styles.infoLine} key={i}>
                <Text style={styles.infoKey}>{a.label}</Text>
                <Text style={styles.infoVal}>{a.m2} m²</Text>
              </View>
            ))}
            <View style={styles.infoLine}><Text style={styles.infoKey}>Superficie total</Text><Text style={styles.infoVal}>{totalM2} m²</Text></View>
            <View style={styles.infoLine}><Text style={styles.infoKey}>Frecuencia</Text><Text style={styles.infoVal}>{frecuenciaLabel}</Text></View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detalle del presupuesto</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: "70%" }]}>Concepto</Text>
            <Text style={[styles.tableHeaderText, { width: "30%", textAlign: "right" }]}>Mensual</Text>
          </View>
          {cotizacion.lineas.map((linea, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={styles.colConcepto}>{linea.concepto}</Text>
              <Text style={styles.colMonto}>US$ {linea.monto_mensual.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total por visita</Text>
            <Text style={styles.totalValue}>US$ {cotizacion.total_por_visita.toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total mensual</Text>
            <Text style={styles.grandTotalValue}>US$ {cotizacion.total_mensual.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.giftBox}>
          <Text style={styles.giftText}>
            🎁 Regalo de bienvenida: {cotizacion.regalo_bienvenida.descripcion}, incluido sin cargo
            al contratar el servicio.
          </Text>
        </View>

        <Text style={styles.conditions}>
          Condiciones: presupuesto válido por 15 días. Los precios están expresados en dólares
          americanos (US$) e incluyen mano de obra, insumos básicos y supervisión de calidad de
          FACILIA. No incluye equipos o consumibles no seleccionados en este documento. La
          contratación del servicio está sujeta a la firma del contrato de prestación de
          servicios de FACILIA — Facility Services by ODDY.
        </Text>

        <Text style={styles.signature}>FACILIA · Facility Services by ODDY</Text>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            FACILIA — Facility Services by ODDY{"\n"}contacto@oddy.com.uy · www.oddy.com.uy · Montevideo, Uruguay
          </Text>
          <Image src={qrDataUrl} style={styles.qr} />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePresupuestoPdf(data: PdfData): Promise<Buffer> {
  const qrDataUrl = await makeQrDataUrl(data.panelUrl);
  const buffer = await renderToBuffer(<PresupuestoDocument data={data} qrDataUrl={qrDataUrl} />);
  return buffer;
}


