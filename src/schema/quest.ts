export interface QuestObjective {
  type: 'visit_region' | 'collect_artifact' | 'collect_count';
  target: string;
  label: string;
  group?: 'insect' | 'extinct' | 'mammal';
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  region: string;
  objectives: QuestObjective[];
  reward: string;
}
