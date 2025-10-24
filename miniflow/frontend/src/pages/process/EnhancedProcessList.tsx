/**
 * 增强的流程列表页面
 * 完整的API集成、实时数据、高级搜索筛选
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Dropdown, 
  Input, 
  Select,
  Modal,
  message,
  Row,
  Col,
  Tooltip,
  Statistic,
  Alert,
  Checkbox,
  Progress,
  Badge,
  DatePicker,
  Drawer,
  Form,
  Divider,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CopyOutlined,
  EyeOutlined,
  SearchOutlined,
  ExportOutlined,
  ImportOutlined,
  ReloadOutlined,
  SettingOutlined,
  FilterOutlined,
  MoreOutlined,
  CloudSyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

// Import services
import { processApi } from '../../services/processApi';
import processService from '../../services/processService';

// Import types
import type { ProcessDefinition, ProcessStats } from '../../types/process';
import { formatRelativeTime } from '../../utils/formatters';

interface EnhancedProcessListProps {
  embedded?: boolean; // 是否作为嵌入组件使用
  height?: string;
  showHeader?: boolean;
  defaultFilters?: {
    category?: string;
    status?: string;
    creator?: string;
  };
}

const EnhancedProcessList: React.FC<EnhancedProcessListProps> = ({
  embedded = false,
  height = '100%',
  showHeader = true,
  defaultFilters = {}
}) => {
  const navigate = useNavigate();
  
  // State management
  const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
  const [stats, setStats] = useState<ProcessStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Filter and search state
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(defaultFilters.category || 'all');
  const [statusFilter, setStatusFilter] = useState(defaultFilters.status || 'all');
  const [creatorFilter, setCreatorFilter] = useState(defaultFilters.creator || 'all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  
  // UI state
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => 
      `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
  });

  // Auto refresh timer
  const refreshTimerRef = useRef<NodeJS.Timeout>();

  // Load processes with enhanced error handling
  const loadProcesses = useCallback(async (page = 1, pageSize = 20, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: searchText || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };

      const response = await processApi.getProcesses(params);
      
      setProcesses(response.processes);
      setPagination(prev => ({
        ...prev,
        current: response.page,
        pageSize: response.page_size,
        total: response.total,
      }));

      // Show success message only for manual refresh
      if (!showLoading && refreshing) {
        message.success(`已刷新，共 ${response.total} 条流程记录`);
      }
    } catch (error: any) {
      message.error(`加载流程列表失败: ${error.message}`);
      console.error('Load processes error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText, categoryFilter, statusFilter, refreshing]);

  // Load stats with error handling
  const loadStats = useCallback(async () => {
    try {
      const statsData = await processApi.getProcessStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Load stats error:', error);
      // Don't show error message for stats as it's not critical
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadProcesses();
    loadStats();
  }, [loadProcesses, loadStats]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!embedded) {
      refreshTimerRef.current = setInterval(() => {
        loadProcesses(pagination.current, pagination.pageSize, false);
        loadStats();
      }, 30000);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [embedded, loadProcesses, loadStats, pagination.current, pagination.pageSize]);

  // Handle search and filter changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProcesses(1, pagination.pageSize);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText, categoryFilter, statusFilter, loadProcesses, pagination.pageSize]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProcesses(pagination.current, pagination.pageSize);
    loadStats();
  }, [loadProcesses, loadStats, pagination]);

  // Handle copy process
  const handleCopyProcess = async (processId: number, processName: string) => {
    try {
      await processService.copyProcess(processId);
      loadProcesses(pagination.current, pagination.pageSize);
      loadStats();
    } catch (error) {
      // Error already handled in processService
    }
  };

  // Handle delete process
  const handleDeleteProcess = (processId: number, processName: string) => {
    Modal.confirm({
      title: '确认删除流程',
      content: (
        <div>
          <p>确定要删除流程 <strong>"{processName}"</strong> 吗？</p>
          <Alert
            message="删除后无法恢复"
            description="流程定义、相关实例和任务都将被永久删除"
            type="warning"
            showIcon
            style={{ marginTop: 8 }}
          />
        </div>
      ),
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await processService.deleteProcess(processId);
          loadProcesses(pagination.current, pagination.pageSize);
          loadStats();
          
          // Clear selection if deleted process was selected
          setSelectedRowKeys(prev => prev.filter(key => key !== processId));
        } catch (error) {
          // Error already handled in processService
        }
      },
    });
  };

  // Handle batch operations
  const handleBatchOperation = async (operation: 'delete' | 'archive' | 'publish') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的流程');
      return;
    }

    const selectedProcesses = processes.filter(p => selectedRowKeys.includes(p.id!));
    const operationNames = {
      delete: '删除',
      archive: '归档',
      publish: '发布'
    };

    Modal.confirm({
      title: `批量${operationNames[operation]}`,
      content: (
        <div>
          <p>确定要{operationNames[operation]}以下 {selectedProcesses.length} 个流程吗？</p>
          <ul style={{ maxHeight: '200px', overflow: 'auto' }}>
            {selectedProcesses.map(process => (
              <li key={process.id}>{process.name} (v{process.version})</li>
            ))}
          </ul>
          {operation === 'delete' && (
            <Alert
              message="批量删除后无法恢复"
              type="error"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      ),
      okText: `确定${operationNames[operation]}`,
      cancelText: '取消',
      okType: operation === 'delete' ? 'danger' : 'primary',
      onOk: async () => {
        // TODO: Implement batch operations when backend supports it
        message.info('批量操作功能开发中，请逐个操作');
      },
    });
  };

  // Handle export
  const handleExportProcess = async (processId: number, format: 'json' | 'xml' | 'bpmn' = 'json') => {
    try {
      const process = await processApi.getProcess(processId);
      await processService.exportProcess(process, format);
    } catch (error) {
      // Error already handled in processService
    }
  };

  // Table columns with enhanced features
  const columns = [
    {
      title: '流程信息',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name: string, record: ProcessDefinition) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 500, marginRight: '8px' }}>{name}</span>
            <Tag color="blue" size="small">v{record.version}</Tag>
            {record.status === 'published' && (
              <Badge status="success" />
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <code>{record.key}</code>
          </div>
          {record.description && (
            <div style={{ 
              fontSize: '11px', 
              color: '#999', 
              marginTop: '2px',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => {
        const categoryConfig = {
          approval: { color: 'blue', text: '审批' },
          workflow: { color: 'green', text: '工作流' },
          notification: { color: 'orange', text: '通知' },
          automation: { color: 'purple', text: '自动化' },
        } as const;
        
        const config = categoryConfig[category as keyof typeof categoryConfig];
        return config ? 
          <Tag color={config.color}>{config.text}</Tag> : 
          category ? <Tag>{category}</Tag> : '-';
      },
      filters: [
        { text: '审批流程', value: 'approval' },
        { text: '工作流程', value: 'workflow' },
        { text: '通知流程', value: 'notification' },
        { text: '自动化流程', value: 'automation' },
      ],
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          draft: { color: 'orange', text: '草稿', icon: <EditOutlined /> },
          published: { color: 'green', text: '已发布', icon: <CheckCircleOutlined /> },
          archived: { color: 'default', text: '已归档', icon: <ClockCircleOutlined /> },
        } as const;
        
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
      filters: [
        { text: '草稿', value: 'draft' },
        { text: '已发布', value: 'published' },
        { text: '已归档', value: 'archived' },
      ],
    },
    {
      title: '流程复杂度',
      key: 'complexity',
      width: 120,
      render: (_, record: ProcessDefinition) => {
        const nodeCount = record.definition?.nodes?.length || 0;
        const flowCount = record.definition?.flows?.length || 0;
        const complexity = nodeCount + flowCount;
        
        const getComplexityLevel = (complexity: number) => {
          if (complexity <= 5) return { level: '简单', color: 'green' };
          if (complexity <= 15) return { level: '中等', color: 'orange' };
          return { level: '复杂', color: 'red' };
        };
        
        const { level, color } = getComplexityLevel(complexity);
        
        return (
          <Tooltip title={`节点: ${nodeCount}, 连线: ${flowCount}`}>
            <div>
              <Tag color={color}>{level}</Tag>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {nodeCount}节点 {flowCount}连线
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '创建信息',
      key: 'creator_info',
      width: 150,
      render: (_, record: ProcessDefinition) => (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500 }}>
            {record.creator_name || '未知用户'}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            <Tooltip title={new Date(record.created_at).toLocaleString()}>
              {formatRelativeTime(record.created_at)}
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: ProcessDefinition) => (
        <Space size="small">
          <Tooltip title="查看流程">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => navigate(`/process/${record.id}/view`)}
            />
          </Tooltip>
          
          <Tooltip title="编辑流程">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => navigate(`/process/${record.id}/edit`)}
            />
          </Tooltip>
          
          <Dropdown
            menu={{
              items: [
                {
                  key: 'copy',
                  icon: <CopyOutlined />,
                  label: '复制流程',
                  onClick: () => handleCopyProcess(record.id!, record.name),
                },
                {
                  key: 'export',
                  icon: <ExportOutlined />,
                  label: '导出',
                  children: [
                    {
                      key: 'export-json',
                      label: 'JSON格式',
                      onClick: () => handleExportProcess(record.id!, 'json'),
                    },
                    {
                      key: 'export-xml',
                      label: 'XML格式',
                      onClick: () => handleExportProcess(record.id!, 'xml'),
                    },
                    {
                      key: 'export-bpmn',
                      label: 'BPMN格式',
                      onClick: () => handleExportProcess(record.id!, 'bpmn'),
                    },
                  ],
                },
                {
                  type: 'divider',
                },
                {
                  key: 'publish',
                  label: record.status === 'published' ? '取消发布' : '发布流程',
                  disabled: record.status === 'archived',
                },
                {
                  key: 'archive',
                  label: record.status === 'archived' ? '取消归档' : '归档流程',
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除流程',
                  danger: true,
                  onClick: () => handleDeleteProcess(record.id!, record.name),
                },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>
      ),
    },
  ];

  // Handle batch export
  const handleBatchExport = async (format: 'json' | 'xml' | 'bpmn') => {
    const selectedProcesses = processes.filter(p => selectedRowKeys.includes(p.id!));
    
    for (const process of selectedProcesses) {
      try {
        await processService.exportProcess(process, format);
      } catch (error) {
        message.error(`导出流程 "${process.name}" 失败`);
      }
    }
    
    message.success(`批量导出完成，共 ${selectedProcesses.length} 个流程`);
  };

  // Row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: ProcessDefinition) => ({
      disabled: false,
      name: record.name,
    }),
  };

  return (
    <div className="enhanced-process-list" style={{ height }}>
      {/* Statistics Cards */}
      {showHeader && stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Card size="small" hoverable>
              <Statistic
                title="草稿流程"
                value={stats.draft_count}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<EditOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" hoverable>
              <Statistic
                title="已发布流程"
                value={stats.published_count}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" hoverable>
              <Statistic
                title="已归档流程"
                value={stats.archived_count}
                valueStyle={{ color: '#8c8c8c' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" hoverable>
              <Statistic
                title="总计流程"
                value={stats.total_count}
                valueStyle={{ color: '#1890ff' }}
                suffix={
                  <Badge 
                    count={refreshing ? <CloudSyncOutlined spin /> : 0} 
                    showZero={false}
                  />
                }
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>流程管理</span>
            {selectedRowKeys.length > 0 && (
              <Tag color="blue">已选择 {selectedRowKeys.length} 个流程</Tag>
            )}
          </div>
        }
        extra={
          <Space>
            {/* Batch operations */}
            {selectedRowKeys.length > 0 && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'batch-export',
                      icon: <ExportOutlined />,
                      label: '批量导出',
                      children: [
                        {
                          key: 'batch-export-json',
                          label: 'JSON格式',
                          onClick: () => handleBatchExport('json'),
                        },
                        {
                          key: 'batch-export-xml',
                          label: 'XML格式',
                          onClick: () => handleBatchExport('xml'),
                        },
                        {
                          key: 'batch-export-bpmn',
                          label: 'BPMN格式',
                          onClick: () => handleBatchExport('bpmn'),
                        },
                      ],
                    },
                    {
                      key: 'batch-archive',
                      label: '批量归档',
                      onClick: () => handleBatchOperation('archive'),
                    },
                    {
                      key: 'batch-delete',
                      label: '批量删除',
                      danger: true,
                      onClick: () => handleBatchOperation('delete'),
                    },
                  ],
                }}
              >
                <Button icon={<SettingOutlined />}>
                  批量操作 ({selectedRowKeys.length})
                </Button>
              </Dropdown>
            )}

            <Button 
              icon={<FilterOutlined />}
              onClick={() => setFilterDrawerVisible(true)}
            >
              高级筛选
            </Button>

            <Button 
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={handleRefresh}
            >
              刷新
            </Button>

            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/process/create')}
            >
              创建流程
            </Button>
          </Space>
        }
        style={{ height: embedded ? '100%' : 'auto' }}
      >
        {/* Quick Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={8}>
            <Input
              placeholder="搜索流程名称、标识或描述"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择分类"
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              <Select.Option value="all">全部分类</Select.Option>
              <Select.Option value="approval">审批流程</Select.Option>
              <Select.Option value="workflow">工作流程</Select.Option>
              <Select.Option value="notification">通知流程</Select.Option>
              <Select.Option value="automation">自动化流程</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择状态"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Select.Option value="all">全部状态</Select.Option>
              <Select.Option value="draft">草稿</Select.Option>
              <Select.Option value="published">已发布</Select.Option>
              <Select.Option value="archived">已归档</Select.Option>
            </Select>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
              {refreshTimerRef.current && !embedded && (
                <Space>
                  <CloudSyncOutlined />
                  <span>自动刷新中 (30秒间隔)</span>
                </Space>
              )}
            </div>
          </Col>
        </Row>
        
        {/* Table */}
        <Table
          columns={columns}
          dataSource={processes}
          loading={loading}
          rowKey="id"
          rowSelection={rowSelection}
          pagination={pagination}
          size="small"
          scroll={{ x: 1000 }}
          onChange={(paginationConfig, filters, sorter) => {
            if (paginationConfig.current && paginationConfig.pageSize) {
              loadProcesses(paginationConfig.current, paginationConfig.pageSize);
            }
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无流程数据"
                children={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/process/create')}>
                    创建第一个流程
                  </Button>
                }
              />
            ),
          }}
        />
      </Card>

      {/* Advanced Filter Drawer */}
      <Drawer
        title="高级筛选"
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        width={400}
      >
        <Form layout="vertical">
          <Form.Item label="创建时间范围">
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
            />
          </Form.Item>
          
          <Form.Item label="创建者">
            <Select
              placeholder="选择创建者"
              style={{ width: '100%' }}
              value={creatorFilter}
              onChange={setCreatorFilter}
            >
              <Select.Option value="all">全部创建者</Select.Option>
              {/* TODO: Load actual creators from API */}
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="user">普通用户</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="流程复杂度">
            <Checkbox.Group>
              <Space direction="vertical">
                <Checkbox value="simple">简单流程 (≤5个元素)</Checkbox>
                <Checkbox value="medium">中等流程 (6-15个元素)</Checkbox>
                <Checkbox value="complex">复杂流程 (&gt;15个元素)</Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Divider />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => {
              setDateRange(null);
              setCreatorFilter('all');
              setFilterDrawerVisible(false);
            }}>
              重置
            </Button>
            <Button type="primary" onClick={() => {
              loadProcesses(1, pagination.pageSize);
              setFilterDrawerVisible(false);
            }}>
              应用筛选
            </Button>
          </Space>
        </Form>
      </Drawer>
    </div>
  );
};

export default EnhancedProcessList;
