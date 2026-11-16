import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  HelpCircle,
  Award,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import {
  fetchTopicDetail,
  fetchTopicMaterials,
  updateTopic,
} from '../api/client';
import { LearningMaterial } from '../types';
import { StudyNotesView } from '../components/workspace/StudyNotesView';
import { TopicAssessmentView } from '../components/workspace/TopicAssessmentView';
import { MCQAssessmentView } from '../components/workspace/MCQAssessmentView';
import { FlowDiagramView } from '../components/workspace/FlowDiagramView';
import { SelectiveGeneratorModal } from '../components/workspace/SelectiveGeneratorModal';

type WorkspaceTab = 'notes' | 'assessment' | 'mcq' | 'flow';

export const TopicWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const getTabFromPath = (): WorkspaceTab => {
    if (location.pathname.endsWith('/notes')) return 'notes';
    if (location.pathname.endsWith('/assessment')) return 'assessment';
    if (location.pathname.endsWith('/mcq')) return 'mcq';
    if (location.pathname.endsWith('/flow')) return 'flow';
    return 'notes';
  };

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(getTabFromPath());
  const [topicDetail, setTopicDetail] = useState<any | null>(null);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);

  const loadAllTopicData = async () => {
    if (!id) return;
    try {
      const [detail, mats] = await Promise.all([
        fetchTopicDetail(id),
        fetchTopicMaterials(id),
      ]);
      setTopicDetail(detail);
      setMaterials(mats);
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
    else if (tab === 'assessment') navigate(`/topics/${id}/assessment`);
    else if (tab === 'mcq') navigate(`/topics/${id}/mcq`);
    else if (tab === 'flow') navigate(`/topics/${id}/flow`);
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 animate-fade-in overflow-hidden">
      {/* Workspace Top Navigation Bar */}
      <div className="border-b border-stone-200 dark:border-stone-800 px-4 sm:px-8 py-3 bg-stone-50/50 dark:bg-stone-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
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
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                topicDetail.status === 'mastered'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-stone-400'
              }`}
            />
            <span className="capitalize">{topicDetail.status.replace('_', ' ')}</span>
          </button>

          {/* Selective Generator Button */}
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="px-3.5 py-1 rounded bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
            <span>Generate Notes</span>
          </button>
        </div>
      </div>

      {/* 4 Focused Workspace Tabs */}
      <div className="border-b border-stone-200 dark:border-stone-800 px-3 sm:px-8 bg-white dark:bg-stone-950 flex space-x-1 overflow-x-auto shrink-0 select-none">
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
          onClick={() => handleTabChange('assessment')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'assessment'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>B. Topic Assessment</span>
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
          <span>C. MCQ Assessment</span>
        </button>

        <button
          onClick={() => handleTabChange('flow')}
          className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === 'flow'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>D. Flow Diagrams</span>
        </button>
      </div>

      {/* Main Tab Viewport */}
      <div
        className={`flex-1 min-h-0 ${
          activeTab === 'flow' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto p-4 sm:p-8'
        }`}
      >
        {/* Tab A: Study Material */}
        {activeTab === 'notes' && (
          <StudyNotesView
            topicId={topicDetail.id}
            topicTitle={topicDetail.title}
            materials={materials}
            onMaterialUpdated={loadAllTopicData}
          />
        )}

        {/* Tab B: Topic Assessment */}
        {activeTab === 'assessment' && (
          <TopicAssessmentView
            topicId={topicDetail.id}
            topicTitle={topicDetail.title}
          />
        )}

        {/* Tab C: MCQ Assessment */}
        {activeTab === 'mcq' && (
          <MCQAssessmentView
            topicId={topicDetail.id}
            topicTitle={topicDetail.title}
            onMasteryChange={loadAllTopicData}
          />
        )}

        {/* Tab D: Flow Diagrams */}
        {activeTab === 'flow' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <FlowDiagramView
              topicId={topicDetail.id}
              topicTitle={topicDetail.title}
            />
          </div>
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
