import React, { forwardRef, useState, ReactElement } from "react";

export interface ChatFormProps {
  className?: string;
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: { experimental_attachments?: FileList }
  ) => void;
  children: (props: {
    files: File[] | null;
    setFiles: React.Dispatch<React.SetStateAction<File[] | null>>;
  }) => ReactElement;
}

export const ChatForm = forwardRef<HTMLFormElement, ChatFormProps>(
  ({ children, handleSubmit, className }, ref) => {
    const [files, setFiles] = useState<File[] | null>(null);

    const onSubmit = (event: React.FormEvent) => {
      if (!files) {
        handleSubmit(event);
        return;
      }

      const fileList = createFileList(files);
      handleSubmit(event, { experimental_attachments: fileList });
      setFiles(null);
    };

    return (
      <form ref={ref} onSubmit={onSubmit} className={className}>
        {children({ files, setFiles })}
      </form>
    );
  }
);

ChatForm.displayName = "ChatForm";

// Utility: create a FileList from array of files
function createFileList(files: File[] | FileList): FileList {
  const dataTransfer = new DataTransfer();
  for (const file of Array.from(files)) {
    dataTransfer.items.add(file);
  }
  return dataTransfer.files;
}
