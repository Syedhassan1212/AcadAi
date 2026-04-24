// ============================================================
// File Processing Pipeline
// Upload → Supabase Storage → Extract → Gemini → DAG
// ============================================================

import { getTextModel, getVisionModel, parseGeminiJson } from '@/lib/gemini/client';
import { buildMasterExtractionPrompt } from '@/lib/gemini/prompts';
import { resolveGeminiDependencies } from '@/lib/dag/builder';
import { MasterAIOutput, ExtractedTopic, Task, QuizQuestion, AINote, GeminiTaskOutput } from '@/lib/types';

const MAX_CHUNK_SIZE = 8000; // characters per Gemini call

// ============================================================
// TEXT & IMAGE EXTRACTION
// ============================================================

/**
 * Extract PDF using Gemini Vision natively.
 * We pass the entire raw PDF buffer as inlineData to Gemini.
 */
export async function extractPdfData(buffer: Buffer): Promise<any[]> {
  // A single "chunk" that is an array containing the PDF part
  return [
    [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: "application/pdf",
        },
      },
    ],
  ];
}

/**
 * Extract text and base64 images from DOCX using mammoth.
 */
export async function extractDocxData(buffer: Buffer): Promise<any[]> {
  const mammoth = await import("mammoth");
  const images: any[] = [];
  
  // Extract images to base64
  const options = {
    convertImage: mammoth.images.imgElement((image) => {
      return image.read("base64").then((imageBuffer) => {
        images.push({
          inlineData: {
            data: imageBuffer,
            mimeType: image.contentType,
          },
        });
        return { src: "" };
      });
    }),
  };
  
  // Process with HTML to trigger image extraction, then extract raw text
  await mammoth.convertToHtml({ buffer }, options);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  const paragraphs = text.split(/\n\n+/);
  const chunks: any[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + para).length > MAX_CHUNK_SIZE) {
      if (current) chunks.push(current);
      current = para;
    } else {
      current += "\n\n" + para;
    }
  }
  if (current) chunks.push(current);
  
  // Bundle the images with the first text chunk for Gemini to analyze
  if (chunks.length > 0 && images.length > 0) {
    chunks[0] = [chunks[0], ...images];
  } else if (chunks.length === 0 && images.length > 0) {
    chunks.push(images);
  }

  return chunks;
}

/**
 * Extract text from PPTX files using officeparser.
 */
export async function extractPptxData(buffer: Buffer): Promise<any[]> {
  const officeparser = await import("officeparser");
  // @ts-ignore
  const text = await officeparser.parseOfficeAsync(buffer);
  
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
    chunks.push(text.slice(i, i + MAX_CHUNK_SIZE));
  }
  return chunks;
}

/**
 * Extract text from plain text files.
 */
export async function extractTxtData(buffer: Buffer): Promise<any[]> {
  const text = buffer.toString('utf-8');
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
    chunks.push(text.slice(i, i + MAX_CHUNK_SIZE));
  }
  return chunks;
}

/**
 * Route to correct extractor based on file type.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<any[]> {
  if (mimeType === 'application/pdf') return extractPdfData(buffer);
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword') return extractDocxData(buffer);
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint') return extractPptxData(buffer);
  if (mimeType === 'text/plain') return extractTxtData(buffer);
  throw new Error(`Unsupported file type: ${mimeType}`);
}

// ============================================================
// GEMINI PROCESSING
// ============================================================

/**
 * Process text/image chunks through Gemini to extract topics/subtopics.
 * Aggregates results across all chunks.
 */
export async function processChunksWithGemini(chunks: any[], weakTopics: string[] = []): Promise<MasterAIOutput> {
  const model = getVisionModel();
  
  const allTopics: ExtractedTopic[] = [];
  const allSubtopics: string[] = [];
  const allNotes: AINote[] = [];
  const allTasks: GeminiTaskOutput[] = [];
  const allQuizzes: QuizQuestion[] = [];

  for (const chunk of chunks) {
    try {
      let promptPayload: any;
      if (Array.isArray(chunk)) {
        promptPayload = [
          ...chunk,
          buildMasterExtractionPrompt("Extract intelligence from these provided documents and images.", weakTopics)
        ];
      } else {
        promptPayload = buildMasterExtractionPrompt(chunk, weakTopics);
      }
      
      const result = await model.generateContent(promptPayload);
      const text = result.response.text();
      const parsed = parseGeminiJson<MasterAIOutput>(text);

      if (parsed.topics) allTopics.push(...parsed.topics);
      if (parsed.subtopics) allSubtopics.push(...parsed.subtopics);
      if (parsed.notes) allNotes.push(...parsed.notes);
      if (parsed.tasks) allTasks.push(...parsed.tasks);
      if (parsed.quizzes) allQuizzes.push(...parsed.quizzes);

      // Rate limit protection
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error('Gemini chunk processing error:', err);
    }
  }

  return {
    topics: deduplicateTopics(allTopics),
    subtopics: Array.from(new Set(allSubtopics)),
    notes: allNotes,
    tasks: allTasks,
    quizzes: allQuizzes
  };
}

// ============================================================
// FULL PIPELINE
// ============================================================

export interface PipelineResult {
  fileId: string;
  extractedTopics: ExtractedTopic[];
  generatedTaskCount: number;
  generatedNotesCount: number;
  generatedQuizCount: number;
}

/**
 * Complete file processing pipeline:
 * Buffer → Extract → Gemini (Master Extract) → Store everything → Return result
 */
export async function runFilePipeline(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  userId: string,
  supabase: any,
  weakTopics: string[] = []
): Promise<PipelineResult> {
  // 1. Extract text chunks
  const chunks = await extractTextFromFile(buffer, mimeType);
  if (chunks.length === 0) throw new Error('No text could be extracted from this file');

  // 2. Register file in DB
  const storagePath = `${userId}/${Date.now()}-${fileName}`;
  const { data: fileRecord, error: fileErr } = await supabase
    .from('uploaded_files')
    .insert({
      user_id: userId,
      file_name: fileName,
      file_type: mimeType,
      storage_path: storagePath,
      processing_status: 'processing',
    })
    .select()
    .single();

  if (fileErr) throw new Error(`Failed to register file: ${fileErr.message}`);

  try {
    // 3. Process with Gemini Master Engine
    const docOutput = await processChunksWithGemini(chunks, weakTopics);

    // 4. Resolve task dependencies
    const tasks = resolveGeminiDependencies(docOutput.tasks ?? [], userId);

    // 5. Insert tasks into DB
    if (tasks.length > 0) {
      const BATCH_SIZE = 20;
      for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);
        await supabase.from('tasks').insert(
          batch.map(t => ({
            ...t,
            source_file_id: fileRecord.id,
            status: t.dependencies.length === 0 ? 'ready' : 'pending',
          }))
        );
      }
    }

    // 6. Insert knowledge nodes (Topics)
    for (const topic of docOutput.topics) {
      const { data: topicNode } = await supabase
        .from('knowledge_nodes')
        .insert({
          user_id: userId,
          file_id: fileRecord.id,
          label: topic.name,
          node_type: 'topic',
          difficulty: topic.difficulty,
          description: topic.description,
        })
        .select()
        .single();

      for (const sub of topic.subtopics) {
        await supabase.from('knowledge_nodes').insert({
          user_id: userId,
          file_id: fileRecord.id,
          label: sub,
          node_type: 'subtopic',
          parent_id: topicNode?.id,
          difficulty: topic.difficulty,
        });
      }
    }

    // 7. Insert Notes
    if (docOutput.notes && docOutput.notes.length > 0) {
      const parsedNotes = docOutput.notes.map(n => ({
        user_id: userId,
        title: n.topic + " Study Guide",
        content: `## Summary\n${n.summary}\n\n## Terms\n${n.key_terms.map(t => '- '+t).join('\n')}\n\n## Explanation\n${n.simple_explanation}\n\n## Notes\n${n.bullet_points.map(b => '- '+b).join('\n')}`,
        tags: [n.topic]
      }));
      await supabase.from('notes').insert(parsedNotes);
    }

    // 8. Insert Quizzes
    if (docOutput.quizzes && docOutput.quizzes.length > 0) {
      const mappedQuizzes = docOutput.quizzes.map(q => ({
        user_id: userId,
        topic: q.topic || 'General',
        question: q.question,
        question_type: q.type,
        options: q.type === 'mcq' ? (q.options ?? []) : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty
      }));
      await supabase.from('quizzes').insert(mappedQuizzes);
    }

    // 9. Update file status to done
    await supabase
      .from('uploaded_files')
      .update({
        processing_status: 'done',
        extracted_topics: docOutput.topics,
      })
      .eq('id', fileRecord.id);

    return {
      fileId: fileRecord.id,
      extractedTopics: docOutput.topics,
      generatedTaskCount: tasks.length,
      generatedNotesCount: docOutput.notes?.length || 0,
      generatedQuizCount: docOutput.quizzes?.length || 0,
    };
  } catch (err) {
    // Mark file as failed
    await supabase
      .from('uploaded_files')
      .update({ processing_status: 'failed' })
      .eq('id', fileRecord.id);
    throw err;
  }
}

// ============================================================
// HELPERS
// ============================================================

function deduplicateTopics(topics: ExtractedTopic[]): ExtractedTopic[] {
  const seen = new Map<string, ExtractedTopic>();
  for (const topic of topics) {
    const key = topic.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, topic);
    } else {
      // Merge subtopics
      const existing = seen.get(key)!;
      const allSubs = [...new Set([...existing.subtopics, ...topic.subtopics])];
      seen.set(key, { ...existing, subtopics: allSubs });
    }
  }
  return Array.from(seen.values());
}
