import React, { useState } from 'react';
import { Folder2, DocumentText, ArrowDown2, ArrowRight2 } from 'iconsax-react';
import styles from './FileTree.module.css';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

interface FileTreeProps {
  files: string[];
  currentProjectId: string;
  onPreviewMarkdown: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ files, currentProjectId, onPreviewMarkdown }) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Helper to build a sorted tree structure
  const buildTree = (fileList: string[]): TreeNode[] => {
    const root: Record<string, any> = {};

    fileList.forEach(file => {
      const parts = file.split('/');
      let current = root;
      let accumulatedPath = '';

      parts.forEach((part, index) => {
        const lowerPart = part.toLowerCase();
        const existingKey = Object.keys(current).find(k => k.toLowerCase() === lowerPart && k !== '_meta');
        const keyToUse = existingKey || part;

        accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (!current[keyToUse]) {
          current[keyToUse] = {
            _meta: {
              name: keyToUse,
              path: accumulatedPath,
              isFolder: !isLast
            }
          };
        }
        current = current[keyToUse];
      });
    });

    const convertToArray = (node: Record<string, any>): TreeNode[] => {
      return Object.keys(node)
        .filter(key => key !== '_meta')
        .map(key => {
          const childNode = node[key];
          return {
            name: childNode._meta.name,
            path: childNode._meta.path,
            isFolder: childNode._meta.isFolder,
            children: convertToArray(childNode)
          };
        })
        .sort((a, b) => {
          // Folders first, then alphabetically
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.name.localeCompare(b.name);
        });
    };

    return convertToArray(root);
  };

  const treeData = buildTree(files);

  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const isExpanded = !!expandedFolders[node.path];
      return (
        <div key={node.path} className={styles.folderNode}>
          <div 
            className={styles.folderHeader} 
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            <span className={styles.chevron}>
              {isExpanded ? <ArrowDown2 size="14" color="#000" variant="Bold" /> : <ArrowRight2 size="14" color="#000" variant="Bold" />}
            </span>
            <Folder2 size="18" color="#000" variant="Bold" className={styles.icon} />
            <span className={styles.folderName}>{node.name}</span>
          </div>
          {isExpanded && (
            <div className={styles.folderChildren}>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      const isMd = node.path.endsWith('.md');
      return (
        <div key={node.path} className={styles.fileNode}>
          <a
            href={`/workspace/${currentProjectId}/${encodeURIComponent(node.path)}`}
            target="_blank"
            rel="noreferrer"
            className={styles.fileLink}
            style={{ paddingLeft: `${depth * 16 + 30}px` }}
            onClick={(e) => {
              if (isMd) {
                e.preventDefault();
                onPreviewMarkdown(node.path);
              }
            }}
          >
            <DocumentText size="16" color="#000" variant="Bold" className={styles.icon} />
            <span className={styles.fileName}>{node.name}</span>
          </a>
        </div>
      );
    }
  };

  return (
    <div className={styles.treeContainer}>
      {treeData.map(node => renderNode(node, 0))}
    </div>
  );
};
