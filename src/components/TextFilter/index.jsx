import React, { useEffect, useState } from 'react';
import { Copy, Save, Settings } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import SettingsPanel from './SettingsPanel';
import CustomRuleForm from './CustomRuleForm';
import { defaultActiveRules, ruleOrder, systemRules } from './privacyRules';

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

const serializeCustomRule = (rule) => ({
  ...rule,
  pattern: rule.pattern instanceof RegExp ? rule.pattern.source : String(rule.pattern || ''),
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
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    setFilteredText(applyRules(inputText, activeRules, customRules));
  }, [inputText, activeRules, customRules]);

  const handleSaveConfig = async () => {
    try {
      await invoke('save_config', {
        config: {
          custom_rules: customRules.map(serializeCustomRule),
          active_rules: activeRules,
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(filteredText);
    } catch (error) {
      console.error('复制失败:', error);
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
            title="规则设置"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 gap-6 h-full">
          <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">输入原始文本</label>
            <textarea
              className="flex-1 p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="在这里输入需要过滤的文本..."
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">过滤后文本</label>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>复制</span>
              </button>
            </div>
            <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-md overflow-auto whitespace-pre-wrap">
              {filteredText || '过滤后的文本会显示在这里...'}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white shadow-sm px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm text-gray-600">
            已启用 {Object.values(activeRules).filter(Boolean).length} 条过滤规则
          </div>
          <button
            onClick={handleSaveConfig}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>保存配置</span>
          </button>
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
