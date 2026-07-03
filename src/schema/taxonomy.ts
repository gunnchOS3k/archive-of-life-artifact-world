export type TaxonomicRank =
  | 'kingdom'
  | 'phylum'
  | 'class'
  | 'order'
  | 'family'
  | 'genus'
  | 'species'
  | 'subspecies';

export interface Taxonomy {
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family: string;
  genus?: string;
  species?: string;
  rank: TaxonomicRank;
  acceptedName: string;
  synonyms?: string[];
  catalogueOfLifeId?: string;
  gbifTaxonKey?: number;
}
