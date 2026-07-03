export type IucnCategory =
  | 'Least Concern'
  | 'Near Threatened'
  | 'Vulnerable'
  | 'Endangered'
  | 'Critically Endangered'
  | 'Extinct in the Wild'
  | 'Extinct'
  | 'Data Deficient'
  | 'Not Evaluated';

export interface ConservationProfile {
  iucnCategory: IucnCategory;
  iucnTaxonId?: number;
  assessmentYear?: number;
  populationTrend?: 'Increasing' | 'Decreasing' | 'Stable' | 'Unknown';
  threats?: string[];
  assessed: boolean;
  sourceVersion: string;
  lastUpdated: string;
}

export function isThreatened(category: IucnCategory): boolean {
  return ['Vulnerable', 'Endangered', 'Critically Endangered', 'Extinct in the Wild'].includes(category);
}

export function isExtinctCategory(category: IucnCategory): boolean {
  return category === 'Extinct' || category === 'Extinct in the Wild';
}
