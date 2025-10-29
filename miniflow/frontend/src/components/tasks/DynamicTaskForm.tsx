import React from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Space, 
  Row, 
  Col,
  Card
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { CheckCircleOutlined } from '@ant-design/icons';

// 动态表单字段类型定义
interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'email' | 'date';
  required?: boolean;
  placeholder?: string;
}

interface DynamicTaskFormProps {
  form?: FormInstance;
  onSubmit: (values: Record<string, unknown>) => void;
  completing?: boolean;
}

const DynamicTaskForm: React.FC<DynamicTaskFormProps> = ({ 
  form: externalForm,
  onSubmit,
  completing = false
}) => {
  const [form] = Form.useForm(externalForm);

  // 模拟表单字段定义（实际应该从任务定义中获取）
  const formFields: FormField[] = [
    {
      name: 'description',
      label: '任务描述',
      type: 'textarea',
      required: true,
      placeholder: '请填写任务描述'
    },
    {
      name: 'result',
      label: '处理结果',
      type: 'textarea',
      required: true,
      placeholder: '请填写处理结果'
    },
    {
      name: 'comment',
      label: '备注',
      type: 'textarea',
      placeholder: '可选备注信息'
    }
  ];

  // 渲染表单字段
  const renderFormField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'date':
        return (
          <Form.Item
            name={field.name}
            label={field.label}
            rules={[{ required: field.required, message: `请输入${field.label}` }]}
          >
            <Input placeholder={field.placeholder} />
          </Form.Item>
        );
      
      case 'number':
        return (
          <Form.Item
            name={field.name}
            label={field.label}
            rules={[{ required: field.required, message: `请输入${field.label}` }]}
          >
            <Input type="number" placeholder={field.placeholder} />
          </Form.Item>
        );
      
      case 'textarea':
        return (
          <Form.Item
            name={field.name}
            label={field.label}
            rules={[{ required: field.required, message: `请输入${field.label}` }]}
          >
            <Input.TextArea rows={4} placeholder={field.placeholder} />
          </Form.Item>
        );
      
      default:
        return (
          <Form.Item
            name={field.name}
            label={field.label}
            rules={[{ required: field.required, message: `请输入${field.label}` }]}
          >
            <Input placeholder={field.placeholder} />
          </Form.Item>
        );
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
    >
      <Card size="small" title="任务表单">
        <Row gutter={[16, 0]}>
          {formFields.map(field => (
            <Col span={24} key={field.name}>
              {renderFormField(field)}
            </Col>
          ))}
        </Row>
      </Card>

      <Form.Item>
        <Space style={{ marginTop: '16px' }}>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={completing}
            icon={<CheckCircleOutlined />}
          >
            {completing ? '提交中...' : '完成任务'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default DynamicTaskForm;
