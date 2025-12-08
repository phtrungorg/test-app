import { Controller, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

interface ConversionRequest {
  hlsUrl: string;
  outputPath?: string;
  outputName?: string;
}

interface ConversionResponse {
  success: boolean;
  message: string;
  processTimeMs: number;
  processTimeFormatted: string;
  inputUrl: string;
  outputPath?: string;
  fileSizeMB?: number;
  error?: string;
}

interface MultiConversionRequest {
  sources: Array<{
    hlsUrl: string;
    outputName?: string;
  }>;
  outputPath?: string;
}

interface MultiConversionResponse {
  success: boolean;
  message: string;
  totalProcessTimeMs: number;
  totalProcessTimeFormatted: string;
  results: Array<{
    hlsUrl: string;
    success: boolean;
    outputPath?: string;
    fileSizeMB?: number;
    processTimeMs: number;
    processTimeFormatted: string;
    error?: string;
  }>;
  successCount: number;
  failureCount: number;
}

interface ConcatMp4Request {
  inputFiles: string[];
  outputPath?: string;
  outputName?: string;
}

interface ConcatMp4Response {
  success: boolean;
  message: string;
  processTimeMs: number;
  processTimeFormatted: string;
  inputFiles: string[];
  outputPath?: string;
  fileSizeMB?: number;
  error?: string;
}

@Controller('video')
export class VideoConversionController {

  @Post('concat-mp4')
  async concatMp4(@Body() request: ConcatMp4Request): Promise<ConcatMp4Response> {
    const startTime = Date.now();

    // Validate input
    if (!request.inputFiles || request.inputFiles.length === 0) {
      throw new HttpException('At least one input file is required', HttpStatus.BAD_REQUEST);
    }

    if (request.inputFiles.length === 1) {
      throw new HttpException('At least two input files are required for concatenation', HttpStatus.BAD_REQUEST);
    }

    // Check if all input files exist
    for (const file of request.inputFiles) {
      if (!fs.existsSync(file)) {
        throw new HttpException(`Input file not found: ${file}`, HttpStatus.BAD_REQUEST);
      }
    }

    const outputDir = request.outputPath || './converted-videos';
    const outputName = request.outputName || `concatenated-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputName);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🎬 Starting MP4 concatenation...`);
    console.log(`📥 Input files: ${request.inputFiles.length} videos`);
    request.inputFiles.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file}`);
    });
    console.log(`📤 Output path: ${outputPath}`);
    console.log(`⏰ Start time: ${new Date().toISOString()}`);

    try {
      await this.concatenateMp4Files(request.inputFiles, outputPath);

      const endTime = Date.now();
      const processTimeMs = endTime - startTime;
      const processTimeFormatted = this.formatProcessTime(processTimeMs);

      let fileSizeMB: number | undefined;
      try {
        const stats = fs.statSync(outputPath);
        fileSizeMB = Math.round((stats.size / (1024 * 1024)) * 100) / 100;
      } catch (error) {
        console.log('Could not get file size:', error);
      }

      console.log(`✅ MP4 concatenation completed successfully!`);
      console.log(`⏱️ Total process time: ${processTimeFormatted} (${processTimeMs}ms)`);
      console.log(`📁 File size: ${fileSizeMB}MB`);
      console.log(`🏁 End time: ${new Date().toISOString()}`);

      return {
        success: true,
        message: 'MP4 concatenation completed successfully',
        processTimeMs,
        processTimeFormatted,
        inputFiles: request.inputFiles,
        outputPath,
        fileSizeMB
      };

    } catch (error) {
      const endTime = Date.now();
      const processTimeMs = endTime - startTime;
      const processTimeFormatted = this.formatProcessTime(processTimeMs);

      console.log(`❌ MP4 concatenation failed after ${processTimeFormatted}`);
      console.log(`🔍 Error details: ${error.message}`);

      return {
        success: false,
        message: 'MP4 concatenation failed',
        processTimeMs,
        processTimeFormatted,
        inputFiles: request.inputFiles,
        error: error.message
      };
    }
  }

  @Post('convert-multiple-hls-to-mp4')
  async convertMultipleHlsToMp4(@Body() request: MultiConversionRequest): Promise<MultiConversionResponse> {
    const startTime = Date.now();

    if (!request.sources || request.sources.length === 0) {
      throw new HttpException('At least one HLS source is required', HttpStatus.BAD_REQUEST);
    }

    const outputDir = request.outputPath || './converted-videos';
    const outputName = `merged-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputName);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🎬 Starting multi-source HLS to MP4 conversion...`);
    console.log(`📥 Input sources: ${request.sources.length} HLS streams`);
    request.sources.forEach((source, i) => {
      console.log(`   ${i + 1}. ${source.hlsUrl}`);
    });
    console.log(`📤 Output path: ${outputPath}`);
    console.log(`⏰ Start time: ${new Date().toISOString()}`);

    return new Promise<MultiConversionResponse>((resolve) => {
      const command = ffmpeg();

      // Add all input sources
      request.sources.forEach(source => {
        command.input(source.hlsUrl);
      });

      // Create concat filter: [0:v][0:a][1:v][1:a]...concat=n=X:v=1:a=1[outv][outa]
      const filterInputs = request.sources.map((_, index) => `[${index}:v][${index}:a]`).join('');
      // const concatFilter = `${filterInputs}concat=n=${request.sources.length}:v=1:a=1[outv][outa]`;

      // console.log(`🔗 Using concat filter: ${concatFilter}`);

      command
      .complexFilter([
        {
          filter: 'concat',
          options: {
            n: request.sources.length,  // Số lượng inputs
            v: 1,                // 1 video stream
            a: 1                 // 1 audio stream
          },
          outputs: ['merged']
        }
      ])
      .outputOptions([
        '-map', '[merged]',
        '-c:v copy',           // Copy codec nếu có thể
        '-c:a copy',
        '-movflags frag_keyframe+empty_moov',
      ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`🚀 FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          const currentTime = Date.now();
          const elapsedMs = currentTime - startTime;
          const elapsedFormatted = this.formatProcessTime(elapsedMs);
          console.log(`⏳ Processing: ${progress.percent?.toFixed(2)}% - Time: ${progress.timemark} - Elapsed: ${elapsedFormatted} (${elapsedMs}ms)`);
        })
        .on('end', () => {
          const endTime = Date.now();
          const totalProcessTimeMs = endTime - startTime;
          const totalProcessTimeFormatted = this.formatProcessTime(totalProcessTimeMs);

          let fileSizeMB: number | undefined;
          try {
            const stats = fs.statSync(outputPath);
            fileSizeMB = Math.round((stats.size / (1024 * 1024)) * 100) / 100;
          } catch (error) {
            console.log('Could not get file size:', error);
          }

          console.log(`✅ Multi-source conversion completed successfully!`);
          console.log(`⏱️ Total process time: ${totalProcessTimeFormatted} (${totalProcessTimeMs}ms)`);
          console.log(`📁 File size: ${fileSizeMB}MB`);
          console.log(`🏁 End time: ${new Date().toISOString()}`);

          resolve({
            success: true,
            message: 'Multi-source HLS to MP4 conversion completed successfully',
            totalProcessTimeMs,
            totalProcessTimeFormatted,
            results: [{
              hlsUrl: request.sources.map(s => s.hlsUrl).join(', '),
              success: true,
              outputPath,
              fileSizeMB,
              processTimeMs: totalProcessTimeMs,
              processTimeFormatted: totalProcessTimeFormatted
            }],
            successCount: 1,
            failureCount: 0
          });
        })
        .on('error', (error) => {
          const endTime = Date.now();
          const totalProcessTimeMs = endTime - startTime;
          const totalProcessTimeFormatted = this.formatProcessTime(totalProcessTimeMs);

          console.log(`❌ Multi-source conversion failed after ${totalProcessTimeFormatted}`);
          console.log(`🔍 Error details: ${error.message}`);

          resolve({
            success: false,
            message: 'Multi-source HLS to MP4 conversion failed',
            totalProcessTimeMs,
            totalProcessTimeFormatted,
            results: [{
              hlsUrl: request.sources.map(s => s.hlsUrl).join(', '),
              success: false,
              processTimeMs: totalProcessTimeMs,
              processTimeFormatted: totalProcessTimeFormatted,
              error: error.message
            }],
            successCount: 0,
            failureCount: 1
          });
        })
        .run();
    });
  }

  @Post('convert-hls-to-mp4')
  async convertHlsToMp4(@Body() request: ConversionRequest): Promise<ConversionResponse> {
    const startTime = Date.now();

    if (!request.hlsUrl) {
      throw new HttpException('HLS URL is required', HttpStatus.BAD_REQUEST);
    }

    const outputDir = request.outputPath || './converted-videos';
    const outputName = request.outputName || `converted-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputName);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    return new Promise<ConversionResponse>((resolve) => {
      console.log(`🎬 Starting HLS to MP4 conversion...`);
      console.log(`📥 Input HLS URL: ${request.hlsUrl}`);
      console.log(`📤 Output path: ${outputPath}`);
      console.log(`⏰ Start time: ${new Date().toISOString()}`);

      ffmpeg(request.hlsUrl)
        .outputOptions([
          '-c copy',          // Copy streams without re-encoding for faster conversion
          '-bsf:a aac_adtstoasc', // Fix AAC stream if needed
          '-movflags faststart'   // Optimize for web playback
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`🚀 FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          const currentTime = Date.now();
          const elapsedMs = currentTime - startTime;
          const elapsedFormatted = this.formatProcessTime(elapsedMs);
          console.log(`⏳ Processing: ${progress.percent?.toFixed(2)}% - Time: ${progress.timemark} - Elapsed: ${elapsedFormatted} (${elapsedMs}ms)`);
        })
        .on('end', () => {
          const endTime = Date.now();
          const processTimeMs = endTime - startTime;
          const processTimeFormatted = this.formatProcessTime(processTimeMs);

          let fileSizeMB: number | undefined;
          try {
            const stats = fs.statSync(outputPath);
            fileSizeMB = Math.round((stats.size / (1024 * 1024)) * 100) / 100;
          } catch (error) {
            console.log('Could not get file size:', error);
          }

          console.log(`✅ Conversion completed successfully!`);
          console.log(`⏱️ Total process time: ${processTimeFormatted} (${processTimeMs}ms)`);
          console.log(`📁 File size: ${fileSizeMB}MB`);
          console.log(`🏁 End time: ${new Date().toISOString()}`);

          resolve({
            success: true,
            message: 'HLS to MP4 conversion completed successfully',
            processTimeMs,
            processTimeFormatted,
            inputUrl: request.hlsUrl,
            outputPath,
            fileSizeMB
          });
        })
        .on('error', (error) => {
          const endTime = Date.now();
          const processTimeMs = endTime - startTime;
          const processTimeFormatted = this.formatProcessTime(processTimeMs);

          console.log(`❌ Conversion failed after ${processTimeFormatted}`);
          console.log(`🔍 Error details: ${error.message}`);

          resolve({
            success: false,
            message: 'HLS to MP4 conversion failed',
            processTimeMs,
            processTimeFormatted,
            inputUrl: request.hlsUrl,
            error: error.message
          });
        })
        .run();
    });
  }

  @Post('convert-hls-to-mp4-test')
  async testConversionWithSampleUrls(): Promise<any> {
    const testUrls = [
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    ];

    const outputDir = './converted-videos';
    const finalOutputName = `merged-${Date.now()}.mp4`;
    const finalOutputPath = path.join(outputDir, finalOutputName);
    const overallStartTime = Date.now();

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🎬 Starting sequential conversion of ${testUrls.length} HLS videos...`);
    console.log(`⏰ Overall start time: ${new Date().toISOString()}`);

    try {
      // Step 1: Convert each HLS video to MP4 individually
      const convertedFiles: string[] = [];
      for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        const tempOutputName = `temp-video-${i}-${Date.now()}.mp4`;
        const tempOutputPath = path.join(outputDir, tempOutputName);

        console.log(`\n📹 Converting video ${i + 1}/${testUrls.length}...`);
        console.log(`📥 Input URL: ${url}`);

        // Convert single video (similar to convertHlsToMp4)
        await this.convertSingleHlsToMp4(url, tempOutputPath);

        convertedFiles.push(tempOutputPath);
        console.log(`✅ Video ${i + 1} converted successfully: ${tempOutputPath}`);
      }

      // Step 2: Concatenate all converted MP4 files
      console.log(`\n🔗 Concatenating ${convertedFiles.length} MP4 files...`);
      await this.concatenateMp4Files(convertedFiles, finalOutputPath);

      // Step 3: Clean up temporary files
      console.log(`\n🧹 Cleaning up temporary files...`);
      for (const file of convertedFiles) {
        try {
          fs.unlinkSync(file);
          console.log(`🗑️ Deleted: ${file}`);
        } catch (error) {
          console.log(`⚠️ Could not delete temporary file: ${file}`, error);
        }
      }

      // Calculate final statistics
      const overallEndTime = Date.now();
      const totalProcessTimeMs = overallEndTime - overallStartTime;
      const totalProcessTimeFormatted = this.formatProcessTime(totalProcessTimeMs);

      let fileSizeMB: number | undefined;
      try {
        const stats = fs.statSync(finalOutputPath);
        fileSizeMB = Math.round((stats.size / (1024 * 1024)) * 100) / 100;
      } catch (error) {
        console.log('Could not get file size:', error);
      }

      console.log(`\n✅ All conversions and concatenation completed successfully!`);
      console.log(`⏱️ Total process time: ${totalProcessTimeFormatted} (${totalProcessTimeMs}ms)`);
      console.log(`📁 Final file size: ${fileSizeMB}MB`);
      console.log(`📤 Final output: ${finalOutputPath}`);
      console.log(`🏁 Overall end time: ${new Date().toISOString()}`);

      return {
        success: true,
        message: 'Sequential HLS to MP4 conversion and concatenation completed successfully',
        processTimeMs: totalProcessTimeMs,
        processTimeFormatted: totalProcessTimeFormatted,
        inputUrls: testUrls,
        outputPath: finalOutputPath,
        fileSizeMB,
        videosProcessed: testUrls.length
      };

    } catch (error) {
      const overallEndTime = Date.now();
      const totalProcessTimeMs = overallEndTime - overallStartTime;
      const totalProcessTimeFormatted = this.formatProcessTime(totalProcessTimeMs);

      console.log(`\n❌ Process failed after ${totalProcessTimeFormatted}`);
      console.log(`🔍 Error details: ${error.message}`);

      return {
        success: false,
        message: 'Sequential HLS to MP4 conversion failed',
        processTimeMs: totalProcessTimeMs,
        processTimeFormatted: totalProcessTimeFormatted,
        inputUrls: testUrls,
        error: error.message
      };
    }
  }

  // Helper method to convert single HLS to MP4 (similar to convertHlsToMp4)
  private convertSingleHlsToMp4(hlsUrl: string, outputPath: string): Promise<void> {
    const startTime = Date.now();

    return new Promise<void>((resolve, reject) => {
      console.log(`🎬 Starting single HLS to MP4 conversion...`);
      console.log(`📥 Input HLS URL: ${hlsUrl}`);
      console.log(`📤 Output path: ${outputPath}`);

      ffmpeg(hlsUrl)
        .outputOptions([
          '-c copy',          // Copy streams without re-encoding for faster conversion
          '-bsf:a aac_adtstoasc', // Fix AAC stream if needed
          '-movflags faststart'   // Optimize for web playback
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`🚀 FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          const currentTime = Date.now();
          const elapsedMs = currentTime - startTime;
          const elapsedFormatted = this.formatProcessTime(elapsedMs);
          console.log(`⏳ Processing: ${progress.percent?.toFixed(2)}% - Time: ${progress.timemark} - Elapsed: ${elapsedFormatted} (${elapsedMs}ms)`);
        })
        .on('end', () => {
          const endTime = Date.now();
          const processTimeMs = endTime - startTime;
          const processTimeFormatted = this.formatProcessTime(processTimeMs);
          console.log(`✅ Single conversion completed in ${processTimeFormatted}`);
          resolve();
        })
        .on('error', (error) => {
          const endTime = Date.now();
          const processTimeMs = endTime - startTime;
          const processTimeFormatted = this.formatProcessTime(processTimeMs);
          console.log(`❌ Single conversion failed after ${processTimeFormatted}`);
          console.log(`🔍 Error details: ${error.message}`);
          reject(error);
        })
        .run();
    });
  }

  // Helper method to concatenate MP4 files using concat demuxer (faster, uses -c copy)
  // NOTE: All input files must have the same codec, resolution, and frame rate
  private concatenateMp4Files(inputFiles: string[], outputPath: string): Promise<void> {
    const startTime = Date.now();

    return new Promise<void>((resolve, reject) => {
      console.log(`🔗 Starting MP4 concatenation (fast mode with -c copy)...`);
      console.log(`📥 Input files: ${inputFiles.length} videos`);
      console.log(`📤 Output path: ${outputPath}`);

      // Create a temporary file list for concat demuxer
      const fileListPath = path.join(path.dirname(outputPath), `concat-list-${Date.now()}.txt`);
      const fileListContent = inputFiles.map(file => `file '${path.resolve(file)}'`).join('\n');

      console.log(`🔍 File list content: ${fileListContent}`);

      try {
        fs.writeFileSync(fileListPath, fileListContent);
        console.log(`📝 Created file list: ${fileListPath}`);
      } catch (error) {
        reject(new Error(`Failed to create file list: ${error.message}`));
        return;
      }

      ffmpeg()
        .input(fileListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c copy',              // Copy streams without re-encoding (FAST!)
          '-movflags', 'faststart' // Optimize for web playback
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`🚀 FFmpeg concat command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          const currentTime = Date.now();
          const elapsedMs = currentTime - startTime;
          const elapsedFormatted = this.formatProcessTime(elapsedMs);
          console.log(`⏳ Concatenating: ${progress.percent?.toFixed(2)}% - Time: ${progress.timemark} - Elapsed: ${elapsedFormatted} (${elapsedMs}ms)`);
        })
        .on('end', () => {
          const endTime = Date.now();
          const processTimeMs = endTime - startTime;
          const processTimeFormatted = this.formatProcessTime(processTimeMs);
          console.log(`✅ Concatenation completed in ${processTimeFormatted}`);

          // Clean up temporary file list
          try {
            fs.unlinkSync(fileListPath);
            console.log(`🗑️ Deleted temporary file list: ${fileListPath}`);
          } catch (error) {
            console.log(`⚠️ Could not delete file list: ${fileListPath}`);
          }

          resolve();
        })
        .on('error', (error) => {
          const endTime = Date.now();
          const processTimeMs = endTime - startTime;
          const processTimeFormatted = this.formatProcessTime(processTimeMs);
          console.log(`❌ Concatenation failed after ${processTimeFormatted}`);
          console.log(`🔍 Error details: ${error.message}`);

          // Clean up temporary file list on error
          try {
            fs.unlinkSync(fileListPath);
          } catch (cleanupError) {
            console.log(`⚠️ Could not delete file list: ${fileListPath}`);
          }

          reject(error);
        })
        .run();
    });
  }

  private formatProcessTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    const remainingMs = milliseconds % 1000;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s ${remainingMs}ms`;
    } else if (minutes > 0) {
      return `${remainingMinutes}m ${remainingSeconds}s ${remainingMs}ms`;
    } else if (seconds > 0) {
      return `${remainingSeconds}s ${remainingMs}ms`;
    } else {
      return `${remainingMs}ms`;
    }
  }
}