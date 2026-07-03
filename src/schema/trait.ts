export type TraitCategory =
  | 'head'
  | 'ears'
  | 'tail'
  | 'back'
  | 'pattern'
  | 'aura'
  | 'movement'
  | 'emote';

export interface LifelingTrait {
  id: string;
  name: string;
  category: TraitCategory;
  description: string;
  unlockedBy: string;
  color?: string;
}
