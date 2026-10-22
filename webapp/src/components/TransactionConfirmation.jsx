import React, { useEffect, useState } from "react";
import Icon from "./Icon";
import { inventoryApi } from "../services/api";

export default function TransactionConfirmation({
  extractedData,
  onConfirm,
  onCancel,
  isSubmitting,
  products = [],
  warehouses = [],
  suppliers = [],
}) {
  const [form, setForm] = useState(extractedData),
    [createNewProduct, setCreateNewProduct] = useState(false);
  const [plan, setPlan] = useState(null),
    [planLoading, setPlanLoading] = useState(false),
    [planError, setPlanError] = useState(""),
    [usePlan, setUsePlan] = useState(false);
  const [newSupplier, setNewSupplier] = useState(false),
    [supplierName, setSupplierName] = useState(""),
    [createdSuppliers, setCreatedSuppliers] = useState([]),
    [supplierBusy, setSupplierBusy] = useState(false),
    [supplierError, setSupplierError] = useState("");
  const supplierList = [
    ...suppliers,
    ...createdSuppliers.filter(
      (s) => !suppliers.some((x) => x.supplierId === s.supplierId),
    ),
  ];
  const product = products.find(
    (p) =>
      p.productId === Number(form.productId) ||
      (!form.productId &&
        p.productName.toLowerCase() ===
          (form.productName || "").trim().toLowerCase()),
  );
  const warehouse = warehouses.find(
    (w) =>
      !w.isUnallocated &&
      (w.warehouseId === Number(form.warehouseId) ||
        (!form.warehouseId &&
          w.warehouseName.toLowerCase() ===
            (form.warehouseName || "").trim().toLowerCase())),
  );
  const supplier = supplierList.find(
    (s) =>
      s.supplierId === Number(form.supplierId) ||
      (!form.supplierId &&
        s.supplierName.toLowerCase() ===
          (form.supplierName || "").trim().toLowerCase()),
  );
  const qty = Number(form.quantity),
    isDispatch = form.transactionType === "Dispatch",
    isReceive = form.transactionType === "Receive";
  const destination = warehouses.find(
    (w) =>
      !w.isUnallocated &&
      (w.warehouseId === Number(form.destinationWarehouseId) ||
        (!form.destinationWarehouseId &&
          w.warehouseName.toLowerCase() ===
            (form.destinationWarehouseName || "").trim().toLowerCase())),
  );
  const internalTransfer = isDispatch && form.destinationType === "Warehouse";
  const destinationId = internalTransfer ? destination?.warehouseId : null;
  const destinationValid =
    !isDispatch ||
    form.destinationType === "External" ||
    (internalTransfer &&
      destination &&
      destination.warehouseId !== warehouse?.warehouseId);
  const missingProduct = !product && !!form.productName?.trim(),
    creatingProduct = isReceive && !product && createNewProduct;
  const wrongUnit =
    product &&
    form.unit &&
    form.unit.trim().toLowerCase() !== product.unit.toLowerCase();
  const currentPlan =
    plan &&
    plan.productId === product?.productId &&
    plan.warehouseId === warehouse?.warehouseId &&
    Number(plan.destinationWarehouseId || 0) === Number(destinationId || 0) &&
    plan.requestedQuantity === qty
      ? plan
      : null;
  const localStock =
    product?.warehouseStocks?.find(
      (s) => s.warehouseId === warehouse?.warehouseId,
    )?.quantity ?? 0;
  const available = currentPlan?.availableQuantity ?? localStock;
  const insufficient = isDispatch && product && warehouse && qty > available;
  const acceptedPlan = !!(usePlan && currentPlan?.canFulfill);
  const valid =
    (isReceive || isDispatch) &&
    (product ||
      (creatingProduct &&
        form.productName?.trim() &&
        form.productName.trim().length <= 200 &&
        form.unit?.trim() &&
        form.unit.trim().length <= 50)) &&
    warehouse &&
    Number.isInteger(qty) &&
    qty > 0 &&
    qty <= 2147483647 &&
    !wrongUnit &&
    !supplierBusy &&
    destinationValid &&
    (!isReceive || !!supplier) &&
    (!isDispatch ||
      (!planLoading &&
        !planError &&
        !!currentPlan &&
        (!insufficient || acceptedPlan)));
  useEffect(() => {
    setPlan(null);
    setUsePlan(false);
    setPlanError("");
    setPlanLoading(false);
    if (
      !isDispatch ||
      !product ||
      !warehouse ||
      !destinationValid ||
      !Number.isInteger(qty) ||
      qty <= 0 ||
      qty > 2147483647
    )
      return;
    const controller = new AbortController();
    setPlanLoading(true);
    const timer = setTimeout(
      () =>
        inventoryApi
          .getDispatchOptions(
            product.productId,
            warehouse.warehouseId,
            qty,
            controller.signal,
            destinationId,
          )
          .then(setPlan)
          .catch((e) => {
            if (!controller.signal.aborted) setPlanError(e.message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setPlanLoading(false);
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    isDispatch,
    product?.productId,
    warehouse?.warehouseId,
    qty,
    destinationId,
    destinationValid,
  ]);
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const addSupplier = async () => {
    if (!supplierName.trim() || supplierBusy) return;
    setSupplierBusy(true);
    setSupplierError("");
    try {
      const existing = supplierList.find(
        (s) =>
          s.supplierName.toLowerCase() === supplierName.trim().toLowerCase(),
      );
      const added =
        existing ||
        (await inventoryApi.createSupplier({
          supplierName: supplierName.trim(),
        }));
      if (!existing) setCreatedSuppliers((list) => [...list, added]);
      setForm((f) => ({
        ...f,
        supplierId: added.supplierId,
        supplierName: added.supplierName,
      }));
      setNewSupplier(false);
      setSupplierName("");
    } catch (e) {
      setSupplierError(e.message);
    } finally {
      setSupplierBusy(false);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!valid || isSubmitting) return;
    const error = await onConfirm({
      transactionType: form.transactionType,
      productId: product?.productId || null,
      productName: product?.productName || form.productName.trim(),
      createNewProduct: !!creatingProduct,
      warehouseId: warehouse.warehouseId,
      supplierId: isReceive ? supplier.supplierId : null,
      destinationType: isDispatch ? form.destinationType : null,
      destinationWarehouseId: destinationId,
      externalDestination:
        isDispatch && form.destinationType === "External"
          ? form.externalDestination?.trim() || null
          : null,
      quantity: qty,
      unit: product?.unit || form.unit.trim(),
      confirmAdditionalDispatches: acceptedPlan,
      dispatchAllocations: acceptedPlan
        ? currentPlan.suggestedAllocations
        : null,
    });
    if (error?.dispatchOptions) {
      setPlan(error.dispatchOptions);
      setUsePlan(false);
    }
  };
  return (
    <section className="card review-card">
      <div className="card-header">
        <div className="section-heading">
          <span className="section-icon">
            <Icon name="check" />
          </span>
          <div>
            <h2 className="card-title">Kiểm tra & xác nhận</h2>
            <p className="card-subtitle">
              {isDispatch
                ? "Xuất từ kho đến kho khác hoặc ra ngoài · Không có nhà cung cấp"
                : "Nhập từ nhà cung cấp vào kho"}
              . Chưa thay đổi tồn kho.
            </p>
          </div>
        </div>
        <span className={`badge ${valid ? "badge-matched" : "badge-neutral"}`}>
          {valid ? "Sẵn sàng xác nhận" : "Cần kiểm tra thông tin"}
        </span>
      </div>
      {missingProduct && isDispatch && (
        <div className="alert alert-error" role="alert">
          <Icon name="alert" />
          <div>
            <strong>Sản phẩm không tồn tại</strong>
            <p>
              “{form.productName}” chưa có trong danh mục. Không thể xuất kho
              sản phẩm này.
            </p>
          </div>
        </div>
      )}
      {missingProduct && isReceive && !createNewProduct && (
        <div className="alert alert-warning new-product-question" role="alert">
          <Icon name="alert" />
          <div>
            <strong>Sản phẩm “{form.productName}” chưa tồn tại.</strong>
            <p>Bạn có muốn tạo sản phẩm mới và nhập kho không?</p>
            <div className="new-product-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSubmitting}
                onClick={() => setCreateNewProduct(true)}
              >
                Có, tạo sản phẩm mới
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={isSubmitting}
                onClick={() => {
                  setCreateNewProduct(false);
                  setForm((f) => ({
                    ...f,
                    productId: null,
                    productName: "",
                    unit: "",
                  }));
                }}
              >
                Không, chọn sản phẩm có sẵn
              </button>
            </div>
          </div>
        </div>
      )}
      {creatingProduct && (
        <div className="alert alert-success" role="status">
          <Icon name="plus" />
          <div>
            <strong>Tạo sản phẩm mới & nhập kho</strong>
            <p>
              Sản phẩm chỉ được tạo cùng đơn nhập từ nhà cung cấp khi xác nhận
              cuối.
            </p>
          </div>
        </div>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={isSubmitting || supplierBusy}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="review-type">Loại giao dịch *</label>
              <select
                id="review-type"
                value={form.transactionType || ""}
                required
                onChange={(e) => {
                  update("transactionType", e.target.value);
                  setCreateNewProduct(false);
                  setNewSupplier(false);
                }}
              >
                <option value="" disabled>
                  Chọn loại giao dịch
                </option>
                <option value="Receive">Nhập từ nhà cung cấp</option>
                <option value="Dispatch">Xuất hàng / chuyển đến kho</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="review-product">Sản phẩm *</label>
              <select
                id="review-product"
                value={
                  product?.productId ||
                  (missingProduct || creatingProduct ? "__new__" : "")
                }
                required
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setCreateNewProduct(true);
                    setForm((f) => ({
                      ...f,
                      productId: null,
                      productName: "",
                      unit: "",
                    }));
                    return;
                  }
                  setCreateNewProduct(false);
                  const p = products.find(
                    (p) => p.productId === Number(e.target.value),
                  );
                  setForm((f) => ({
                    ...f,
                    productId: p?.productId,
                    productName: p?.productName || "",
                    unit: p?.unit || "",
                  }));
                }}
              >
                <option value="" disabled>
                  {form.productName
                    ? `${form.productName} — cần chọn lại`
                    : "Chọn sản phẩm"}
                </option>
                {isReceive && (
                  <option value="__new__">
                    {missingProduct
                      ? `${form.productName} — sản phẩm mới`
                      : "Tạo sản phẩm mới..."}
                  </option>
                )}
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName}
                  </option>
                ))}
              </select>
            </div>
            {creatingProduct && (
              <div className="form-field">
                <label htmlFor="new-product-name">Tên sản phẩm mới *</label>
                <input
                  id="new-product-name"
                  value={form.productName || ""}
                  maxLength={200}
                  required
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      productId: null,
                      productName: e.target.value,
                    }))
                  }
                />
              </div>
            )}
            <div className="form-field">
              <label htmlFor="review-warehouse">
                {isDispatch ? "Kho xuất *" : "Kho nhận *"}
              </label>
              <select
                id="review-warehouse"
                value={warehouse?.warehouseId || ""}
                required
                onChange={(e) => {
                  const w = warehouses.find(
                    (w) => w.warehouseId === Number(e.target.value),
                  );
                  setForm((f) => ({
                    ...f,
                    warehouseId: w?.warehouseId,
                    warehouseName: w?.warehouseName || "",
                  }));
                }}
              >
                <option value="" disabled>
                  Chọn kho thực tế
                </option>
                {warehouses
                  .filter((w) => !w.isUnallocated)
                  .map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="review-quantity">Số lượng *</label>
              <input
                id="review-quantity"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                required
                value={form.quantity ?? ""}
                aria-invalid={!!(insufficient && !acceptedPlan)}
                onChange={(e) => update("quantity", e.target.value)}
              />
            </div>
            {isDispatch && (
              <div className="form-field">
                <label htmlFor="review-destination">Xuất đến đâu? *</label>
                <select
                  id="review-destination"
                  required
                  value={
                    form.destinationType === "External"
                      ? "External"
                      : destination?.warehouseId || ""
                  }
                  onChange={(e) => {
                    const w = warehouses.find(
                      (w) => w.warehouseId === Number(e.target.value),
                    );
                    setForm((f) => ({
                      ...f,
                      destinationType:
                        e.target.value === "External"
                          ? "External"
                          : "Warehouse",
                      destinationWarehouseId: w?.warehouseId || null,
                      destinationWarehouseName: w?.warehouseName || null,
                      externalDestination: null,
                    }));
                  }}
                >
                  <option value="" disabled>
                    Chọn kho nhận hoặc xuất ra ngoài
                  </option>
                  <option value="External">Xuất hàng ra ngoài</option>
                  <optgroup label="Chuyển đến kho hiện có">
                    {warehouses
                      .filter(
                        (w) =>
                          !w.isUnallocated &&
                          w.warehouseId !== warehouse?.warehouseId,
                      )
                      .map((w) => (
                        <option key={w.warehouseId} value={w.warehouseId}>
                          {w.warehouseName}
                        </option>
                      ))}
                  </optgroup>
                </select>
                <small>
                  {internalTransfer
                    ? "Chuyển giữa kho: tổng tồn toàn hệ thống không đổi."
                    : "Chọn rõ nơi đến trước khi xác nhận xuất."}
                </small>
              </div>
            )}
            {isDispatch && form.destinationType === "External" && (
              <div className="form-field">
                <label htmlFor="review-external-destination">
                  Người nhận / địa điểm bên ngoài <span>Tùy chọn</span>
                </label>
                <input
                  id="review-external-destination"
                  maxLength={200}
                  value={form.externalDestination || ""}
                  onChange={(e) =>
                    update("externalDestination", e.target.value)
                  }
                  placeholder="Ví dụ: Khách hàng An Phát, cửa hàng Quận 1"
                />
              </div>
            )}
            <div className="form-field">
              <label htmlFor="review-unit">Đơn vị tính</label>
              <input
                id="review-unit"
                readOnly={!creatingProduct}
                required={!!creatingProduct}
                maxLength={50}
                value={product?.unit || form.unit || ""}
                onChange={(e) => update("unit", e.target.value)}
                placeholder="Đơn vị sản phẩm"
              />
            </div>
            {isReceive && (
              <div className="form-field">
                <label htmlFor="review-supplier">Nhập từ nhà cung cấp *</label>
                <select
                  id="review-supplier"
                  required
                  value={supplier?.supplierId || ""}
                  onChange={(e) => {
                    const s = supplierList.find(
                      (s) => s.supplierId === Number(e.target.value),
                    );
                    setForm((f) => ({
                      ...f,
                      supplierId: s?.supplierId || null,
                      supplierName: s?.supplierName || null,
                    }));
                  }}
                >
                  <option value="">
                    {form.supplierName && !supplier
                      ? `${form.supplierName} — chưa có, hãy thêm mới`
                      : "Chọn nhà cung cấp"}
                  </option>
                  {supplierList.map((s) => (
                    <option key={s.supplierId} value={s.supplierId}>
                      {s.supplierName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setNewSupplier(!newSupplier);
                    setSupplierName(form.supplierName || "");
                  }}
                >
                  + Thêm nhà cung cấp
                </button>
              </div>
            )}
          </div>
        </fieldset>
        {isReceive && newSupplier && (
          <div className="inline-supplier">
            <label htmlFor="quick-supplier-name">Tên nhà cung cấp mới</label>
            <div>
              <input
                id="quick-supplier-name"
                maxLength={200}
                value={supplierName}
                disabled={supplierBusy || isSubmitting}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Ví dụ: Công ty An Phát"
              />
              <button
                type="button"
                className="btn btn-outline"
                disabled={!supplierName.trim() || supplierBusy || isSubmitting}
                onClick={addSupplier}
              >
                {supplierBusy ? "Đang thêm..." : "Thêm & chọn"}
              </button>
            </div>
            {supplierError && (
              <p className="field-error" role="alert">
                {supplierError}
              </p>
            )}
            <small>
              Nhà cung cấp được thêm vào danh mục; đơn nhập vẫn chờ xác nhận.
            </small>
          </div>
        )}
        {isReceive && !supplier && (
          <p className="field-error" role="alert">
            Vui lòng chọn nhà cung cấp để nhập hàng vào kho.
          </p>
        )}
        {isDispatch && !destinationValid && (
          <p className="field-error" role="alert">
            Vui lòng chọn nơi đến. Kho nhận phải khác kho xuất.
          </p>
        )}
        {isDispatch && destinationValid && (
          <div className="destination-summary" role="status">
            <Icon name="arrow" size={16} />
            <span>
              {warehouse?.warehouseName || "Kho xuất"} →{" "}
              <strong>
                {internalTransfer
                  ? destination.warehouseName
                  : form.externalDestination?.trim() || "Bên ngoài"}
              </strong>
            </span>
          </div>
        )}
        {wrongUnit && (
          <div className="alert alert-warning" role="alert">
            <span>
              Đơn vị phải là {product.unit}.{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => update("unit", product.unit)}
                disabled={isSubmitting}
              >
                Dùng đơn vị {product.unit}
              </button>
            </span>
          </div>
        )}
        {planLoading && (
          <p className="stock-plan-status" role="status">
            <span className="spinner" /> Đang kiểm tra tồn tại từng kho...
          </p>
        )}
        {planError && (
          <div className="alert alert-error" role="alert">
            {planError} Thay đổi kho hoặc số lượng để kiểm tra lại.
          </div>
        )}
        {(product || creatingProduct) && warehouse && (
          <div
            className={`stock-preview ${insufficient && !acceptedPlan ? "invalid" : ""}`}
          >
            <div>
              <small>TỒN TẠI {warehouse.warehouseName}</small>
              <strong>
                {available.toLocaleString("vi-VN")}{" "}
                <span>{product?.unit || form.unit}</span>
              </strong>
            </div>
            <Icon name="arrow" />
            <div>
              <small>{isDispatch ? "YÊU CẦU XUẤT" : "NHẬP VÀO KHO"}</small>
              <strong>
                {Number.isFinite(qty) ? qty.toLocaleString("vi-VN") : "—"}{" "}
                <span>{product?.unit || form.unit}</span>
              </strong>
            </div>
            <div>
              <small>TỔNG TỒN SẢN PHẨM</small>
              <strong>{product?.stockQuantity ?? 0}</strong>
            </div>
          </div>
        )}
        {isDispatch && currentPlan?.shortageQuantity > 0 && (
          <section
            className="dispatch-suggestions"
            aria-label="Gợi ý xuất từ kho khác"
          >
            <div className="alert alert-warning" role="alert">
              <Icon name="alert" />
              <div>
                <strong>Kho đã chọn không đủ hàng</strong>
                <p>{currentPlan.message}</p>
              </div>
            </div>
            {currentPlan.alternatives.length > 0 && (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>KHO CÒN HÀNG</th>
                      <th>TỒN</th>
                      <th>ĐỀ XUẤT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPlan.alternatives.map((s) => (
                      <tr key={s.warehouseId}>
                        <td>{s.warehouseName}</td>
                        <td>
                          {s.quantity} {s.unit}
                        </td>
                        <td>
                          {s.quantity >= qty && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              disabled={isSubmitting}
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  warehouseId: s.warehouseId,
                                  warehouseName: s.warehouseName,
                                }))
                              }
                            >
                              Xuất toàn bộ từ kho này
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {currentPlan.canFulfill && !usePlan && (
              <div className="new-product-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  onClick={() => setUsePlan(true)}
                >
                  Có, tạo kế hoạch xuất từ các kho còn hàng
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    setUsePlan(false);
                    update("quantity", available);
                  }}
                >
                  Không, chỉ xuất số có tại kho đã chọn
                </button>
              </div>
            )}
            {acceptedPlan && (
              <div className="accepted-dispatch-plan">
                <strong>
                  Đã đồng ý kế hoạch — {currentPlan.suggestedAllocations.length}{" "}
                  đơn xuất, tổng {qty} {product.unit}
                </strong>
                <ul>
                  {currentPlan.suggestedAllocations.map((a) => (
                    <li key={a.warehouseId}>
                      {warehouses.find((w) => w.warehouseId === a.warehouseId)
                        ?.warehouseName || a.warehouseId}
                      :{" "}
                      <strong>
                        {a.quantity} {product.unit}
                      </strong>
                    </li>
                  ))}
                </ul>
                <p>
                  Chưa lưu đơn nào. Bấm xác nhận bên dưới để lưu toàn bộ cùng
                  lúc.
                </p>
                <button
                  type="button"
                  className="text-button"
                  disabled={isSubmitting}
                  onClick={() => setUsePlan(false)}
                >
                  Hủy kế hoạch bổ sung
                </button>
              </div>
            )}
          </section>
        )}
        <div className="review-actions">
          <p>
            <Icon name="check" size={16} /> Tồn từng kho và lịch sử được lưu
            cùng lúc.
          </p>
          <button
            type="button"
            className="btn btn-outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Hủy giao dịch
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!valid || isSubmitting}
          >
            {isSubmitting
              ? "Đang lưu..."
              : creatingProduct
                ? "Xác nhận tạo sản phẩm & nhập kho"
                : acceptedPlan
                  ? `Xác nhận ${currentPlan.suggestedAllocations.length} đơn xuất`
                  : "Xác nhận & lưu giao dịch"}
          </button>
        </div>
      </form>
    </section>
  );
}
