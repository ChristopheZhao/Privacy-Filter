import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const RULE_EXAMPLES = {
  identity: {
    label: '身份信息',
    examples: [
      { name: '手机号码', pattern: '1[3-9]\\d{9}', replacement: '[PHONE_NUMBER]' },
      {
        name: '身份证号',
        pattern: '[1-9]\\d{5}(?:19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]',
        replacement: '[ID_CARD]',
      },
    ],
  },
  social: {
    label: '社交账号',
    examples: [
      {
        name: '微信号',
        pattern: '(?:微信|WeChat|wx)(?:号|ID)?[：:]?\\s*([a-zA-Z][-_a-zA-Z0-9]{5,19})',
        replacement: '[WECHAT_ID]',
      },
      {
        name: 'QQ 号',
        pattern: '(?:QQ|qq)(?:号)?[：:]?\\s*[1-9][0-9]{4,}',
        replacement: '[QQ_NUMBER]',
      },
    ],
  },
  system: {
    label: '系统配置',
    examples: [
      {
        name: 'API 密钥',
        pattern: '(?:API[_\\s]?(?:key|token))[：:]?\\s*["\\\'](\\w+)["\\\']',
        replacement: '[CREDENTIALS]',
      },
      {
        name: '数据库 URL',
        pattern: '(?:mongodb|mysql|postgresql):\\/\\/[^\\s\\n]+',
        replacement: '[DATABASE_URL]',
      },
    ],
  },
};

const emptyFormData = {
  name: '',
  description: '',
  pattern: '',
  replacement: '',
  category: 'identity',
};

const emptyErrorState = {
  name: '',
  pattern: '',
  replacement: '',
  category: '',
};

const CustomRuleForm = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  existingCategories = [],
  existingRules = [],
}) => {
  const [formData, setFormData] = useState(emptyFormData);
  const [error, setError] = useState(emptyErrorState);
  const [selectedExample, setSelectedExample] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const allCategories = [
    ...Object.entries(RULE_EXAMPLES).map(([key, { label }]) => ({
      value: key,
      label,
      isPreset: true,
    })),
    ...existingCategories
      .filter(Boolean)
      .filter((category, index, array) => array.indexOf(category) === index)
      .map((category) => ({
        value: category,
        label: category,
        isPreset: false,
      })),
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        pattern: initialData.pattern instanceof RegExp ? initialData.pattern.source : '',
        replacement: initialData.replacement || '',
        category: initialData.category || 'identity',
      });

      const isPresetCategory = Object.keys(RULE_EXAMPLES).includes(initialData.category);
      setIsCustomCategory(!isPresetCategory);
      setCustomCategory(isPresetCategory ? '' : initialData.category || '');
      setSelectedExample(null);
      setError(emptyErrorState);
    } else if (isOpen) {
      setFormData(emptyFormData);
      setError(emptyErrorState);
      setSelectedExample(null);
      setIsCustomCategory(false);
      setCustomCategory('');
    }
  }, [initialData, isOpen]);

  const handleLoadExample = (example) => {
    setFormData((prev) => ({
      ...prev,
      pattern: example.pattern,
      replacement: example.replacement,
      description: `基于“${example.name}”示例修改`,
    }));
    setSelectedExample(example.name);
  };

  const validateForm = () => {
    const nextError = { ...emptyErrorState };
    let isValid = true;

    if (!formData.name.trim()) {
      nextError.name = '请输入规则名称';
      isValid = false;
    } else if (formData.name.trim().length > 50) {
      nextError.name = '规则名称不能超过 50 个字符';
      isValid = false;
    } else if (
      existingRules.some(
        (rule) =>
          rule.name === formData.name.trim() &&
          (!initialData || initialData.name !== formData.name.trim())
      )
    ) {
      nextError.name = '规则名称已存在';
      isValid = false;
    }

    if (!formData.pattern.trim()) {
      nextError.pattern = '请输入匹配模式';
      isValid = false;
    } else {
      try {
        new RegExp(formData.pattern);
      } catch (validationError) {
        nextError.pattern = '无效的正则表达式';
        isValid = false;
      }
    }

    if (!formData.replacement.trim()) {
      nextError.replacement = '请输入替换文本';
      isValid = false;
    }

    if (!isCustomCategory && !formData.category) {
      nextError.category = '请选择规则分类';
      isValid = false;
    }

    if (isCustomCategory && !customCategory.trim()) {
      nextError.category = '请输入自定义分类名称';
      isValid = false;
    }

    setError(nextError);
    return isValid;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        pattern: new RegExp(formData.pattern, 'g'),
        replacement: formData.replacement.trim(),
        category: isCustomCategory ? customCategory.trim() : formData.category,
      });
      onClose();
    } catch (submitError) {
      setError((prev) => ({
        ...prev,
        pattern: '创建正则表达式时出错',
      }));
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
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="关闭"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6">
          <div className="col-span-1 border-r pr-6">
            <h4 className="font-medium text-gray-700 mb-3">规则示例</h4>
            <div className="space-y-4">
              {Object.entries(RULE_EXAMPLES).map(([category, { label, examples }]) => (
                <div key={category} className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-600">{label}</h5>
                  {examples.map((example) => (
                    <button
                      key={example.name}
                      type="button"
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

          <form onSubmit={handleSubmit} className="col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                规则名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                  error.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="输入规则名称"
              />
              {error.name && <p className="mt-1 text-sm text-red-500">{error.name}</p>}
            </div>

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
                    选择已有分类
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
                    创建新分类
                  </button>
                </div>

                {isCustomCategory ? (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(event) => setCustomCategory(event.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                      error.category ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="输入新的分类名称"
                  />
                ) : (
                  <select
                    value={formData.category}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, category: event.target.value }))
                    }
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                      error.category ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">请选择分类</option>
                    {allCategories.map(({ value, label, isPreset }) => (
                      <option key={value} value={value}>
                        {label} {!isPreset && '(自定义)'}
                      </option>
                    ))}
                  </select>
                )}
                {error.category && <p className="mt-1 text-sm text-red-500">{error.category}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">规则描述</label>
              <input
                type="text"
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, description: event.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500"
                placeholder="输入规则描述（选填）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                匹配模式 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pattern}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, pattern: event.target.value }))
                }
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                  error.pattern ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="输入正则表达式"
              />
              {error.pattern ? (
                <p className="mt-1 text-sm text-red-500">{error.pattern}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  使用正则表达式定义匹配模式，例如：`1[3-9]\d{9}` 匹配手机号。
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                替换文本 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.replacement}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, replacement: event.target.value }))
                }
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-1 ${
                  error.replacement
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="输入替换后的文本"
              />
              {error.replacement && (
                <p className="mt-1 text-sm text-red-500">{error.replacement}</p>
              )}
            </div>

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
