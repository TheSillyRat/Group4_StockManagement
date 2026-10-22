import React, { useEffect, useRef, useState } from "react";
import { inventoryApi } from "../services/api";
import Icon from "./Icon";

export default function CatalogAiChat({
  entityType,
  onApply,
  onBusyChange,
  disabled = false,
}) {
  const product = entityType === "product";
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(null),
    logRef = useRef(null);
  const sample = product
    ? "Thêm sản phẩm Cà phê Arabica, đơn vị kg, tồn ban đầu 50."
    : "Tạo kho mới tên Kho Bình Dương.";
  useEffect(
    () => () => {
      requestRef.current?.abort();
      onBusyChange?.(false);
    },
    [onBusyChange],
  );
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, busy]);
  const send = async (event) => {
    event.preventDefault();
    if (busy || disabled || !draft.trim()) return;
    const next = [...messages, { role: "user", content: draft.trim() }];
    const controller = new AbortController();
    requestRef.current = controller;
    setMessages(next);
    setDraft("");
    setError("");
    setBusy(true);
    onBusyChange?.(true);
    try {
      const result = await inventoryApi.extractCatalog(
        entityType,
        next.slice(-11),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      onApply(result);
      setMessages([...next, { role: "assistant", content: result.message }]);
    } catch (err) {
      if (!controller.signal.aborted) {
        setMessages(messages);
        setDraft(next[next.length - 1].content);
        setError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        onBusyChange?.(false);
      }
    }
  };
  return (
    <section
      className="catalog-ai-chat"
      aria-label={`Trợ lý AI thêm ${product ? "sản phẩm" : "kho hàng"}`}
    >
      <div className="catalog-chat-heading">
        <span>
          <Icon name="spark" size={17} />
        </span>
        <div>
          <strong>Nhập nhanh cùng AI</strong>
          <small>Mô tả tự nhiên · Kiểm tra trước khi lưu</small>
        </div>
        <span className="badge badge-accent">AI</span>
      </div>
      <div
        className="catalog-chat-log"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        ref={logRef}
      >
        <p className="chat-bubble assistant">
          {product
            ? "Bạn muốn thêm sản phẩm gì? Cho tôi biết tên, đơn vị tính và tồn ban đầu (nếu có)."
            : "Bạn muốn tạo kho tên gì? Mô tả ngắn, tôi sẽ điền tên kho giúp bạn."}
        </p>
        {messages.map((message, i) => (
          <p key={i} className={`chat-bubble ${message.role}`}>
            <span>{message.role === "user" ? "Bạn" : "Trợ lý AI"}</span>
            {message.content}
          </p>
        ))}
        {busy && (
          <p className="chat-bubble assistant chat-thinking" role="status">
            <span className="spinner" /> Đang phân tích...
          </p>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error} Thông tin trong biểu mẫu vẫn được giữ nguyên.
        </p>
      )}
      {!messages.length && (
        <button
          type="button"
          className="chat-example"
          disabled={busy || disabled}
          onClick={() => setDraft(sample)}
        >
          Thử ví dụ: {sample}
        </button>
      )}
      <form className="catalog-chat-composer" onSubmit={send}>
        <label className="sr-only" htmlFor={`catalog-chat-${entityType}`}>
          Mô tả {product ? "sản phẩm" : "kho hàng"} cho AI
        </label>
        <textarea
          id={`catalog-chat-${entityType}`}
          rows={2}
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            product
              ? "Ví dụ: Thêm Bút bi xanh, đơn vị hộp, tồn 20..."
              : "Ví dụ: Thêm kho hàng tên Kho Bình Dương..."
          }
          disabled={busy || disabled}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              send(e);
            }
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || disabled || !draft.trim()}
          aria-label="Gửi yêu cầu cho AI"
        >
          {busy ? (
            <span className="spinner" />
          ) : (
            <Icon name="arrow" size={17} />
          )}
        </button>
      </form>
      <p className="catalog-chat-hint">
        AI chỉ điền thông tin. Chỉ lưu khi bạn bấm nút xác nhận bên dưới.
      </p>
    </section>
  );
}
