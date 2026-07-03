export type ArtifactType =
  | 'photo_record'
  | 'audio_recording'
  | 'track_cast'
  | 'behavioral_field_note'
  | 'molted_exoskeleton'
  | 'fossil_tooth_replica'
  | 'fossil_bone_cast'
  | 'shell_fossil'
  | 'excavation_field_note'
  | 'scat_sample'
  | 'shed_antler'
  | 'hive_observation'
  | 'pollination_event_record'
  | 'conservation_report'
  | string;

export interface ArtifactTemplate {
  id: string;
  artifactType: ArtifactType;
  label: string;
  ethical: true;
  description: string;
  unlocksCompanionTraits?: string[];
}
