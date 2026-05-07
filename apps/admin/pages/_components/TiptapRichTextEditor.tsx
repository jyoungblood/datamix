import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useId, useState } from "react";

import "../../styles/tiptap-editor.css";

type TiptapRichTextEditorProps = {
  disabled?: boolean;
  label: string;
  hint: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (nextValue: string) => void;
};

type MarkdownCapableEditor = TiptapEditor & {
  markdown?: {
    parse: (markdown: string) => unknown;
  };
};

function looksLikeMarkdown(text: string) {
  return (
    /^#{1,6}\s/m.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /\*[^*]+\*/.test(text) ||
    /\[.+\]\(.+\)/.test(text) ||
    /^[-*+]\s/m.test(text) ||
    /^\d+\.\s/m.test(text) ||
    /^>\s/m.test(text) ||
    /^```/m.test(text) ||
    /^---$/m.test(text) ||
    /`[^`]+`/.test(text)
  );
}

function normalizeEditorHtml(editor: TiptapEditor) {
  return editor.isEmpty ? "" : editor.getHTML();
}

function ToolbarButton({
  active = false,
  children,
  disabled = false,
  onClick,
  title,
}: {
  active?: boolean;
  children: string;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-label={title}
      aria-pressed={active}
      className={active ? "tiptap-toolbar-button is-active" : "tiptap-toolbar-button"}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function TiptapRichTextEditor({
  disabled = false,
  hint,
  label,
  onChange,
  placeholder = "",
  required = false,
  value,
}: TiptapRichTextEditorProps) {
  const editorId = useId();
  const [, setEditorVersion] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
      },
      handleKeyDown(view, event) {
        if (
          event.key === "Escape" ||
          event.key === "Esc" ||
          event.code === "Escape" ||
          event.keyCode === 27
        ) {
          if (view.dom instanceof HTMLElement) {
            view.dom.blur();
          }

          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }

          event.preventDefault();
          event.stopPropagation();
          return true;
        }

        return false;
      },
      handlePaste(_view, event) {
        const text = event.clipboardData?.getData("text/plain");
        const markdownEditor = editor as MarkdownCapableEditor | null;

        if (!text || !markdownEditor?.markdown || !looksLikeMarkdown(text)) {
          return false;
        }

        try {
          const parsedContent = markdownEditor.markdown.parse(text);
          markdownEditor.commands.insertContent(parsedContent);
          return true;
        } catch (error) {
          console.error("[Datamix] Unable to parse pasted markdown for rich text:", error);
          return false;
        }
      },
    },
    onSelectionUpdate() {
      setEditorVersion((current) => current + 1);
    },
    onUpdate({ editor: currentEditor }) {
      onChange(normalizeEditorHtml(currentEditor));
      setEditorVersion((current) => current + 1);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const normalizedValue = value || "";
    const normalizedEditorValue = normalizeEditorHtml(editor);

    if (normalizedValue === normalizedEditorValue) {
      return;
    }

    editor.commands.setContent(normalizedValue, {
      emitUpdate: false,
    });
    setEditorVersion((current) => current + 1);
  }, [editor, value]);

  const handleLink = () => {
    if (!editor || disabled) {
      return;
    }

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    const existingLink = editor.getAttributes("link");

    if (existingLink.href) {
      const shouldRemove = window.confirm("Remove link? Press Cancel to edit it.");

      if (shouldRemove) {
        editor.chain().focus().unsetLink().run();
        return;
      }

      const nextUrl = window.prompt("Enter URL:", String(existingLink.href));

      if (nextUrl) {
        editor.chain().focus().setLink({ href: nextUrl }).run();
      }

      return;
    }

    const nextUrl = window.prompt(
      "Enter URL:",
      selectedText &&
        (selectedText.startsWith("http://") || selectedText.startsWith("https://"))
        ? selectedText
        : "https://",
    );

    if (!nextUrl) {
      return;
    }

    const normalizedUrl =
      nextUrl.startsWith("http://") || nextUrl.startsWith("https://")
        ? nextUrl
        : `https://${nextUrl}`;

    if (selectedText) {
      editor.chain().focus().setLink({ href: normalizedUrl }).run();
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent(`<a href="${normalizedUrl}">${normalizedUrl}</a>`)
      .run();
  };

  const isReady = editor !== null;
  return (
    <div className="field">
      <span>{label}</span>
      <div className={disabled ? "tiptap-wrapper is-disabled" : "tiptap-wrapper"}>
        <div className="tiptap-toolbar" role="toolbar" aria-label={`${label} formatting options`}>
          <div className="tiptap-toolbar-group">
            <ToolbarButton
              active={editor?.isActive("bold") ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              title="Bold"
            >
              B
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive("italic") ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              I
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive("strike") ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              S
            </ToolbarButton>
          </div>

          <div className="tiptap-toolbar-group">
            <ToolbarButton
              active={editor?.isActive("heading", { level: 1 }) ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive("heading", { level: 2 }) ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive("heading", { level: 3 }) ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
            >
              H3
            </ToolbarButton>
          </div>

          <div className="tiptap-toolbar-group">
            <ToolbarButton
              active={editor?.isActive("bulletList") ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              title="Bullet list"
            >
              UL
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive("orderedList") ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              title="Numbered list"
            >
              OL
            </ToolbarButton>
          </div>

          <div className="tiptap-toolbar-group">
            <ToolbarButton
              active={editor?.isActive("blockquote") ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              title="Blockquote"
            >
              "
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive("code") ?? false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().toggleCode().run()}
              title="Inline code"
            >
              {"</>"}
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive("link") ?? false}
              disabled={!isReady || disabled}
              onClick={handleLink}
              title="Link"
            >
              Link
            </ToolbarButton>
            <ToolbarButton
              active={false}
              disabled={!isReady || disabled}
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              title="Horizontal rule"
            >
              HR
            </ToolbarButton>
          </div>
        </div>

        <EditorContent
          editor={editor}
          id={editorId}
          aria-label={label}
          aria-required={required}
          className="tiptap-editor-surface"
        />
      </div>
      <small className="field-hint">{hint}</small>
    </div>
  );
}
