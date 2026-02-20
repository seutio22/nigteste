import React, { useRef, useCallback } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import '../styles/quill.css'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
  minHeight?: number | string
}

export function RichTextEditor({ content, onChange, placeholder = 'Digite seu conteúdo aqui...', readOnly = false, minHeight = 400 }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null)

  // Configuração dos módulos do Quill
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  }

  // Configuração dos formatos permitidos
  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image',
    'clean'
  ]

  // Função para lidar com mudanças no editor
  const handleChange = useCallback((value: string) => {
    onChange(value)
  }, [onChange])

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
          backgroundColor: 'white'
        }}
      />
    </div>
  )
}