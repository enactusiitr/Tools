'use client';

import { useEffect, useRef, useState } from 'react';
import type { FieldMapping, FontInfo } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

type FabricCanvas = any;

interface CanvasEditorProps {
  templateUrl: string;
  templateWidth: number;
  templateHeight: number;
  fields: FieldMapping[];
  fonts: FontInfo[];
  headers: string[];
  sampleRow: Record<string, string>;
  onFieldsChange: (fields: FieldMapping[]) => void;
  onSelectField: (field: FieldMapping | null) => void;
  selectedFieldId: string | null;
}

export default function CanvasEditor({
  templateUrl,
  templateWidth,
  templateHeight,
  fields,
  fonts,
  headers,
  sampleRow,
  onFieldsChange,
  onSelectField,
  selectedFieldId,
}: CanvasEditorProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const fabricRef   = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const fieldsRef    = useRef<FieldMapping[]>(fields);
  const suppressSync = useRef(false);

  useEffect(() => { fieldsRef.current = fields; }, [fields]);

  // ── 1. Load Fabric.js once (browser-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // @ts-ignore
    if (window.fabric) { setFabricLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
    s.onload = () => setFabricLoaded(true);
    document.head.appendChild(s);
  }, []);

  // ── 2. Build canvas when Fabric is ready / template changes
  useEffect(() => {
    if (!fabricLoaded || !canvasRef.current || !containerRef.current) return;
    // @ts-ignore
    const fabric = window.fabric as any;
    if (!fabric) return;

    // ── Scale: make the canvas fit the available container width.
    //    CRITICAL: we use Fabric's ViewportTransform so ALL object
    //    coordinates (left/top/width) are in full-resolution template pixels.
    //    No manual * scale or / scale anywhere.
    const availableW = containerRef.current.getBoundingClientRect().width || 780;
    const scale = Math.min(1, (availableW - 4) / templateWidth);
    const displayW = Math.round(templateWidth  * scale);
    const displayH = Math.round(templateHeight * scale);

    const canvas = new fabric.Canvas(canvasRef.current, {
      width:               displayW,
      height:              displayH,
      selection:           true,
      enableRetinaScaling: false,   // keeps coordinate math simple
    });
    // ViewportTransform [scaleX,0,0,scaleY,tx,ty]
    // This makes Fabric render everything at the display scale while
    // keeping internal coordinates in template-pixel space.
    canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
    fabricRef.current = canvas;

    // ── Load template as background
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const bi = new fabric.Image(img, { left: 0, top: 0, selectable: false });
      canvas.setBackgroundImage(bi, () => canvas.renderAll());
    };
    img.onerror = () => console.error('Failed to load template bg:', templateUrl);
    img.src = templateUrl;

    // ── Double-click → add text field at template coordinates
    canvas.on('mouse:dblclick', (opt: any) => {
      // getPointer with VPT returns template-space coords directly ✓
      const ptr = canvas.getPointer(opt.e);
      const col = headers[0] || '';

      const newField: FieldMapping = {
        id: uuidv4(),
        column:     col,
        x:          Math.round(ptr.x),
        y:          Math.round(ptr.y),
        fontFamily: 'Open Sans',
        fontSize:   28,
        color:      '#000000',
        align:      'left',
        maxWidth:   400,
      };

      const tb = buildTextbox(fabric, newField, sampleRow);
      canvas.add(tb);
      canvas.setActiveObject(tb);
      canvas.renderAll();

      const updated = [...fieldsRef.current, newField];
      fieldsRef.current = updated;
      onFieldsChange(updated);
      onSelectField(newField);
    });

    // ── Selection events
    const pickField = (obj: any) => {
      if (!obj?.id) return;
      const f = fieldsRef.current.find((f) => f.id === obj.id);
      if (f) onSelectField(f);
    };
    canvas.on('selection:created', (e: any) => pickField(e.selected?.[0]));
    canvas.on('selection:updated', (e: any) => pickField(e.selected?.[0]));
    canvas.on('selection:cleared',  () => onSelectField(null));

    // ── Move / resize → write back template-space coords
    canvas.on('object:modified', (e: any) => {
      const obj = e.target;
      if (!obj?.id) return;

      suppressSync.current = true;
      const updated = fieldsRef.current.map((f) => {
        if (f.id !== obj.id) return f;
        return {
          ...f,
          // obj.left / obj.top are already in template px (VPT handles display)
          x:        Math.round(obj.left),
          y:        Math.round(obj.top),
          // scaleX can be set when user corner-drags
          maxWidth: Math.round(obj.width * (obj.scaleX ?? 1)),
        };
      });
      fieldsRef.current = updated;
      onFieldsChange(updated);
      setTimeout(() => { suppressSync.current = false; }, 50);
      const f = updated.find((f) => f.id === obj.id);
      if (f) onSelectField(f);
    });

    return () => { canvas.dispose(); fabricRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricLoaded, templateUrl, templateWidth, templateHeight]);

  // ── 3. Sync field config panel changes → canvas objects
  useEffect(() => {
    if (!fabricRef.current || suppressSync.current) return;
    // @ts-ignore
    const fabric = window.fabric as any;
    const canvas  = fabricRef.current;
    if (!canvas || !fabric) return;

    const objMap = new Map<string, any>();
    (canvas.getObjects() as any[]).forEach((o) => { if (o.id) objMap.set(o.id, o); });

    for (const field of fields) {
      const displayText = sampleRow[field.column] || `{${field.column || '?'}}`;
      const obj = objMap.get(field.id);
      if (obj) {
        obj.set({
          left:       field.x,
          top:        field.y,
          fontSize:   field.fontSize,
          fontFamily: field.fontFamily,
          fill:       field.color,
          textAlign:  field.align,
          width:      field.maxWidth,
          scaleX:     1,
          scaleY:     1,
          text:       displayText,
        });
        objMap.delete(field.id);
      } else {
        canvas.add(buildTextbox(fabric, field, sampleRow));
      }
    }
    objMap.forEach((obj) => canvas.remove(obj));
    canvas.renderAll();
  }, [fields, sampleRow]);

  // ── 4. Highlight active field
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !selectedFieldId) return;
    const obj = (canvas.getObjects() as any[]).find((o) => o.id === selectedFieldId);
    if (obj && canvas.getActiveObject() !== obj) {
      canvas.setActiveObject(obj);
      canvas.renderAll();
    }
  }, [selectedFieldId]);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      {!fabricLoaded ? (
        <div className="flex items-center justify-center py-20">
          <div className="loader" />
          <span className="ml-3 text-sm text-slate-500">Loading canvas editor…</span>
        </div>
      ) : (
        <div className="inline-block border-2 border-slate-300 rounded-lg overflow-hidden shadow-md">
          <canvas ref={canvasRef} />
        </div>
      )}
      <p className="text-xs text-slate-400 mt-2 text-center">
        Double-click on the template to place a text field · Drag to reposition · Side panel to configure
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper: create a Fabric Textbox from a FieldMapping.
// padding: 0  →  obj.top == text's top edge == output canvas y
// lockScalingY →  prevents height distortion
// ─────────────────────────────────────────────────────────────
function buildTextbox(fabric: any, field: FieldMapping, sampleRow: Record<string, string>) {
  const text = sampleRow[field.column] || `{${field.column || '?'}}`;
  return new fabric.Textbox(text, {
    id:                 field.id,
    left:               field.x,
    top:                field.y,
    fontSize:           field.fontSize,
    fontFamily:         field.fontFamily,
    fill:               field.color,
    width:              field.maxWidth,
    textAlign:          field.align,
    padding:            0,           // no internal padding → top == text top
    editable:           false,
    lockScalingY:       true,
    borderColor:        '#3b82f6',
    cornerColor:        '#3b82f6',
    cornerStyle:        'circle',
    transparentCorners: false,
    cornerSize:         8,
  });
}
