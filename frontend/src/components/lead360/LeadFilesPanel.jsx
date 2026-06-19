/**
 * LeadFilesPanel — file attachments for a lead's workspace.
 *
 * Staff can upload documents/photos to a lead, download and delete them.
 * Files are stored as base64 data URLs (15 MB cap) via:
 *   GET    /api/leads/:id/files
 *   POST   /api/leads/:id/files            { name, mime, data_url, size }
 *   GET    /api/leads/:id/files/:fid/download
 *   DELETE /api/leads/:id/files/:fid
 *
 * Fully i18n (en/bg/uk) via the l360_files_* keys.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../App';
import { useLang } from '../../i18n';
import { toast } from 'sonner';
import {
  UploadSimple,
  FilePdf,
  FileImage,
  FileDoc,
  File as FileIcon,
  DownloadSimple,
  Trash,
  SpinnerGap,
  Paperclip,
} from '@phosphor-icons/react';

const MAX_BYTES = 15 * 1024 * 1024;

const iconFor = (mime = '') => {
  if (mime.startsWith('image/')) return FileImage;
  if (mime === 'application/pdf') return FilePdf;
  if (mime.includes('word') || mime.includes('document')) return FileDoc;
  return FileIcon;
};

const fmtSize = (n) => {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const fmtWhen = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(); } catch { return ''; }
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function LeadFilesPanel({ leadId, onAfterChange }) {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/leads/${leadId}/files`);
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(t('l360_files_tooBig'));
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await axios.post(`${API_URL}/api/leads/${leadId}/files`, {
        name: file.name,
        mime: file.type || 'application/octet-stream',
        data_url: dataUrl,
        size: file.size,
      });
      toast.success(t('l360_files_uploaded'));
      load();
      if (onAfterChange) onAfterChange();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const download = async (f) => {
    setBusyId(f.id);
    try {
      const { data } = await axios.get(`${API_URL}/api/leads/${leadId}/files/${f.id}/download`);
      const link = document.createElement('a');
      link.href = data.data_url;
      link.download = data.name || f.name || 'file';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Download failed');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (f) => {
    if (!window.confirm(t('l360_files_confirmDelete'))) return;
    setBusyId(f.id);
    try {
      await axios.delete(`${API_URL}/api/leads/${leadId}/files/${f.id}`);
      toast.success(t('l360_files_deleted'));
      setItems((prev) => prev.filter((x) => x.id !== f.id));
      if (onAfterChange) onAfterChange();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4" data-testid="lead360-files-panel">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[13px] font-bold text-[#18181B] inline-flex items-center gap-1.5">
            <Paperclip size={15} /> {t('l360_files_title')}
          </div>
          <div className="text-[12px] text-[#A1A1AA] mt-0.5">{t('l360_files_subtitle')}</div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] bg-[#18181B] hover:bg-black text-white rounded-xl font-semibold disabled:opacity-50"
          data-testid="lead360-file-upload-btn"
        >
          {uploading ? <SpinnerGap size={14} className="animate-spin" /> : <UploadSimple size={14} weight="bold" />}
          {uploading ? t('l360_files_uploading') : t('l360_files_upload')}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={onPick} data-testid="lead360-file-input" />
      </div>

      {loading ? (
        <div className="py-10 text-center text-[#A1A1AA]"><SpinnerGap size={22} className="animate-spin inline" /></div>
      ) : items.length === 0 ? (
        <div className="text-[13px] text-[#A1A1AA] italic py-8 text-center border border-dashed border-[#E4E4E7] rounded-xl">
          {t('l360_files_empty')}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((f) => {
            const Ico = iconFor(f.mime);
            return (
              <li
                key={f.id}
                className="flex items-center gap-3 bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl px-3 py-2.5"
                data-testid={`lead360-file-${f.id}`}
              >
                <span className="w-9 h-9 rounded-lg bg-white border border-[#E4E4E7] flex items-center justify-center text-[#52525B] shrink-0">
                  <Ico size={18} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[#18181B] truncate">{f.name}</div>
                  <div className="text-[11px] text-[#A1A1AA] truncate">
                    {fmtSize(f.size)} · {fmtWhen(f.created_at)}
                    {f.uploaded_by_name ? ` · ${t('l360_files_by')} ${f.uploaded_by_name}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => download(f)}
                  disabled={busyId === f.id}
                  className="p-2 rounded-lg hover:bg-white text-[#52525B] disabled:opacity-50"
                  title={t('l360_files_download')}
                  data-testid={`lead360-file-download-${f.id}`}
                >
                  {busyId === f.id ? <SpinnerGap size={16} className="animate-spin" /> : <DownloadSimple size={16} />}
                </button>
                <button
                  onClick={() => remove(f)}
                  disabled={busyId === f.id}
                  className="p-2 rounded-lg hover:bg-[#FEE2E2] text-[#DC2626] disabled:opacity-50"
                  title={t('l360_files_delete')}
                  data-testid={`lead360-file-delete-${f.id}`}
                >
                  <Trash size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
