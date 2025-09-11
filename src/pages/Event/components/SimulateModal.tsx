import eventServices from '@/services/event';
import { Col, DatePicker, Form, InputNumber, Modal, Row, Select, message } from 'antd';
import dayjs from 'dayjs';
import React, { PropsWithChildren, useMemo, useState } from 'react';

const { addEvent } = eventServices.EventController;

interface SimulateModalProps {
  modalVisible: boolean;
  onCancel: () => void;
  onOk: () => void;
  projectDist: any;
}

const randBetween = (min: number, max: number) => Math.random() * (max - min) + min;

const SimulateModal: React.FC<PropsWithChildren<SimulateModalProps>> = ({
  modalVisible,
  onCancel,
  onOk,
  projectDist,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const projectOptions = useMemo(() => {
    if (!projectDist) return [] as Array<{ label: string; value: string | number }>;
    return Object.keys(projectDist).map((key) => ({
      value: Number(key),
      label: projectDist[key]?.text ?? key,
    }));
  }, [projectDist]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const {
        project_id,
        count,
        xMin,
        xMax,
        yMin,
        yMax,
        zMin,
        zMax,
        timeRange,
        energyMin,
        energyMax,
      } = values;

      // 基本范围校验
      const checks: Array<[number, number, string]> = [
        [xMin, xMax, 'X范围'],
        [yMin, yMax, 'Y范围'],
        [zMin, zMax, 'Z范围'],
      ];
      for (const [min, max, label] of checks) {
        if (min >= max) {
          message.error(`${label}最小值应小于最大值`);
          return;
        }
      }
      if (energyMin == null || energyMax == null || energyMin === '' || energyMax === '') {
        message.error('请填写能量范围');
        return;
      }
      if (Number(energyMin) < 0 || Number(energyMax) <= 0) {
        message.error('能量范围需为正数');
        return;
      }
      if (Number(energyMin) >= Number(energyMax)) {
        message.error('能量范围最小值应小于最大值');
        return;
      }

      const [start, end] = timeRange || [];
      const startMs = dayjs(start).valueOf();
      const endMs = dayjs(end).valueOf();
      if (!startMs || !endMs || startMs >= endMs) {
        message.error('时间范围不合法');
        return;
      }

      const total = Number(count);
      if (!Number.isFinite(total) || total <= 0) {
        message.error('模拟事件个数需为正整数');
        return;
      }

      setSubmitting(true);
      message.loading({ content: `正在模拟 ${total} 条事件...`, key: 'simulate' });

      const concurrency = 20; // 并发数量
      let successCount = 0;
      let failCount = 0;

      const taskFns: Array<() => Promise<void>> = Array.from({ length: total }).map(() => async () => {
        const loc_x = Number(randBetween(xMin, xMax).toFixed(2));
        const loc_y = Number(randBetween(yMin, yMax).toFixed(2));
        const loc_z = Number(randBetween(zMin, zMax).toFixed(2));
        const randTime = new Date(randBetween(startMs, endMs));
        // 时间格式：YYYY-MM-DD HH:mm:ss.SSS（毫秒级精度）
        const time = dayjs(randTime).format('YYYY-MM-DD HH:mm:ss.SSS');

        // 随机能量(KJ)
        const energy = Number(randBetween(Number(energyMin), Number(energyMax)).toFixed(3));
        // 按公式 log10(E) = 1.8 + 1.9M 计算震级（E 单位为 KJ）
        const magnitude = Number(((Math.log10(energy) - 1.8) / 1.9).toFixed(3));

        try {
          const ok = await addEvent({
            project_id: Number(project_id),
            loc_x,
            loc_y,
            loc_z,
            energy,
            magnitude,
            time,
          });
          if (ok) successCount += 1; else failCount += 1;
        } catch (e) {
          failCount += 1;
        }
      });

      for (let i = 0; i < taskFns.length; i += concurrency) {
        const slice = taskFns.slice(i, i + concurrency);
        await Promise.allSettled(slice.map((fn) => fn()));
      }

      message.success({ content: `模拟完成：成功 ${successCount} 条，失败 ${failCount} 条`, key: 'simulate' });
      form.resetFields();
      onOk();
    } catch (e) {
      // validation error
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      open={modalVisible}
      title="数据模拟"
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      width={720}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="project_id" label="所属项目" rules={[{ required: true, message: '请选择所属项目' }]}>
          <Select options={projectOptions} placeholder="请选择项目" />
        </Form.Item>

        <Form.Item name="count" label="模拟事件个数" rules={[{ required: true, message: '请输入个数' }]}>
          <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="例如 100" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="X范围 (最小)" name="xMin" rules={[{ required: true, message: '请输入X最小值' }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="X范围 (最大)" name="xMax" rules={[{ required: true, message: '请输入X最大值' }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Y范围 (最小)" name="yMin" rules={[{ required: true, message: '请输入Y最小值' }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Y范围 (最大)" name="yMax" rules={[{ required: true, message: '请输入Y最大值' }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Z范围 (最小)" name="zMin" rules={[{ required: true, message: '请输入Z最小值' }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Z范围 (最大)" name="zMax" rules={[{ required: true, message: '请输入Z最大值' }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="timeRange" label="时间范围" rules={[{ required: true, message: '请选择时间范围' }]}>
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="能量范围 (最小, KJ)" name="energyMin" rules={[{ required: true, message: '请输入能量最小值' }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="能量范围 (最大, KJ)" name="energyMax" rules={[{ required: true, message: '请输入能量最大值' }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item colon={false} label=" ">
          <div style={{ color: '#888' }}>换算公式：log10(E[KJ]) = 1.8 + 1.9M</div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SimulateModal;
