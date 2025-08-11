export interface CountryLegalDocs {
  constitution: string;
  procurementLaw: string;           // ley principal de contrataciones
  procurementRegulation?: string;   // reglamento / decreto
  laborCode?: string;               // opcional (no core para licitaciones)
  authority?: string;               // entidad rectora
}

export interface CountryInfo {
  name: string;
  code: string;
  legalDocuments: CountryLegalDocs;
}

export const COUNTRIES_CONFIG: Record<string, CountryInfo> = {
  ecuador: {
    name: "Ecuador",
    code: "EC",
    legalDocuments: {
      constitution: "Constitución de la República del Ecuador",
      procurementLaw: "Ley Orgánica del Sistema Nacional de Contratación Pública (LOSNCP)",
      procurementRegulation: "Reglamento General a la LOSNCP",
      laborCode: "Código del Trabajo",
      authority: "SERCOP"
    }
  },
  peru: {
    name: "Perú",
    code: "PE",
    legalDocuments: {
      constitution: "Constitución Política del Perú",
      procurementLaw: "Ley de Contrataciones del Estado (LCE)",
      procurementRegulation: "Reglamento de la LCE",
      laborCode: "Marco laboral general (p.ej., D.S. 003-97-TR)",
      authority: "OSCE"
    }
  },
  colombia: {
    name: "Colombia",
    code: "CO",
    legalDocuments: {
      constitution: "Constitución Política de Colombia",
      procurementLaw: "Estatuto General de Contratación (Ley 80 de 1993, Ley 1150 de 2007)",
      procurementRegulation: "D. 1082 de 2015 (compila reglamentación)",
      laborCode: "Código Sustantivo del Trabajo",
      authority: "Colombia Compra Eficiente"
    }
  },
  mexico: {
    name: "México",
    code: "MX",
    legalDocuments: {
      constitution: "Constitución Política de los Estados Unidos Mexicanos",
      procurementLaw: "LAASSP / LOPSRM (federal)",
      procurementRegulation: "Reglamentos de la LAASSP y LOPSRM",
      laborCode: "Ley Federal del Trabajo",
      authority: "SFP / CompraNet"
    }
  },
  others: {
    name: "Others",
    code: "OT",
    legalDocuments: {
      constitution: "Custom Constitution - Please upload your documents",
      procurementLaw: "Custom Procurement Law - Please upload your documents",
      procurementRegulation: "Custom Procurement Regulation - Please upload your documents",
      laborCode: "Custom Labor Law - Optional",
      authority: "Custom Authority"
    }
  }
};

// Helper functions
export function getCountryByKey(key: string): CountryInfo | null {
  return COUNTRIES_CONFIG[key] || null;
}

export function getAllCountries(): CountryInfo[] {
  return Object.values(COUNTRIES_CONFIG);
}
