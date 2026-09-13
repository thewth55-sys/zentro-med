// ============================================================
// Builds the request body for a factura.com sandbox smoke-test CFDI.
//
// Hardcodes the Receptor to the SAT's generic "público en general" RFC
// (XAXX010101000) — no real client/contact data is ever involved here,
// this is purely a connectivity + field-mapping test.
// ============================================================

export interface TestCfdiOverrides {
  descripcion?: string;
  cantidad?: number;
  valorUnitario?: number;
}

export function buildTestCfdiPayload({
  descripcion = "Consulta general",
  cantidad = 1,
  valorUnitario = 500,
}: TestCfdiOverrides) {
  return {
    TipoDocumento: "I",
    Receptor: {
      RFC: "XAXX010101000",
      Nombre: "PUBLICO EN GENERAL",
      UsoCFDI: "S01",
      RegimenFiscal: "616",
      CP: "06600",
    },
    Serie: "PRUEBA",
    FormaPago: "01",
    MetodoPago: "PUE",
    Moneda: "MXN",
    Conceptos: [
      {
        ClaveProdServ: "85121500",
        ClaveUnidad: "E48",
        Cantidad: cantidad,
        Descripcion: descripcion,
        ValorUnitario: valorUnitario,
        Impuestos: {
          Traslados: [{ Base: valorUnitario, Impuesto: "002", TipoFactor: "Tasa", TasaOCuota: "0.160000" }],
        },
      },
    ],
  };
}
