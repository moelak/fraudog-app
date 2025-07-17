import React from 'react';
import { ToastContainer as ReactToastifyContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastContainer: React.FC = () => {
  return (
    <ReactToastifyContainer
      position="top-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      toastClassName="!bg-white !text-gray-900 !shadow-lg !border !border-gray-200"
      bodyClassName="!text-sm !font-medium"
      progressClassName="!bg-blue-500"
      closeButton={true}
    />
  );
};

export default ToastContainer;