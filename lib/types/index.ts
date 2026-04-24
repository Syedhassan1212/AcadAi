// ============================================================
// Adaptive Study OS — Centralized Types
// ============================================================

export type TaskStatus = 'pending' | 'ready' | 'in_progress' | 'done' | 'failed' | 'skipped';
export type TaskType = 'learn' | 'practice' | 'review' | 'quiz' | 'project';
export type NodeType = 'topic' | 'subtopic' | 'concept';
export type FileProcessingStatus = 'pending' | 'processing' | 'done' | 'failed';
export type PreferredType = 'learn' | 'practice' | 'review' | 'quiz';

// ============================================================
// Database Row Types
// ============================================================

export interface Task {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  subtopic?: string;
  description?: string;
  duration: number;           // minutes, max 45
  priority: number;           // 0-1 computed score
  deadline?: string;          // ISO datetime
  dependencies: string[];     // uuid[]
  status: TaskStatus;
  task_type: TaskType;
  difficulty: number;         // 0-1
  success_rate: number;       // 0-1 rolling average
  avg_time?: number;          // minutes rolling average
  critical_path_length: number;
  source_file_id?: string;
  attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskLog {
  id: string;
  task_id: string;
  user_id: string;
  completed: boolean;
  actual_time?: number;
  difficulty_felt?: number;
  notes?: string;
  created_at: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  date: string;              // YYYY-MM-DD
  tasks: PlanTask[];
  total_time: number;
  created_at: string;
}

export interface PlanTask {
  task_id: string;
  title: string;
  topic: string;
  duration: number;
  priority: number;
  task_type: TaskType;
  is_revision?: boolean;
  order: number;
}

export interface Note {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  linked_tasks: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface UserBehavior {
  id: string;
  user_id: string;
  topic: string;
  success_rate: number;
  preferred_type: PreferredType;
  procrastination_index: number; // 0-1, 1 = high procrastination
  consistency_score: number;     // 0-1
  burnout_risk: number;          // 0-1
  avg_session_time: number;
  total_sessions: number;
  last_session_at?: string;
  updated_at: string;
}

export interface KnowledgeNode {
  id: string;
  user_id: string;
  file_id?: string;
  label: string;
  node_type: NodeType;
  parent_id?: string;
  difficulty: number;
  description?: string;
  created_at: string;
}

export interface UploadedFile {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  processing_status: FileProcessingStatus;
  extracted_topics: ExtractedTopic[];
  created_at: string;
}

// ============================================================
// Intelligence / Engine Types
// ============================================================

export interface DAGNode {
  id: string;
  task: Task;
  children: string[];   // task ids that depend on this
  parents: string[];    // task ids this depends on
  critical_path_length: number;
  depth: number;
}

export interface DAGGraph {
  nodes: Map<string, DAGNode>;
  topologicalOrder: string[];
  isValid: boolean;
  cycles: string[][];
}

export interface ReadyTask extends Task {
  canStart: boolean;
  blockedBy: string[];
}

export interface HealthReport {
  user_id: string;
  health_score: number;           // 0-1, 1 = perfect
  failure_trend: number;          // positive = worsening
  time_trend: number;             // positive = taking longer
  needs_replan: boolean;
  top_struggling_topics: string[];
  recommendation: string;
  computed_at: string;
}

export interface ReplanAction {
  type: 'boost_priority' | 'compress_duration' | 'drop_task' | 'add_revision' | 'recalculate_dag';
  task_id?: string;
  reason: string;
  old_value?: number | string;
  new_value?: number | string;
}

export interface ReplanResult {
  actions: ReplanAction[];
  updated_tasks: string[];
  dropped_tasks: string[];
  new_plan?: StudyPlan;
}

export interface BehaviorAdaptation {
  task_id: string;
  recommendation: 'simplify' | 'deepen' | 'switch_type' | 'compress' | 'none';
  new_duration?: number;
  new_type?: TaskType;
  new_difficulty?: number;
  reason: string;
}

export interface ExperiencePattern {
  topic: string;
  success_contexts: string[];
  failure_contexts: string[];
  best_task_type: TaskType;
  optimal_duration: number;
  time_of_day_performance: Record<string, number>;
}

export interface ExtractedTopic {
  name: string;
  subtopics: string[];
  difficulty: number;
  has_diagrams: boolean;
  description?: string;
}

export interface GeminiTaskOutput {
  title: string;
  topic: string;
  subtopic?: string;
  description: string;
  estimated_time: number;
  difficulty: string; // "easy" | "medium" | "hard"
  task_type: TaskType;
  dependencies_hint?: string[]; 
}

export interface QuizQuestion {
  topic: string;
  question: string;
  type: 'mcq' | 'short_answer' | 'conceptual';
  options?: string[]; // required for mcq
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AINote {
  topic: string;
  headings: string[];
  bullet_points: string[];
  key_terms: string[];
  simple_explanation: string;
  summary: string;
}

export interface MasterAIOutput {
  topics: ExtractedTopic[];
  subtopics: string[];
  notes: AINote[];
  tasks: GeminiTaskOutput[];
  quizzes: QuizQuestion[];
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TutorContext {
  pending_tasks: Task[];
  behavior: UserBehavior[];
  recent_logs: TaskLog[];
  health_report: HealthReport | null;
  today_plan: StudyPlan | null;
}

export interface WorkerResult {
  ran_at: string;
  behavior_updated: number;
  priorities_updated: number;
  replan_triggered: boolean;
  errors: string[];
}

export interface PriorityComponents {
  critical_path_score: number;
  deadline_urgency: number;
  difficulty_score: number;
  procrastination_score: number;
  final_priority: number;
}
