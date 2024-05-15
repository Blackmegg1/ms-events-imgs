import { Modal } from 'antd';
import React, { PropsWithChildren } from 'react';

interface CreateFormProps {
  modalVisible: boolean;
  onCancel: () => void;
  onOk: () => void;
}

const CreateForm: React.FC<PropsWithChildren<CreateFormProps>> = (props) => {
  const { modalVisible, onCancel, onOk, children } = props;

  return (
    <Modal
      destroyOnClose
      title="新建事件"
      width={600}
      open={modalVisible}
      onCancel={() => onCancel()}
      onOk={() => onOk()}
    >
      {children}
    </Modal>
  );
};

export default CreateForm;
