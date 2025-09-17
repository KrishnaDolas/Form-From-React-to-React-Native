import React, { useState, useRef, useEffect } from 'react';

const steps = [
  'Template Setup',
  'Define Sections',
  'Add Questions',
  'Configure Logic',
  'Scoring',
  'Publishing',
];

const auditCategories = [
  'Merchandising',
  'Stock',
  'Quality',
  'Safety',
  'Operations',
];

const questionTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'numeric', label: 'Numeric Input' },
  { value: 'single', label: 'Single Choice' },
  { value: 'multiple', label: 'Multiple Choice' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Date/Time' },
  { value: 'file', label: 'File Upload' },
  { value: 'barcode', label: 'Barcode Scanner' },
];

export default function Form() {
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1 fields
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [auditCategory, setAuditCategory] = useState('');
  const [errors, setErrors] = useState({});

  // Step 2: Sections state
  const [sections, setSections] = useState([]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [sectionEditIndex, setSectionEditIndex] = useState(null);
  const [sectionError, setSectionError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Step 3: Questions state
  const [questions, setQuestions] = useState([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionSection, setQuestionSection] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionOptions, setQuestionOptions] = useState(['', '']);
  const [questionMandatory, setQuestionMandatory] = useState(false);
  const [questionMin, setQuestionMin] = useState('');
  const [questionMax, setQuestionMax] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [previewQuestion, setPreviewQuestion] = useState(null);

  // Step 4: Logic state
  const [logicRules, setLogicRules] = useState([]);
  const [showLogicModal, setShowLogicModal] = useState(false);
  const [logicQuestion, setLogicQuestion] = useState('');
  const [logicConditions, setLogicConditions] = useState([
    { question: '', operator: '==', value: '', logicOp: 'AND' },
  ]);
  const [logicAction, setLogicAction] = useState({ type: '', target: '' });
  const [logicError, setLogicError] = useState('');
  const [testLogicResult, setTestLogicResult] = useState(null);

  // Step 5: Scoring and Publish state
  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [weights, setWeights] = useState([]); // [{ id, type: 'section'|'question', title, weight }]
  const [criticalQuestions, setCriticalQuestions] = useState([]);
  const [complianceThreshold, setComplianceThreshold] = useState('');
  const [publishError, setPublishError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Step 6: Publishing state
  const [publishSuccess, setPublishSuccess] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Focus for modal
  const sectionTitleRef = useRef(null);
  const questionTextRef = useRef(null);

  useEffect(() => {
    if (showSectionModal && sectionTitleRef.current) {
      sectionTitleRef.current.focus();
    }
    if (showQuestionModal && questionTextRef.current) {
      questionTextRef.current.focus();
    }
  }, [showSectionModal, showQuestionModal]);

  // Step navigation
  const handleNext = () => {
    if (currentStep === 0) {
      let newErrors = {};
      if (!templateName.trim()) {
        newErrors.templateName = 'Template Name is required';
      }
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) return;
    }
    if (currentStep === 1 && sections.length === 0) {
      setSectionError('Please add at least one section.');
      return;
    }
    setErrors({});
    setSectionError('');
    setQuestionError('');
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleCancel = () => {
    setTemplateName('');
    setTemplateDescription('');
    setAuditCategory('');
    setSections([]);
    setQuestions([]);
    setErrors({});
    setSectionError('');
    setQuestionError('');
    setCurrentStep(0);
  };

  // Section modal handlers
  const openSectionModal = (index = null) => {
    if (index !== null) {
      setSectionTitle(sections[index].title);
      setSectionDescription(sections[index].description || '');
      setSectionEditIndex(index);
    } else {
      setSectionTitle('');
      setSectionDescription('');
      setSectionEditIndex(null);
    }
    setSectionError('');
    setShowSectionModal(true);
  };

  const closeSectionModal = () => {
    setShowSectionModal(false);
    setSectionTitle('');
    setSectionDescription('');
    setSectionEditIndex(null);
    setSectionError('');
  };

  const handleSectionSave = (e) => {
    e.preventDefault();
    if (!sectionTitle.trim()) {
      setSectionError('Section Title is required');
      return;
    }
    if (sectionEditIndex !== null) {
      // Edit
      const updated = [...sections];
      updated[sectionEditIndex] = {
        title: sectionTitle,
        description: sectionDescription,
      };
      setSections(updated);
    } else {
      // Add
      setSections([
        ...sections,
        { title: sectionTitle, description: sectionDescription },
      ]);
    }
    closeSectionModal();
  };

  const handleSectionDelete = (index) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDragOver = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...sections];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, removed);
    setSections(updated);
    setDraggedIndex(index);
  };

  const closeQuestionModal = () => {
    setShowQuestionModal(false);
    setQuestionSection('');
    setQuestionType('');
    setQuestionText('');
    setQuestionOptions(['', '']);
    setQuestionMandatory(false);
    setQuestionMin('');
    setQuestionMax('');
    setQuestionError('');
    setPreviewQuestion(null);
  };

  // Open/close logic modal
  const openLogicModal = () => {
    setLogicQuestion('');
    setLogicConditions([{ question: '', operator: '==', value: '', logicOp: 'AND' }]);
    setLogicAction({ type: '', target: '' });
    setLogicError('');
    setTestLogicResult(null);
    setShowLogicModal(true);
  };
  const closeLogicModal = () => {
    setShowLogicModal(false);
    setLogicQuestion('');
    setLogicConditions([{ question: '', operator: '==', value: '', logicOp: 'AND' }]);
    setLogicAction({ type: '', target: '' });
    setLogicError('');
    setTestLogicResult(null);
  };

  const handleQuestionSave = (e) => {
    e.preventDefault();
    if (!questionSection) {
      setQuestionError('Please select a section.');
      return;
    }
    if (!questionType) {
      setQuestionError('Please select a question type.');
      return;
    }
    if (!questionText.trim()) {
      setQuestionError('Question Text is required.');
      return;
    }
    if (
      ['single', 'multiple', 'dropdown'].includes(questionType) &&
      questionOptions.filter((opt) => opt.trim()).length < 2
    ) {
      setQuestionError('Please provide at least two options.');
      return;
    }
    if (
      questionType === 'numeric' &&
      questionMin !== '' &&
      questionMax !== '' &&
      Number(questionMin) > Number(questionMax)
    ) {
      setQuestionError('Min value cannot be greater than Max value.');
      return;
    }

    const newQuestion = {
      id: questions.length,
      section: questionSection,
      type: questionType,
      text: questionText,
      options: ['single', 'multiple', 'dropdown'].includes(questionType)
        ? questionOptions.filter((opt) => opt.trim())
        : [],
      mandatory: questionMandatory,
      min: questionType === 'numeric' ? questionMin : undefined,
      max: questionType === 'numeric' ? questionMax : undefined,
    };

    setQuestions([...questions, newQuestion]);
    closeQuestionModal();
  };

  // Option handlers for applicable types
  const handleOptionChange = (idx, value) => {
    const updated = [...questionOptions];
    updated[idx] = value;
    setQuestionOptions(updated);
  };
  const handleAddOption = () => setQuestionOptions([...questionOptions, '']);
  const handleRemoveOption = (idx) => {
    if (questionOptions.length > 2) {
      setQuestionOptions(questionOptions.filter((_, i) => i !== idx));
    }
  };

  // Preview
  const handlePreviewQuestion = () => {
    setPreviewQuestion({
      section: questionSection,
      type: questionType,
      text: questionText,
      options: ['single', 'multiple', 'dropdown'].includes(questionType)
        ? questionOptions.filter((opt) => opt.trim())
        : [],
      mandatory: questionMandatory,
      min: questionType === 'numeric' ? questionMin : undefined,
      max: questionType === 'numeric' ? questionMax : undefined,
    });
  };
  // Add/remove conditions
  const handleAddCondition = () => {
    setLogicConditions([
      ...logicConditions,
      { question: '', operator: '==', value: '', logicOp: 'AND' },
    ]);
  };
  const handleRemoveCondition = (idx) => {
    setLogicConditions(logicConditions.filter((_, i) => i !== idx));
  };

  // Update condition
  const handleConditionChange = (idx, field, value) => {
    const updated = [...logicConditions];
    updated[idx][field] = value;
    setLogicConditions(updated);
  };

  // Save logic rule
  const handleLogicSave = (e) => {
    e.preventDefault();
    if (!logicQuestion) {
      setLogicError('Select a question to configure logic.');
      return;
    }
    if (!logicAction.type || !logicAction.target) {
      setLogicError('Specify an action for this logic.');
      return;
    }

    // validate conditions
    for (let i = 0; i < logicConditions.length; i += 1) {
      const c = logicConditions[i];
      if (!c.question) {
        setLogicError('All conditions must select a question.');
        return;
      }
      if (c.value === '' || c.value === null) {
        setLogicError('All conditions must provide a value to compare.');
        return;
      }
    }

    // Simple circular check: don't allow action to target the same question
    if (
      (logicAction.type === 'show' || logicAction.type === 'skip') &&
      logicAction.target === logicQuestion
    ) {
      setLogicError('Logic cannot target the same question.');
      return;
    }

    setLogicError('');
    setLogicRules([
      ...logicRules,
      {
        question: logicQuestion,
        conditions: logicConditions,
        action: logicAction,
      },
    ]);
    closeLogicModal();
  };

  // Test logic (simulation)
  const handleTestLogic = () => {
    // Basic simulation: just show the human-readable rules for now
    const summary = logicConditions
      .map((c, i) => {
        const qLabel = questions.find((q) => q.text === c.question)?.text || c.question;
        return `${i > 0 ? c.logicOp + ' ' : ''}[${qLabel}] ${c.operator} "${c.value}"`;
      })
      .join(' ');
    setTestLogicResult(`If ${summary} => ${logicAction.type.toUpperCase()} [${logicAction.target}]`);
  };

  // Initialize / sync weights when scoring is enabled & questions change
  useEffect(() => {
    if (scoringEnabled) {
      setWeights((prev) => {
        // preserve existing weights where titles match, append new questions, keep order
        const map = new Map(prev.map((w) => [w.title, w.weight]));
        return questions.map((q, i) => ({
          id: i,
          type: 'question',
          title: q.text,
          weight: map.has(q.text) ? map.get(q.text) : 1,
        }));
      });
    } else {
      setWeights([]);
    }
  }, [scoringEnabled, questions]);

  // Save as draft - basic local endpoint
  const handleSaveDraft = async () => {
    setIsPublishing(true);
    setPublishError('');
    setPublishSuccess('');
    try {
      const res = await fetch('http://localhost:5000/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          auditCategory,
          sections,
          questions: questions.map((q) => ({
            ...q,
            options: q.options ? q.options.map((opt) => ({ value: opt })) : [],
            critical: criticalQuestions.includes(q.text),
            weight: weights.find((w) => w.title === q.text)?.weight || 1,
          })),
          logicRules,
          scoringEnabled,
          complianceThreshold: scoringEnabled ? Number(complianceThreshold) : undefined,
          status: 'draft',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save draft');
      }
      setPublishSuccess('Draft saved!');
      setCurrentStep(steps.length - 1);
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

 // Publish
const handlePublish = async () => {
  console.log('--- handlePublish initiated ---');
  setPublishError('');
  setPublishSuccess('');
  setIsPublishing(true);
  
  // Validate weights if scoring is enabled
  if (scoringEnabled) {
    console.log('Scoring is enabled, validating weights and compliance threshold...');
    if (weights.some((w) => !w.weight || isNaN(Number(w.weight)) || Number(w.weight) < 0)) {
      console.log('Invalid weights detected:', weights);
      setPublishError('All weights must be non-negative numbers.');
      setIsPublishing(false);
      return;
    }
    if (!complianceThreshold || isNaN(Number(complianceThreshold))) {
      console.log('Invalid compliance threshold:', complianceThreshold);
      setPublishError('Compliance threshold is required and must be a number.');
      setIsPublishing(false);
      return;
    }
  }

  // Prepare payload
  const payload = {
    name: templateName,
    description: templateDescription,
    auditCategory,
    sections,
    questions: questions.map((q) => ({
      ...q,
      options: q.options ? q.options.map((opt) => ({ value: opt })) : [],
      critical: criticalQuestions.includes(q.text),
      weight: weights.find((w) => w.title === q.text)?.weight || 1,
    })),
    logicRules,
    scoringEnabled,
    complianceThreshold: scoringEnabled ? Number(complianceThreshold) : undefined,
    status: 'published',
  };

  console.log('Prepared payload for publishing:', JSON.stringify(payload, null, 2));

  try {
    const res = await fetch('http://localhost:5000/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('API response status:', res.status);

    if (!res.ok) {
      const data = await res.json();
      console.log('API response error data:', data);
      throw new Error(data.error || 'Failed to publish template');
    }

    const responseData = await res.json();
    console.log('Publish successful:', responseData);

    setPublishSuccess('Template published!');
    setCurrentStep(steps.length - 1);
  } catch (err) {
    console.error('Error during publishing:', err);
    setPublishError(err.message);
  } finally {
    console.log('Publishing process completed.');
    setIsPublishing(false);
  }
};

  // Step 5 content
  const handleWeightChange = (idx, value) => {
    const updated = [...weights];
    updated[idx].weight = value;
    setWeights(updated);
  };

  const handleCriticalToggle = (idx) => {
    const questionTitle = weights[idx].title;
    if (criticalQuestions.includes(questionTitle)) {
      setCriticalQuestions(criticalQuestions.filter((q) => q !== questionTitle));
    } else {
      setCriticalQuestions([...criticalQuestions, questionTitle]);
    }
  };

  const renderScoringAndPublish = () => (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Scoring &amp; Publish</h2>
      <div className="mb-4 flex items-center gap-3">
        <label className="font-medium">Enable Scoring:</label>
        <input
          type="checkbox"
          checked={scoringEnabled}
          onChange={(e) => setScoringEnabled(e.target.checked)}
          className="ml-2 scale-125"
          aria-label="Enable scoring"
        />
      </div>
      {scoringEnabled && (
        <>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Assign Weights to Questions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 border">Question</th>
                    <th className="px-2 py-1 border">Weight</th>
                    <th className="px-2 py-1 border">Critical</th>
                  </tr>
                </thead>
                <tbody>
                  {weights.map((w, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1 border">{w.title}</td>
                      <td className="px-2 py-1 border">
                        <input
                          type="number"
                          min={0}
                          className="w-20 px-2 py-1 border rounded"
                          value={w.weight}
                          onChange={(e) => handleWeightChange(idx, e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1 border text-center">
                        <input
                          type="checkbox"
                          checked={criticalQuestions.includes(w.title)}
                          onChange={() => handleCriticalToggle(idx)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Compliance Threshold (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={complianceThreshold}
              onChange={(e) => setComplianceThreshold(e.target.value)}
              placeholder="e.g. 80"
            />
          </div>
        </>
      )}
      {publishError && <p className="text-red-500 text-xs mb-2">{publishError}</p>}
      {saveStatus && <p className="text-green-600 text-xs mb-2">{saveStatus}</p>}
      <div className="flex justify-between mt-8">
        <button onClick={handlePrev} className="px-4 py-2 bg-gray-200 text-gray-700 rounded">
          Previous
        </button>
        <div className="flex gap-2">
          <button onClick={handleSaveDraft} className="px-4 py-2 bg-yellow-500 text-white rounded" disabled={isPublishing}>
            {isPublishing ? 'Saving...' : 'Save as Draft'}
          </button>
          <button onClick={handlePublish} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : 'Publish Template'}
          </button>
        </div>
      </div>
      {publishSuccess && <p className="text-green-600 text-sm mt-4">{publishSuccess}</p>}
    </div>
  );

  // Step 0: Template Setup
  const renderTemplateSetup = () => (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Template Setup</h2>
      <div className="mb-4">
        <label htmlFor="templateName" className="block text-sm font-medium mb-1">
          Template Name <span className="text-red-500">*</span>
        </label>
        <input
          id="templateName"
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Enter template name"
        />
        {errors.templateName && <p className="text-red-500 text-xs mt-1">{errors.templateName}</p>}
      </div>
      <div className="mb-4">
        <label htmlFor="templateDescription" className="block text-sm font-medium mb-1">Description</label>
        <textarea
          id="templateDescription"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={templateDescription}
          onChange={(e) => setTemplateDescription(e.target.value)}
          placeholder="Describe this template (optional)"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="auditCategory" className="block text-sm font-medium mb-1">Audit Category</label>
        <select
          id="auditCategory"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={auditCategory}
          onChange={(e) => setAuditCategory(e.target.value)}
        >
          <option value="">Select category</option>
          {auditCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-between mt-8">
        <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded">
          Cancel
        </button>
        <button onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded">
          Next
        </button>
      </div>
    </div>
  );

  // Step 1: Define Sections
  const renderDefineSections = () => (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Define Sections</h2>
      <div className="mb-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => openSectionModal()}>
          Add Section
        </button>
      </div>
      {sectionError && <p className="text-red-500 text-xs mb-2">{sectionError}</p>}
      <ul className="mb-4">
        {sections.map((section, idx) => (
          <li
            key={idx}
            className="flex items-center justify-between bg-gradient-to-r from-white to-slate-50 rounded p-3 mb-3 border shadow-sm"
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => {
              e.preventDefault();
              handleDragOver(idx);
            }}
          >
            <div>
              <div className="font-semibold text-gray-800">{section.title}</div>
              {section.description && <div className="text-gray-500 text-sm mt-1">{section.description}</div>}
            </div>
            <div className="flex gap-2">
              <button className="px-2 py-1 bg-yellow-400 text-white rounded text-xs" onClick={() => openSectionModal(idx)}>
                Edit
              </button>
              <button className="px-2 py-1 bg-red-500 text-white rounded text-xs" onClick={() => handleSectionDelete(idx)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between mt-8">
        <button onClick={handlePrev} className="px-4 py-2 bg-gray-200 text-gray-700 rounded">
          Previous
        </button>
        <button onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded">
          Next
        </button>
      </div>

      {showSectionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form className="bg-white rounded shadow-lg p-6 w-full max-w-md" onSubmit={handleSectionSave}>
            <h3 className="text-lg font-semibold mb-4">{sectionEditIndex !== null ? 'Edit Section' : 'Add Section'}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Section Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                ref={sectionTitleRef}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Enter section title"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
                placeholder="Describe this section (optional)"
              />
            </div>
            {sectionError && <p className="text-red-500 text-xs mb-2">{sectionError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded" onClick={closeSectionModal}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{sectionEditIndex !== null ? 'Update' : 'Add'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  // Step 2: Add Questions
  const renderAddQuestions = () => (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Add Questions</h2>
      <div className="mb-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setShowQuestionModal(true)}>
          Add Question
        </button>
      </div>
      {questionError && <p className="text-red-500 text-xs mb-2">{questionError}</p>}
      <ul className="mb-4">
        {questions.map((q, idx) => (
          <li key={idx} className="flex items-center justify-between bg-white rounded p-3 mb-2 border shadow-sm">
            <div>
              <div className="font-semibold text-gray-800">{q.text}</div>
              <div className="text-gray-500 text-xs">{q.type} • <span className="text-blue-500">{q.section}</span></div>
            </div>
            <div className="flex gap-2">
              {/* Future: Edit/Delete */}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between mt-8">
        <button onClick={handlePrev} className="px-4 py-2 bg-gray-200 text-gray-700 rounded">Previous</button>
        <button onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded">Next</button>
      </div>

      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form className="bg-white rounded shadow-lg p-6 w-full max-w-md" onSubmit={handleQuestionSave}>
            <h3 className="text-lg font-semibold mb-4">Add Question</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Section <span className="text-red-500">*</span></label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" value={questionSection} onChange={(e) => setQuestionSection(e.target.value)}>
                <option value="">Select section</option>
                {sections.map((section, idx) => (
                  <option key={idx} value={section.title}>{section.title}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Question Type <span className="text-red-500">*</span></label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                <option value="">Select type</option>
                {questionTypes.map((qt) => (
                  <option key={qt.value} value={qt.value}>{qt.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Question Text <span className="text-red-500">*</span></label>
              <input ref={questionTextRef} type="text" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Enter question" />
            </div>
            {['single', 'multiple', 'dropdown'].includes(questionType) && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Options <span className="text-red-500">*</span></label>
                {questionOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center mb-2 gap-2">
                    <input type="text" className="flex-1 px-2 py-1 border border-gray-300 rounded" value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Option ${idx + 1}`} />
                    <button type="button" className="px-2 py-1 bg-red-500 text-white rounded text-xs" onClick={() => handleRemoveOption(idx)} disabled={questionOptions.length <= 2}>Remove</button>
                  </div>
                ))}
                <button type="button" className="mt-2 px-3 py-1 bg-green-500 text-white rounded text-xs" onClick={handleAddOption}>Add Option</button>
              </div>
            )}
            {questionType === 'numeric' && (
              <div className="mb-4 flex gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Min</label>
                  <input type="number" className="w-24 px-2 py-1 border border-gray-300 rounded" value={questionMin} onChange={(e) => setQuestionMin(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max</label>
                  <input type="number" className="w-24 px-2 py-1 border border-gray-300 rounded" value={questionMax} onChange={(e) => setQuestionMax(e.target.value)} />
                </div>
              </div>
            )}
            {questionType === 'file' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Allowed File Types</label>
                <div className="text-xs text-gray-500">Images recommended (jpg/png). Actual upload happens in runtime surveys.</div>
              </div>
            )}
            <div className="mb-4 flex items-center gap-2">
              <input id="mandatory" type="checkbox" checked={questionMandatory} onChange={(e) => setQuestionMandatory(e.target.checked)} />
              <label htmlFor="mandatory" className="text-sm font-medium">Mandatory</label>
            </div>
            {questionError && <p className="text-red-500 text-xs mb-2">{questionError}</p>}
            <div className="flex justify-between gap-2">
              <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded" onClick={closeQuestionModal}>Cancel</button>
              <button type="button" className="px-4 py-2 bg-purple-500 text-white rounded" onClick={handlePreviewQuestion}>Preview</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
            </div>
            {previewQuestion && (
              <div className="mt-4 p-3 border rounded bg-gray-50">
                <h4 className="font-semibold mb-2">Preview</h4>
                <div>
                  <span className="font-medium">{previewQuestion.text}</span>
                  {previewQuestion.mandatory && <span className="ml-2 text-red-500">*</span>}
                </div>
                {['single', 'multiple', 'dropdown'].includes(previewQuestion.type) && (
                  <ul className="list-disc ml-6 mt-2">
                    {previewQuestion.options.map((opt, idx) => (
                      <li key={idx}>{opt}</li>
                    ))}
                  </ul>
                )}
                {previewQuestion.type === 'numeric' && (
                  <div className="mt-2">
                    <span>Min: {previewQuestion.min} </span>
                    <span className="ml-2">Max: {previewQuestion.max}</span>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );

  // Step 3: Configure Logic
  const renderConfigureLogic = () => (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Configure Logic</h2>
      <div className="mb-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={openLogicModal}>Add Logic Rule</button>
      </div>
      {logicRules.length === 0 && <p className="text-gray-500 text-sm mb-2">No logic rules added yet.</p>}
      <ul className="mb-4">
        {logicRules.map((rule, idx) => (
          <li key={idx} className="bg-white rounded p-3 mb-2 border shadow-sm text-sm">
            <div className="font-semibold">Target: {questions.find((q) => q.text === rule.question)?.text || rule.question}</div>
            <div className="text-gray-600 mt-1">If:&nbsp;{rule.conditions.map((cond, cidx) => (
<span key={cidx} className="mr-2">{cidx > 0 ? cond.logicOp + ' ' : ''}[{questions.find((q) => q.text === cond.question)?.text || cond.question}] {cond.operator} "{cond.value}"</span>            ))}</div>
            <div className="text-blue-600 mt-2">Action: {rule.action.type} [{questions.find((q) => q.text === rule.action.target)?.text || rule.action.target}]</div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between mt-8">
        <button onClick={handlePrev} className="px-4 py-2 bg-gray-200 text-gray-700 rounded">Previous</button>
        <button onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded">Next</button>
      </div>

      {showLogicModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form className="bg-white rounded shadow-lg p-8 w-full max-w-4xl space-y-4" onSubmit={handleLogicSave}>
            <h3 className="text-lg font-semibold mb-4">Add Logic Rule</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Target Question <span className="text-red-500">*</span></label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded" value={logicQuestion} onChange={(e) => setLogicQuestion(e.target.value)}>
                <option value="">Select question</option>
                {questions.map((q, idx) => (
                  <option key={idx} value={q.text}>{q.text}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Conditions</label>
              {logicConditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <select className="px-2 py-1 border rounded" value={cond.question} onChange={(e) => handleConditionChange(idx, 'question', e.target.value)}>
                    <option value="">Select question</option>
                    {questions.map((q, qidx) => (
                      <option key={qidx} value={q.text}>{q.text}</option>
                    ))}
                  </select>
                  <select className="px-2 py-1 border rounded" value={cond.operator} onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}>
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                  </select>
                  <input type="text" className="px-2 py-1 border rounded" value={cond.value} onChange={(e) => handleConditionChange(idx, 'value', e.target.value)} placeholder="Value" />
                  {idx > 0 && (
                    <select className="px-2 py-1 border rounded" value={cond.logicOp} onChange={(e) => handleConditionChange(idx, 'logicOp', e.target.value)}>
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}
                  <button type="button" className="px-2 py-1 bg-red-500 text-white rounded text-xs" onClick={() => handleRemoveCondition(idx)}>Remove</button>
                </div>
              ))}
              <button type="button" className="mt-2 px-3 py-1 bg-green-500 text-white rounded text-xs" onClick={handleAddCondition}>Add Condition</button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Action <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select className="px-2 py-1 border rounded" value={logicAction.type} onChange={(e) => setLogicAction({ ...logicAction, type: e.target.value })}>
                  <option value="">Select action</option>
                  <option value="show">Show</option>
                  <option value="hide">Hide</option>
                  <option value="skip">Skip</option>
                </select>
                <select className="px-2 py-1 border rounded" value={logicAction.target} onChange={(e) => setLogicAction({ ...logicAction, target: e.target.value })}>
                  <option value="">Select target question</option>
                  {questions.map((q, idx) => (
                    <option key={idx} value={q.text}>{q.text}</option>
                  ))}
                </select>
              </div>
            </div>
            {logicError && <p className="text-red-500 text-xs mb-2">{logicError}</p>}
            <div className="flex justify-between gap-2">
              <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded" onClick={closeLogicModal}>Cancel</button>
              <button type="button" className="px-4 py-2 bg-purple-500 text-white rounded" onClick={handleTestLogic}>Test Logic</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
            </div>
            {testLogicResult && (
              <div className="mt-4 p-3 border rounded bg-gray-50">
                <h4 className="font-semibold mb-2">Test Result</h4>
                <div className="text-sm">{testLogicResult}</div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );

  const renderStepContent = () => {
    if (currentStep === 0) return renderTemplateSetup();
    if (currentStep === 1) return renderDefineSections();
    if (currentStep === 2) return renderAddQuestions();
    if (currentStep === 3) return renderConfigureLogic();
    if (currentStep === 4) return renderScoringAndPublish();
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-4">{steps[currentStep]}</h2>
        <p className="text-gray-500">Step {currentStep + 1} content goes here.</p>
        <div className="flex justify-between mt-8">
          <button onClick={handlePrev} className="px-4 py-2 bg-gray-200 text-gray-700 rounded">Previous</button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Survey Template Builder</h1>
            <div className="text-sm opacity-90 mt-1">Create smart audit templates for field execution</div>
          </div>
          <div className="text-sm opacity-90">Step {currentStep + 1} of {steps.length}</div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-6 min-h-[300px]">
        {/* Stepper */}
        <div className="flex items-center gap-4 mb-6">
          {steps.map((step, idx) => (
            <div key={step} className="flex-1">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold ${idx === currentStep ? 'bg-white text-blue-600' : idx < currentStep ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {idx + 1}
                </div>
                <div className="text-sm">
                  <div className={`${idx === currentStep ? 'text-blue-600 font-semibold' : idx < currentStep ? 'text-green-600' : 'text-gray-500'}`}>{step}</div>
                </div>
              </div>
              {idx < steps.length - 1 && <div className={`h-1 mt-3 ${idx < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {renderStepContent()}
      </div>
    </div>
  );
}
