import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Brain,
  FileQuestion,
  HelpCircle,
  Award,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Layers,
  RotateCcw
} from 'lucide-react';
import {
  fetchTopicDetail,
  fetchTopicMaterials,
  fetchTopicExercises,
  fetchTopicQuestions,
  updateTopic,
} from '../api/client';
import { LearningMaterial, Exercise, Question } from '../types';
import { StudyNotesView } from '../components/workspace/StudyNotesView';
import { ProgressiveDeletionView } from '../components/memorization/ProgressiveDeletionView';
import { ParagraphReconstructionView } from '../components/memorization/ParagraphReconstructionView';
import { KeywordScaffoldingView } from '../components/memorization/KeywordScaffoldingView';
import { DefinitionRecallView } from '../components/memorization/DefinitionRecallView';
import { ListSequenceView } from '../components/memorization/ListSequenceView';
import { WrittenPracticeView } from '../components/practice/WrittenPracticeView';
import { TopicAssessmentView } from '../components/workspace/TopicAssessmentView';
import { MCQAssessmentView } from '../components/workspace/MCQAssessmentView';
import { SelectiveGeneratorModal } from '../components/workspace/SelectiveGeneratorModal';

type WorkspaceTab = 'notes' | 'memorize' | 'conceptual' | 'practice' | 'assessment' | 'mcq';

export const TopicWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const getTabFromPath = (): WorkspaceTab => {
    if (location.pathname.endsWith('/notes')) return 'notes';
    if (location.pathname.endsWith('/memorize')) return 'memorize';
    if (location.pathname.endsWith('/practice')) return 'practice';
    if (location.pathname.endsWith('/assessment')) return 'assessment';
    if (location.pathname.endsWith('/mcq')) return 'mcq';
    return 'notes';
  };

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(getTabFromPath());
  const [topicDetail, setTopicDetail] = useState<any | null>(null);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);

  const loadAllTopicData = async () => {
    if (!id) return;
    try {
      const [detail, mats, exs, qs] = await Promise.all([
        fetchTopicDetail(id),
        fetchTopicMaterials(id),
        fetchTopicExercises(id),
        fetchTopicQuestions(id),
      ]);
      setTopicDetail(detail);
      setMaterials(mats);
      setExercises(exs);
      setQuestions(qs);
    } catch (err) {
      console.error('Error loading topic workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllTopicData();
  }, [id]);

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    if (!id) return;
    if (tab === 'notes') navigate(`/topics/${id}/notes`);
    else if (tab === 'memorize') navigate(`/topics/${id}/memorize`);
    else if (tab === 'practice') navigate(`/topics/${id}/practice`);
    else if (tab === 'assessment') navigate(`/topics/${id}/assessment`);
    else if (tab === 'mcq') navigate(`/topics/${id}/mcq`);
    else navigate(`/topics/${id}`);
  };

  const handleToggleMastery = async () => {
    if (!id || !topicDetail) return;
    const nextStatus = topicDetail.status === 'mastered' ? 'in_progress' : 'mastered';
    try {
      await updateTopic(id, { status: nextStatus });
      setTopicDetail({ ...topicDetail, status: nextStatus });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-stone-400 font-mono">
        Loading topic workspace...
      </div>
    );
  }

  if (!topicDetail) {
    return (
      <div className="p-8 text-center text-xs text-stone-500">
        Topic not found.{' '}
        <button onClick={() => navigate('/dashboard')} className="underline">
          Return to dashboard
        </button>
      </div>
    );
  }

  // Filter memorization exercises by mode
  const progressiveEx = exercises.find((e) => e.exercise_mode === 'progressive_deletion');
  const paragraphEx = exercises.find((e) => e.exercise_mode === 'paragraph_reconstruction');
  const scaffoldingEx = exercises.find((e) => e.exercise_mode === 'keyword_scaffolding');
  const definitionEx = exercises.find((e) => e.exercise_mode === 'definition_recall');
  const listEx = exercises.find((e) => e.exercise_mode === 'list_recall');
  const conceptualEx = exercises.find((e) => e.exercise_mode === 'conceptual');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 animate-fade-in overflow-hidden">
      {/* Workspace Top Navigation Bar */}
      <div className="border-b border-stone-200 dark:border-stone-800 px-6 sm:px-8 py-3.5 bg-stone-50/50 dark:bg-stone-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/subjects/${topicDetail.subject?.id}`)}
            className="p-1 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
            title="Back to Subject"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
              <span>{topicDetail.subject?.name}</span>
              <span>/</span>
              <span>{topicDetail.unit?.title}</span>
            </div>
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {topicDetail.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {/* Status Badge & Toggle */}
          <button
            onClick={handleToggleMastery}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors flex items-center space-x-1.5 ${
              topicDetail.status === 'mastered'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${topicDetail.status === 'mastered' ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}`} />
            <span className="capitalize">{topicDetail.status.replace('_', ' ')}</span>
          </button>

          {/* Selective Generator Button */}
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="px-3.5 py-1 rounded bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
            <span>Generate Resources</span>
          </button>
        </div>
      </div>

      {/* 5-Section Workspace Tabs */}
      <div className="border-b border-stone-200 dark:border-stone-800 px-6 sm:px-8 bg-white dark:bg-stone-950 flex space-x-1 overflow-x-auto shrink-0 select-none">
        <button
          onClick={() => handleTabChange('notes')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'notes'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>A. Study Material</span>
          {materials.length > 0 && (
            <span className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-1.5 py-0.2 rounded-full font-mono">
              {materials.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('memorize')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'memorize'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" />
          <span className="font-semibold text-stone-900 dark:text-stone-100">B. Memorization Engine</span>
          {exercises.length > 0 && (
            <span className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-1.5 py-0.2 rounded-full font-mono">
              {exercises.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('conceptual')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'conceptual'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>C. Conceptual Exercises</span>
        </button>

        <button
          onClick={() => handleTabChange('practice')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'practice'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <FileQuestion className="w-3.5 h-3.5" />
          <span>D. Written Practice</span>
          {questions.length > 0 && (
            <span className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-1.5 py-0.2 rounded-full font-mono">
              {questions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('assessment')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'assessment'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>E. Topic Assessment</span>
        </button>

        <button
          onClick={() => handleTabChange('mcq')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'mcq'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>F. MCQ Assessment</span>
        </button>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        {/* Tab A: Study Material */}
        {activeTab === 'notes' && (
          <StudyNotesView
            topicId={topicDetail.id}
            topicTitle={topicDetail.title}
            materials={materials}
            onMaterialUpdated={loadAllTopicData}
          />
        )}

        {/* Tab B: Memorization Engine */}
        {activeTab === 'memorize' && (
          <div className="space-y-8 max-w-4xl">
            <div className="p-4 rounded-lg bg-stone-100/70 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 text-xs text-stone-700 dark:text-zinc-300 flex items-start space-x-2.5">
              <Brain className="w-4 h-4 text-stone-900 dark:text-zinc-100 mt-0.5 shrink-0" />
              <div>
                <strong className="text-stone-900 dark:text-zinc-100">Academic Memorization Engine</strong>: Practice reproducing complete definitions, paragraphs, and sequences with 5 cognitive recall modes. No gamification or superficial MCQs.
              </div>
            </div>

            {exercises.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-stone-200 dark:border-zinc-800 rounded-lg text-stone-500 dark:text-zinc-400 text-xs space-y-3">
                <p>No memorization exercises generated yet for this topic.</p>
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="px-4 py-2 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors"
                >
                  Generate Memorization Exercises
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Mode A: Progressive Sentence Deletion */}
                {progressiveEx && (
                  <ProgressiveDeletionView
                    exerciseId={progressiveEx.id}
                    payload={progressiveEx.payload}
                    onCompleted={loadAllTopicData}
                  />
                )}

                {/* Mode B: Paragraph Reconstruction */}
                {paragraphEx && (
                  <ParagraphReconstructionView
                    exerciseId={paragraphEx.id}
                    payload={paragraphEx.payload}
                    onCompleted={loadAllTopicData}
                  />
                )}

                {/* Mode C: Keyword Scaffolding */}
                {scaffoldingEx && (
                  <KeywordScaffoldingView
                    exerciseId={scaffoldingEx.id}
                    payload={scaffoldingEx.payload}
                    onCompleted={loadAllTopicData}
                  />
                )}

                {/* Mode D: Definition Recall */}
                {definitionEx && (
                  <DefinitionRecallView
                    exerciseId={definitionEx.id}
                    payload={definitionEx.payload}
                    onCompleted={loadAllTopicData}
                  />
                )}

                {/* Mode E: List & Sequence Recall */}
                {listEx && (
                  <ListSequenceView
                    exerciseId={listEx.id}
                    payload={listEx.payload}
                    onCompleted={loadAllTopicData}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab C: Conceptual Exercises */}
        {activeTab === 'conceptual' && (
          <div className="space-y-6 max-w-4xl text-stone-900 dark:text-zinc-100">
            {conceptualEx ? (
              <div className="border border-stone-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-[#18181b] space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-stone-100 dark:border-zinc-800">
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300">
                    Conceptual Relationship Analysis
                  </span>
                  <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200">{conceptualEx.title}</span>
                </div>
                <p className="text-sm font-medium font-serif text-stone-900 dark:text-zinc-100 leading-relaxed">
                  {conceptualEx.payload.prompt}
                </p>
                <div className="p-4 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg space-y-2 text-xs">
                  <span className="font-semibold text-stone-700 dark:text-zinc-300 block">Critical Dimensions to Analyze:</span>
                  <ul className="list-disc list-inside space-y-1 text-stone-600 dark:text-zinc-400">
                    {conceptualEx.payload.expected_aspects?.map((asp: string, idx: number) => (
                      <li key={idx}>{asp}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-stone-100/60 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-lg space-y-1 text-xs">
                  <span className="font-semibold text-stone-600 dark:text-zinc-400 uppercase tracking-wider text-[10px]">Sample Academic Formulation:</span>
                  <p className="text-stone-800 dark:text-zinc-200 font-serif leading-relaxed">{conceptualEx.payload.sample_solution}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-stone-200 dark:border-zinc-800 rounded-lg text-stone-500 dark:text-zinc-400 text-xs space-y-2">
                <p>No conceptual exercises generated for this topic yet.</p>
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="px-3 py-1.5 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white"
                >
                  Generate Conceptual Exercises
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab D: Written-Answer Practice */}
        {activeTab === 'practice' && (
          <div className="max-w-4xl">
            <WrittenPracticeView
              questions={questions}
              onAttemptCompleted={loadAllTopicData}
            />
          </div>
        )}

        {/* Tab E: Topic Assessment */}
        {activeTab === 'assessment' && (
          <TopicAssessmentView
            topicId={topicDetail.id}
            topicTitle={topicDetail.title}
          />
        )}

        {/* Tab F: MCQ Assessment */}
        {activeTab === 'mcq' && (
          <MCQAssessmentView
            topicId={topicDetail.id}
            topicTitle={topicDetail.title}
            onMasteryChange={loadAllTopicData}
          />
        )}
      </div>

      {/* Selective Generator Modal */}
      <SelectiveGeneratorModal
        topicId={topicDetail.id}
        topicTitle={topicDetail.title}
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onGenerated={loadAllTopicData}
      />
    </div>
  );
};
