export interface QuestObjective {
  type:
    | 'visit_region'
    | 'collect_artifact'
    | 'collect_count'
    | 'view_earth_tab'
    | 'analyze_earth_region';
  target: string;
  label: string;
  group?: 'insect' | 'extinct' | 'mammal';
  /** NASA Earth Layer quest tag */
  nasaLayer?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  region: string;
  objectives: QuestObjective[];
  reward: string;
}
