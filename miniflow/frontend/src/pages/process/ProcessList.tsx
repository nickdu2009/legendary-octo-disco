import React, { useState, useEffect } from 'react';
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
  Statistic
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
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { processApi } from '../../services/processApi';
import type { ProcessDefinition, ProcessStats } from '../../types/process';
import { formatRelativeTime } from '../../utils/formatters';

const ProcessList: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
  const [stats, setStats] = useState<ProcessStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Load processes
  const loadProcesses = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const response = await processApi.getProcesses({
        page,
        page_size: pageSize,
        search: searchText || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      
      setProcesses(response.processes);
      setPagination({
        current: response.page,
        pageSize: response.page_size,
        total: response.total,
      });
    } catch (error) {
      message.error('加载流程列表失败');
      console.error('Load processes error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const statsData = await processApi.getProcessStats();
      setStats(statsData);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadProcesses();
    loadStats();
  }, []);

  // Handle search and filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProcesses(1, pagination.pageSize);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText, categoryFilter, statusFilter]);

  // Handle copy process
  const handleCopyProcess = async (processId: number) => {
    try {
      await processApi.copyProcess(processId);
      message.success('流程复制成功');
      loadProcesses(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('流程复制失败');
    }
  };

  // Handle delete process
  const handleDeleteProcess = (processId: number, processName: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除流程 "${processName}" 吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await processApi.deleteProcess(processId);
          message.success('流程删除成功');
          loadProcesses(pagination.current, pagination.pageSize);
          loadStats();
        } catch (error) {
          message.error('流程删除失败');
        }
      },
    });
  };

  // Handle export process
  const handleExportProcess = async (processId: number, format: 'json' | 'xml' = 'json') => {
    try {
      const blob = await processApi.exportProcess(processId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `process_${processId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('流程导出成功');
    } catch (error) {
      message.error('流程导出失败');
    }
  };

  // Table columns
  const columns = [
    {
      title: '流程名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ProcessDefinition) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <Tag color="blue">v{record.version}</Tag>
        </Space>
      ),
    },
    {
      title: '流程标识',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => <code style={{ fontSize: '11px' }}>{key}</code>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => category ? <Tag>{category}</Tag> : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          draft: { color: 'orange', text: '草稿' },
          published: { color: 'green', text: '已发布' },
          archived: { color: 'default', text: '已归档' },
        } as const;
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建者',
      dataIndex: 'creator_name',
      key: 'creator_name',
      render: (name: string) => name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => (
        <Tooltip title={new Date(time).toLocaleString()}>
          {formatRelativeTime(time)}
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: ProcessDefinition) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => navigate(`/process/${record.id}/view`)}
            />
          </Tooltip>
          
          <Tooltip title="编辑">
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
                  label: '复制',
                  onClick: () => handleCopyProcess(record.id!),
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
                  ],
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除',
                  danger: true,
                  onClick: () => handleDeleteProcess(record.id!, record.name),
                },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" icon={<SettingOutlined />} size="small" />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div className="process-list-page">
      {/* Statistics Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="草稿流程"
                value={stats.draft_count}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="已发布流程"
                value={stats.published_count}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="已归档流程"
                value={stats.archived_count}
                valueStyle={{ color: '#8c8c8c' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="总计流程"
                value={stats.total_count}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content */}
      <Card 
        title="流程管理"
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />}
              onClick={() => {
                loadProcesses(pagination.current, pagination.pageSize);
                loadStats();
              }}
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
      >
        {/* Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={8}>
            <Input
              placeholder="搜索流程名称或标识"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="选择分类"
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              <Select.Option value="all">全部分类</Select.Option>
              <Select.Option value="approval">审批流程</Select.Option>
              <Select.Option value="workflow">工作流程</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
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
          <Col span={4}>
            <Button
              icon={<ImportOutlined />}
              onClick={() => {
                // TODO: Implement import functionality
                message.info('导入功能正在开发中');
              }}
              style={{ width: '100%' }}
            >
              导入
            </Button>
          </Col>
        </Row>
        
        {/* Table */}
        <Table
          columns={columns}
          dataSource={processes}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              loadProcesses(page, pageSize);
            },
          }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default ProcessList;
