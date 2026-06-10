"use client";

import type { ReactNode } from "react";
import type { DatamixFieldDefinition, DatamixMediaAsset } from "@datamix/core";

import { TiptapRichTextEditor } from "./TiptapRichTextEditor";
import { MediaAssetFieldPicker } from "./media-asset-field-picker";
import {
  createGeneratedFieldHint,
  createGeneratedFieldPlaceholder,
  type GeneratedRecordFormValue,
} from "../_lib/record-drafts";

type GeneratedRecordFieldInputProps = {
  disabled?: boolean;
  field: DatamixFieldDefinition;
  mediaAssets: DatamixMediaAsset[];
  onOpenMediaLibrary: () => void;
  value: GeneratedRecordFormValue;
  onChange: (nextValue: GeneratedRecordFormValue) => void;
};

function createInlineMarkdownPreview(
  value: string,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let cursor = 0;
  let matchIndex = 0;

  for (const match of value.matchAll(tokenPattern)) {
    const matchText = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      nodes.push(value.slice(cursor, index));
    }

    if (match[2] && match[3]) {
      nodes.push(
        <a
          href={match[3]}
          key={`${keyPrefix}-link-${matchIndex}`}
          rel="noreferrer"
          target="_blank"
        >
          {match[2]}
        </a>,
      );
    } else if (match[5]) {
      nodes.push(<code key={`${keyPrefix}-code-${matchIndex}`}>{match[5]}</code>);
    } else if (match[7]) {
      nodes.push(<strong key={`${keyPrefix}-strong-${matchIndex}`}>{match[7]}</strong>);
    } else if (match[9]) {
      nodes.push(<em key={`${keyPrefix}-em-${matchIndex}`}>{match[9]}</em>);
    } else {
      nodes.push(matchText);
    }

    cursor = index + matchText.length;
    matchIndex += 1;
  }

  if (cursor < value.length) {
    nodes.push(value.slice(cursor));
  }

  return nodes;
}

function renderMarkdownPreview(markdown: string) {
  const normalizedMarkdown = markdown.replaceAll("\r\n", "\n");

  if (normalizedMarkdown.trim().length === 0) {
    return (
      <p className="markdown-preview-empty">
        Nothing to preview yet. Start writing markdown on the left.
      </p>
    );
  }

  const lines = normalizedMarkdown.split("\n");
  const blocks: ReactNode[] = [];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex] ?? "";
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      lineIndex += 1;
      continue;
    }

    if (trimmedLine.startsWith("```")) {
      const codeLines: string[] = [];
      lineIndex += 1;

      while (lineIndex < lines.length && !(lines[lineIndex] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[lineIndex] ?? "");
        lineIndex += 1;
      }

      if (lineIndex < lines.length) {
        lineIndex += 1;
      }

      blocks.push(
        <pre className="markdown-preview-code" key={`code-${lineIndex}`}>
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.*)$/);

    if (headingMatch) {
      const content = createInlineMarkdownPreview(
        headingMatch[2] ?? "",
        `heading-${lineIndex}`,
      );

      switch (headingMatch[1]) {
        case "#":
          blocks.push(<h1 key={`heading-${lineIndex}`}>{content}</h1>);
          break;
        case "##":
          blocks.push(<h2 key={`heading-${lineIndex}`}>{content}</h2>);
          break;
        default:
          blocks.push(<h3 key={`heading-${lineIndex}`}>{content}</h3>);
          break;
      }

      lineIndex += 1;
      continue;
    }

    if (trimmedLine.startsWith(">")) {
      const quoteLines: string[] = [];

      while (lineIndex < lines.length) {
        const nextLine = lines[lineIndex] ?? "";

        if (!nextLine.trim().startsWith(">")) {
          break;
        }

        quoteLines.push(nextLine.trim().replace(/^>\s?/, ""));
        lineIndex += 1;
      }

      blocks.push(
        <blockquote key={`quote-${lineIndex}`}>
          {createInlineMarkdownPreview(quoteLines.join(" "), `quote-${lineIndex}`)}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmedLine)) {
      const items: ReactNode[] = [];

      while (lineIndex < lines.length) {
        const nextLine = (lines[lineIndex] ?? "").trim();
        const nextMatch = nextLine.match(/^[-*]\s+(.*)$/);

        if (!nextMatch) {
          break;
        }

        items.push(
          <li key={`ul-item-${lineIndex}`}>
            {createInlineMarkdownPreview(nextMatch[1] ?? "", `ul-${lineIndex}`)}
          </li>,
        );
        lineIndex += 1;
      }

      blocks.push(<ul key={`ul-${lineIndex}`}>{items}</ul>);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmedLine)) {
      const items: ReactNode[] = [];

      while (lineIndex < lines.length) {
        const nextLine = (lines[lineIndex] ?? "").trim();
        const nextMatch = nextLine.match(/^\d+\.\s+(.*)$/);

        if (!nextMatch) {
          break;
        }

        items.push(
          <li key={`ol-item-${lineIndex}`}>
            {createInlineMarkdownPreview(nextMatch[1] ?? "", `ol-${lineIndex}`)}
          </li>,
        );
        lineIndex += 1;
      }

      blocks.push(<ol key={`ol-${lineIndex}`}>{items}</ol>);
      continue;
    }

    const paragraphLines: string[] = [];

    while (lineIndex < lines.length) {
      const nextLine = lines[lineIndex] ?? "";
      const nextTrimmedLine = nextLine.trim();

      if (
        nextTrimmedLine.length === 0 ||
        nextTrimmedLine.startsWith("```") ||
        /^#{1,3}\s+/.test(nextTrimmedLine) ||
        nextTrimmedLine.startsWith(">") ||
        /^[-*]\s+/.test(nextTrimmedLine) ||
        /^\d+\.\s+/.test(nextTrimmedLine)
      ) {
        break;
      }

      paragraphLines.push(nextTrimmedLine);
      lineIndex += 1;
    }

    blocks.push(
      <p key={`paragraph-${lineIndex}`}>
        {createInlineMarkdownPreview(paragraphLines.join(" "), `paragraph-${lineIndex}`)}
      </p>,
    );
  }

  return <div className="markdown-preview-content">{blocks}</div>;
}

export function GeneratedRecordFieldInput({
  disabled = false,
  field,
  mediaAssets,
  onOpenMediaLibrary,
  value,
  onChange,
}: GeneratedRecordFieldInputProps) {
  const label = field.required ? `${field.label} *` : field.label;
  const hint = createGeneratedFieldHint(field);

  if (field.type === "boolean") {
    return (
      <label className="field checkbox-field generated-checkbox-field">
        <span>{label}</span>
        <input
          checked={value === true}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <small className="field-hint">{hint}</small>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="field">
        <span>{label}</span>
        <select
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          value={typeof value === "string" ? value : ""}
        >
          <option disabled={field.required} value="">
            Select an option
          </option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small className="field-hint">{hint}</small>
      </label>
    );
  }

  if (field.type === "richText") {
    return (
      <TiptapRichTextEditor
        disabled={disabled}
        hint={hint}
        label={label}
        onChange={(nextValue) => onChange(nextValue)}
        placeholder={createGeneratedFieldPlaceholder(field)}
        required={field.required}
        value={typeof value === "string" ? value : ""}
      />
    );
  }

  if (field.type === "image") {
    const stringValue = typeof value === "string" ? value : "";

    return (
      <div className="field media-field">
        <label className="field">
          <span>{label}</span>
          <input
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={createGeneratedFieldPlaceholder(field)}
            required={field.required}
            type="text"
            value={stringValue}
          />
          <small className="field-hint">{hint}</small>
        </label>
        {!disabled ? (
          <MediaAssetFieldPicker
            fieldType="image"
            mediaAssets={mediaAssets}
            onChange={onChange}
            onOpenMediaLibrary={onOpenMediaLibrary}
            value={stringValue}
          />
        ) : null}
      </div>
    );
  }

  if (field.type === "imageGallery" || (field.type === "relationship" && field.multiple)) {
    return (
      <div className="field media-field">
        <label className="field">
          <span>{label}</span>
          <textarea
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={createGeneratedFieldPlaceholder(field)}
            required={field.required}
            rows={field.type === "imageGallery" ? 4 : 6}
            value={typeof value === "string" ? value : ""}
          />
          <small className="field-hint">{hint}</small>
        </label>
        {field.type === "imageGallery" && !disabled ? (
          <MediaAssetFieldPicker
            fieldType="imageGallery"
            mediaAssets={mediaAssets}
            onChange={onChange}
            onOpenMediaLibrary={onOpenMediaLibrary}
            value={typeof value === "string" ? value : ""}
          />
        ) : null}
      </div>
    );
  }

  if (field.type === "markdown") {
    const stringValue = typeof value === "string" ? value : "";

    return (
      <div className="field markdown-field">
        <div className="markdown-field-header">
          <span>{label}</span>
          <small className="field-hint">{hint}</small>
        </div>
        <div className="markdown-field-grid">
          <label className="field markdown-field-panel">
            <span>Editor</span>
            <textarea
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
              placeholder={createGeneratedFieldPlaceholder(field)}
              required={field.required}
              rows={10}
              value={stringValue}
            />
          </label>
          <div className="markdown-field-panel markdown-preview-panel">
            <span>Preview</span>
            {renderMarkdownPreview(stringValue)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <label className="field">
      <span>{label}</span>
      <input
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={createGeneratedFieldPlaceholder(field)}
        required={field.required}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={typeof value === "string" ? value : ""}
      />
      <small className="field-hint">{hint}</small>
    </label>
  );
}
