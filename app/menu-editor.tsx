"use client";

import {
  ArrowDownToLine, ArrowUpRight, Check, ChevronDown, CircleHelp, Copy, ImagePlus,
  Languages, LoaderCircle, MousePointer2, Plus, QrCode, ScanText, Trash2, X,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { exportMenu, loadImage, prepareImage, renderMenu, sampleMenu } from "@/lib/canvas";
import { languages, maxUpload, newLine, type Language, type MenuImage, type MenuLine } from "@/lib/menu";

type Result = { url: string; qr: string };
type Drag = { id: string; x: number; y: number; left: number; top: number };
type Position = Pick<MenuLine, "x" | "y" | "width" | "height">;
const positionFields: { key: keyof Position; label: string }[] = [
  { key: "x", label: "가로 위치" }, { key: "y", label: "세로 위치" },
  { key: "width", label: "너비" }, { key: "height", label: "높이" },
];

async function post<T>(url: string, body: FormData | string): Promise<T> {
  const response = await fetch(url, {
    method: "POST", body,
    headers: typeof body === "string" ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error ?? "요청을 처리할 수 없습니다. 다시 시도해 주세요.");
  return data as T;
}

export function MenuEditor() {
  const [image, setImage] = useState<MenuImage>();
  const [source, setSource] = useState<HTMLImageElement>();
  const [lines, setLines] = useState<MenuLine[]>([]);
  const [targets, setTargets] = useState<Language[]>(["en", "ja", "zh-CN"]);
  const [tab, setTab] = useState<Language | "original">("en");
  const [active, setActive] = useState<string>();
  const [title, setTitle] = useState("Table & Seoul");
  const [sample, setSample] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | undefined>("샘플 불러오는 중");
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>();
  const input = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag>(null);
  const resultCard = useRef<HTMLElement>(null);
  const selected = lines.find((line) => line.id === active);
  const editLanguage = tab === "original" ? targets[0] : tab;
  const complete = targets.length > 0 && lines.length > 0 &&
    lines.every((line) => targets.every((language) => line.translations[language]?.trim()));

  useEffect(() => {
    let alive = true;
    void sampleMenu().then(({ image, lines }) => {
      if (!alive) { URL.revokeObjectURL(image.url); return; }
      setImage(image);
      setLines(lines);
    }).catch(() => { if (alive) setError("샘플 메뉴를 불러오지 못했습니다."); })
      .finally(() => { if (alive) setBusy(undefined); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!image) return;
    let alive = true;
    void loadImage(image.url).then((loaded) => {
      if (alive) setSource(loaded);
    }).catch(() => { if (alive) setError("메뉴판 이미지를 읽을 수 없습니다."); });
    return () => { alive = false; URL.revokeObjectURL(image.url); };
  }, [image]);

  useEffect(() => {
    const canvas = preview.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (ctx && source && image && source.src === image.url) {
      void renderMenu(ctx, source, lines, tab === "original" ? undefined : tab);
    }
  }, [image, lines, source, tab]);

  useEffect(() => {
    if (result) resultCard.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [result]);

  async function run(label: string, work: () => Promise<void>) {
    setBusy(label);
    setError("");
    setStatus("");
    try { await work(); }
    catch (error) { setError(error instanceof Error ? error.message : "다시 시도해 주세요."); }
    finally { setBusy(undefined); }
  }

  async function upload(file?: File) {
    if (!file || busy) return;
    await run("이미지 불러오는 중", async () => {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size || file.size > maxUpload) {
        throw new Error("8MB 이하의 JPG, PNG, WebP 이미지를 선택해 주세요.");
      }
      const prepared = await prepareImage(file);
      setImage(prepared);
      setLines([]);
      setActive(undefined);
      setResult(undefined);
      setSample(false);
      setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 80));
      setTab("original");
      setAdding(false);
    });
  }

  function resetSample() {
    void run("샘플 불러오는 중", async () => {
      const next = await sampleMenu();
      setImage(next.image);
      setLines(next.lines);
      setTargets(["en", "ja", "zh-CN"]);
      setTitle("Table & Seoul");
      setTab("en");
      setActive(undefined);
      setResult(undefined);
      setAdding(false);
      setSample(true);
    });
  }

  function toggleLanguage(language: Language) {
    setResult(undefined);
    if (targets.includes(language)) {
      const remaining = targets.filter((target) => target !== language);
      setTargets(remaining);
      if (tab === language) setTab(remaining[0] ?? "original");
    } else {
      setTargets([...targets, language]);
      setTab(language);
    }
  }

  function recognize() {
    if (!source || source.src !== image?.url || lines.length) return;
    void run("메뉴명 읽는 중", async () => {
      const form = new FormData();
      form.set("image", await exportMenu(source, [], "en"), "menu.webp");
      const data = await post<{ lines: MenuLine[] }>("/api/ocr", form);
      if (!data.lines.length) throw new Error("글자를 찾지 못했습니다. 영역을 직접 추가할 수 있습니다.");
      setLines(data.lines);
      setActive(data.lines[0]?.id);
      setResult(undefined);
      setStatus(`${data.lines.length}개 영역을 찾았습니다. 메뉴명과 위치를 확인해 주세요.`);
    });
  }

  function translate() {
    if (!targets.length || !lines.length) return;
    void run("메뉴명 번역 중", async () => {
      const jobs = targets.map((language) => ({
        language, missing: lines.filter((line) => !line.translations[language]?.trim()),
      })).filter(({ missing }) => missing.length);
      const next = new Map(lines.map((line) => [line.id, { ...line, translations: { ...line.translations } }]));
      await Promise.all(jobs.map(async ({ language, missing }) => {
        const data = await post<{ translations: Record<Language, string[]> }>("/api/translate", JSON.stringify({
          texts: missing.map((line) => line.text.trim()), targets: [language],
        }));
        missing.forEach(({ id }, index) => { next.get(id)!.translations[language] = data.translations[language][index]; });
      }));
      setLines([...next.values()]);
      setTab(targets[0]);
      setResult(undefined);
      setStatus("번역을 불러왔습니다. 미리보기에서 글자와 위치를 확인해 주세요.");
    });
  }

  function publish() {
    if (!source || source.src !== image?.url || !title.trim() || !complete) return;
    void run("QR 메뉴 만드는 중", async () => {
      const form = new FormData();
      form.set("title", title.trim());
      for (const language of targets) {
        form.set(language, await exportMenu(source, lines, language), `${language}.webp`);
      }
      const { url } = await post<{ url: string }>("/api/menus", form);
      const qr = await QRCode.toDataURL(url, { width: 320, margin: 3, color: { dark: "#15203a", light: "#ffffff" } });
      setResult({ url, qr });
    });
  }

  function update(id: string, change: Partial<MenuLine>) {
    setResult(undefined);
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...change } : line));
  }

  function addRegion(event: PointerEvent<HTMLDivElement>) {
    if (!adding || !image || busy) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const width = Math.max(1, Math.round(image.width * 0.46));
    const height = Math.max(1, Math.round(image.height * 0.07));
    const x = Math.min(image.width - width, Math.max(0, Math.round((event.clientX - bounds.left) / bounds.width * image.width)));
    const y = Math.min(image.height - height, Math.max(0, Math.round((event.clientY - bounds.top) / bounds.height * image.height)));
    const line = newLine(crypto.randomUUID?.() ?? String(Date.now()), "", { x, y, width, height });
    setLines([...lines, line]);
    setActive(line.id);
    setAdding(false);
    setResult(undefined);
  }

  function moveRegion(event: PointerEvent<HTMLButtonElement>, line: MenuLine) {
    if (!drag.current || drag.current.id !== line.id || !image || !preview.current) return;
    const bounds = preview.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(image.width - line.width, Math.round(drag.current.left + (event.clientX - drag.current.x) * image.width / bounds.width)));
    const y = Math.max(0, Math.min(image.height - line.height, Math.round(drag.current.top + (event.clientY - drag.current.y) * image.height / bounds.height)));
    if (x !== line.x || y !== line.y) update(line.id, { x, y });
  }

  return (
    <>
      <div className="workspace">
        <aside className="card settings" aria-label="메뉴판 설정">
          <div className="settings-section">
            <div className="section-heading"><span className="step-icon"><ImagePlus size={18} /></span><h2>메뉴판 이미지</h2></div>
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }} />
            <button type="button" className={`upload-zone ${dragOver ? "drag-over" : ""}`} disabled={!!busy}
              onClick={() => input.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => { event.preventDefault(); setDragOver(false); void upload(event.dataTransfer.files[0]); }}>
              <ImagePlus size={22} />
              <strong>이미지를 선택하거나 끌어오세요</strong>
              <span>JPG, PNG, WebP · 최대 8MB</span>
            </button>
            <div className="file-row">
              <span title={image?.name}>{image?.name ?? "선택한 이미지 없음"}</span>
              <button type="button" className="text-button" onClick={resetSample} disabled={!!busy}>샘플 불러오기</button>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-heading"><span className="step-icon"><Languages size={18} /></span><h2>번역 언어</h2></div>
            <div className="language-list">
              {languages.map(({ code, label, native }) => (
                <button type="button" key={code} className={`language-option ${targets.includes(code) ? "checked" : ""}`}
                  aria-pressed={targets.includes(code)} disabled={!!busy} onClick={() => toggleLanguage(code)}>
                  <span><strong>{label}</strong><small>{native}</small></span>
                  <span className="check-box">{targets.includes(code) && <Check size={13} strokeWidth={3} />}</span>
                </button>
              ))}
            </div>
            <div className="auto-actions">
              <button type="button" className="secondary" disabled={!source || !!busy || !!lines.length} onClick={recognize}><ScanText size={16} /> 글자 읽기</button>
              <button type="button" className="secondary" disabled={!targets.length || !lines.length || lines.some((line) => !line.text.trim()) || complete || !!busy} onClick={translate}><Languages size={16} /> 자동 번역</button>
            </div>
          </div>

          <div className="settings-section publish">
            <label className="field-label" htmlFor="menu-title">공개 메뉴판 이름</label>
            <input className="field" id="menu-title" maxLength={80} value={title} disabled={!!busy}
              onChange={(event) => { setTitle(event.target.value); setResult(undefined); }} />
            <button type="button" className="primary" disabled={!complete || !title.trim() || !source || !!busy} onClick={publish}>
              {busy === "QR 메뉴 만드는 중" ? <LoaderCircle size={18} className="spinner" /> : <QrCode size={18} />}
              {busy === "QR 메뉴 만드는 중" ? busy : "QR 메뉴 만들기"}
            </button>
            {!complete && <p className="hint">선택한 모든 언어의 번역문을 입력하면 공개할 수 있습니다.</p>}
          </div>
        </aside>

        <section className="card preview" aria-label="메뉴판 편집">
          <div className="preview-header">
            <div><h2>메뉴판 미리보기</h2><p>{sample ? "샘플 메뉴" : (image?.name ?? "메뉴판 이미지")}</p></div>
            <button className="secondary add-button" type="button" aria-pressed={adding} disabled={!source || !!busy}
              onClick={() => setAdding(!adding)}>{adding ? <X size={16} /> : <Plus size={16} />}{adding ? "추가 취소" : "영역 추가"}</button>
          </div>
          <div className="tab-bar" aria-label="미리보기 언어">
            <button type="button" aria-pressed={tab === "original"} onClick={() => setTab("original")}>원본</button>
            {languages.filter(({ code }) => targets.includes(code)).map(({ code, native }) => (
              <button type="button" key={code} aria-pressed={tab === code} onClick={() => setTab(code)}>{native}</button>
            ))}
          </div>
          <div className="preview-body">
            <div className="board">
              {image ? (
                <div className={`artboard ${adding ? "adding" : ""}`} onPointerDown={addRegion}
                  style={{ width: Math.min(image.width, 650 * image.width / image.height) }}>
                  <canvas width={image.width} height={image.height} ref={preview} aria-label="메뉴판 이미지 미리보기" />
                  {lines.map((line, index) => (
                    <button key={line.id} type="button" disabled={!!busy} tabIndex={adding ? -1 : 0}
                      className={`region ${active === line.id ? "active" : ""}`}
                      aria-label={`${index + 1}. ${line.text || "메뉴명 입력"}`}
                      style={{ left: `${line.x / image.width * 100}%`, top: `${line.y / image.height * 100}%`,
                        width: `${line.width / image.width * 100}%`, height: `${line.height / image.height * 100}%` }}
                      onClick={() => setActive(line.id)}
                      onPointerDown={(event) => {
                        if (adding || busy || event.button !== 0) return;
                        event.stopPropagation();
                        setActive(line.id);
                        drag.current = { id: line.id, x: event.clientX, y: event.clientY, left: line.x, top: line.y };
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => moveRegion(event, line)}
                      onLostPointerCapture={() => { drag.current = null; }}>
                      <span>{index + 1}</span>
                    </button>
                  ))}
                </div>
              ) : <div className="empty-board"><ImagePlus size={28} /><span>메뉴판 이미지를 올려주세요.</span></div>}
            </div>
            <p className="board-help"><MousePointer2 size={14} />{adding ? "이미지에서 번역 영역의 왼쪽 위 지점을 선택하세요." : "번역 영역을 클릭해 수정하거나 드래그해 옮길 수 있어요."}</p>
            {selected && image && (
              <div className="region-editor">
                <div className="region-heading"><strong>번역 영역 편집</strong>
                  <button type="button" className="text-button danger" disabled={!!busy} onClick={() => {
                    setLines(lines.filter(({ id }) => id !== selected.id)); setActive(undefined); setResult(undefined);
                  }}><Trash2 size={15} /> 삭제</button>
                </div>
                <div className="editor-fields">
                  <label>원문<input className="field" maxLength={500} value={selected.text} disabled={!!busy}
                    onChange={(event) => update(selected.id, { text: event.target.value })} /></label>
                  {editLanguage && <label>{languages.find(({ code }) => code === editLanguage)?.label} 번역
                    <input className="field" maxLength={500} value={selected.translations[editLanguage] ?? ""} disabled={!!busy}
                      onChange={(event) => update(selected.id, { translations: { ...selected.translations, [editLanguage]: event.target.value } })} />
                  </label>}
                </div>
                <details>
                  <summary>위치, 크기 및 색상 <ChevronDown size={15} /></summary>
                  <div className="region-options">
                    {positionFields.map(({ key, label }) => {
                      const max = { x: image.width - selected.width, y: image.height - selected.height,
                        width: image.width - selected.x, height: image.height - selected.y }[key];
                      const min = key === "x" || key === "y" ? 0 : 1;
                      return <label key={key}>{label}<input className="field" type="number" min={min} max={max} disabled={!!busy}
                        value={selected[key]} onChange={(event) => {
                          const value = event.target.valueAsNumber;
                          if (Number.isFinite(value)) update(selected.id, { [key]: Math.max(min, Math.min(max, value)) });
                        }} /></label>;
                    })}
                    <label>글자 크기<input className="field" type="number" min={1} max={512} value={selected.fontSize} disabled={!!busy}
                      onChange={(event) => {
                        const value = event.target.valueAsNumber;
                        if (Number.isFinite(value)) update(selected.id, { fontSize: Math.max(1, Math.min(512, value)) });
                      }} /></label>
                    <label className="background-mode">원문 처리
                      <select className="field" value={selected.backgroundMode ?? "restore"} disabled={!!busy}
                        onChange={(event) => update(selected.id, { backgroundMode: event.target.value === "fill" ? "fill" : "restore" })}>
                        <option value="restore">글자 지우기</option>
                        <option value="fill">배경색으로 가리기</option>
                      </select>
                    </label>
                    {selected.backgroundMode === "fill" && <>
                      <label>배경색<input className="field" type="color" value={selected.background} disabled={!!busy}
                        onChange={(event) => update(selected.id, { background: event.target.value })} /></label>
                      <label className="transparency-control">
                        <span>배경 투명도 <span aria-hidden="true">{selected.backgroundTransparency ?? 0}%</span></span>
                        <input type="range" min={0} max={100} value={selected.backgroundTransparency ?? 0}
                          aria-valuetext={`${selected.backgroundTransparency ?? 0}%`} disabled={!!busy}
                          onChange={(event) => update(selected.id, { backgroundTransparency: event.target.valueAsNumber })} />
                      </label>
                    </>}
                    <label>글자색<input className="field" type="color" value={selected.color} disabled={!!busy}
                      onChange={(event) => update(selected.id, { color: event.target.value })} /></label>
                  </div>
                </details>
              </div>
            )}
          </div>
        </section>
      </div>
      {error && <p className="notice error" role="alert"><CircleHelp size={17} /> {error}</p>}
      {(status || (busy && busy !== "QR 메뉴 만드는 중")) && <p className="notice" role="status">{busy && <LoaderCircle size={16} className="spinner" />}{busy ?? status}</p>}
      {result && (
        <section className="card result" ref={resultCard} aria-label="공개한 QR 메뉴">
          <img src={result.qr} alt="공개 메뉴판 QR 코드" width={126} height={126} />
          <div>
            <h2>QR 메뉴가 준비됐어요</h2>
            <p className="result-url">{result.url}</p>
            <div className="result-actions">
              <a className="secondary" href={result.url} target="_blank" rel="noreferrer">메뉴 열기 <ArrowUpRight size={16} /></a>
              <button className="secondary" type="button" onClick={() => {
                void navigator.clipboard?.writeText(result.url).then(() => setStatus("링크를 복사했습니다."))
                  .catch(() => setStatus("링크를 선택해 복사해 주세요."));
                if (!navigator.clipboard) setStatus("링크를 선택해 복사해 주세요.");
              }}><Copy size={16} /> 링크 복사</button>
              <a className="secondary" href={result.qr} download="menu-qr.png"><ArrowDownToLine size={16} /> QR 저장</a>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
