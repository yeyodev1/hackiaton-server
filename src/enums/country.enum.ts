export enum CountryCode {
  ECUADOR = 'EC',
  PERU = 'PE',
  COLOMBIA = 'CO',
  MEXICO = 'MX',
  OTHERS = 'OT'
}

export enum CountryName {
  ECUADOR = 'Ecuador',
  PERU = 'Peru',
  COLOMBIA = 'Colombia',
  MEXICO = 'Mexico',
  OTHERS = 'Others'
}

export interface CountryInfo {
  name: string
  code: string
  legalDocuments: {
    constitution: string
    organicCode: string
  }
}

export const COUNTRIES_CONFIG: Record<string, CountryInfo> = {
  ecuador: {
    name: CountryName.ECUADOR,
    code: CountryCode.ECUADOR,
    legalDocuments: {
      constitution: 'Constitution of Ecuador',
      organicCode: 'Organic Code of Ecuador'
    }
  },
  peru: {
    name: CountryName.PERU,
    code: CountryCode.PERU,
    legalDocuments: {
      constitution: 'Constitution of Peru',
      organicCode: 'Organic Code of Peru'
    }
  },
  colombia: {
    name: CountryName.COLOMBIA,
    code: CountryCode.COLOMBIA,
    legalDocuments: {
      constitution: 'Constitution of Colombia',
      organicCode: 'Organic Code of Colombia'
    }
  },
  mexico: {
    name: CountryName.MEXICO,
    code: CountryCode.MEXICO,
    legalDocuments: {
      constitution: 'Constitution of Mexico',
      organicCode: 'Organic Code of Mexico'
    }
  },
  others: {
    name: CountryName.OTHERS,
    code: CountryCode.OTHERS,
    legalDocuments: {
      constitution: 'Custom Constitution - Please upload your documents',
      organicCode: 'Custom Organic Code - Please upload your documents'
    }
  }
}

export const getCountryByKey = (key: string): CountryInfo | null => {
  return COUNTRIES_CONFIG[key.toLowerCase()] || null
}

export const getAllCountries = (): CountryInfo[] => {
  return Object.values(COUNTRIES_CONFIG)
}