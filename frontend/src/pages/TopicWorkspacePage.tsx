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
import { SelectiveGeneratorModal } from '../components/workspace/SelectiveGeneratorModal';

type WorkspaceTab = 'notes' | 'memorize' | 'conceptual' | 'practice' | 'assessment';

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
    <div className="flex flex-col h-full bg-white animate-fade-in overflow-hidden">
      {/* Workspace Top Navigation Bar */}
      <div className="border-b border-stone-200 px-6 sm:px-8 py-3.5 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/subjects/${topicDetail.subject?.id}`)}
            className="p-1 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-200/50 transition-colors"
            title="Back to Subject"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-[11px] text-stone-500 font-mono">
              <span>{topicDetail.subject?.name}</span>
              <span>/</span>
              <span>{topicDetail.unit?.title}</span>
            </div>
            <h1 className="text-base font-bold text-stone-900 tracking-tight">
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
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${topicDetail.status === 'mastered' ? 'text-emerald-700' : 'text-stone-400'}`} />
            <span className="capitalize">{topicDetail.status.replace('_', ' ')}</span>
          </button>

          {/* Selective Generator Button */}
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="px-3.5 py-1 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Resources</span>
          </button>
        </div>
      </div>

      {/* 5-Section Workspace Tabs */}
      <div className="border-b border-stone-200 px-6 sm:px-8 bg-white flex space-x-1 overflow-x-auto shrink-0 select-none">
        <button
          onClick={() => handleTabChange('notes')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'notes'
              ? 'border-stone-900 text-stone-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>A. Study Material</span>
          {materials.length > 0 && (
            <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded-full font-mono">
              {materials.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('memorize')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'memorize'
              ? 'border-stone-900 text-stone-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-stone-700" />
          <span className="font-semibold text-stone-900">B. Memorization Engine</span>
          {exercises.length > 0 && (
            <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded-full font-mono">
              {exercises.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('conceptual')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'conceptual'
              ? 'border-stone-900 text-stone-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>C. Conceptual Exercises</span>
        </button>

        <button
          onClick={() => handleTabChange('practice')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'practice'
              ? 'border-stone-900 text-stone-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileQuestion className="w-3.5 h-3.5" />
          <span>D. Written Practice</span>
          {questions.length > 0 && (
            <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded-full font-mono">
              {questions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('assessment')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'assessment'
              ? 'border-stone-900 text-stone-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>E. Topic Assessment</span>
        </button>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        {/* Tab A: Study Material */}
        {activeTab === 'notes' && (
          <StudyNotesView
            materials={materials}
            onMaterialUpdated={loadAllTopicData}
          />
        )}

        {/* Tab B: Memorization Engine */}
        {activeTab === 'memorize' && (
          <div className="space-y-8 max-w-4xl">
            <div className="p-4 rounded-lg bg-stone-100/70 border border-stone-200 text-xs text-stone-700 flex items-start space-x-2.5">
              <Brain className="w-4 h-4 text-stone-900 mt-0.5 shrink-0" />
              <div>
                <strong className="text-stone-900">Academic Memorization Engine</strong>: Practice reproducing complete definitions, paragraphs, and sequences with 5 cognitive recall modes. No gamification or superficial MCQs.
              </div>
            </div>

            {exercises.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-stone-200 rounded-lg text-stone-500 text-xs space-y-3">
                <p>No memorization exercises generated yet for this topic.</p>
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="px-4 py-2 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors"
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
          <div className="space-y-6 max-w-4xl">
            {conceptualEx ? (
              <div className="border border-stone-200 rounded-lg p-6 bg-white space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-stone-100">
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded bg-stone-100 text-stone-700">
                    Conceptual Relationship Analysis
                  </span>
                  <span className="text-xs font-semibold text-stone-800">{conceptualEx.title}</span>
                </div>
                <p className="text-sm font-medium font-serif text-stone-900 leading-relaxed">
                  {conceptualEx.payload.prompt}
                </p>
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-2 text-xs">
                  <span className="font-semibold text-stone-700 block">Critical Dimensions to Analyze:</span>
                  <ul className="list-disc list-inside space-y-1 text-stone-600">
                    {conceptualEx.payload.expected_aspects?.map((asp: string, idx: number) => (
                      <li key={idx}>{asp}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-stone-100/60 border border-stone-200 rounded-lg space-y-1 text-xs">
                  <span className="font-semibold text-stone-600 uppercase tracking-wider text-[10px]">Sample Academic Formulation:</span>
                  <p className="text-stone-800 font-serif leading-relaxed">{conceptualEx.payload.sample_solution}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-stone-200 rounded-lg text-stone-500 text-xs space-y-2">
                <p>No conceptual exercises generated for this topic yet.</p>
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="px-3 py-1.5 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800"
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
