/** Maps layout node id → API compressor id */
export const COMPRESSOR_ID_MAP = {
  'screw-1': 'COMP-01',
  'screw-2': 'COMP-02',
  'screw-3': 'COMP-03',
  'screw-4': 'COMP-04',
  'screw-5': 'COMP-05',
  'screw-6': 'COMP-06',
  'screw-7': 'COMP-07',
}

/** Symbol type → public asset path */
export const ASSET_MAP = {
  ScrewCompressor: '/assets/compressor.svg',
  Evaporator:      '/assets/evaporator.svg',
  HPTank:          '/assets/hp_tank.svg',
  Intercooler:     '/assets/intercooler.svg',
  LPTank:          '/assets/lp_tank.svg',
  LoadUnit:        '/assets/load_unit.svg',
  Valve:           '/assets/valve.svg',
}

/** Default symbol dimensions in viewBox units */
export const SYMBOL_SIZE = {
  ScrewCompressor: { width: 70, height: 55 },
  Evaporator:      { width: 80, height: 60 },
  HPTank:          { width: 90, height: 45 },
  Intercooler:     { width: 55, height: 70 },
  LPTank:          { width: 45, height: 65 },
  LoadUnit:        { width: 85, height: 50 },
  Valve:           { width: 24, height: 24 },
}
