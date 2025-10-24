import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, message, Button } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import ProcessList from './pages/process/ProcessList';
import ProcessEdit from './pages/process/ProcessEdit';
import ProcessTest from './pages/process/ProcessTest';
import ReactFlowDemo from './pages/process/ReactFlowDemo';
import BasicProcessDemo from './pages/process/BasicProcessDemo';

// Components
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Styles
import './styles/auth.css';
import './styles/layout.css';
import './App.css';

// Configure message
message.config({
  top: 80,
  duration: 3,
  maxCount: 3,
});

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Main pages */}
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Placeholder pages for future development */}
            <Route 
              path="process" 
              element={
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <h2>流程管理</h2>
                  <p>流程管理功能将在后续版本中实现</p>
                </div>
              } 
            />
            <Route 
              path="tasks" 
              element={
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <h2>我的任务</h2>
                  <p>任务管理功能将在后续版本中实现</p>
                </div>
              } 
            />
            <Route 
              path="profile" 
              element={
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <h2>个人资料</h2>
                  <p>个人资料页面将在后续版本中实现</p>
                </div>
              } 
            />
            
            {/* Process routes */}
            <Route path="process" element={<ProcessList />} />
            <Route path="process/basic" element={<BasicProcessDemo />} />
            <Route path="process/demo" element={<ReactFlowDemo />} />
            <Route path="process/test" element={<ProcessTest />} />
            <Route path="process/create" element={<ProcessEdit />} />
            <Route path="process/:id/edit" element={<ProcessEdit />} />
            <Route path="process/:id/view" element={<ProcessEdit />} />

            {/* Admin routes */}
            <Route 
              path="admin/users" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <div style={{ padding: 24, textAlign: 'center' }}>
                    <h2>用户管理</h2>
                    <p>用户管理功能将在后续版本中实现</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="admin/stats" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <div style={{ padding: 24, textAlign: 'center' }}>
                    <h2>统计分析</h2>
                    <p>统计分析功能将在后续版本中实现</p>
                  </div>
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* 404 fallback */}
          <Route 
            path="*" 
            element={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '100vh',
                flexDirection: 'column',
                gap: 16 
              }}>
                <h1>404 - 页面未找到</h1>
                <p>您访问的页面不存在</p>
                <a href="/">
                  <Button type="primary">返回首页</Button>
                </a>
              </div>
            } 
          />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
