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
  onDeleteCustomRule
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
          {selectedTab === 'system' ? renderSystemRules() : renderCustomRules()}
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