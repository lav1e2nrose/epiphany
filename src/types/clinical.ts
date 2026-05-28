export interface BooleanWithDetail {
  value: boolean | 'unknown'
  detail?: string
  ageAtEvent?: number
}

export interface MedicationRecord {
  drugName: string
  dosage: string
  startDate: string
  endDate?: string
  effect: 'effective' | 'partial' | 'ineffective' | 'sideeffect'
  notes: string
}

export interface FrequencyPoint {
  year: number
  monthlyCount: number
}

export interface ExamRecord {
  type: 'EEG' | 'MRI' | 'CT' | 'PET-CT' | 'fMRI' | 'Video-EEG' | 'Other'
  date: string
  hospital: string
  conclusion: string
  attachments: { name: string; url: string; sizeLabel?: string }[]
}

export interface QuestionnaireResult {
  name: string
  date: string
  totalScore: number
  itemScores: Record<string, number>
  interpretation: string
}

export interface MedicalHistory {
  patientId: string
  cerebralInfection: BooleanWithDetail
  headTrauma: BooleanWithDetail
  birthInjury: BooleanWithDetail
  febrileSeizure: BooleanWithDetail
  familyHistory: BooleanWithDetail
  medications: MedicationRecord[]
  drugReactions: string
  onsetAge: number
  seizureFrequencyHistory: FrequencyPoint[]
  seizureEvolutionNotes: string
  examinations: ExamRecord[]
  questionnaires: QuestionnaireResult[]
  updatedAt: number
  lockedByDoctor: boolean
}

export type SeizureType =
  | 'focal_aware'
  | 'focal_impaired'
  | 'focal_to_bilateral'
  | 'generalized_tonic_clonic'
  | 'absence'
  | 'myoclonic'
  | 'atonic'
  | 'unknown'

export type TriggerCategory =
  | 'sleep_deprivation'
  | 'emotional_stress'
  | 'missed_medication'
  | 'alcohol'
  | 'flashing_light'
  | 'fever'
  | 'menstruation'
  | 'fatigue'
  | 'other'

export interface AIFollowUpAnswer {
  question: string
  answer: string
  answerType: 'voice' | 'text' | 'choice'
}

export interface TriggerRecord {
  category: TriggerCategory
  rawInput: string
  refinedAnswers: AIFollowUpAnswer[]
  severity: 1 | 2 | 3 | 4 | 5
}

export type AuraType =
  | 'epigastric_rising'
  | 'deja_vu'
  | 'jamais_vu'
  | 'visual'
  | 'auditory'
  | 'olfactory'
  | 'gustatory'
  | 'somatosensory'
  | 'autonomic'
  | 'fear_anxiety'
  | 'unspecified'

export interface AuraRecord {
  type: AuraType
  description: string
}

export interface ClinicalSeizureEvent {
  id: string
  patientId: string
  timestamp: number
  durationSec: number
  source: 'algorithm' | 'patient' | 'guardian'
  confirmed: 'unconfirmed' | 'confirmed' | 'rejected'
  pre: {
    triggers: TriggerRecord[]
    aura: AuraRecord[]
    timeBeforeOnset: number
  }
  ictal: {
    seizureType: SeizureType
    symptoms: string[]
    patientDescription: string
    witnessDescription: string
    videoClipUrl?: string
    eegSnippetRef?: string
  }
  post: {
    state: 'fully_recovered' | 'confused' | 'sleepy' | 'sore' | 'amnesia' | 'todds_paresis'
    recoveryDurationMin: number
    notes: string
  }
  medicationCompliance: {
    missedDoseLast24h: boolean
    lastDoseTime?: number
  }
  doctorReview?: {
    doctorId: string
    reviewedAt: number
    annotation: string
    classification: SeizureType
    relevanceToTreatment: 'high' | 'medium' | 'low'
  }
}

export interface ChatMessage {
  id: string
  patientId: string
  doctorId: string
  sender: 'patient' | 'doctor' | 'system'
  type: 'text' | 'voice' | 'image' | 'event_ref'
  content: string
  attachments?: { type: string; url: string }[]
  refEventId?: string
  timestamp: number
  read: boolean
}

export interface ChatChannel {
  patientId: string
  doctorId: string
  status: 'open' | 'closed' | 'readonly'
  openedAt?: number
  closedAt?: number
  reason?: string
}

export interface AISummary {
  id: string
  patientId: string
  periodStart: number
  periodEnd: number
  generatedAt: number
  modelVersion: string
  highlights: string[]
  detectedPatterns: { pattern: string; confidence: number; suggestion: string }[]
  medicationAnalysis: string
  recommendations: string[]
  draftStatus: 'draft' | 'doctor_approved'
}

export interface VideoClipMeta {
  id: string
  patientId: string
  eventId?: string
  startAt: number
  endAt: number
  durationSec: number
  source: 'mock' | 'camera'
  thumbnail: string
  fileUrl: string
}
