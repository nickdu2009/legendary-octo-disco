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
import ProductionProcessEditor from './pages/process/ProductionProcessEditor';
import EnhancedProcessList from './pages/process/EnhancedProcessList';

// Task management pages (新增)
import TaskWorkspace from './pages/tasks/TaskWorkspace';
import ProcessMonitor from './pages/process/ProcessMonitor';

// Development and testing pages
import ReactFlowDemo from './pages/dev/ReactFlowDemo';
import BasicProcessDemo from './pages/dev/BasicProcessDemo';
import EnhancedProcessDemo from './pages/dev/EnhancedProcessDemo';
import Day3FeatureTest from './pages/dev/Day3FeatureTest';
import Day3IntegrationTest from './pages/dev/Day3IntegrationTest';
import Day4Test from './pages/dev/Day4Test';
import SystemIntegrationTest from './pages/system/SystemIntegrationTest';
import PerformanceMonitor from './pages/system/PerformanceMonitor';
import EndToEndTest from './pages/system/EndToEndTest';

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
            
            {/* Task management routes (新增) */}
            <Route path="tasks" element={<TaskWorkspace />} />
            <Route path="tasks/workspace" element={<TaskWorkspace />} />
            <Route 
              path="profile" 
              element={
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <h2>个人资料</h2>
                  <p>个人资料页面将在后续版本中实现</p>
                </div>
              } 
            />
            
            {/* Business process routes */}
            <Route path="process" element={<EnhancedProcessList />} />
            <Route path="process/create" element={<ProductionProcessEditor />} />
            <Route path="process/:id/edit" element={<ProductionProcessEditor />} />
            <Route path="process/:id/view" element={<ProductionProcessEditor />} />
            <Route path="process/production" element={<ProductionProcessEditor />} />
            <Route path="process/test" element={<ProcessTest />} />
            
            {/* Process monitoring routes (新增) */}
            <Route path="process/monitor" element={<ProcessMonitor />} />
            <Route path="process/instances" element={<ProcessMonitor />} />

            {/* Development and demo routes */}
            <Route path="dev/basic" element={<BasicProcessDemo />} />
            <Route path="dev/enhanced" element={<EnhancedProcessDemo />} />
            <Route path="dev/demo" element={<ReactFlowDemo />} />
            <Route path="dev/day3" element={<Day3FeatureTest />} />
            <Route path="dev/day3-integration" element={<Day3IntegrationTest />} />
            <Route path="dev/day4" element={<Day4Test />} />

            {/* System testing and monitoring routes */}
            <Route path="system/integration" element={<SystemIntegrationTest />} />
            <Route path="system/performance" element={<PerformanceMonitor />} />
            <Route path="system/e2e" element={<EndToEndTest />} />

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
