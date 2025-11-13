import imgmagServices from '@/services/imgmag';
import { getBlob } from '@/utils';
import type { GetProp, UploadProps } from 'antd';
import { Form, Input, InputNumber, Modal, Select, Upload, message } from 'antd';
import React, { PropsWithChildren, useEffect, useState } from 'react';

const { addImg } = imgmagServices.ImgmagController;

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

interface CreateFormProps {
  modalVisible: boolean;
  onCancel: () => void;
  onOk: () => void;
  projectDist: any;
}


const normFile = (e: any) => {
  console.log('Upload event:', e);
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

const uploadButton = (
  <button style={{ border: 0, background: 'none' }} type="button">
    <div style={{ marginTop: 8 }}>上传底图</div>
  </button>
);

const CreateForm: React.FC<PropsWithChildren<CreateFormProps>> = (props) => {
  const { modalVisible, onCancel, onOk, projectDist } = props;
  const [form] = Form.useForm();
  const [options, setOptions] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  useEffect(() => {
    if (projectDist !== null) {
      let tmp = Object.keys(projectDist).map((key) => {
        return {
          value: key,
          label: projectDist[key].text,
        };
      });
      setOptions(tmp);
    }
  }, [projectDist]);

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file) => {
    let blob;
    if (!file.url && !file.preview) {
      blob = await getBlob(file.originFileObj);
    }
    const url = file.url || (window.URL && window.URL.createObjectURL(blob));
    setPreviewImage(url);
    setPreviewOpen(true);
    setPreviewTitle(
      file.name || file.url.substring(file.url.lastIndexOf('/') + 1),
    );
  };

  const handleSubmit = async () => {
    const values = form.getFieldsValue();
    const valid = await form.validateFields();
    if (valid) {
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        if (key !== 'img') {
          formData.append(key, values[key]);
        }
      });
      const imgBlob = await getBlob(values.img[0].originFileObj);

      formData.append('img_blob', imgBlob);
      formData.append('img_name', values.img[0].name);
      try {
        addImg(formData).then((res) => {
          form.resetFields();
          onOk();
        });
      } catch (e) {
        message.error(e.message);
      }
    } else {
      return false;
    }
  };

  return (
    <Modal
      destroyOnClose
      title="新建底图"
      width={600}
      open={modalVisible}
      onCancel={() => onCancel()}
      onOk={handleSubmit}
    >
      <Form form={form} layout="horizontal">
        <Form.Item
          label="所属项目"
          name="project_id"
          rules={[
            {
              required: true,
              message: '所属项目为必填项',
            },
          ]}
        >
          <Select options={options} />
        </Form.Item>
        <Form.Item
          label="底图名称"
          name="name"
          rules={[
            {
              required: true,
              message: '底图名称为必填项',
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="法向轴"
          name="norm_axis"
          rules={[
            {
              required: true,
              message: '法向轴为必填项',
            },
          ]}
        >
          <Select
            options={[
              { label: 'x', value: 'x' },
              { label: 'y', value: 'y' },
              { label: 'z', value: 'z' },
            ]}
          />
        </Form.Item>
        <Form.Item label="X最小值" name="min_x">
          <InputNumber />
        </Form.Item>
        <Form.Item label="X最大值" name="max_x">
          <InputNumber />
        </Form.Item>
        <Form.Item label="Y最小值" name="min_y">
          <InputNumber />
        </Form.Item>
        <Form.Item label="Y最大值" name="max_y">
          <InputNumber />
        </Form.Item>
        <Form.Item label="Z最小值" name="min_z">
          <InputNumber />
        </Form.Item>
        <Form.Item label="Z最大值" name="max_z">
          <InputNumber />
        </Form.Item>
        <Form.Item label="左偏移" name="left_margin">
          <InputNumber />
        </Form.Item>
        <Form.Item label="上偏移" name="top_margin">
          <InputNumber />
        </Form.Item>
        <Form.Item
          label="底图"
          name="img"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[
            {
              required: true,
              message: '底图不能为空',
            },
          ]}
        >
          <Upload
            listType="picture-card"
            onPreview={handlePreview}
            maxCount={1}
            beforeUpload={(file) => {
              const isPNG = file.type === 'image/png';
              if (!isPNG) {
                message.error(`${file.name}不是一个PNG图片`);
              }
              return isPNG || Upload.LIST_IGNORE;
            }}
          >
            {uploadButton}
          </Upload>
        </Form.Item>
      </Form>
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
        width={1080}
      >
        <img alt="example" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </Modal>
  );
};

export default CreateForm;
