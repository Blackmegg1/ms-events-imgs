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

      // 鍩烘湰鑼冨洿鏍￠獙
      const checks: Array<[number, number, string]> = [
        [xMin, xMax, 'X鑼冨洿'],
        [yMin, yMax, 'Y鑼冨洿'],
        [zMin, zMax, 'Z鑼冨洿'],
      ];
      for (const [min, max, label] of checks) {
        if (min >= max) {
          message.error(`${label}鏈€灏忓€煎簲灏忎簬鏈€澶у€糮);
          return;
        }
      }
      if (energyMin == null || energyMax == null || energyMin === '' || energyMax === '') {
        message.error('璇峰～鍐欒兘閲忚寖鍥?);
        return;
      }
      if (Number(energyMin) < 0 || Number(energyMax) <= 0) {
        message.error('鑳介噺鑼冨洿闇€涓烘鏁?);
        return;
      }
      if (Number(energyMin) >= Number(energyMax)) {
        message.error('鑳介噺鑼冨洿鏈€灏忓€煎簲灏忎簬鏈€澶у€?);
        return;
      }

      const [start, end] = timeRange || [];
      const startMs = dayjs(start).valueOf();
      const endMs = dayjs(end).valueOf();
      if (!startMs || !endMs || startMs >= endMs) {
        message.error('鏃堕棿鑼冨洿涓嶅悎娉?);
        return;
      }

      const total = Number(count);
      if (!Number.isFinite(total) || total <= 0) {
        message.error('妯℃嫙浜嬩欢涓暟闇€涓烘鏁存暟');
        return;
      }

      setSubmitting(true);
      message.loading({ content: `姝ｅ湪妯℃嫙 ${total} 鏉′簨浠?..`, key: 'simulate' });

      const concurrency = 20; // 骞跺彂鏁伴噺
      let successCount = 0;
      let failCount = 0;

      const taskFns: Array<() => Promise<void>> = Array.from({ length: total }).map(() => async () => {
        const loc_x = Number(randBetween(xMin, xMax).toFixed(2));
        const loc_y = Number(randBetween(yMin, yMax).toFixed(2));
        const loc_z = Number(randBetween(zMin, zMax).toFixed(2));
        const randTime = new Date(randBetween(startMs, endMs));
        // 鏃堕棿鏍煎紡锛歒YYY-MM-DD HH:mm:ss.SSS锛堟绉掔骇绮惧害锛?        const time = dayjs(randTime).format('YYYY-MM-DD HH:mm:ss.SSS');

        // 闅忔満鑳介噺(KJ)
        const energy = Number(randBetween(Number(energyMin), Number(energyMax)).toFixed(3));
        // 鎸夊叕寮?log10(E) = 1.8 + 1.9M 璁＄畻闇囩骇锛圗 鍗曚綅涓?KJ锛?        const energyJ = energy * 1000;
        const magnitude = Number(((Math.log10(energyJ) - 1.8) / 1.9).toFixed(3));

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

      message.success({ content: `妯℃嫙瀹屾垚锛氭垚鍔?${successCount} 鏉★紝澶辫触 ${failCount} 鏉, key: 'simulate' });
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
      title="鏁版嵁妯℃嫙"
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      width={720}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="project_id" label="鎵€灞為」鐩? rules={[{ required: true, message: '璇烽€夋嫨鎵€灞為」鐩? }]}>
          <Select options={projectOptions} placeholder="璇烽€夋嫨椤圭洰" />
        </Form.Item>

        <Form.Item name="count" label="妯℃嫙浜嬩欢涓暟" rules={[{ required: true, message: '璇疯緭鍏ヤ釜鏁? }]}>
          <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="渚嬪 100" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="X鑼冨洿 (鏈€灏?" name="xMin" rules={[{ required: true, message: '璇疯緭鍏鏈€灏忓€? }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="X鑼冨洿 (鏈€澶?" name="xMax" rules={[{ required: true, message: '璇疯緭鍏鏈€澶у€? }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Y鑼冨洿 (鏈€灏?" name="yMin" rules={[{ required: true, message: '璇疯緭鍏鏈€灏忓€? }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Y鑼冨洿 (鏈€澶?" name="yMax" rules={[{ required: true, message: '璇疯緭鍏鏈€澶у€? }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Z鑼冨洿 (鏈€灏?" name="zMin" rules={[{ required: true, message: '璇疯緭鍏鏈€灏忓€? }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Z鑼冨洿 (鏈€澶?" name="zMax" rules={[{ required: true, message: '璇疯緭鍏鏈€澶у€? }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="timeRange" label="鏃堕棿鑼冨洿" rules={[{ required: true, message: '璇烽€夋嫨鏃堕棿鑼冨洿' }]}>
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="鑳介噺鑼冨洿 (鏈€灏? KJ)" name="energyMin" rules={[{ required: true, message: '璇疯緭鍏ヨ兘閲忔渶灏忓€? }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="鑳介噺鑼冨洿 (鏈€澶? KJ)" name="energyMax" rules={[{ required: true, message: '璇疯緭鍏ヨ兘閲忔渶澶у€? }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item colon={false} label=" ">
          <div style={{ color: '#888' }}>鎹㈢畻鍏紡锛歭og10(E[KJ]) = 1.8 + 1.9M</div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SimulateModal;

