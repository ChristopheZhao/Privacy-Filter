import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// 规则示例
const RULE_EXAMPLES = {
  identity: {
    label: '身份信息',
    examples: [
      { name: '手机号码', pattern: '\\d{11}', replacement: '[PHONE_NUMBER]' },
      { name: '身份证号', pattern: '[1-9]\\d{5}(?:19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]', replacement: '[ID_CARD]' }
    ]
  },
  social: {
    label: '社交账号',
    examples: [
      { name: '微信号', pattern: '(?:微信|WeChat|wx)(?:号|ID)?[：:]\\s*([a-zA-Z][-_a-zA-Z0-9]{5,19})', replacement: '[WECHAT_ID]' },
      { name: 'QQ号', pattern: '(?:QQ|qq)(?:号)?[：:]\\s*[1-9][0-9]{4,}', replacement: '[QQ_NUMBER]' }
    ]
  },
  system: {
    label: '系统配置',
    examples: [
      { name: 'API密钥', pattern: '(?:API[_\\s]?(?:key|token))[：:]\\s*["\'](\\w+)["\']', replacement: '[CREDENTIALS]' },
      { name: '数据库URL', pattern: '(?:mongodb|mysql|postgresql):\\/\\/[^\\s\\n]+', replacement: '[DATABASE_URL]' }
    ]
  }
};

const CustomRuleForm = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  existingCategories = [],
  existingRules = []
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pattern: '',
    replacement: '',
    category: 'identity'
  });

  const [error, setError] = useState({
    name: '',
    pattern: '',
    replacement: '',
    category: ''
  });

  const [selectedExample, setSelectedExample] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // 合并预设类别和已存在的自定义类别
  const allCategories = [
    ...Object.entries(RULE_EXAMPLES).map(([key, { label }]) => ({ 
      value: key, 
      label, 
      isPreset: true 
    })),
    ...existingCategories.map(category => ({ 
      value: category, 
      label: category, 
      isPreset: false 
    }))
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        pattern: initialData.pattern instanceof RegExp ? initialData.pattern.source : '',
        replacement: initialData.replacement || '',
        category: initialData.category || 'identity'
      });

      const isPresetCategory = Object.keys(RULE_EXAMPLES).includes(initialData.category);
      setIsCustomCategory(!isPresetCategory);
      if (!isPresetCategory) {
        setCustomCategory(initialData.category || '');
      }
    }
  }, [initialData]);

  const handleLoadExample = (example) => {
    setFormData(prev => ({
      ...prev,
      pattern: example.pattern,
      replacement: example.replacement,
      description: `基于"${example.name}"示例修改`,
    }));
    setSelectedExample(example.name);
  };

  const validateForm = () => {
    const newError = {
      name: '',
      pattern: '',
      replacement: '',
      category: ''
    };

    let isValid = true;

    // 验证规则名称
    if (!formData.name.trim()) {
      newError.name = '请输入规则名称';
      isValid = false;
    } else if (formData.name.length > 50) {
      newError.name = '规则名称不能超过50个字符';
      isValid = false;
    } else if (
      existingRules.some(rule => 
        rule.name === formData.name.trim() && 
        (!initialData || initialData.name !== formData.name.trim())
      )
    ) {
      newError.name = '规则名称已存在';
      isValid = false;
    }

    // 验证正则表达式
    if (!formData.pattern.trim()) {
      newError.pattern = '请输入匹配模式';
      isValid = false;
    } else {
      try {
        new RegExp(formData.pattern);
      } catch (e) {
        newError.pattern = '无效的正则表达式';
        isValid = false;
      }
    }

    // 验证替换文本
    if (!formData.replacement.trim()) {
      newError.replacement = '请输入替换文本';
      isValid = false;
    }

    // 验证类别
    if (!isCustomCategory && !formData.category) {
      newError.category = '请选择规则类别';
      isValid = false;
    }

    if (isCustomCategory && !customCategory.trim()) {
      newError.category = '请输入自定义类别名称';
      isValid = false;
    }

    setError(newError);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        const ruleData = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          pattern: new RegExp(formData.pattern, 'g'),
          replacement: formData.replacement.trim(),
          category: isCustomCategory ? customCategory.trim() : formData.category
        };
        onSubmit(ruleData);
        onClose();
      } catch (error) {
        setError(prev => ({
          ...prev,
          pattern: '创建正则表达式时出错'
        }));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {initialData ? '编辑规则' : '创建新规则'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6">
          {/* 左侧：示例面板 */}
          <div className="col-span-1 border-r pr-6">
            <h4 className="font-medium text-gray-700 mb-3">规则示例</h4>
            <div className="space-y-4">
              {Object.entries(RULE_EXAMPLES).map(([category, { label, examples }]) => (
                <div key={category} className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-600">{label}</h5>
                  {examples.map(example => (
                    <button
                      key={example.name}
                      onClick={() => handleLoadExample(example)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedExample === example.name
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {example.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：表单 */}
          <form onSubmit={handleSubmit} className="col-span-2 space-y-4">
            {/* 规则名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                规则名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                  error.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="输入规则名称"
              />
              {error.name && (
                <p className="mt-1 text-sm text-red-500">{error.name}</p>
              )}
            </div>

            {/* 规则分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                规则分类 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(false)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      !isCustomCategory 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}
                  >
                    选择已有类别
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(true)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      isCustomCategory 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}
                  >
                    创建新类别
                  </button>
                </div>

                {isCustomCategory ? (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                      error.category ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="输入新的类别名称"
                  />
                ) : (
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                      error.category ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">请选择类别</option>
                    {allCategories.map(({ value, label, isPreset }) => (
                      <option key={value} value={value}>
                        {label} {!isPreset && '(自定义)'}
                      </option>
                    ))}
                  </select>
                )}
                {error.category && (
                  <p className="mt-1 text-sm text-red-500">{error.category}</p>
                )}
              </div>
            </div>

            {/* 规则描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                规则描述
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500"
                placeholder="输入规则描述（选填）"
              />
            </div>

            {/* 匹配模式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                匹配模式 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pattern}
                onChange={e => setFormData(prev => ({ ...prev, pattern: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                  error.pattern ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="输入正则表达式"
              />
              {error.pattern ? (
                <p className="mt-1 text-sm text-red-500">{error.pattern}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  使用正则表达式定义匹配模式，例如：\d{11} 匹配手机号
                </p>
              )}
            </div>

            {/* 替换文本 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                替换文本 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.replacement}
                onChange={e => setFormData(prev => ({ ...prev, replacement: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                  error.replacement ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="输入替换后的文本"
              />
              {error.replacement && (
                <p className="mt-1 text-sm text-red-500">{error.replacement}</p>
              )}
            </div>

            {/* 按钮组 */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                确定
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomRuleForm;
