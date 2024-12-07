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

  // 文本过滤处理
  const handleTextChange = useCallback((text) => {
    setInputText(text);
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
  }, [systemRules, customRules, activeRules]);

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
          <div className="text-sm text-gray-600">
            已启用 {Object.values(activeRules).filter(Boolean).length} 个过滤规则
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