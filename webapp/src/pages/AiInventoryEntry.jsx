import React, { useState, useEffect } from "react";
import { inventoryApi } from "../services/api";
import TransactionConfirmation from "../components/TransactionConfirmation";
import Icon from "../components/Icon";
const samples = [
  [
    "Nhập hàng",
    "Receive 20 boxes of Product A from Supplier X into Binh Tan Warehouse.",
  ],
  ["Xuất hàng", "Dispatch 15 boxes of Product A from Binh Tan Warehouse."],
  [
    "Nhập theo kg",
    "Receive 50 kg of Product C from Supplier Y into Thu Duc Warehouse.",
  ],
];
export default function AiInventoryEntry({ onViewHistory, onDataChange }) {
  const [prompt, setPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState(null);
  const [references, setReferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referenceError, setReferenceError] = useState("");
  const [saved, setSaved] = useState(null);
  const loadReferences = async () => {
    setLoading(true);
    setReferenceError("");
    try {
      const [products, warehouses, suppliers] = await Promise.all([
        inventoryApi.getProducts(),
        inventoryApi.getWarehouses(),
        inventoryApi.getSuppliers(),
      ]);
      setReferences({ products, warehouses, suppliers });
    } catch (err) {
      setReferenceError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadReferences();
  }, []);
  const extract = async (event) => {
    event.preventDefault();
    if (!prompt.trim() || processing || submitting) return;
    setProcessing(true);
    setData(null);
    setNotice(null);
    setSaved(null);
    try {
      const result = await inventoryApi.extractFromAi(prompt.trim());
      setData(result);
      if (result.isAmbiguous)
        setNotice({
          type: "warning",
          text:
            result.clarificationMessage ||
            "Vui lòng bổ sung thông tin còn thiếu trong biểu mẫu bên dưới.",
        });
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setProcessing(false);
    }
  };
  const confirm = async (form) => {
    if (submitting) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await inventoryApi.confirmTransaction(form);
      setSaved(result);
      setData(null);
      setPrompt("");
      await loadReferences();
      onDataChange?.();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };
  const busy = processing || submitting;
  return (
    <>
      <div className="workflow-steps" aria-label="Các bước giao dịch">
        {["Mô tả yêu cầu", "Kiểm tra thông tin", "Xác nhận & lưu"].map(
          (label, i) => (
            <div
              key={label}
              className={`workflow-step ${(saved ? 3 : data ? 1 : 0) >= i ? "current" : ""}`}
            >
              <span>
                {saved || (data && i === 0) ? (
                  <Icon name="check" size={15} />
                ) : (
                  `0${i + 1}`
                )}
              </span>
              <strong>{label}</strong>
              {i < 2 && <div className="step-line" />}
            </div>
          ),
        )}
      </div>
      {referenceError && (
        <div className="alert alert-error" role="alert">
          <Icon name="alert" />
          <div>
            <strong>Không tải được danh mục kho</strong>
            <p>{referenceError}</p>
          </div>
          <button
            className="btn btn-outline"
            onClick={loadReferences}
            disabled={loading}
          >
            Thử lại
          </button>
        </div>
      )}
      {notice && (
        <div className={`alert alert-${notice.type}`} role="alert">
          <Icon name="alert" />
          <span>{notice.text}</span>
        </div>
      )}
      {saved && (
        <div className="success-panel" role="status">
          <span className="success-icon">
            <Icon name="check" size={26} />
          </span>
          <div>
            <h3>Đã ghi nhận giao dịch #{saved.transactionId}</h3>
            <p>{saved.message}</p>
          </div>
          <button className="btn btn-outline" onClick={onViewHistory}>
            Xem lịch sử <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
      <div className="entry-layout">
        <section className="card prompt-card">
          <div className="card-header">
            <div className="section-heading">
              <span className="section-icon">
                <Icon name="spark" />
              </span>
              <div>
                <h2 className="card-title">Tạo giao dịch bằng AI</h2>
                <p className="card-subtitle">
                  Mô tả yêu cầu, chúng tôi chuẩn bị phần còn lại.
                </p>
              </div>
            </div>
            <span className="badge badge-accent">AI ASSISTANT</span>
          </div>
          <form onSubmit={extract}>
            <label className="form-label" htmlFor="inventory-prompt">
              Bạn muốn nhập hay xuất hàng?
            </label>
            <textarea
              id="inventory-prompt"
              rows={5}
              maxLength={4000}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setData(null);
                setNotice(null);
              }}
              disabled={busy}
              placeholder="Ví dụ: Nhập 20 box Product A từ Supplier X vào Binh Tan Warehouse..."
            />
            <div className="input-meta">
              <span>Nêu rõ sản phẩm, số lượng và kho hàng.</span>
              <span>{prompt.length}/4.000</span>
            </div>
            <div className="sample-label">THỬ MỘT YÊU CẦU MẪU</div>
            <div className="chip-container">
              {samples.map(([label, text]) => (
                <button
                  key={label}
                  type="button"
                  className="prompt-chip"
                  disabled={busy}
                  onClick={() => {
                    setPrompt(text);
                    setData(null);
                    setNotice(null);
                    setSaved(null);
                  }}
                >
                  {label}
                  <Icon name="arrow" size={14} />
                </button>
              ))}
            </div>
            <div className="prompt-actions">
              <span>
                <Icon name="check" size={15} /> Chỉ lưu sau khi bạn xác nhận
              </span>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || loading || !!referenceError || !prompt.trim()}
              >
                {processing ? (
                  <span className="spinner" />
                ) : (
                  <Icon name="spark" size={17} />
                )}{" "}
                {processing ? "Đang phân tích..." : "Phân tích yêu cầu"}
                {!processing && <Icon name="arrow" size={17} />}
              </button>
            </div>
          </form>
        </section>
        <aside className="entry-guide">
          <div className="guide-header">
            <Icon name="box" size={24} />
            <span>GIAO DỊCH RÕ RÀNG HƠN</span>
          </div>
          <h3>
            Đúng thông tin.
            <br />
            An tâm xác nhận.
          </h3>
          <p>
            AI hỗ trợ điền thông tin. Bạn luôn là người quyết định trước khi tồn
            kho thay đổi.
          </p>
          <div className="guide-list">
            <div>
              <span>01</span>
              <p>
                <strong>Mô tả cụ thể</strong>Sản phẩm, số lượng, đơn vị và kho.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Kiểm tra lần cuối</strong>Chỉnh sửa thông tin AI đã
                trích xuất.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Theo dõi dễ dàng</strong>Giao dịch được lưu vào lịch sử.
              </p>
            </div>
          </div>
          <div className="guide-bottom">
            Danh mục hiện tại{" "}
            <strong>
              {loading
                ? "Đang tải..."
                : references
                  ? `${references.products.length} sản phẩm · ${references.warehouses.length} kho`
                  : "Chưa kết nối"}
            </strong>
          </div>
        </aside>
      </div>
      {data && references && !referenceError && (
        <TransactionConfirmation
          key="review"
          extractedData={data}
          onConfirm={confirm}
          onCancel={() => {
            setData(null);
            setNotice(null);
          }}
          isSubmitting={submitting}
          {...references}
        />
      )}
      {!data && !saved && (
        <div className="review-placeholder">
          <span>
            <Icon name="check" size={24} />
          </span>
          <div>
            <h3>Thông tin giao dịch sẽ xuất hiện ở đây</h3>
            <p>Phân tích yêu cầu để kiểm tra và xác nhận trước khi lưu.</p>
          </div>
        </div>
      )}
    </>
  );
}
