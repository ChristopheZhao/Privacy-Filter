import React, { useDeferredValue, useEffect, useState } from 'react';
import {
  CheckCheck,
  Copy,
  ListFilter,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import SettingsPanel from './SettingsPanel';
import CustomRuleForm from './CustomRuleForm';
import {
  applyResolvedFindings,
  buildSelectedFindingKeys,
  formatConfidence,
  formatElapsed,
  getFindingKey,
  getSelectedFindings,
} from './deepFilterUtils';
import { defaultActiveRules, ruleOrder, systemRules } from './privacyRules';

const defaultLlmConfig = {
  enabled: true,
  provider: 'ollama',
  base_url: 'http://127.0.0.1:11434',
  model: 'qwen3.5:4b',
  timeout_ms: 60000,
  think: false,
  auto_run: false,
  max_chunk_chars: 1800,
  confidence_threshold: 0,
};

const normalizePattern = (pattern) => {
  if (pattern instanceof RegExp) {
    return new RegExp(pattern.source, pattern.flags || 'g');
  }

  if (typeof pattern === 'string' && pattern.trim()) {
    return new RegExp(pattern, 'g');
  }

  if (pattern && typeof pattern === 'object' && typeof pattern.source === 'string') {
    return new RegExp(pattern.source, pattern.flags || 'g');
  }

  return null;
};

const normalizeCustomRule = (rule) => {
  if (!rule || typeof rule !== 'object') {
    return null;
  }

  const pattern = normalizePattern(rule.pattern);
  if (!pattern) {
    return null;
  }

  return {
    ...rule,
    category: rule.category || '未分类',
    replacement: typeof rule.replacement === 'string' ? rule.replacement : '[CUSTOM_RULE]',
    pattern,
  };
};

const normalizeLlmConfig = (config) => ({
  ...defaultLlmConfig,
  ...(config && typeof config === 'object' ? config : {}),
  enabled:
    typeof config?.enabled === 'boolean' ? config.enabled : defaultLlmConfig.enabled,
  provider:
    typeof config?.provider === 'string' && config.provider.trim()
      ? config.provider.trim()
      : defaultLlmConfig.provider,
  base_url:
    typeof config?.base_url === 'string' && config.base_url.trim()
      ? config.base_url.trim()
      : defaultLlmConfig.base_url,
  model:
    typeof config?.model === 'string' && config.model.trim()
      ? config.model.trim()
      : defaultLlmConfig.model,
  timeout_ms: Number.isFinite(Number(config?.timeout_ms))
    ? Number(config.timeout_ms)
    : defaultLlmConfig.timeout_ms,
  think: typeof config?.think === 'boolean' ? config.think : defaultLlmConfig.think,
  auto_run:
    typeof config?.auto_run === 'boolean' ? config.auto_run : defaultLlmConfig.auto_run,
  max_chunk_chars: Number.isFinite(Number(config?.max_chunk_chars))
    ? Number(config.max_chunk_chars)
    : defaultLlmConfig.max_chunk_chars,
  confidence_threshold: Number.isFinite(Number(config?.confidence_threshold))
    ? Number(config.confidence_threshold)
    : defaultLlmConfig.confidence_threshold,
});

const serializeCustomRule = (rule) => ({
  ...rule,
  pattern: rule.pattern instanceof RegExp ? rule.pattern.source : String(rule.pattern || ''),
});

const buildRuntimeConfig = (config) => ({
  enabled: config.enabled,
  provider: config.provider,
  base_url: config.base_url.trim(),
  model: config.model.trim(),
  timeout_ms: Math.max(1000, Number(config.timeout_ms) || defaultLlmConfig.timeout_ms),
  think: Boolean(config.think),
  auto_run: Boolean(config.auto_run),
  max_chunk_chars: Math.max(256, Number(config.max_chunk_chars) || defaultLlmConfig.max_chunk_chars),
  confidence_threshold: Math.min(
    1,
    Math.max(0, Number(config.confidence_threshold) || defaultLlmConfig.confidence_threshold)
  ),
});

const applyRules = (text, activeRules, customRules) => {
  if (!text) {
    return '';
  }

  let processed = text;

  ruleOrder.forEach((ruleKey) => {
    if (activeRules[ruleKey] && systemRules[ruleKey]) {
      processed = processed.replace(systemRules[ruleKey].pattern, systemRules[ruleKey].replacement);
    }
  });

  customRules.forEach((rule) => {
    if (activeRules[rule.name] && rule.pattern instanceof RegExp) {
      processed = processed.replace(rule.pattern, rule.replacement);
    }
  });

  return processed;
};

const TextFilter = () => {
  const [inputText, setInputText] = useState('');
  const [filteredText, setFilteredText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomRuleFormOpen, setIsCustomRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [customRules, setCustomRules] = useState([]);
  const [activeRules, setActiveRules] = useState(defaultActiveRules);
  const [llmConfig, setLlmConfig] = useState(defaultLlmConfig);
  const [deepFilterStatus, setDeepFilterStatus] = useState('idle');
  const [deepFilterError, setDeepFilterError] = useState('');
  const [deepFilterResult, setDeepFilterResult] = useState(null);
  const [selectedFindingKeys, setSelectedFindingKeys] = useState({});
  const [compactReviewMode, setCompactReviewMode] = useState(true);
  const [isInputComposing, setIsInputComposing] = useState(false);
  const deferredInputText = useDeferredValue(inputText);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await invoke('load_config');

        if (Array.isArray(config.custom_rules)) {
          setCustomRules(config.custom_rules.map(normalizeCustomRule).filter(Boolean));
        }

        if (config.active_rules && typeof config.active_rules === 'object') {
          setActiveRules({
            ...defaultActiveRules,
            ...config.active_rules,
          });
        }

        setLlmConfig(normalizeLlmConfig(config.llm));
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (isInputComposing) {
      return;
    }

    setFilteredText(applyRules(deferredInputText, activeRules, customRules));
  }, [deferredInputText, activeRules, customRules, isInputComposing]);

  useEffect(() => {
    if (isInputComposing) {
      return;
    }

    setDeepFilterStatus('idle');
    setDeepFilterError('');
    setDeepFilterResult(null);
    setSelectedFindingKeys({});
  }, [
    inputText,
    llmConfig.enabled,
    llmConfig.base_url,
    llmConfig.model,
    llmConfig.timeout_ms,
    llmConfig.think,
    llmConfig.confidence_threshold,
    isInputComposing,
  ]);

  useEffect(() => {
    if (!deepFilterResult?.applied_findings) {
      setSelectedFindingKeys({});
      return;
    }

    setSelectedFindingKeys(buildSelectedFindingKeys(deepFilterResult.applied_findings));
  }, [deepFilterResult]);

  const handleSaveConfig = async () => {
    try {
      await invoke('save_config', {
        config: {
          custom_rules: customRules.map(serializeCustomRule),
          active_rules: activeRules,
          llm: buildRuntimeConfig(llmConfig),
        },
      });
      alert('配置已保存到本地。');
    } catch (error) {
      console.error('保存失败:', error);
      alert(`保存失败: ${error}`);
    }
  };

  const handleToggleRule = (ruleKey, isEnabled) => {
    setActiveRules((prev) => ({
      ...prev,
      [ruleKey]: isEnabled,
    }));
  };

  const handleUpdateLlmConfig = (patch) => {
    setLlmConfig((prev) => normalizeLlmConfig({ ...prev, ...patch }));
  };

  const handleAddCustomRule = (ruleData) => {
    if (customRules.some((rule) => rule.name === ruleData.name)) {
      console.error('规则名称已存在');
      return;
    }

    setCustomRules((prev) => [
      ...prev,
      {
        ...ruleData,
        category: ruleData.category || '未分类',
      },
    ]);
    setActiveRules((prev) => ({
      ...prev,
      [ruleData.name]: true,
    }));
    setIsCustomRuleFormOpen(false);
  };

  const handleEditCustomRule = (oldRule, newRule) => {
    if (
      oldRule.name !== newRule.name &&
      customRules.some((rule) => rule.name === newRule.name)
    ) {
      console.error('规则名称已存在');
      return;
    }

    setCustomRules((prev) =>
      prev.map((rule) =>
        rule.name === oldRule.name
          ? {
              ...newRule,
              category: newRule.category || '未分类',
            }
          : rule
      )
    );

    if (oldRule.name !== newRule.name) {
      setActiveRules((prev) => {
        const { [oldRule.name]: _, ...rest } = prev;
        return {
          ...rest,
          [newRule.name]: true,
        };
      });
    }

    setEditingRule(null);
  };

  const handleDeleteCustomRule = (ruleName) => {
    setCustomRules((prev) => prev.filter((rule) => rule.name !== ruleName));
    setActiveRules((prev) => {
      const { [ruleName]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleCopyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  const handleInputCompositionStart = () => {
    setIsInputComposing(true);
  };

  const handleInputCompositionEnd = (event) => {
    setIsInputComposing(false);
    setInputText(event.currentTarget.value);
  };

  const handleRunDeepFilter = async () => {
    if (!inputText.trim()) {
      setDeepFilterStatus('error');
      setDeepFilterError('请先输入要进行深度过滤的文本。');
      return;
    }

    if (!llmConfig.enabled) {
      setDeepFilterStatus('error');
      setDeepFilterError('本地 LLM 深度过滤已关闭，请先在设置中启用。');
      return;
    }

    const runtime = buildRuntimeConfig(llmConfig);

    try {
      setDeepFilterStatus('checking');
      setDeepFilterError('');
      setDeepFilterResult(null);

      const health = await invoke('llm_healthcheck', { runtime });
      if (!health.ok) {
        throw new Error(health.message || '本地 LLM 服务不可用');
      }

      setDeepFilterStatus('running');
      const result = await invoke('analyze_text', {
        input: inputText,
        runtime,
      });
      setDeepFilterResult(result);
      setDeepFilterStatus('success');
    } catch (error) {
      console.error('深度过滤失败:', error);
      setDeepFilterStatus('error');
      setDeepFilterError(String(error));
    }
  };

  const handleToggleFinding = (finding) => {
    const key = getFindingKey(finding);
    setSelectedFindingKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAllFindings = () => {
    if (!deepFilterResult?.applied_findings) {
      return;
    }

    setSelectedFindingKeys(buildSelectedFindingKeys(deepFilterResult.applied_findings));
  };

  const handleClearFindingSelection = () => {
    if (!deepFilterResult?.applied_findings) {
      return;
    }

    const nextSelection = {};
    deepFilterResult.applied_findings.forEach((finding) => {
      nextSelection[getFindingKey(finding)] = false;
    });
    setSelectedFindingKeys(nextSelection);
  };

  const appliedFindings = deepFilterResult?.applied_findings || [];
  const selectedFindings = getSelectedFindings(appliedFindings, selectedFindingKeys);
  const deepFilterPreviewText = deepFilterResult
    ? applyResolvedFindings(inputText, selectedFindings)
    : '';
  const unresolvedFindings = deepFilterResult?.unresolved_findings || [];

  const handleApplySelectedFindings = () => {
    if (!deepFilterResult) {
      return;
    }

    setInputText(deepFilterPreviewText);
    setDeepFilterStatus('idle');
    setDeepFilterError('');
    setDeepFilterResult(null);
    setSelectedFindingKeys({});
  };

  const isDeepFilterBusy =
    deepFilterStatus === 'checking' || deepFilterStatus === 'running';
  const deepFilterSummary = deepFilterResult
    ? {
        total: appliedFindings.length,
        selected: selectedFindings.length,
        unresolved: unresolvedFindings.length,
        elapsedMs: deepFilterResult.elapsed_ms || 0,
      }
    : null;

  const deepFilterStatusText = {
    idle: '尚未运行深度过滤。',
    checking: '正在检查本地 LLM 服务...',
    running: '正在使用本地 LLM 分析文本...',
    success: '深度过滤已完成。',
    error: deepFilterError || '深度过滤失败。',
  }[deepFilterStatus];

  const deepFilterStatusAppearance = {
    idle: {
      panelClass: 'border border-slate-200 bg-white/80 text-slate-700',
      dotClass: 'bg-slate-400',
      badge: '待运行',
    },
    checking: {
      panelClass: 'border border-sky-200 bg-sky-50 text-sky-800',
      dotClass: 'bg-sky-500',
      badge: '检查中',
    },
    running: {
      panelClass: 'border border-teal-200 bg-teal-50 text-teal-800',
      dotClass: 'bg-teal-500',
      badge: '分析中',
    },
    success: {
      panelClass: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
      dotClass: 'bg-emerald-500',
      badge: '已完成',
    },
    error: {
      panelClass: 'border border-rose-200 bg-rose-50 text-rose-800',
      dotClass: 'bg-rose-500',
      badge: '异常',
    },
  }[deepFilterStatus];

  const deepFilterSummaryCards = deepFilterSummary
    ? [
        {
          label: '识别命中',
          value: deepFilterSummary.total,
          tone: 'bg-teal-50 text-teal-800 border-teal-100',
        },
        {
          label: '已选择',
          value: deepFilterSummary.selected,
          tone: 'bg-emerald-50 text-emerald-800 border-emerald-100',
        },
        {
          label: '未解析',
          value: deepFilterSummary.unresolved,
          tone: 'bg-amber-50 text-amber-800 border-amber-100',
        },
        {
          label: '耗时',
          value: formatElapsed(deepFilterSummary.elapsedMs),
          tone: 'bg-sky-50 text-sky-800 border-sky-100',
        },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <header className="border-b border-white/60 bg-white/70 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                隐私信息过滤器
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                用规则快速预览兜底，用本地 LLM 做上下文识别，再由你逐条确认是否应用。
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                全程本地处理
              </span>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 font-medium text-sky-700">
                Provider: {llmConfig.provider}
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-600">
                模型: {llmConfig.model}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.55)] transition hover:border-sky-100 hover:bg-sky-50 hover:text-sky-700"
            title="规则设置"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.02fr),minmax(0,1fr)]">
          <section className="flex min-h-[420px] flex-col rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.38)] backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-800">输入原始文本</label>
                <p className="mt-1 text-xs text-slate-500">
                  原文只在本地处理，不会上传到云端。
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {inputText.length} 字符
              </span>
            </div>
            <textarea
              className="min-h-[380px] flex-1 rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-4 text-slate-800 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 resize-none"
              value={inputText}
              onChange={handleInputChange}
              onCompositionStart={handleInputCompositionStart}
              onCompositionEnd={handleInputCompositionEnd}
              placeholder="在这里输入需要过滤的文本..."
            />
          </section>

          <div className="space-y-6">
            <section className="flex min-h-[220px] flex-col rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.32)] backdrop-blur">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-800">规则快速预览</label>
                  <p className="mt-1 text-xs text-slate-500">
                    适合邮箱、手机号、数据库串、密钥等高确定性字段。
                  </p>
                </div>
                <button
                  onClick={() => handleCopyText(filteredText)}
                  disabled={!filteredText}
                  className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:bg-slate-300"
                >
                  <Copy className="h-4 w-4" />
                  <span>复制</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                {filteredText || '规则快速预览会显示在这里...'}
              </div>
            </section>

            <section className="flex min-h-[320px] flex-col rounded-[28px] border border-emerald-100/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.92),rgba(255,255,255,0.95))] p-5 shadow-[0_28px_80px_-46px_rgba(5,150,105,0.45)] backdrop-blur">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      深度过滤
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
                      {llmConfig.model}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">本地 LLM 审阅式过滤</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      先识别候选敏感项，再由你逐条勾选是否应用，减少误杀带来的返工。
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleRunDeepFilter}
                    disabled={isDeepFilterBusy || !inputText.trim()}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                  >
                    <Sparkles className={`h-4 w-4 ${isDeepFilterBusy ? 'animate-pulse' : ''}`} />
                    <span>{isDeepFilterBusy ? '分析中...' : '运行深度过滤'}</span>
                  </button>
                  <button
                    onClick={() => handleCopyText(deepFilterPreviewText || '')}
                    disabled={!deepFilterPreviewText}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:bg-slate-300"
                  >
                    <Copy className="h-4 w-4" />
                    <span>复制已选结果</span>
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 font-medium text-slate-600">
                  Provider: {llmConfig.provider}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 font-medium text-slate-600">
                  服务地址: {llmConfig.base_url}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 font-medium text-slate-600">
                  超时: {llmConfig.timeout_ms} ms
                </span>
              </div>

              <div
                className={`mb-4 rounded-2xl px-4 py-3 text-sm ${deepFilterStatusAppearance.panelClass}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-2.5 w-2.5 rounded-full ${deepFilterStatusAppearance.dotClass}`}
                    />
                    <span className="font-medium">{deepFilterStatusText}</span>
                  </div>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium">
                    {deepFilterStatusAppearance.badge}
                  </span>
                </div>
              </div>

              {deepFilterSummaryCards.length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {deepFilterSummaryCards.map((card) => (
                    <div
                      key={card.label}
                      className={`rounded-2xl border px-3 py-3 ${card.tone}`}
                    >
                      <div className="text-xs font-medium opacity-80">{card.label}</div>
                      <div className="mt-2 text-lg font-semibold">{card.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {deepFilterError && deepFilterStatus === 'error' && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {deepFilterError}
                </div>
              )}

              {deepFilterResult ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr,0.85fr]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <ListFilter className="h-4 w-4 text-emerald-700" />
                          <h3 className="text-sm font-semibold text-slate-800">命中项审阅</h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          每条命中默认选中。取消勾选后，右侧预览会实时更新。
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setCompactReviewMode((value) => !value)}
                          className="rounded-xl bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white"
                        >
                          {compactReviewMode ? '展开详情' : '紧凑模式'}
                        </button>
                        <button
                          onClick={handleSelectAllFindings}
                          className="rounded-xl bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white"
                        >
                          全选
                        </button>
                        <button
                          onClick={handleClearFindingSelection}
                          className="rounded-xl bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white"
                        >
                          清空
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[460px] overflow-auto pr-1">
                      {appliedFindings.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-slate-500">
                          本次深度过滤没有返回可应用的命中项。
                        </div>
                      ) : (
                        appliedFindings.map((finding) => {
                          const selected = Boolean(selectedFindingKeys[getFindingKey(finding)]);
                          const confidenceWidth = Math.max(
                            10,
                            Math.min(100, Number(finding.confidence || 0) * 100)
                          );
                          const itemClass = selected
                            ? 'border-emerald-200 bg-white shadow-[0_20px_40px_-28px_rgba(5,150,105,0.4)] ring-1 ring-emerald-100'
                            : 'border-white/70 bg-white/75 hover:border-slate-200 hover:bg-white';
                          return (
                            <div
                              key={getFindingKey(finding)}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleToggleFinding(finding)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleToggleFinding(finding);
                                }
                              }}
                              className={`w-full text-left rounded-[24px] border transition-all ${
                                compactReviewMode ? 'p-3.5' : 'p-4'
                              } ${itemClass}`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => handleToggleFinding(finding)}
                                  onClick={(event) => event.stopPropagation()}
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                                      {finding.label}
                                    </span>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                        selected
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {selected ? '已应用' : '已忽略'}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      置信度 {formatConfidence(finding.confidence)}
                                    </span>
                                  </div>
                                  <div
                                    className={`mt-3 grid grid-cols-1 gap-3 text-sm ${
                                      compactReviewMode ? 'xl:grid-cols-[1fr,auto,1fr]' : 'md:grid-cols-2'
                                    }`}
                                  >
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                                      <div className="mb-1 text-xs text-slate-500">原文片段</div>
                                      <div className="break-all font-medium text-slate-800">
                                        {finding.text}
                                      </div>
                                    </div>
                                    {compactReviewMode && (
                                      <div className="hidden xl:flex items-center justify-center text-slate-300">
                                        →
                                      </div>
                                    )}
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                                      <div className="mb-1 text-xs text-emerald-700/80">替换结果</div>
                                      <div className="break-all font-medium text-emerald-700">
                                        {finding.replacement}
                                      </div>
                                    </div>
                                  </div>
                                  {!compactReviewMode && (
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                                        <span>置信度</span>
                                        <span>{formatConfidence(finding.confidence)}</span>
                                      </div>
                                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                                        <div
                                          className="h-full rounded-full bg-emerald-500"
                                          style={{ width: `${confidenceWidth}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {finding.reason && !compactReviewMode && (
                                    <p className="mt-3 text-xs text-slate-500">
                                      原因：{finding.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {unresolvedFindings.length > 0 && (
                      <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <TriangleAlert className="h-4 w-4 text-amber-700" />
                              <h4 className="text-sm font-semibold text-amber-900">未解析项</h4>
                            </div>
                            <p className="mt-1 text-xs text-amber-800">
                              这些命中项没有被自动应用，你可以据此检查原文。
                            </p>
                          </div>
                          <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-xs text-amber-800">
                            {unresolvedFindings.length} 项
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {unresolvedFindings.map((finding, index) => (
                            <div
                              key={`${finding.label}:${finding.anchor_text}:${index}`}
                              className="rounded-2xl border border-amber-100 bg-white/80 p-3"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                  {finding.label || '未命名'}
                                </span>
                                <span className="break-all text-xs text-slate-500">
                                  {finding.anchor_text || '无 anchor_text'}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                未应用原因：{finding.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 xl:sticky xl:top-4">
                    <div className="rounded-[24px] border border-slate-200 bg-white/85 p-4 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.5)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CheckCheck className="h-4 w-4 text-emerald-700" />
                            <h3 className="text-sm font-semibold text-slate-800">已选结果预览</h3>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            右侧内容只应用当前已勾选的命中项。
                          </p>
                        </div>
                        <button
                          onClick={handleApplySelectedFindings}
                          disabled={!selectedFindings.length}
                          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                        >
                          应用 {selectedFindings.length} 项到输入框
                        </button>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                          <div className="text-xs font-medium text-emerald-700/80">本次将应用</div>
                          <div className="mt-1 text-lg font-semibold text-emerald-800">
                            {selectedFindings.length} 项
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="text-xs font-medium text-slate-500">保持原样</div>
                          <div className="mt-1 text-lg font-semibold text-slate-700">
                            {Math.max(appliedFindings.length - selectedFindings.length, 0)} 项
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-[420px] overflow-auto rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                      {deepFilterPreviewText || inputText || '已选结果预览会显示在这里。'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-[220px] rounded-[24px] border border-dashed border-emerald-200 bg-white/70 p-5 text-sm text-slate-600">
                  <div className="flex items-center gap-2 text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    <span className="font-medium">等待本地 LLM 分析</span>
                  </div>
                  <div className="mt-3 space-y-2 leading-7">
                    <p>1. 点击“运行深度过滤”触发本地模型分析。</p>
                    <p>2. 模型会返回候选敏感项，而不是直接改写整段文本。</p>
                    <p>3. 你可以在结果出来后逐条取消或保留，再决定是否应用。</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            已启用 {Object.values(activeRules).filter(Boolean).length} 条过滤规则
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSaveConfig}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              <Save className="h-4 w-4" />
              <span>保存配置</span>
            </button>
          </div>
        </div>
      </footer>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemRules={systemRules}
        customRules={customRules}
        activeRules={activeRules}
        onToggleRule={handleToggleRule}
        onAddCustomRule={() => setIsCustomRuleFormOpen(true)}
        onEditCustomRule={(rule) => setEditingRule(rule)}
        onDeleteCustomRule={handleDeleteCustomRule}
        llmConfig={llmConfig}
        onChangeLlmConfig={handleUpdateLlmConfig}
      />

      <CustomRuleForm
        isOpen={isCustomRuleFormOpen || !!editingRule}
        onClose={() => {
          setIsCustomRuleFormOpen(false);
          setEditingRule(null);
        }}
        onSubmit={(ruleData) => {
          if (editingRule) {
            handleEditCustomRule(editingRule, ruleData);
          } else {
            handleAddCustomRule(ruleData);
          }
        }}
        initialData={editingRule}
        existingCategories={Array.from(new Set(customRules.map((rule) => rule.category).filter(Boolean)))}
        existingRules={customRules}
      />
    </div>
  );
};

export default TextFilter;
