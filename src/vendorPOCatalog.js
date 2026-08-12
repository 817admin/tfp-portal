// vendorPOCatalog.js
// Source: 2026_08_07_-_TFP_Empaques_Fuertes.xlsx
// Costs are null until Julian provides vendor MXN pricing.

export const SKU_NAMES = {
  "CG-001": "Noailles Screen",
  "CG-002": "Epure Ottoman",
  "CG-003": "Semblant Pedestal",
  "ST-001": "Epure Sofa",
  "ST-002": "Biseau Armchair",
  "ST-003": "Gaillon Dining Chair",
  "ST-004": "Incline Counter Stool",
  "ST-005": "Monde Sofa",
  "TB-001": "Pointue Side Table",
  "TB-002": "L'eclat Coffee Table",
  "TB-003": "Courbe Side Table",
  "TB-004": "Noailles Coffee Table",
  "TB-005": "Noailles Side Table",
  "TB-006": "Mettre Dining Table",
};

export const CRATE_CATALOG = {
  "CG-001": [
    { pieces: 1, boxes: 1, boxDim: "168 W x 10 D x 130 H", itemDim: "160 W x 3.1 D x 121.9 H", cost: null },
    { pieces: 2, boxes: 1, boxDim: "168 W x 20 D x 130 H", itemDim: "160 W x 3.1 D x 121.9 H", cost: null },
  ],
  "CG-002": [
    { pieces: 1, boxes: 1, boxDim: "66 W x 66 D x 50 H", itemDim: "60.96 W x 60.96 L x 40.64 H", cost: null },
    { pieces: 2, boxes: 1, boxDim: "140 W x 74 D x 50 H", itemDim: "60.96 W x 60.96 L x 40.64 H", cost: null },
  ],
  "CG-003": [
    { pieces: 1, boxes: 1, boxDim: "42 W x 42 D x 140 H", itemDim: "33.03 W x 33.03 D x 127.0 H", cost: null },
  ],
  "ST-001": [
    {
      pieces: 1,
      boxes: 2,
      structural: true,
      components: [
        { name: "Epure Sofa (Centro)", boxDim: "268 W x 127 D x 73 H", itemDim: "243.8 W x 113.7 x 61 H", cost: null },
        { name: "Epure Sofa (Laterales)", boxDim: "82 W x 128 D x 73 H", itemDim: "30.5 W x 113.7 x 61 H", notes: "dos laterales por caja", cost: null },
      ],
    },
  ],
  "ST-002": [
    { pieces: 1, boxes: 1, boxDim: "65 W x 65 D x 68 H", itemDim: "55.88 W x 55.88 D x 58.42", cost: null },
  ],
  "ST-003": [
    { pieces: 1, boxes: 1, boxDim: "50 W x 50 D x 80 H", itemDim: "43.2 W x 45.7 D x 73.7 H", cost: null },
  ],
  "ST-004": [
    { pieces: 1, boxes: 1, boxDim: "48 W x 48 D x 100 H", itemDim: "41.28 W x 40.64 D x 88.9 H", cost: null },
  ],
  "ST-005": [
    { pieces: 1, boxes: 1, boxDim: "275 W x 111 D x 94 H", itemDim: "256.55 W x 96.52 D x 78.74 H", cost: null },
  ],
  "TB-001": [
    // No single-piece option — smallest is a pair. qty=1 cannot pack (by design).
    { pieces: 2, boxes: 1, boxDim: "40 W x 40 D x 69 H", itemDim: "32.6 W x 32.6 D x 55.9 H", cost: null },
    { pieces: 3, boxes: 1, boxDim: "125 W x 58 D x 69 H", itemDim: "32.6 W x 32.6 D x 55.9 H", cost: null },
  ],
  "TB-002": [
    { pieces: 1, boxes: 1, boxDim: "128 W x 128 D x 52 H", itemDim: "116.21 W x 116.21 D x 38.74 H", cost: null },
  ],
  "TB-003": [
    { pieces: 1, boxes: 1, boxDim: "58 W x 58 D x 67 H", itemDim: "45.72 diam x 53.34 H", cost: null },
  ],
  "TB-004": [
    { pieces: 1, boxes: 1, boxDim: "125 W x 79 D x 53 H", itemDim: "111.76 W x 66.05 D x 39.37 H", cost: null },
  ],
  "TB-005": [
    { pieces: 1, boxes: 1, boxDim: "50 W x 50 D x 72 H", itemDim: "40.64 W x 40.64 D x 57.15 H", cost: null },
    { pieces: 2, boxes: 1, boxDim: "100 W x 50 D x 72 H", itemDim: "40.64 W x 40.64 D x 57.15 H", cost: null },
  ],
  "TB-006": [
    {
      pieces: 1,
      boxes: 2,
      structural: true,
      components: [
        { name: "Mettre Dining Table (Base)", boxDim: "70 W x 70 D x 87 H", itemDim: "55.6 diam x 73.6 H", cost: null },
        { name: "Mettre Dining Table (Cubierta)", boxDim: "181 W x 108 D x 17 H", itemDim: "167.6 W x 95.3 D x 3.1 H", notes: "pallet debe estar a lo largo y ancho", cost: null },
      ],
    },
  ],
};
