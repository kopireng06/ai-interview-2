import React from "react";

interface CustomModalProps {
  show: boolean;
  handleClose: () => void;
  title: string;
  children: React.ReactNode;
}

const CustomModal: React.FC<CustomModalProps> = ({
  show,
  handleClose,
  title,
  children,
}) => {
  return (
    <div
      className={`fixed inset-0 z-50 ${show ? "block" : "hidden"}`}
      role="dialog"
    >
      <div
        className="fixed inset-0 bg-black opacity-70"
        onClick={handleClose}
      ></div>
      <div className="z-[100] relative flex items-center justify-center min-h-screen max-w-screen-sm mx-auto">
        <div className="bg-gray-800 text-white rounded-lg shadow-lg p-6">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="mt-4">{children}</div>
          <button
            className="mt-4 px-4 py-2 mx-auto bg-gray-600 rounded-lg hover:bg-gray-500"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
