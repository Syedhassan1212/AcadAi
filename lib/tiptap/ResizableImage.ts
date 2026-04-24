import Image from '@tiptap/extension-image';

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: attributes => ({
          style: `width: ${attributes.width}; height: auto; cursor: nwse-resize;`,
        }),
      },
      height: {
        default: 'auto',
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('div');
      container.className = 'resizable-image-container relative inline-block group';
      
      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.style.width = node.attrs.width;
      img.style.height = node.attrs.height;
      img.className = 'rounded-xl border border-outline-variant/20 shadow-sm transition-all';
      
      const handle = document.createElement('div');
      handle.className = 'resizer-handle opacity-0 group-hover:opacity-100 absolute bottom-2 right-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize border-2 border-on-primary shadow-lg transition-all z-10';

      let isResizing = false;
      let startX: number, startWidth: number;

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startWidth = img.offsetWidth;
        
        const onMouseMove = (moveEvent: MouseEvent) => {
          if (!isResizing) return;
          const deltaX = moveEvent.clientX - startX;
          const newWidth = Math.max(100, startWidth + deltaX);
          img.style.width = `${newWidth}px`;
        };

        const onMouseUp = () => {
          isResizing = false;
          const finalWidth = img.style.width;
          const pos = getPos();
          if (typeof pos === 'number' && typeof getPos === 'function') {
            editor.commands.command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                width: finalWidth,
              });
              return true;
            });
          }
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      container.appendChild(img);
      container.appendChild(handle);

      return {
        dom: container,
        update: updatedNode => {
          if (updatedNode.type.name !== 'image') return false;
          img.src = updatedNode.attrs.src;
          img.style.width = updatedNode.attrs.width;
          return true;
        },
      };
    };
  },
});
