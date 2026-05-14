'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Camera, CameraOff, ScanBarcode, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguageStore } from '@/store';

// Lazy-load html5-qrcode to avoid SSR issues
let Html5Qrcode: any = null;
let Html5QrcodeSupportedFormats: any = null;

async function loadLibrary() {
  if (Html5Qrcode) return;
  try {
    const mod = await import('html5-qrcode');
    Html5Qrcode = mod.Html5Qrcode;
    Html5QrcodeSupportedFormats = mod.Html5QrcodeSupportedFormats;
  } catch (err) {
    console.error('Failed to load html5-qrcode library:', err);
    throw new Error('Barcode scanner library failed to load');
  }
}

// Global counter for unique stable IDs
let scannerCounter = 0;

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export function BarcodeScanner({
  open,
  onClose,
  onScan,
  title,
  description,
}: BarcodeScannerProps) {
  const { t } = useLanguageStore();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onScan);
  const mountedRef = useRef(false);
  callbackRef.current = onScan;

  // Stable scanner ID — does NOT change on re-render
  const scannerId = useMemo(() => {
    scannerCounter++;
    return `hms-barcode-scanner-${scannerCounter}`;
  }, []);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // state 2 = SCANNING
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore stop errors
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // ignore clear errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    setError('');
    setLastResult('');
    setLoading(true);

    try {
      await loadLibrary();
      await stopScanning();

      // Verify the DOM element exists
      const el = document.getElementById(scannerId);
      if (!el) {
        throw new Error('Scanner container element not found in DOM');
      }

      // Extra delay to ensure Dialog portal is fully mounted
      await new Promise((r) => setTimeout(r, 500));

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      const formatsToSupport = Html5QrcodeSupportedFormats
        ? [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.PDF_417,
          ]
        : undefined;

      const config: any = {
        fps: 10,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.5,
        formatsToSupport,
      };

      // Try environment (rear) camera first, then fallback
      let cameraStarted = false;
      let lastError: any = null;

      // Attempt 1: Try rear camera
      try {
        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText: string) => {
            setLastResult(decodedText);
            setScanning(false);
            callbackRef.current(decodedText);
          },
          () => {
            // QR code not found in this frame — silent
          }
        );
        cameraStarted = true;
      } catch (err1: any) {
        lastError = err1;
        // Attempt 2: Try front camera (desktop/laptop fallback)
        try {
          // Clear any partial state from failed attempt
          try { await scanner.clear(); } catch { /* ignore */ }
          await new Promise((r) => setTimeout(r, 200));

          const scanner2 = new Html5Qrcode(scannerId);
          scannerRef.current = scanner2;

          await scanner2.start(
            { facingMode: 'user' },
            config,
            (decodedText: string) => {
              setLastResult(decodedText);
              setScanning(false);
              callbackRef.current(decodedText);
            },
            () => {
              // QR code not found in this frame — silent
            }
          );
          cameraStarted = true;
        } catch (err2: any) {
          // Attempt 3: Try without any facing mode constraint
          try {
            try { await scanner2.clear(); } catch { /* ignore */ }
            await new Promise((r) => setTimeout(r, 200));

            const scanner3 = new Html5Qrcode(scannerId);
            scannerRef.current = scanner3;

            // Request any available video device
            await scanner3.start(
              undefined,
              config,
              (decodedText: string) => {
                setLastResult(decodedText);
                setScanning(false);
                callbackRef.current(decodedText);
              },
              () => {
                // QR code not found in this frame — silent
              }
            );
            cameraStarted = true;
          } catch (err3: any) {
            lastError = err3;
          }
        }
      }

      if (!cameraStarted) {
        throw lastError;
      }

      setScanning(true);
    } catch (err: any) {
      console.error('Barcode scanner error:', err);
      const msg = err?.message || String(err);
      if (
        msg.includes('NotAllowedError') ||
        msg.includes('Permission') ||
        msg.includes('Permission denied')
      ) {
        setError(t('camera_permission_denied'));
      } else if (
        msg.includes('NotFoundError') ||
        msg.includes('Requested device not found') ||
        msg.includes('no camera') ||
        msg.includes('not found')
      ) {
        setError(t('camera_not_found'));
      } else if (
        msg.includes('NotReadableError') ||
        msg.includes('Could not start video') ||
        msg.includes('in use')
      ) {
        setError(t('camera_in_use'));
      } else {
        setError(t('camera_error'));
      }
      setScanning(false);
      scannerRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [scannerId, stopScanning, t]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            scannerRef.current
              .stop()
              .then(() => {
                scannerRef.current?.clear().catch(() => {});
              })
              .catch(() => {});
          } else {
            scannerRef.current.clear().catch(() => {});
          }
        } catch {
          // ignore
        }
        scannerRef.current = null;
      }
    };
  }, []);

  const handleClose = async () => {
    await stopScanning();
    setLastResult('');
    setError('');
    setManualCode('');
    onClose();
  };

  const handleRetry = async () => {
    await stopScanning();
    setError('');
    await startScanning();
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code) {
      setLastResult(code);
      setManualCode('');
      onScan(code);
    }
  };

  const displayTitle = title || t('barcode_scanner');
  const displayDesc = description || t('barcode_scanner_desc');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="size-5 text-primary" />
            {displayTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Scanner Area */}
          <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/30">
            <div
              id={scannerId}
              ref={containerRef}
              className="w-full"
              style={{ minHeight: '220px' }}
            />

            {/* Overlay when not scanning */}
            {!scanning && !lastResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-3 p-6">
                <Camera className="size-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground text-center">
                  {error ? (
                    <span className="text-destructive">{error}</span>
                  ) : loading ? (
                    <span className="animate-pulse">{t('loading')}</span>
                  ) : (
                    displayDesc
                  )}
                </p>
                {error && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="gap-1.5 mt-1"
                  >
                    <RefreshCw className="size-3.5" />
                    {t('scan_again')}
                  </Button>
                )}
              </div>
            )}

            {/* Scan result overlay */}
            {lastResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/90 text-primary-foreground gap-3 p-6">
                <ScanBarcode className="size-10 animate-bounce" />
                <p className="text-xs uppercase tracking-wider opacity-80">
                  {t('barcode_found')}
                </p>
                <p className="text-lg font-mono font-bold text-center break-all">
                  {lastResult}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 bg-background text-foreground hover:bg-background/90"
                  onClick={() => {
                    setLastResult('');
                    startScanning();
                  }}
                >
                  <Camera className="size-4 me-1" />
                  {t('scan_again')}
                </Button>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={scanning ? stopScanning : startScanning}
              disabled={loading}
            >
              {loading ? (
                <span className="animate-pulse">{t('loading')}</span>
              ) : scanning ? (
                <>
                  <CameraOff className="size-4 me-1.5" />
                  {t('stop_camera')}
                </>
              ) : (
                <>
                  <Camera className="size-4 me-1.5" />
                  {t('start_camera')}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              <X className="size-4" />
            </Button>
          </div>

          {/* Manual Entry */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('or_enter_manually')}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSubmit();
                }}
                placeholder="e.g. 1234567890128"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                dir="ltr"
              />
              <Button
                variant="secondary"
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
              >
                {t('submit')}
              </Button>
            </div>
          </div>

          {/* Supported formats info */}
          <p className="text-[11px] text-muted-foreground text-center">
            {t('supported_formats')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
