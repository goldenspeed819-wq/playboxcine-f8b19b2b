import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface ConversionProgress {
  stage: 'loading' | 'converting' | 'done' | 'error';
  progress: number;
  message: string;
}

export function useVideoConverter() {
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadedRef = useRef(false);

  const loadFFmpeg = useCallback(async () => {
    if (loadedRef.current && ffmpegRef.current) return ffmpegRef.current;

    setConversionProgress({
      stage: 'loading',
      progress: 0,
      message: 'Carregando conversor de vídeo...',
    });

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on('progress', ({ progress }) => {
      setConversionProgress({
        stage: 'converting',
        progress: Math.round(progress * 100),
        message: `Convertendo... ${Math.round(progress * 100)}%`,
      });
    });

    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    // Load FFmpeg core from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    loadedRef.current = true;
    return ffmpeg;
  }, []);

  const needsConversion = useCallback((file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension === 'mkv' || extension === 'ts' || extension === 'mts' || extension === 'avi';
  }, []);

  const convertToMp4 = useCallback(async (file: File): Promise<File> => {
    if (!needsConversion(file)) {
      return file;
    }

    try {
      const ffmpeg = await loadFFmpeg();

      setConversionProgress({
        stage: 'converting',
        progress: 0,
        message: 'Preparando arquivo...',
      });

      const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'));
      const outputName = file.name.replace(/\.[^/.]+$/, '') + '.mp4';

      // Write input file to FFmpeg virtual filesystem
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      setConversionProgress({
        stage: 'converting',
        progress: 5,
        message: 'Iniciando conversão...',
      });

      // Convert to MP4 with H.264 codec for maximum browser compatibility
      // Using fast preset for speed, copy audio to save time
      await ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputName,
      ]);

      // Read the output file
      const data = await ffmpeg.readFile(outputName);
      
      // Clean up
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setConversionProgress({
        stage: 'done',
        progress: 100,
        message: 'Conversão concluída!',
      });

      // Create a new File object with the converted data
      // Copy to a new ArrayBuffer to avoid SharedArrayBuffer issues
      const uint8Data = data as Uint8Array;
      const newBuffer = new ArrayBuffer(uint8Data.length);
      const newUint8 = new Uint8Array(newBuffer);
      newUint8.set(uint8Data);
      
      const convertedFile = new File(
        [newBuffer],
        outputName,
        { type: 'video/mp4' }
      );

      return convertedFile;
    } catch (error) {
      console.error('Conversion error:', error);
      setConversionProgress({
        stage: 'error',
        progress: 0,
        message: 'Erro na conversão. Tente upload direto.',
      });
      throw error;
    }
  }, [loadFFmpeg, needsConversion]);

  const resetProgress = useCallback(() => {
    setConversionProgress(null);
  }, []);

  return {
    convertToMp4,
    needsConversion,
    conversionProgress,
    resetProgress,
  };
}
