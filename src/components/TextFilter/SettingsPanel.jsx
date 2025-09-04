import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';

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
  filteringMode,
  onFilteringModeChange,
  selectedModel,
  onModelChange
}) => {
  const [selectedTab, setSelectedTab] = useState('system');

  if (!isOpen) return null;

  // 获取所有自定义规则的类别
  const getCustomCategories = () => {
    const categories = new Set(customRules.map(rule => rule.category));
    return Array.from(categories);
  };

  // 根据类别对规则进行分组
  const groupRulesByCategory = () => {
    return customRules.reduce((acc, rule) => {
      const category = rule.category || '未分类';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(rule);
      return acc;
    }, {});
  };

  // 推荐的LLM模型
  const recommendedModels = [
    {
      id: 'qwen2.5-0.5b',
      name: 'Qwen2.5-0.5B-Instruct',
      size: '~500MB (quantized)',
      description: '卓越的中英文支持，能够直接理解上下文并生成遮罩文本',
      features: ['中英文双语支持', '上下文理解', '直接生成遮罩文本', '检测隐式PII'],
      recommended: true
    },
    {
      id: 'phi-3.5-mini',
      name: 'Phi-3.5-mini-instruct',
      size: '~1.2GB (quantized)',
      description: '优秀的推理能力，适合处理复杂PII模式',
      features: ['复杂模式推理', '可解释PII检测', '多语言支持', '自定义规则理解'],
      recommended: false
    },
    {
      id: 'gemma-2b',
      name: 'Gemma-2B-it',
      size: '~1GB (quantized)',
      description: '平衡的性能和大小，良好的指令遵循能力',
      features: ['平衡性能', '指令遵循', '自定义规则支持', '稳定输出'],
      recommended: false
    }
  ];

  const renderSystemRules = () => (
    <div className="space-y-4">
      {Object.entries(systemRules).map(([key, rule]) => (
        <div key={key} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center h-6">
            <input
              type="checkbox"
              id={key}
              checked={activeRules[key] || false}
              onChange={(e) => onToggleRule(key, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor={key} className="font-medium text-gray-700 cursor-pointer">
              {rule.description}
            </label>
            <p className="text-sm text-gray-500 mt-1">
              替换为: {typeof rule.replacement === 'string' ? rule.replacement : '自定义替换规则'}
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
            className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
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
                <div key={rule.name} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center h-6">
                    <input
                      type="checkbox"
                      id={rule.name}
                      checked={activeRules[rule.name] || false}
                      onChange={(e) => onToggleRule(rule.name, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <label htmlFor={rule.name} className="font-medium text-gray-700 cursor-pointer">
                          {rule.name}
                        </label>
                        {rule.description && (
                          <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          替换为: {rule.replacement}
                        </p>
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

  // 渲染模型选择界面
  const renderModelSelection = () => (
    <div className="space-y-6">
      {/* 过滤模式选择 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">过滤模式</h3>
        <div className="space-y-3">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="radio"
              name="filteringMode"
              value="regex"
              checked={filteringMode === 'regex'}
              onChange={(e) => onFilteringModeChange(e.target.value)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-700">正则表达式模式</div>
              <div className="text-sm text-gray-500">使用预定义的正则表达式规则进行快速过滤</div>
              <div className="text-xs text-green-600 mt-1">✓ 超快处理 ✓ 低资源占用 ✓ 离线工作</div>
            </div>
          </label>
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="radio"
              name="filteringMode"
              value="llm"
              checked={filteringMode === 'llm'}
              onChange={(e) => onFilteringModeChange(e.target.value)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-gray-700">智能LLM模式</div>
              <div className="text-sm text-gray-500">使用小型语言模型进行上下文感知的隐私过滤</div>
              <div className="text-xs text-blue-600 mt-1">✓ 上下文理解 ✓ 隐式PII检测 ✓ 更准确识别</div>
            </div>
          </label>
        </div>
      </div>

      {/* LLM模型选择 */}
      {filteringMode === 'llm' && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">选择LLM模型</h3>
          <div className="space-y-4">
            {recommendedModels.map((model) => (
              <label key={model.id} className="flex items-start space-x-3 cursor-pointer border rounded-lg p-3 hover:bg-gray-50">
                <input
                  type="radio"
                  name="selectedModel"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="font-medium text-gray-900">{model.name}</div>
                    {model.recommended && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">推荐</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{model.description}</div>
                  <div className="text-xs text-gray-500 mt-1">大小: {model.size}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {model.features.map((feature, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>为什么选择LLM而不是BERT？</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• <strong>上下文理解</strong>: 理解"我老板小王打电话"包含PII，BERT可能遗漏</li>
                <li>• <strong>直接生成</strong>: 可直接输出过滤后的文本，而非仅标记实体</li>
                <li>• <strong>更灵活</strong>: 可通过提示词设置不同隐私级别或自定义规则</li>
                <li>• <strong>中文支持</strong>: 像Qwen这样的模型对中文姓名/地址处理更自然</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">规则设置</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 标签页切换 */}
        <div className="px-6 pt-4 border-b">
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedTab('models')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'models'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              模型选择
            </button>
            <button
              onClick={() => setSelectedTab('system')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'system'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              系统规则
            </button>
            <button
              onClick={() => setSelectedTab('custom')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'custom'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              自定义规则
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          {selectedTab === 'models' && renderModelSelection()}
          {selectedTab === 'system' && renderSystemRules()}
          {selectedTab === 'custom' && renderCustomRules()}
        </div>

        {/* 底部按钮 */}
        <div className="border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;