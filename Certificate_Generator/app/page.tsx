'use client';

import { useState, useCallback } from 'react';
import StepIndicator from '@/components/StepIndicator';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import CanvasEditor from '@/components/CanvasEditor';
import FieldConfigPanel from '@/components/FieldConfigPanel';
import PreviewModal from '@/components/PreviewModal';
import {
  uploadTemplate,
  uploadExcel,
  fetchFonts,
  uploadFont,
  generatePreview,
  generateCertificates,
} from '@/lib/api';
import type { FieldMapping, FontInfo, SessionState } from '@/lib/types';

const STEPS = ['Template', 'Data', 'Map Fields', 'Preview', 'Generate'];

export default function HomePage() {
  const [state, setState] = useState<SessionState>({
    step: 1,
    templateUrl: null,
    templatePath: null,
    templateWidth: 0,
    templateHeight: 0,
    excelPath: null,
    headers: [],
    rows: [],
    fields: [],
    fileNameColumn: '',
    previewUrl: null,
  });

  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [selectedField, setSelectedField] = useState<FieldMapping | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<{
    zipUrl: string;
    total: number;
  } | null>(null);

  // ── Step 1: Template Upload ─────────────────────────────
  const handleTemplateUpload = useCallback(async (file: File) => {
    setLoadingTemplate(true);
    setError(null);
    try {
      const res = await uploadTemplate(file);
      if (!res.success || !res.data) {
        setError(res.error || 'Upload failed');
        return;
      }
      // Also load fonts
      const fontRes = await fetchFonts();
      if (fontRes.success && fontRes.data) {
        setFonts(fontRes.data);
      }
      setState((s) => ({
        ...s,
        templateUrl: res.data!.templateUrl,
        templatePath: res.data!.templatePath,
        templateWidth: res.data!.width,
        templateHeight: res.data!.height,
        step: 2,
      }));
    } catch (err) {
      setError('Failed to upload template');
    } finally {
      setLoadingTemplate(false);
    }
  }, []);

  // ── Step 2: Excel Upload ────────────────────────────────
  const handleExcelUpload = useCallback(async (file: File) => {
    setLoadingExcel(true);
    setError(null);
    try {
      const res = await uploadExcel(file);
      if (!res.success || !res.data) {
        setError(res.error || 'Upload failed');
        return;
      }
      setState((s) => ({
        ...s,
        headers: res.data!.headers,
        rows: res.data!.rows,
        excelPath: res.data!.filePath,
        fileNameColumn: res.data!.headers[0] || '',
        step: 3,
      }));
    } catch (err) {
      setError('Failed to upload data file');
    } finally {
      setLoadingExcel(false);
    }
  }, []);

  // ── Step 3: Field changes ────────────────────────────────
  const handleFieldsChange = useCallback((fields: FieldMapping[]) => {
    setState((s) => ({ ...s, fields }));
  }, []);

  const handleFieldUpdate = useCallback(
    (updated: FieldMapping) => {
      const newFields = state.fields.map((f) =>
        f.id === updated.id ? updated : f
      );
      setState((s) => ({ ...s, fields: newFields }));
      setSelectedField(updated);
    },
    [state.fields]
  );

  const handleFieldDelete = useCallback(
    (id: string) => {
      const newFields = state.fields.filter((f) => f.id !== id);
      setState((s) => ({ ...s, fields: newFields }));
      setSelectedField(null);
    },
    [state.fields]
  );

  // ── Font Upload ──────────────────────────────────────────
  const handleFontUpload = useCallback(async (file: File) => {
    try {
      const res = await uploadFont(file);
      if (res.success && res.data) {
        setFonts((prev) => [...prev, res.data!]);
      }
    } catch {
      // Silently fail – they can still use built-in fonts
    }
  }, []);

  // ── Step 4: Preview ──────────────────────────────────────
  const handlePreview = useCallback(async () => {
    if (!state.templatePath || state.fields.length === 0) {
      setError('Please add at least one field mapping');
      return;
    }
    // Validate all fields have column set
    const unmapped = state.fields.filter((f) => !f.column);
    if (unmapped.length > 0) {
      setError('Some fields have no Excel column mapped');
      return;
    }

    setLoadingPreview(true);
    setError(null);
    try {
      const res = await generatePreview(
        state.templatePath,
        state.fields,
        state.rows
      );
      if (!res.success || !res.data) {
        setError(res.error || 'Preview failed');
        return;
      }
      setState((s) => ({
        ...s,
        previewUrl: (res.data as any).previewUrl,
        step: Math.max(s.step, 4),
      }));
      setShowPreview(true);
    } catch {
      setError('Preview generation failed');
    } finally {
      setLoadingPreview(false);
    }
  }, [state.templatePath, state.fields, state.rows]);

  // ── Step 5: Generate ─────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!state.templatePath || state.fields.length === 0) {
      setError('Setup incomplete');
      return;
    }
    setLoadingGenerate(true);
    setError(null);
    setGenerateResult(null);
    try {
      const res = await generateCertificates(
        state.templatePath,
        state.fields,
        state.rows,
        state.fileNameColumn
      );
      if (!res.success || !res.data) {
        setError(res.error || 'Generation failed');
        return;
      }
      setGenerateResult({
        zipUrl: (res.data as any).zipUrl,
        total: (res.data as any).totalGenerated,
      });
      setState((s) => ({ ...s, step: 5 }));
    } catch {
      setError('Certificate generation failed');
    } finally {
      setLoadingGenerate(false);
    }
  }, [state]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <StepIndicator currentStep={state.step} steps={STEPS} />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── STEP 1: Upload Template ─────────────────────────── */}
      {state.step >= 1 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Step 1: Upload Certificate Template
          </h2>
          <FileUpload
            accept="image/png,image/jpeg,image/jpg"
            label="Upload Template Image"
            description="PNG or JPG, max 10MB. This will be used as the certificate background."
            loading={loadingTemplate}
            disabled={state.step > 1}
            onFileSelected={handleTemplateUpload}
            icon={
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            }
          />
          {state.templateUrl && state.step > 1 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Template uploaded ({state.templateWidth} × {state.templateHeight})
              <button
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    step: 1,
                    templateUrl: null,
                    templatePath: null,
                    fields: [],
                    previewUrl: null,
                  }))
                }
                className="text-xs text-slate-400 hover:text-slate-600 underline ml-2"
              >
                Re-upload
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── STEP 2: Upload Data ─────────────────────────────── */}
      {state.step >= 2 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Step 2: Upload Data File
          </h2>
          <FileUpload
            accept=".xlsx,.xls,.csv"
            label="Upload Excel or CSV"
            description=".xlsx, .xls, or .csv — each row becomes one certificate"
            loading={loadingExcel}
            disabled={state.step > 2}
            onFileSelected={handleExcelUpload}
            icon={
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v.375" />
              </svg>
            }
          />
          {state.headers.length > 0 && state.step > 2 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {state.rows.length} rows loaded with {state.headers.length} columns
                <button
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      step: 2,
                      headers: [],
                      rows: [],
                      fields: [],
                      previewUrl: null,
                    }))
                  }
                  className="text-xs text-slate-400 hover:text-slate-600 underline ml-2"
                >
                  Re-upload
                </button>
              </div>
              <DataPreview headers={state.headers} rows={state.rows} />
            </div>
          )}
        </section>
      )}

      {/* ── STEP 3: Map Fields ──────────────────────────────── */}
      {state.step >= 3 && state.templateUrl && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Step 3: Map Fields on Template
          </h2>

          {/* Font upload */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600 font-medium">
              Custom Font:
            </label>
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFontUpload(f);
              }}
              className="text-sm text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
            />
            {/* Filename Column Selector */}
            <div className="ml-auto flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">
                Filename Column:
              </label>
              <select
                value={state.fileNameColumn}
                onChange={(e) =>
                  setState((s) => ({ ...s, fileNameColumn: e.target.value }))
                }
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {state.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            {/* Canvas */}
            <div className="min-w-0">
              <CanvasEditor
                templateUrl={state.templateUrl}
                templateWidth={state.templateWidth}
                templateHeight={state.templateHeight}
                fields={state.fields}
                fonts={fonts}
                headers={state.headers}
                sampleRow={state.rows[0] || {}}
                onFieldsChange={handleFieldsChange}
                onSelectField={setSelectedField}
                selectedFieldId={selectedField?.id || null}
              />
            </div>

            {/* Config Panel */}
            <div className="space-y-4">
              <FieldConfigPanel
                field={selectedField}
                headers={state.headers}
                fonts={fonts}
                onUpdate={handleFieldUpdate}
                onDelete={handleFieldDelete}
              />

              {/* Fields list */}
              {state.fields.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    All Fields ({state.fields.length})
                  </h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {state.fields.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedField(f)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                          selectedField?.id === f.id
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        <span className="font-medium">
                          {f.column || 'Unmapped'}
                        </span>
                        <span className="text-slate-400 ml-2">
                          ({f.fontFamily}, {f.fontSize}px)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handlePreview}
              disabled={loadingPreview || state.fields.length === 0}
              className="px-6 py-2.5 bg-white border border-primary-300 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loadingPreview ? (
                <>
                  <div className="loader" style={{ width: 16, height: 16 }} />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview First Row
                </>
              )}
            </button>

            <button
              onClick={handleGenerate}
              disabled={loadingGenerate || state.fields.length === 0}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loadingGenerate ? (
                <>
                  <div
                    className="loader"
                    style={{
                      width: 16,
                      height: 16,
                      borderTopColor: '#fff',
                      borderColor: 'rgba(255,255,255,0.3)',
                    }}
                  />
                  Generating {state.rows.length} certificates...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Generate All ({state.rows.length} certificates)
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ── STEP 5: Download ────────────────────────────────── */}
      {generateResult && (
        <section className="mb-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <svg
              className="w-12 h-12 text-green-500 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-green-800 mb-1">
              {generateResult.total} Certificates Generated!
            </h3>
            <p className="text-sm text-green-600 mb-4">
              All certificates have been packaged into a ZIP file.
            </p>
            <a
              href={generateResult.zipUrl}
              download="certificates.zip"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download ZIP
            </a>
          </div>
        </section>
      )}

      {/* ── Preview Modal ────────────────────────────────────── */}
      {showPreview && state.previewUrl && (
        <PreviewModal
          previewUrl={state.previewUrl}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
