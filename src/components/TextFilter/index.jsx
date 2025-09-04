import React, { useState, useCallback } from 'react';
import { Copy, Save, Settings } from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import CustomRuleForm from './CustomRuleForm';
import { systemRules, ruleOrder, defaultActiveRules } from './privacyRules';

const TextFilter = () => {
  // 核心状态
  const [inputText, setInputText] = useState('');
  const [filteredText, setFilteredText] = useState('');
  
  // 面板显示状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomRuleFormOpen, setIsCustomRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // 规则状态
  const [customRules, setCustomRules] = useState([]);
  const [activeRules, setActiveRules] = useState(defaultActiveRules);

  // 模型和过滤模式状态
  const [filteringMode, setFilteringMode] = useState('regex'); // 'regex' 或 'llm'
  const [selectedModel, setSelectedModel] = useState('qwen2.5-0.5b');

  // 文本过滤处理
  const handleTextChange = useCallback((text) => {
    setInputText(text);
    
    if (filteringMode === 'regex') {
      // 使用正则表达式模式
      let processed = text;
      
      // 首先处理系统规则
      ruleOrder.forEach(ruleKey => {
        if (activeRules[ruleKey] && systemRules[ruleKey]) {
          processed = processed.replace(systemRules[ruleKey].pattern, systemRules[ruleKey].replacement);
        }
      });
      
      // 然后处理自定义规则
      customRules.forEach(rule => {
        if (activeRules[rule.name]) {
          processed = processed.replace(rule.pattern, rule.replacement);
        }
      });
      
      setFilteredText(processed);
    } else if (filteringMode === 'llm') {
      // 使用LLM模式 - 目前是模拟实现
      // 在实际实现中，这里会调用选定的LLM模型进行处理
      const processWithLLM = async (inputText) => {
        // 模拟LLM处理延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 模拟LLM更智能的处理结果
        let processed = inputText;
        
        // 模拟上下文感知的替换 - 实际会由LLM模型处理
        processed = processed.replace(/我的名字是[\u4e00-\u9fa5]{2,4}/g, '我的名字是[NAME]');
        processed = processed.replace(/我住在[\u4e00-\u9fa5\d]{5,}/g, '我住在[ADDRESS]');
        processed = processed.replace(/我老板[\u4e00-\u9fa5]{2,4}/g, '我老板[NAME]');
        processed = processed.replace(/[1-9]\d{10}/g, '[PHONE_NUMBER]');
        processed = processed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
        
        return processed;
      };
      
      // 设置处理中状态
      setFilteredText('正在使用 ' + getModelDisplayName(selectedModel) + ' 处理中...');
      
      processWithLLM(text).then(result => {
        setFilteredText(result);
      }).catch(error => {
        setFilteredText('处理失败: ' + error.message);
      });
    }
  }, [systemRules, customRules, activeRules, filteringMode, selectedModel]);

  // 获取模型显示名称
  const getModelDisplayName = (modelId) => {
    const modelNames = {
      'qwen2.5-0.5b': 'Qwen2.5-0.5B-Instruct',
      'phi-3.5-mini': 'Phi-3.5-mini-instruct', 
      'gemma-2b': 'Gemma-2B-it'
    };
    return modelNames[modelId] || modelId;
  };

  // 规则管理处理函数
  const handleToggleRule = (ruleKey, isEnabled) => {
    setActiveRules(prev => ({
      ...prev,
      [ruleKey]: isEnabled
    }));
  };

  // 添加自定义规则
  const handleAddCustomRule = (ruleData) => {
    // 检查规则名称是否重复
    if (customRules.some(rule => rule.name === ruleData.name)) {
      // 可以添加一个提示
      console.error('规则名称已存在');
      return;
    }

    setCustomRules(prev => [...prev, {
      ...ruleData,
      // 确保自定义类别存在
      category: ruleData.category || '未分类'
    }]);
    setActiveRules(prev => ({
      ...prev,
      [ruleData.name]: true
    }));
    setIsCustomRuleFormOpen(false);
  };

  const handleEditCustomRule = (oldRule, newRule) => {
    // 如果改变了规则名称，确保新名称不会与其他规则冲突
    if (oldRule.name !== newRule.name && 
        customRules.some(rule => rule.name === newRule.name)) {
      console.error('规则名称已存在');
      return;
    }

    setCustomRules(prev => 
      prev.map(rule => rule.name === oldRule.name ? {
        ...newRule,
        category: newRule.category || '未分类'
      } : rule)
    );
    
    if (oldRule.name !== newRule.name) {
      setActiveRules(prev => {
        const { [oldRule.name]: _, ...rest } = prev;
        return {
          ...rest,
          [newRule.name]: true
        };
      });
    }
    setEditingRule(null);
  };

  const handleDeleteCustomRule = (ruleName) => {
    setCustomRules(prev => prev.filter(rule => rule.name !== ruleName));
    setActiveRules(prev => {
      const { [ruleName]: _, ...rest } = prev;
      return rest;
    });
  };

  // 复制功能
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(filteredText);
      // TODO: 添加复制成功的提示
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 处理过滤模式变化
  const handleFilteringModeChange = (mode) => {
    setFilteringMode(mode);
    // 重新处理当前文本
    if (inputText) {
      handleTextChange(inputText);
    }
  };

  // 处理模型选择变化
  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    // 如果当前是LLM模式，重新处理文本
    if (filteringMode === 'llm' && inputText) {
      handleTextChange(inputText);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">隐私信息过滤器</h1>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 gap-6 h-full">
          <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">
              输入原始文本
            </label>
            <textarea
              className="flex-1 p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="在此输入需要过滤的文本..."
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                过滤后文本
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>复制</span>
              </button>
            </div>
            <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-md overflow-auto whitespace-pre-wrap">
              {filteredText || '过滤后的文本将显示在这里...'}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white shadow-sm px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm text-gray-600 flex items-center space-x-4">
            <span>
              已启用 {Object.values(activeRules).filter(Boolean).length} 个过滤规则
            </span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              filteringMode === 'regex' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {filteringMode === 'regex' ? '正则模式' : `LLM模式 (${getModelDisplayName(selectedModel)})`}
            </span>
          </div>
          <button className="flex items-center space-x-1 px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">
            <Save className="w-4 h-4" />
            <span>保存配置</span>
          </button>
        </div>
      </footer>

      {/* 设置面板 */}
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
        filteringMode={filteringMode}
        onFilteringModeChange={handleFilteringModeChange}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />

      {/* 自定义规则表单 */}
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
      />
    </div>
  );
};

export default TextFilter;