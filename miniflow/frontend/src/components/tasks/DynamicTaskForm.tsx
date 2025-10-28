import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  TimePicker,
  Checkbox,
  Radio,
  Switch,
  Slider,
  Rate,
  Upload,
  Button,
  Card,
  Row,
  Col,
  Divider,
  message,
  Spin,
  Alert,
  Space,
  Tooltip
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { UploadFile } from 'antd/es/upload/interface';
import dayjs, { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Group: RadioGroup } = Radio;
const { Group: CheckboxGroup } = Checkbox;

// 表单字段类型定义
interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'date' | 'daterange' | 
        'time' | 'datetime' | 'checkbox' | 'radio' | 'switch' | 'slider' | 'rate' | 'upload';
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  props?: Record<string, any>;
  dependencies?: string[];
  conditional?: {
    field: string;
    value: any;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  };
  description?: string;
  group?: string;
}

interface FormDefinition {
  title?: string;
  description?: string;
  fields: FormField[];
  layout?: 'horizontal' | 'vertical' | 'inline';
  groups?: { name: string; title: string; fields: string[] }[];
}

interface DynamicTaskFormProps {
  taskId: number;
  onSave?: (data: any) => void;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  readonly?: boolean;
  initialData?: Record<string, any>;
}

const DynamicTaskForm: React.FC<DynamicTaskFormProps> = ({
  taskId,
  onSave,
  onSubmit,
  onCancel,
  readonly = false,
  initialData = {}
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formDefinition, setFormDefinition] = useState<FormDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [conditionalFields, setConditionalFields] = useState<Set<string>>(new Set());

  // 获取任务表单定义
  const fetchTaskForm = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/task/${taskId}/form`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        
        // 解析表单定义
        let definition: FormDefinition;
        if (data.form_definition) {
          definition = typeof data.form_definition === 'string' 
            ? JSON.parse(data.form_definition)
            : data.form_definition;
        } else {
          // 默认表单定义
          definition = createDefaultFormDefinition(data.task);
        }

        setFormDefinition(definition);

        // 解析现有表单数据
        let existingData = initialData;
        if (data.form_data) {
          try {
            const parsedData = typeof data.form_data === 'string' 
              ? JSON.parse(data.form_data)
              : data.form_data;
            existingData = { ...existingData, ...parsedData };
          } catch (e) {
            console.warn('解析表单数据失败:', e);
          }
        }

        setFormData(existingData);
        form.setFieldsValue(existingData);
      } else {
        message.error('获取任务表单失败');
      }
    } catch (error) {
      console.error('获取任务表单异常:', error);
      message.error('获取任务表单异常');
    } finally {
      setLoading(false);
    }
  };

  // 创建默认表单定义
  const createDefaultFormDefinition = (task: any): FormDefinition => {
    return {
      title: `${task?.name || '任务'} 处理表单`,
      description: '请填写任务处理相关信息',
      layout: 'vertical',
      fields: [
        {
          name: 'approved',
          label: '审核结果',
          type: 'radio',
          required: true,
          options: [
            { label: '通过', value: true },
            { label: '拒绝', value: false }
          ]
        },
        {
          name: 'comment',
          label: '处理意见',
          type: 'textarea',
          required: true,
          placeholder: '请填写处理意见...',
          validation: {
            min: 10,
            max: 500,
            message: '处理意见长度应在10-500字符之间'
          }
        },
        {
          name: 'priority',
          label: '优先级调整',
          type: 'slider',
          defaultValue: 50,
          props: {
            min: 1,
            max: 100,
            marks: {
              1: '低',
              50: '中',
              100: '高'
            }
          }
        }
      ]
    };
  };

  // 组件挂载时获取表单定义
  useEffect(() => {
    if (taskId) {
      fetchTaskForm();
    }
  }, [taskId]);

  // 监听表单值变化，处理条件字段
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    setFormData(allValues);

    // 处理条件字段显示/隐藏
    if (formDefinition) {
      const newConditionalFields = new Set<string>();
      
      formDefinition.fields.forEach(field => {
        if (field.conditional) {
          const { field: condField, value: condValue, operator } = field.conditional;
          const fieldValue = allValues[condField];
          
          let shouldShow = false;
          switch (operator) {
            case '==':
              shouldShow = fieldValue === condValue;
              break;
            case '!=':
              shouldShow = fieldValue !== condValue;
              break;
            case '>':
              shouldShow = fieldValue > condValue;
              break;
            case '<':
              shouldShow = fieldValue < condValue;
              break;
            case '>=':
              shouldShow = fieldValue >= condValue;
              break;
            case '<=':
              shouldShow = fieldValue <= condValue;
              break;
            case 'in':
              shouldShow = Array.isArray(condValue) && condValue.includes(fieldValue);
              break;
            case 'not_in':
              shouldShow = Array.isArray(condValue) && !condValue.includes(fieldValue);
              break;
            default:
              shouldShow = true;
          }

          if (shouldShow) {
            newConditionalFields.add(field.name);
          }
        } else {
          newConditionalFields.add(field.name);
        }
      });

      setConditionalFields(newConditionalFields);
    }
  };

  // 渲染表单字段
  const renderFormField = (field: FormField) => {
    const commonProps = {
      placeholder: field.placeholder,
      disabled: readonly,
      ...field.props
    };

    switch (field.type) {
      case 'text':
        return <Input {...commonProps} />;
      
      case 'textarea':
        return <TextArea rows={4} {...commonProps} />;
      
      case 'number':
        return <InputNumber style={{ width: '100%' }} {...commonProps} />;
      
      case 'select':
        return (
          <Select {...commonProps} allowClear>
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      
      case 'multiselect':
        return (
          <Select {...commonProps} mode="multiple" allowClear>
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      
      case 'date':
        return <DatePicker style={{ width: '100%' }} {...commonProps} />;
      
      case 'daterange':
        return <RangePicker style={{ width: '100%' }} {...commonProps} />;
      
      case 'time':
        return <TimePicker style={{ width: '100%' }} {...commonProps} />;
      
      case 'datetime':
        return <DatePicker showTime style={{ width: '100%' }} {...commonProps} />;
      
      case 'checkbox':
        return (
          <CheckboxGroup {...commonProps}>
            {field.options?.map(option => (
              <Checkbox key={option.value} value={option.value}>
                {option.label}
              </Checkbox>
            ))}
          </CheckboxGroup>
        );
      
      case 'radio':
        return (
          <RadioGroup {...commonProps}>
            {field.options?.map(option => (
              <Radio key={option.value} value={option.value}>
                {option.label}
              </Radio>
            ))}
          </RadioGroup>
        );
      
      case 'switch':
        return <Switch {...commonProps} />;
      
      case 'slider':
        return <Slider {...commonProps} />;
      
      case 'rate':
        return <Rate {...commonProps} />;
      
      case 'upload':
        return (
          <Upload {...commonProps}>
            <Button icon={<UploadOutlined />}>点击上传</Button>
          </Upload>
        );
      
      default:
        return <Input {...commonProps} />;
    }
  };

  // 获取字段验证规则
  const getFieldRules = (field: FormField) => {
    const rules: any[] = [];

    if (field.required) {
      rules.push({ required: true, message: `请填写${field.label}` });
    }

    if (field.validation) {
      const { min, max, pattern, message: validationMessage } = field.validation;
      
      if (min !== undefined) {
        if (field.type === 'text' || field.type === 'textarea') {
          rules.push({ min, message: validationMessage || `${field.label}最少${min}个字符` });
        } else if (field.type === 'number') {
          rules.push({ type: 'number', min, message: validationMessage || `${field.label}最小值为${min}` });
        }
      }
      
      if (max !== undefined) {
        if (field.type === 'text' || field.type === 'textarea') {
          rules.push({ max, message: validationMessage || `${field.label}最多${max}个字符` });
        } else if (field.type === 'number') {
          rules.push({ type: 'number', max, message: validationMessage || `${field.label}最大值为${max}` });
        }
      }
      
      if (pattern) {
        rules.push({ 
          pattern: new RegExp(pattern), 
          message: validationMessage || `${field.label}格式不正确` 
        });
      }
    }

    return rules;
  };

  // 保存表单数据
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/task/${taskId}/form`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save',
          form_data: values
        })
      });

      if (response.ok) {
        message.success('表单保存成功');
        onSave?.(values);
      } else {
        const errorData = await response.json();
        message.error(errorData.message || '表单保存失败');
      }
    } catch (error) {
      console.error('保存表单异常:', error);
      message.error('保存表单异常');
    } finally {
      setSaving(false);
    }
  };

  // 提交表单完成任务
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/task/${taskId}/form`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'complete',
          form_data: values,
          comment: values.comment || ''
        })
      });

      if (response.ok) {
        message.success('任务完成成功');
        onSubmit?.(values);
      } else {
        const errorData = await response.json();
        message.error(errorData.message || '任务完成失败');
      }
    } catch (error) {
      console.error('提交表单异常:', error);
      message.error('提交表单异常');
    } finally {
      setSubmitting(false);
    }
  };

  // 按组渲染字段
  const renderFieldsByGroup = () => {
    if (!formDefinition) return null;

    const { fields, groups } = formDefinition;

    if (groups && groups.length > 0) {
      // 按组渲染
      return groups.map(group => {
        const groupFields = fields.filter(field => 
          group.fields.includes(field.name) && conditionalFields.has(field.name)
        );

        if (groupFields.length === 0) return null;

        return (
          <Card 
            key={group.name}
            title={group.title}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 16]}>
              {groupFields.map(field => (
                <Col key={field.name} span={12}>
                  {renderFormItem(field)}
                </Col>
              ))}
            </Row>
          </Card>
        );
      });
    } else {
      // 普通渲染
      const visibleFields = fields.filter(field => conditionalFields.has(field.name));
      return (
        <Row gutter={[16, 16]}>
          {visibleFields.map(field => (
            <Col 
              key={field.name} 
              span={field.type === 'textarea' ? 24 : 12}
            >
              {renderFormItem(field)}
            </Col>
          ))}
        </Row>
      );
    }
  };

  // 渲染表单项
  const renderFormItem = (field: FormField) => {
    const label = (
      <Space>
        {field.label}
        {field.description && (
          <Tooltip title={field.description}>
            <QuestionCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        )}
      </Space>
    );

    return (
      <Form.Item
        key={field.name}
        name={field.name}
        label={label}
        rules={getFieldRules(field)}
        initialValue={field.defaultValue}
      >
        {renderFormField(field)}
      </Form.Item>
    );
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>加载表单定义中...</div>
        </div>
      </Card>
    );
  }

  if (!formDefinition) {
    return (
      <Card>
        <Alert
          message="表单定义加载失败"
          description="无法获取任务表单定义，请刷新重试。"
          type="error"
          action={
            <Button size="small" onClick={fetchTaskForm}>
              重新加载
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          {formDefinition.title || '任务处理表单'}
          {readonly && <Tag color="orange">只读模式</Tag>}
        </Space>
      }
      extra={
        !readonly && (
          <Space>
            <Button 
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存草稿
            </Button>
            <Button 
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleSubmit}
            >
              完成任务
            </Button>
            {onCancel && (
              <Button onClick={onCancel}>
                取消
              </Button>
            )}
          </Space>
        )
      }
    >
      {formDefinition.description && (
        <Alert
          message={formDefinition.description}
          type="info"
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Form
        form={form}
        layout={formDefinition.layout || 'vertical'}
        onValuesChange={handleFormValuesChange}
        initialValues={formData}
      >
        {renderFieldsByGroup()}

        {/* 隐藏的提交按钮，用于表单验证 */}
        <Form.Item style={{ display: 'none' }}>
          <Button htmlType="submit">提交</Button>
        </Form.Item>
      </Form>

      {/* 表单数据预览 (开发模式) */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <Divider>表单数据预览 (开发模式)</Divider>
          <pre style={{
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '12px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {JSON.stringify(formData, null, 2)}
          </pre>
        </>
      )}
    </Card>
  );
};

export default DynamicTaskForm;
