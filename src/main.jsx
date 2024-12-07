import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // 如果没有这个文件也没关系，可以暂时注释掉

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);