// src/components/TextFilter/LLMConfig.jsx
import React, { useState } from 'react';
import { Download, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { llmPrivacyFilter, availableModels } from '../../utils/llmService';

const LLMConfig = ({ 
  isLLMEnabled, 
  onToggleLLM, 
  selectedModel, 
  onModelChange,
  llmStatus,
  onLLMStatusChange,
  processingMode,
  onProcessingModeChange
}) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);

  const handleInitializeModel = async () => {
    if (!selectedModel) return;

    setIsInitializing(true);
    setError(null);

    try {
      const model = availableModels.find(m => m.id === selectedModel);
      await llmPrivacyFilter.initialize(model.modelName);
      
      const status = llmPrivacyFilter.getStatus();
      onLLMStatusChange(status);
    } catch (err) {
      setError(`初始化模型失败: ${err.message}`);
      console.error('Model initialization failed:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const getStatusIcon = () => {
    if (isInitializing || llmStatus.initializing) {
      return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (llmStatus.initialized) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (error) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return <Download className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (isInitializing || llmStatus.initializing) {
      return '正在初始化模型...';
    }
    if (llmStatus.initialized) {
      return '模型已就绪';
    }
    if (error) {
      return '初始化失败';
    }
    return '未初始化';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">AI智能过滤</h3>
          <p className="text-sm text-gray-500">使用本地量化语言模型进行隐私信息检测</p>
        </div>
        <div className="flex items-center">
          <input
            id="llm-enabled"
            type="checkbox"
            checked={isLLMEnabled}
            onChange={(e) => onToggleLLM(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="llm-enabled" className="ml-2 text-sm text-gray-700">
            启用AI过滤
          </label>
        </div>
      </div>

      {isLLMEnabled && (
        <div className="space-y-4 pl-4 border-l-2 border-blue-100">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择模型
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              disabled={llmStatus.initialized}
            >
              <option value="">请选择模型</option>
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.size}
                </option>
              ))}
            </select>
            {selectedModel && (
              <p className="mt-1 text-sm text-gray-500">
                {availableModels.find(m => m.id === selectedModel)?.description}
              </p>
            )}
          </div>

          {/* Model Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm font-medium text-gray-700">
                模型状态: {getStatusText()}
              </span>
            </div>
            
            {selectedModel && !llmStatus.initialized && !isInitializing && (
              <button
                onClick={handleInitializeModel}
                disabled={!selectedModel}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                初始化模型
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Processing Mode */}
          {llmStatus.initialized && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                处理模式
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="processing-mode"
                    value="llm-only"
                    checked={processingMode === 'llm-only'}
                    onChange={(e) => onProcessingModeChange(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">仅使用AI过滤</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="processing-mode"
                    value="hybrid"
                    checked={processingMode === 'hybrid'}
                    onChange={(e) => onProcessingModeChange(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">AI + 规则混合过滤（推荐）</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="processing-mode"
                    value="rules-fallback"
                    checked={processingMode === 'rules-fallback'}
                    onChange={(e) => onProcessingModeChange(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">AI优先，规则兜底</span>
                </label>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-1">关于AI过滤</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 完全本地处理，数据不会上传到任何服务器</li>
              <li>• 首次加载模型需要下载，请确保网络连接稳定</li>
              <li>• 模型会缓存在本地，后续使用更快</li>
              <li>• AI过滤可以理解上下文，提供更智能的隐私保护</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMConfig;