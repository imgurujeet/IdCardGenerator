import React, { useEffect, useState } from 'react';
import {
  Lock,
  Eye,
  CheckCircle2,
  RefreshCw,
  Home,
  Copy,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TemplateDocument } from '../../../types/template';
import { renderCardToCanvas } from '../../generation/renderer/canvasRenderer';

interface SubmittedCardPreviewProps {
  submissionId: string;
  formTitle: string;
  templateDoc: TemplateDocument;
  formData: Record<string, any>;
  onReset?: () => void;
}

export const SubmittedCardPreview: React.FC<SubmittedCardPreviewProps> = ({
  submissionId,
  formTitle,
  templateDoc,
  formData,
  onReset,
}) => {
  const [frontImgUrl, setFrontImgUrl] = useState<string | null>(null);
  const [backImgUrl, setBackImgUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [activeSide, setActiveSide] = useState<'both' | 'front' | 'back'>('both');
  const [copied, setCopied] = useState(false);

  // Normalize all user-submitted form data keys for template interpolation
  const candidateName =
    formData['student_name'] ||
    formData['candidate_name'] ||
    formData['full_name'] ||
    formData['name'] ||
    formData['employee_name'] ||
    'Student';

  const candidateRoll =
    formData['roll_no'] ||
    formData['student_roll'] ||
    formData['roll'] ||
    formData['student_id'] ||
    formData['employee_id'] ||
    '001';

  const photo = formData['photo_url'] || formData['photo'] || '';

  const enrichedRecord: Record<string, any> = {
    ...formData,
    student_name: candidateName,
    full_name: candidateName,
    candidate_name: candidateName,
    name: candidateName,
    roll_no: candidateRoll,
    student_roll: candidateRoll,
    student_id: candidateRoll,
    photo_url: photo,
    photo: photo,
    session: formData['session'] || '2026-2028',
    father_name: formData['father_name'] || formData['Father_name'] || '',
    Father_name: formData['father_name'] || formData['Father_name'] || '',
    dob: formData['dob'] || '',
    blood_group: formData['blood_group'] || '',
    mobile: formData['mobile'] || formData['Mobile_number'] || '',
    Mobile_number: formData['mobile'] || formData['Mobile_number'] || '',
    address: formData['address'] || '',
    police_station: formData['police_station'] || '',
    pincode: formData['pincode'] || '',
    district: formData['district'] || '',
    city: formData['city'] || formData['district'] || '',
    state: formData['state'] || '',
  };

  useEffect(() => {
    let isCancelled = false;

    async function generatePreviews() {
      setIsRendering(true);
      try {
        // High fidelity rendering for screen preview
        const frontCanvas = await renderCardToCanvas(templateDoc, {
          dpi: 200,
          recordData: enrichedRecord,
          side: 'front',
        });

        if (!isCancelled) {
          setFrontImgUrl(frontCanvas.toDataURL('image/png'));
        }

        if (templateDoc.layouts.back) {
          const backCanvas = await renderCardToCanvas(templateDoc, {
            dpi: 200,
            recordData: enrichedRecord,
            side: 'back',
          });
          if (!isCancelled) {
            setBackImgUrl(backCanvas.toDataURL('image/png'));
          }
        }
      } catch (err) {
        console.error('Failed to render card preview:', err);
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    generatePreviews();

    return () => {
      isCancelled = true;
    };
  }, [templateDoc, formData]);

  const copyRefId = () => {
    navigator.clipboard.writeText(submissionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="min-h-screen bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 select-none"
      onContextMenu={(e) => {
        // Strict anti-download protection: Disable right click context menu
        e.preventDefault();
        return false;
      }}
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Registration Submitted
                  </span>
                  <span className="text-xs text-slate-400 truncate max-w-xs">{formTitle}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                  Submission Successful!
                </h1>
                <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                  Your record has been transmitted to the college administration. Below is your official
                  read-only ID card digital preview.
                </p>
              </div>
            </div>

            {/* Reference ID Pill */}
            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-700 sm:text-right shrink-0">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                Submission Reference
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="font-mono text-xs sm:text-sm font-bold text-amber-400">
                  {submissionId}
                </code>
                <button
                  type="button"
                  onClick={copyRefId}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Copy Reference"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Candidate Summary Chips */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">Candidate Name</span>
              <span className="font-semibold text-white truncate block">{candidateName}</span>
            </div>
            <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">Roll Number</span>
              <span className="font-semibold text-white truncate block">{candidateRoll}</span>
            </div>
            <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">Session</span>
              <span className="font-semibold text-white truncate block">{formData['session'] || '2026-2028'}</span>
            </div>
            <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">Blood Group</span>
              <span className="font-bold text-red-400 truncate block">{formData['blood_group'] || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* ID Card Preview Section */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/60 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/70 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Digital ID Card Preview</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Preview Only • Download Restricted
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official dual-sided preview matching the institutional layout.
                </p>
              </div>
            </div>

            {/* Side Switcher Tab Buttons */}
            <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveSide('both')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeSide === 'both' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Both Sides
              </button>
              <button
                type="button"
                onClick={() => setActiveSide('front')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeSide === 'front' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Front Side
              </button>
              {templateDoc.layouts.back && (
                <button
                  type="button"
                  onClick={() => setActiveSide('back')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    activeSide === 'back' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Back Side
                </button>
              )}
            </div>
          </div>

          {/* Cards Display Canvas / Images */}
          {isRendering ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-medium">
                Generating high-fidelity card preview with your submitted photo and details...
              </p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-4">
              {/* Front Card Preview */}
              {(activeSide === 'both' || activeSide === 'front') && frontImgUrl && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Front Side</span>
                  </div>

                  {/* Card Container with Lamination Glow, Anti-drag & Watermark */}
                  <div className="relative group rounded-[18px] p-1 bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 shadow-2xl transition-transform duration-300 hover:scale-[1.01]">
                    <div className="relative overflow-hidden rounded-[15px] bg-white max-w-[280px] sm:max-w-[310px]">
                      {/* Protected Image */}
                      <img
                        src={frontImgUrl}
                        alt="Front ID Card Preview"
                        draggable={false}
                        className="w-full h-auto block select-none pointer-events-none"
                        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                      />

                      {/* Translucent Anti-Download Watermark Banner */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-30 select-none">
                        <div className="transform -rotate-45 text-center">
                          <p className="font-extrabold text-slate-900 text-sm tracking-widest uppercase border-y-2 border-slate-900 py-1 px-4 whitespace-nowrap bg-white/40">
                            PREVIEW ONLY • CANNOT DOWNLOAD
                          </p>
                          <p className="text-[10px] font-bold text-slate-800 mt-1 tracking-wider uppercase">
                            OFFICIAL VERIFICATION ONLY
                          </p>
                        </div>
                      </div>

                      {/* Shield Security Overlay Badge */}
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-[9px] font-semibold text-slate-200 border border-slate-700/60 flex items-center gap-1 shadow-xs pointer-events-none">
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        <span>Protected View</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Back Card Preview */}
              {(activeSide === 'both' || activeSide === 'back') && backImgUrl && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>Back Side</span>
                  </div>

                  {/* Card Container with Lamination Glow, Anti-drag & Watermark */}
                  <div className="relative group rounded-[18px] p-1 bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 shadow-2xl transition-transform duration-300 hover:scale-[1.01]">
                    <div className="relative overflow-hidden rounded-[15px] bg-white max-w-[280px] sm:max-w-[310px]">
                      {/* Protected Image */}
                      <img
                        src={backImgUrl}
                        alt="Back ID Card Preview"
                        draggable={false}
                        className="w-full h-auto block select-none pointer-events-none"
                        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                      />

                      {/* Translucent Anti-Download Watermark Banner */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-30 select-none">
                        <div className="transform -rotate-45 text-center">
                          <p className="font-extrabold text-slate-900 text-sm tracking-widest uppercase border-y-2 border-slate-900 py-1 px-4 whitespace-nowrap bg-white/40">
                            PREVIEW ONLY • CANNOT DOWNLOAD
                          </p>
                          <p className="text-[10px] font-bold text-slate-800 mt-1 tracking-wider uppercase">
                            OFFICIAL VERIFICATION ONLY
                          </p>
                        </div>
                      </div>

                      {/* Shield Security Overlay Badge */}
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-[9px] font-semibold text-slate-200 border border-slate-700/60 flex items-center gap-1 shadow-xs pointer-events-none">
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        <span>Protected View</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Anti-Download Policy Warning Notice Box */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-4 flex items-start gap-3 text-amber-200 text-xs">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-300">
                Notice: Downloading is strictly disabled for student submissions
              </p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                As per institutional security regulations, ID badges cannot be downloaded or duplicated directly by
                candidates. Your physical PVC card is being verified and will be printed and issued directly by the
                college administrative office.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Submit Another Candidate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
