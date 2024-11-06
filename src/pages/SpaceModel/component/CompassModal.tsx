import { editCompass } from '@/services/model/ModelController';
import {
  Form,
  InputNumber,
  message,
  Modal,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useEffect } from 'react';

const { Text } = Typography;

const CompassModal = ({ currentRecord, modalVisible, onCancel }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (currentRecord) {
      console.log(currentRecord);
      form.setFieldsValue({
        enableCompass: Boolean(currentRecord.show_compass) || false,
      });
      if (currentRecord.show_compass) {
        const startPointArray = currentRecord.compass_start.split(',');
        const endPointArray = currentRecord.compass_end.split(',');
        form.setFieldsValue({
          startPoint: {
            x: +startPointArray[0],
            y: +startPointArray[1],
            z: +startPointArray[2],
          },
          endPoint: {
            x: +endPointArray[0],
            y: +endPointArray[1],
            z: +endPointArray[2],
          },
        });
      }
    }
  }, [currentRecord, form]);

  const handleOk = async () => {
    try {
      // 获取表单数据
      const formData = await form.validateFields();

      // 构造提交的数据结构
      const submitData = {
        show_compass: formData.enableCompass,
        // 只有当启用指北针时才包含坐标数据
        ...(formData.enableCompass && {
          compass_start: `${+formData.startPoint.x},${+formData.startPoint.y},${+formData.startPoint.z}`,
          compass_end: `${+formData.endPoint.x},${+formData.endPoint.y},${+formData.endPoint.z}`,
        }),
      };
      console.log('提交的数据:', submitData);
      await editCompass(currentRecord.model_id, submitData);

      message.success('保存成功');

      onCancel();
    } catch (error) {
      // 表单验证失败或其他错误
      console.error('表单提交错误:', error);
      message.error('提交失败，请检查表单数据');
    }
  };

  return (
    <Modal
      title="指北针设置"
      open={modalVisible}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnClose
    >
      <Form
        form={form}
        initialValues={{
          enableCompass: false,
          startPoint: { x: 0, y: 0, z: 0 },
          endPoint: { x: 0, y: 0, z: 0 },
        }}
      >
        <Form.Item
          name="enableCompass"
          label="开启指北针"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.enableCompass !== currentValues.enableCompass
          }
        >
          {({ getFieldValue }) =>
            getFieldValue('enableCompass') ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>起点坐标：</Text>
                  <Space>
                    <Form.Item
                      name={['startPoint', 'x']}
                      label="X"
                      rules={[{ required: true, message: '请输入X坐标' }]}
                    >
                      <InputNumber />
                    </Form.Item>
                    <Form.Item
                      name={['startPoint', 'y']}
                      label="Y"
                      rules={[{ required: true, message: '请输入Y坐标' }]}
                    >
                      <InputNumber />
                    </Form.Item>
                    <Form.Item
                      name={['startPoint', 'z']}
                      label="Z"
                      rules={[{ required: true, message: '请输入Z坐标' }]}
                    >
                      <InputNumber />
                    </Form.Item>
                  </Space>
                </div>

                <div>
                  <Text>终点坐标：</Text>
                  <Space>
                    <Form.Item
                      name={['endPoint', 'x']}
                      label="X"
                      rules={[{ required: true, message: '请输入X坐标' }]}
                    >
                      <InputNumber />
                    </Form.Item>
                    <Form.Item
                      name={['endPoint', 'y']}
                      label="Y"
                      rules={[{ required: true, message: '请输入Y坐标' }]}
                    >
                      <InputNumber />
                    </Form.Item>
                    <Form.Item
                      name={['endPoint', 'z']}
                      label="Z"
                      rules={[{ required: true, message: '请输入Z坐标' }]}
                    >
                      <InputNumber />
                    </Form.Item>
                  </Space>
                </div>
              </Space>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CompassModal;
