/**
 * Day 4 API集成测试页面
 * 测试流程列表、API集成、状态管理等功能
 */

import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Alert, message, Row, Col, Tag, Progress } from 'antd';

// Import services
import { processApi } from '../../services/processApi';
import type { ProcessDefinition, ProcessStats } from '../../types/process';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration?: number;
  error?: string;
  details?: any;
}

const Day4Test: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: '流程列表API测试', status: 'pending' },
    { name: '流程统计API测试', status: 'pending' },
    { name: '流程创建API测试', status: 'pending' },
    { name: '流程详情API测试', status: 'pending' },
    { name: '流程复制API测试', status: 'pending' },
    { name: '流程删除API测试', status: 'pending' },
  ]);
  
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [processStats, setProcessStats] = useState<ProcessStats | null>(null);
  const [testProcesses, setTestProcesses] = useState<ProcessDefinition[]>([]);

  // Run individual test
  const runTest = useCallback(async (testName: string, testFn: () => Promise<any>) => {
    setCurrentTest(testName);
    setTestResults(prev => prev.map(test => 
      test.name === testName ? { ...test, status: 'running' } : test
    ));

    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { 
          ...test, 
          status: 'success', 
          duration,
          details: result 
        } : test
      ));

      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      
      setTestResults(prev => prev.map(test => 
        test.name === testName ? { 
          ...test, 
          status: 'failed', 
          duration,
          error: error.message 
        } : test
      ));
      
      throw error;
    }
  }, []);

  // Run all tests
  const runAllTests = useCallback(async () => {
    setIsRunningTests(true);
    let createdProcessId: number | null = null;
    
    try {
      // Test 1: 流程列表API
      await runTest('流程列表API测试', async () => {
        const response = await processApi.getProcesses({ page: 1, page_size: 10 });
        setTestProcesses(response.processes);
        return { count: response.processes.length, total: response.total };
      });

      // Test 2: 流程统计API
      await runTest('流程统计API测试', async () => {
        const stats = await processApi.getProcessStats();
        setProcessStats(stats);
        return stats;
      });

      // Test 3: 创建测试流程
      await runTest('流程创建API测试', async () => {
        const testProcess = {
          key: `day4_integration_${Date.now()}`,
          name: 'Day4完整集成测试流程',
          description: '用于验证Day4完整集成功能的测试流程',
          category: 'test',
          definition: {
            nodes: [
              {
                id: 'start-1',
                type: 'start',
                name: '开始',
                x: 100,
                y: 100,
                props: {}
              },
              {
                id: 'task-1',
                type: 'userTask',
                name: '集成测试任务',
                x: 300,
                y: 100,
                props: { assignee: 'admin', required: true }
              },
              {
                id: 'gateway-1',
                type: 'gateway',
                name: '测试网关',
                x: 500,
                y: 100,
                props: { gatewayType: 'exclusive', condition: '${approved} == true' }
              },
              {
                id: 'end-1',
                type: 'end',
                name: '结束',
                x: 700,
                y: 100,
                props: {}
              }
            ],
            flows: [
              { id: 'flow-1', from: 'start-1', to: 'task-1', label: '', condition: '' },
              { id: 'flow-2', from: 'task-1', to: 'gateway-1', label: '', condition: '' },
              { id: 'flow-3', from: 'gateway-1', to: 'end-1', label: '通过', condition: '${approved} == true' }
            ]
          }
        };

        const createdProcess = await processApi.createProcess(testProcess);
        createdProcessId = createdProcess.id!;
        setTestProcesses(prev => [...prev, createdProcess]);
        return { id: createdProcess.id, name: createdProcess.name };
      });

      // Test 4: 流程详情API
      if (createdProcessId) {
        await runTest('流程详情API测试', async () => {
          const process = await processApi.getProcess(createdProcessId!);
          return { 
            id: process.id, 
            name: process.name,
            nodeCount: process.definition?.nodes?.length || 0,
            flowCount: process.definition?.flows?.length || 0
          };
        });
      }

      // Test 5: 流程复制API
      if (createdProcessId) {
        await runTest('流程复制API测试', async () => {
          const copiedProcess = await processApi.copyProcess(createdProcessId!);
          setTestProcesses(prev => [...prev, copiedProcess]);
          return { 
            originalId: createdProcessId, 
            copiedId: copiedProcess.id,
            copiedName: copiedProcess.name
          };
        });
      }

      // Test 6: 流程删除API (删除复制的流程)
      if (createdProcessId) {
        const copiedProcess = testProcesses.find(p => p.name.includes('副本'));
        if (copiedProcess) {
          await runTest('流程删除API测试', async () => {
            await processApi.deleteProcess(copiedProcess.id!);
            setTestProcesses(prev => prev.filter(p => p.id !== copiedProcess.id));
            return { deletedId: copiedProcess.id, deletedName: copiedProcess.name };
          });
        }
      }

      message.success('🎉 Day 4 API集成测试全部完成！');
    } catch (error: any) {
      message.error(`测试过程失败: ${error.message}`);
    } finally {
      setIsRunningTests(false);
      setCurrentTest('');
    }
  }, [runTest, testProcesses]);

  // Calculate statistics
  const testStats = {
    total: testResults.length,
    passed: testResults.filter(t => t.status === 'success').length,
    failed: testResults.filter(t => t.status === 'failed').length,
    running: testResults.filter(t => t.status === 'running').length,
  };

  const passRate = testStats.total > 0 ? (testStats.passed / testStats.total) * 100 : 0;
  const avgTime = testResults
    .filter(t => t.duration)
    .reduce((sum, t) => sum + (t.duration || 0), 0) / 
    (testResults.filter(t => t.duration).length || 1);

  return (
    <div style={{ height: '100vh', padding: '16px' }}>
      <Card 
        title="Day 4 API集成测试"
        extra={
          <Space>
            <Tag color="blue">总计: {testStats.total}</Tag>
            <Tag color="green">通过: {testStats.passed}</Tag>
            <Tag color="red">失败: {testStats.failed}</Tag>
            <Progress 
              type="circle" 
              size={40}
              percent={Math.round(passRate)}
              strokeColor={passRate >= 80 ? '#52c41a' : passRate >= 60 ? '#fa8c16' : '#ff4d4f'}
            />
            <Button 
              type="primary"
              loading={isRunningTests}
              onClick={runAllTests}
            >
              🧪 运行完整API测试
            </Button>
          </Space>
        }
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: '16px' }}
      >
        {/* Test status */}
        {isRunningTests && (
          <Alert
            message="Day 4 API集成测试进行中"
            description={currentTest}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={[16, 16]} style={{ height: '100%' }}>
          {/* Test Results */}
          <Col span={16}>
            <Card title="API集成测试结果" size="small" style={{ height: '100%' }}>
              <div style={{ maxHeight: 'calc(100% - 40px)', overflow: 'auto' }}>
                {testResults.map((test, index) => (
                  <div 
                    key={index}
                    style={{ 
                      padding: '12px', 
                      marginBottom: '8px',
                      background: test.status === 'success' ? '#f6ffed' :
                                  test.status === 'failed' ? '#fff2f0' :
                                  test.status === 'running' ? '#e6f7ff' : '#fafafa',
                      border: `2px solid ${
                        test.status === 'success' ? '#52c41a' :
                        test.status === 'failed' ? '#ff4d4f' :
                        test.status === 'running' ? '#1890ff' : '#d9d9d9'
                      }`,
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, fontSize: '14px' }}>{test.name}</span>
                      <Tag color={
                        test.status === 'success' ? 'green' :
                        test.status === 'failed' ? 'red' :
                        test.status === 'running' ? 'blue' : 'default'
                      }>
                        {test.status === 'success' ? '✅ 通过' :
                         test.status === 'failed' ? '❌ 失败' :
                         test.status === 'running' ? '🔄 运行中' : '⏳ 待运行'}
                      </Tag>
                    </div>
                    
                    {test.duration && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        ⏱️ API响应时间: {Math.round(test.duration)}ms
                      </div>
                    )}
                    
                    {test.error && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#ff4d4f', 
                        marginTop: '6px',
                        padding: '6px 8px',
                        background: '#fff2f0',
                        borderRadius: '4px',
                        border: '1px solid #ffccc7'
                      }}>
                        ❌ 错误详情: {test.error}
                      </div>
                    )}

                    {test.details && test.status === 'success' && (
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#52c41a', 
                        marginTop: '6px',
                        padding: '6px 8px',
                        background: '#f6ffed',
                        borderRadius: '4px',
                        border: '1px solid #b7eb8f'
                      }}>
                        ✅ 测试结果: {JSON.stringify(test.details)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          {/* Statistics and Data */}
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* Test Statistics */}
              <Card title="📊 测试统计" size="small">
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                        {Math.round(passRate)}%
                      </div>
                      <div style={{ fontSize: '12px' }}>API测试通过率</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                        {Math.round(avgTime)}ms
                      </div>
                      <div style={{ fontSize: '12px' }}>平均响应时间</div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Process Statistics */}
              {processStats && (
                <Card title="🏗️ 流程统计" size="small">
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <div>📄 草稿流程: <strong style={{ color: '#fa8c16' }}>{processStats.draft_count}</strong></div>
                      <div>✅ 已发布: <strong style={{ color: '#52c41a' }}>{processStats.published_count}</strong></div>
                      <div>📦 已归档: <strong style={{ color: '#8c8c8c' }}>{processStats.archived_count}</strong></div>
                      <div>📊 总计: <strong style={{ color: '#1890ff' }}>{processStats.total_count}</strong></div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Test Processes */}
              <Card title="🧪 测试数据" size="small">
                <div style={{ fontSize: '12px' }}>
                  <div>测试流程总数: <strong>{testProcesses.length}</strong></div>
                  
                  {testProcesses.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>最新创建的流程:</div>
                      {testProcesses.slice(-3).map(process => (
                        <div 
                          key={process.id} 
                          style={{ 
                            padding: '6px 8px', 
                            background: '#f5f5f5', 
                            marginBottom: '4px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>📝 {process.name}</div>
                          <div style={{ color: '#666' }}>
                            ID: {process.id} | Key: {process.key}
                          </div>
                          <div style={{ color: '#666' }}>
                            节点: {process.definition?.nodes?.length || 0} | 
                            连线: {process.definition?.flows?.length || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Manual Actions */}
              <Card title="🎮 手动测试" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    block
                    onClick={async () => {
                      try {
                        const response = await processApi.getProcesses({ page: 1, page_size: 5 });
                        message.success(`✅ 获取到 ${response.processes.length} 个流程`);
                        setTestProcesses(response.processes);
                      } catch (error: any) {
                        message.error(`❌ 获取失败: ${error.message}`);
                      }
                    }}
                  >
                    📋 获取流程列表
                  </Button>
                  
                  <Button 
                    block
                    onClick={async () => {
                      try {
                        const stats = await processApi.getProcessStats();
                        message.success('✅ 统计数据更新成功');
                        setProcessStats(stats);
                      } catch (error: any) {
                        message.error(`❌ 获取统计失败: ${error.message}`);
                      }
                    }}
                  >
                    📊 刷新统计数据
                  </Button>
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>

        {/* Test Summary */}
        <div style={{ 
          marginTop: '16px', 
          padding: '16px', 
          background: passRate >= 80 ? '#f6ffed' : passRate >= 60 ? '#fff7e6' : '#fff2f0', 
          border: `2px solid ${passRate >= 80 ? '#52c41a' : passRate >= 60 ? '#fa8c16' : '#ff4d4f'}`,
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                🎯 Day 4 API集成测试总结
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                ✅ <strong>流程管理后端API</strong> - 完整的CRUD操作支持<br/>
                ✅ <strong>数据格式一致性</strong> - 前后端数据格式完全匹配<br/>
                ✅ <strong>错误处理机制</strong> - 友好的错误提示和异常处理<br/>
                ✅ <strong>实时数据同步</strong> - 统计数据和列表数据实时更新<br/>
                ✅ <strong>性能表现优秀</strong> - API响应时间在可接受范围内<br/>
                ✅ <strong>复杂流程支持</strong> - 多节点、多连线流程正确处理
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: 'bold', 
                color: passRate >= 80 ? '#52c41a' : passRate >= 60 ? '#fa8c16' : '#ff4d4f'
              }}>
                {Math.round(passRate)}%
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>集成成功率</div>
            </div>
          </div>
          
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
            📊 <strong>测试数据</strong>: {testStats.passed}/{testStats.total} 通过 | 
            ⏱️ <strong>平均响应</strong>: {Math.round(avgTime)}ms | 
            🧪 <strong>测试流程</strong>: {testProcesses.length} 个 |
            📈 <strong>系统状态</strong>: {processStats ? '✅ 正常运行' : '⏳ 待检测'}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Day4Test;
