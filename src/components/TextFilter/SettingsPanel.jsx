import React, { useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';

const SettingsPanel = ({
  isOpen,
  onClose,
  systemRules,
  customRules,
  activeRules,
  onToggleRule,
  onAddCustomRule,
  onEditCustomRule,
  onDeleteCustomRule,
  llmConfig,
  onChangeLlmConfig,
}) => {
  const [selectedTab, setSelectedTab] = useState('system');

  if (!isOpen) return null;

  const groupRulesByCategory = () =>
    customRules.reduce((acc, rule) => {
      const category = rule.category || '未分类';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(rule);
      return acc;
    }, {});

  const renderSystemRules = () => (
    <div className="space-y-4">
      {Object.entries(systemRules).map(([key, rule]) => (
        <div
          key={key}
          className="flex items-start space-x-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-4"
        >
          <div className="flex items-center h-6">
            <input
              type="checkbox"
              id={key}
              checked={activeRules[key] || false}
              onChange={(event) => onToggleRule(key, event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor={key} className="cursor-pointer font-medium text-slate-700">
              {rule.description}
            </label>
            <p className="mt-1 text-sm text-slate-500">
              替换为 {typeof rule.replacement === 'string' ? rule.replacement : '按规则动态替换'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCustomRules = () => {
    const groupedRules = groupRulesByCategory();

    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => onAddCustomRule()}
            className="flex items-center space-x-1 rounded-xl bg-sky-600 px-3 py-2 text-sm text-white transition-colors hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" />
            <span>添加规则</span>
          </button>
        </div>

        {Object.entries(groupedRules).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无自定义规则</p>
            <p className="text-sm text-gray-400 mt-1">点击上方按钮添加新规则</p>
          </div>
        ) : (
          Object.entries(groupedRules).map(([category, rules]) => (
            <div key={category} className="space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">{category}</h3>
              {rules.map((rule) => (
                <div
                  key={rule.name}
                  className="flex items-start space-x-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-4"
                >
                  <div className="flex items-center h-6">
                    <input
                      type="checkbox"
                      id={rule.name}
                      checked={activeRules[rule.name] || false}
                      onChange={(event) => onToggleRule(rule.name, event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <label htmlFor={rule.name} className="cursor-pointer font-medium text-slate-700">
                          {rule.name}
                        </label>
                        {rule.description && (
                          <p className="mt-1 text-sm text-slate-500">{rule.description}</p>
                        )}
                        <p className="mt-1 text-sm text-slate-500">替换为 {rule.replacement}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onEditCustomRule(rule)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑规则"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteCustomRule(rule.name)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除规则"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderLlmSettings = () => (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,0.92))] p-4">
        <h3 className="text-sm font-semibold text-emerald-900">深度过滤使用本地 LLM</h3>
        <p className="mt-1 text-sm text-emerald-800">
          深度过滤会通过本地模型服务识别上下文中的隐私信息，不会把文本上传到云端。
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
        <div>
          <p className="font-medium text-gray-800">启用本地 LLM 深度过滤</p>
          <p className="text-sm text-gray-500 mt-1">
            关闭后仍可使用规则快速预览，但不会调用本地模型做语义识别。
          </p>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={llmConfig.enabled}
            onChange={(event) => onChangeLlmConfig({ enabled: event.target.checked })}
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-500 relative transition-colors">
            <div className="absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <input
            type="text"
            value={llmConfig.provider}
            onChange={(event) => onChangeLlmConfig({ provider: event.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 shadow-sm focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
          <input
            type="text"
            value={llmConfig.model}
            onChange={(event) => onChangeLlmConfig({ model: event.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 shadow-sm focus:ring-1 focus:ring-sky-500"
            placeholder="例如 qwen3.5:4b"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">本地服务地址</label>
          <input
            type="text"
            value={llmConfig.base_url}
            onChange={(event) => onChangeLlmConfig({ base_url: event.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 shadow-sm focus:ring-1 focus:ring-sky-500"
            placeholder="http://127.0.0.1:11434"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">超时（毫秒）</label>
          <input
            type="number"
            min="1000"
            step="1000"
            value={llmConfig.timeout_ms}
            onChange={(event) =>
              onChangeLlmConfig({ timeout_ms: Number(event.target.value) || 1000 })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 shadow-sm focus:ring-1 focus:ring-sky-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Confidence threshold: keep `0` for the benchmark-backed default behavior.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">置信度阈值</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={llmConfig.confidence_threshold}
            onChange={(event) =>
              onChangeLlmConfig({
                confidence_threshold: Math.min(1, Math.max(0, Number(event.target.value) || 0)),
              })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 shadow-sm focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">分块大小</label>
          <input
            type="number"
            min="256"
            step="128"
            value={llmConfig.max_chunk_chars}
            onChange={(event) =>
              onChangeLlmConfig({ max_chunk_chars: Number(event.target.value) || 256 })
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 shadow-sm focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">启用思考模式</p>
            <p className="text-xs text-gray-500 mt-1">通常会更慢，默认关闭更适合结构化抽取。</p>
          </div>
          <input
            type="checkbox"
            checked={llmConfig.think}
            onChange={(event) => onChangeLlmConfig({ think: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-[32px] border border-white/70 bg-white/92 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">规则设置</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="关闭"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 pt-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedTab('system')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedTab === 'system'
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              系统规则
            </button>
            <button
              onClick={() => setSelectedTab('custom')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedTab === 'custom'
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              自定义规则
            </button>
            <button
              onClick={() => setSelectedTab('llm')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedTab === 'llm'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              本地 LLM
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {selectedTab === 'system' && renderSystemRules()}
          {selectedTab === 'custom' && renderCustomRules()}
          {selectedTab === 'llm' && renderLlmSettings()}
        </div>

        <div className="border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
