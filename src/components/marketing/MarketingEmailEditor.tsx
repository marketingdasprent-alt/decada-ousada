import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import ImageResize from 'tiptap-extension-resize-image';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Heading1, Heading2, Undo, Redo, Image as ImageIcon
} from 'lucide-react';
import { useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  content: string;
  onChange: (html: string) => void;
}

const MarketingEmailEditor = ({ content, onChange }: Props) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageResize,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastContentRef.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      editor.commands.setContent(content);
      lastContentRef.current = content;
    }
  }, [content, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 5MB)'); return; }
    try {
      const ext = file.name.split('.').pop();
      const name = `marketing/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('document-templates').upload(name, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('document-templates').getPublicUrl(name);
      editor?.chain().focus().insertContent(`<img src="${publicUrl}" />`).run();
      toast.success('Imagem adicionada');
    } catch { toast.error('Erro ao carregar imagem'); }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  if (!editor) return null;

  const Btn = ({ onClick, active, children, title }: any) => (
    <Button type="button" variant={active ? 'secondary' : 'ghost'} size="sm"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }} title={title} className="h-8 w-8 p-0" tabIndex={-1}>
      {children}
    </Button>
  );

  return (
    <div className="border rounded-lg bg-background">
      <div className="border-b p-2 flex flex-wrap gap-1">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado"><UnderlineIcon className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1"><Heading1 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2"><Heading2 className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Esquerda"><AlignLeft className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centro"><AlignCenter className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Direita"><AlignRight className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista"><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleImageUpload} />
        <Btn onClick={() => imageInputRef.current?.click()} title="Imagem"><ImageIcon className="h-4 w-4" /></Btn>
        <div className="w-px bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Desfazer"><Undo className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Refazer"><Redo className="h-4 w-4" /></Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default MarketingEmailEditor;
