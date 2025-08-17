export interface LawyerSpecialtyItem {
  code: string;
  name: string;
  isShared?: boolean;
}

export interface LawyerSpecialtyGroup {
  groupName: string;
  items: LawyerSpecialtyItem[];
}

export const lawyerSpecialitiesData: LawyerSpecialtyGroup[] = [
  {
    groupName: "Droit des affaires",
    items: [
      { code: "corporate", name: "Droit des sociétés" },
      { code: "commercial", name: "Droit commercial" },
      { code: "contracts", name: "Droit des contrats" }
    ]
  },
  {
    groupName: "Droit de la famille",
    items: [
      { code: "divorce", name: "Divorce" },
      { code: "custody", name: "Garde d'enfants" }
    ]
  }
];

export default lawyerSpecialitiesData;
