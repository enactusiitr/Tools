'use client';

import { useState } from 'react';
import type { FieldMapping, FontInfo } from '@/lib/types';

interface FieldConfigPanelProps {
  field: FieldMapping | null;
  headers: string[];
  fonts: FontInfo[];
  onUpdate: (updated: FieldMapping) => void;
  onDelete: (id: string) => void;
}

export default function FieldConfigPanel({
  field,
  headers,
  fonts,
  onUpdate,
  onDelete,
}: FieldConfigPanelProps) {
  if (!field) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm text-slate-400 text-center py-8">
          Click on the canvas to add a text field, or select an existing field to
          configure it.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Field Settings
        </h3>
        <button
          onClick={() => onDelete(field.id)}
          className="text-xs text-red-500 hover:text-red-700 font-medium"
        >
          Delete
        </button>
      </div>

      {/* Column Mapping */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Excel Column
        </label>
        <select
          value={field.column}
          onChange={(e) => onUpdate({ ...field, column: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select column...</option>
          {headers.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>

      {/* Font Family */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Font Family
        </label>
        <select
          value={field.fontFamily}
          onChange={(e) => onUpdate({ ...field, fontFamily: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {fonts.map((f) => (
            <option
              key={f.family}
              value={f.family}
              style={{ fontFamily: f.family }}
            >
              {f.family} {f.source === 'custom' ? '(custom)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Font Size: {field.fontSize}px
        </label>
        <input
          type="range"
          min={8}
          max={120}
          value={field.fontSize}
          onChange={(e) =>
            onUpdate({ ...field, fontSize: parseInt(e.target.value) })
          }
          className="w-full accent-primary-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>8</span>
          <span>120</span>
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Text Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={field.color}
            onChange={(e) => onUpdate({ ...field, color: e.target.value })}
            className="w-8 h-8 border border-slate-200 rounded cursor-pointer"
          />
          <input
            type="text"
            value={field.color}
            onChange={(e) => onUpdate({ ...field, color: e.target.value })}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Alignment */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Alignment
        </label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onUpdate({ ...field, align })}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                field.align === align
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Max Width */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Max Width: {field.maxWidth}px
        </label>
        <input
          type="range"
          min={50}
          max={1200}
          value={field.maxWidth}
          onChange={(e) =>
            onUpdate({ ...field, maxWidth: parseInt(e.target.value) })
          }
          className="w-full accent-primary-600"
        />
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">
            X
          </label>
          <input
            type="number"
            value={Math.round(field.x)}
            onChange={(e) =>
              onUpdate({ ...field, x: parseInt(e.target.value) || 0 })
            }
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">
            Y
          </label>
          <input
            type="number"
            value={Math.round(field.y)}
            onChange={(e) =>
              onUpdate({ ...field, y: parseInt(e.target.value) || 0 })
            }
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );
}
