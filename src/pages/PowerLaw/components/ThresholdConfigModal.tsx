import { Form, InputNumber, Modal } from 'antd';
import React, { useEffect } from 'react';
import type { ThresholdConfig } from '../utils/analyzeComparison';

interface ThresholdConfigModalProps {
  open: boolean;
  thresholds: ThresholdConfig;
  onSave: (values: ThresholdConfig) => void;
  onCancel: () => void;
}

const FIELDS: {
  name: keyof ThresholdConfig;
  label: string;
  desc: string;
  min: number;
  max: number;
  step: number;
}[] = [
  {
    name: 'minEventCount',
    label: '最少事件数',
    desc: '有效事件数低于此值时标记为「样本不足」',
    min: 5,
    max: 500,
    step: 1,
  },
  {
    name: 'bDropWarning',
    label: 'b 值下降「关注」阈值',
    desc: 'baseline.b − current.b 超过此值进入「关注」（例：0.15）',
    min: 0.01,
    max: 2,
    step: 0.01,
  },
  {
    name: 'bDropHigh',
    label: 'b 值下降「重点关注」阈值',
    desc: 'baseline.b − current.b 超过此值进入「重点关注」（例：0.30）',
    min: 0.01,
    max: 2,
    step: 0.01,
  },
  {
    name: 'aRiseWarning',
    label: 'a 值上升「关注」比例',
    desc: 'a 值上升幅度超过此比例进入「关注」（例：0.20 = 20%）',
    min: 0.01,
    max: 5,
    step: 0.01,
  },
  {
    name: 'aRiseHigh',
    label: 'a 值上升「重点关注」比例',
    desc: 'a 值上升幅度超过此比例进入「重点关注」（例：0.40 = 40%）',
    min: 0.01,
    max: 5,
    step: 0.01,
  },
];

const ThresholdConfigModal: React.FC<ThresholdConfigModalProps> = ({
  open,
  thresholds,
  onSave,
  onCancel,
}) => {
  const [form] = Form.useForm<ThresholdConfig>();

  useEffect(() => {
    if (open) form.setFieldsValue(thresholds);
  }, [open, thresholds, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSave(values);
  };

  return (
    <Modal
      title="预警阈值配置"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      width={520}
    >
      <Form form={form} layout="vertical" size="small">
        {FIELDS.map((f) => (
          <Form.Item
            key={f.name}
            name={f.name}
            label={f.label}
            extra={<span style={{ color: '#8c8c8c', fontSize: 12 }}>{f.desc}</span>}
            rules={[{ required: true, message: '请填写此字段' }]}
          >
            <InputNumber
              min={f.min}
              max={f.max}
              step={f.step}
              style={{ width: '100%' }}
            />
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
};

export default ThresholdConfigModal;
