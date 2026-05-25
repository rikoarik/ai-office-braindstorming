import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownViewer.module.css';
import { ArrowLeft, DocumentText } from 'iconsax-react';

interface MarkdownViewerProps {
  url: string;
  filename: string;
  onBack: () => void;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ url, filename, onBack }) => {
  const [content, setContent] = useState<string>('Loading...');

  const isBinary = /\.(docx|pptx|xlsx|pdf|zip|png|jpg|jpeg)$/i.test(filename);

  useEffect(() => {
    if (isBinary) return; // Don't fetch binary content as text
    fetch(url)
      .then(res => res.text())
      .then(text => setContent(text))
      .catch(() => setContent('Failed to load markdown.'));
  }, [url, isBinary]);

  const getFileTypeText = () => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'docx') return 'Microsoft Word Document (.docx)';
    if (ext === 'pptx') return 'Microsoft PowerPoint Presentation (.pptx)';
    if (ext === 'xlsx') return 'Microsoft Excel Spreadsheet (.xlsx)';
    if (ext === 'pdf') return 'PDF Document (.pdf)';
    return 'Binary Document';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <ArrowLeft size="18" color="#000" variant="Bold" /> Back
        </button>
        <div className={styles.filename}>{filename}</div>
      </div>
      <div className={styles.content}>
        {isBinary ? (
          <div className={styles.downloadContainer}>
            <div className={styles.downloadCard}>
              <div className={styles.docIcon}>
                <DocumentText size="64" color="#000" variant="Bold" />
              </div>
              <h3 className={styles.downloadTitle}>{filename}</h3>
              <p className={styles.downloadMeta}>{getFileTypeText()}</p>
              <p className={styles.downloadDesc}>
                Berkas ini adalah dokumen biner Microsoft Office / Media. Anda dapat mengunduh berkas ini langsung ke komputer Anda untuk dibuka dengan aplikasi Word, PowerPoint, atau Excel.
              </p>
              <a href={url} download={filename} className={styles.downloadBtn}>
                Unduh Berkas 📥
              </a>
            </div>
          </div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};
