import { getVisionModel, getTextModel, parseGeminiJson } from '../gemini/client';

export class QuotaExceededError extends Error {
  constructor(message: string, public retryAfter?: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class AIService {
  /**
   * Internal wrapper to catch 429 errors across all AI calls
   */
  private static async safeCall<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('quota') || err.status === 429) {
        throw new QuotaExceededError('AI Daily Quota Exceeded. Please try again in 24 hours or upgrade to a paid key.');
      }
      throw err;
    }
  }

  /**
   * Process Material (Extract Subjects, Topics, Subtopics, and Edges)
   */
  static async extractHierarchy(fileBuffer: Buffer, mimeType: string): Promise<any> {
    const model = getVisionModel();
    const payload = [
      {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType,
        },
      },
      `Analyze this material and return ONLY JSON outlining a strict curriculum hierarchy.
      {
        "subject": "Main Subject Title",
        "topics": [
          {
            "title": "Topic Name",
            "subtopics": [
              {
                "title": "Subtopic Name",
                "difficulty": 0.5,
                "dependencies": ["Names of prerequisite subtopics within this same subject"]
              }
            ]
          }
        ]
      }`,
    ];

    const result = await this.safeCall(() => model.generateContent(payload));
    return parseGeminiJson(result.response.text());
  }

  /**
   * Scoped Extraction: Extract Subtopics for a specific Parent Topic
   */
  static async extractSubtopicsForTopic(fileBuffer: Buffer, mimeType: string, parentTopicTitle: string): Promise<any[]> {
    const model = getVisionModel();
    const payload = [
      {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType,
        },
      },
      `You are an expert curriculum designer. Extract a list of granular sub-concepts (subtopics) specifically for the parent topic: "${parentTopicTitle}".
      
      Return ONLY JSON in this format:
      {
        "subtopics": [
          {
            "title": "Subtopic Name",
            "summary": "A 1-sentence analytical or visual summary of this specific concept from the document.",
            "difficulty": 0.5,
            "dependencies": ["Prerequisite subtopics within this document"]
          }
        ]
      }
      
      Requirements:
      - Extract 4-10 subtopics.
      - Each subtopic MUST have a unique, insight-driven summary.
      - Ensure titles are specific and concise.`,
    ];

    const result = await this.safeCall(() => model.generateContent(payload));
    const parsed = parseGeminiJson<{ subtopics: any[] }>(result.response.text());
    return parsed.subtopics || [];
  }

  /**
   * Generate Quizzes — supports multiple topics, difficulty filters, and count
   */
  static async generateQuiz(
    topics: string | string[],
    context?: string,
    options?: { difficulty?: string; count?: number; questionType?: string }
  ): Promise<any[]> {
    const model = getTextModel();
    const topicList = Array.isArray(topics) ? topics : [topics];
    const diff = options?.difficulty || 'mixed';
    const count = options?.count || 5;
    const qType = options?.questionType || 'mixed';

    const diffInstruction = diff === 'mixed'
      ? 'Include a mix of easy, medium, and hard questions.'
      : `All questions should be ${diff} difficulty.`;

    const typeInstruction = qType === 'mixed'
      ? 'Use a mix of mcq, short_answer, and conceptual question types.'
      : `All questions should be "${qType}" type.`;

    const prompt = `Generate a ${count}-question quiz covering these topics: ${topicList.join(', ')}.
    Context: ${context || 'None'}

    ${diffInstruction}
    ${typeInstruction}

    Return pure JSON:
    {
      "quizzes": [
        {
          "topic": "Which topic this question belongs to",
          "question": "Question?",
          "type": "mcq",
          "options": ["A", "B", "C", "D"],
          "correct_answer": "A",
          "explanation": "Because...",
          "difficulty": "medium"
        }
      ]
    }

    Rules:
    - For mcq: always provide exactly 4 options
    - For short_answer: omit options array
    - For conceptual: omit options, expect a paragraph answer
    - Each question MUST have an explanation
    - Distribute questions across the topics evenly`;

    const result = await this.safeCall(() => model.generateContent(prompt));
    const parsed = parseGeminiJson<{ quizzes: any[] }>(result.response.text());
    return parsed.quizzes || [];
  }

  /**
   * Generate Notes — supports multiple topics for combined notes
   */
  static async generateNotes(
    topics: string | string[],
    context?: string
  ): Promise<string> {
    const model = getTextModel();
    const topicList = Array.isArray(topics) ? topics : [topics];

    const prompt = `Generate structured markdown study notes for ${topicList.length > 1 ? 'these topics' : 'the topic'}: ${topicList.join(', ')}.
    Context: ${context || 'None'}

    Requirements:
    - Use headings (##) for each topic section
    - **Visual Intelligence**: If the context contains data from graphs, charts, diagrams, or images, provide a detailed "Visual Summary" section for each visual element, describing its key insights, trends, or structure.
    - Include key definitions, formulas, and examples
    - Add "Key Takeaways" bullet points at the end of each section
    - Keep it concise and formatted for quick scanning
    - Do NOT wrap in generic markdown blocks like \`\`\`markdown.
    - If multiple topics, create a section for each with clear separation`;

    const result = await this.safeCall(() => model.generateContent(prompt));
    return result.response.text();
  }

  /**
   * Generate Tasks for a specific Subtopic
   */
  static async generateTasks(subtopicTitle: string, context?: string): Promise<any[]> {
    const model = getTextModel();
    const prompt = `Generate actionable study tasks for the subtopic: "${subtopicTitle}".
    Context: ${context || 'None'}

    Return pure JSON:
    {
      "tasks": [
        {
          "title": "Task title",
          "estimated_time": 30,
          "difficulty": "medium",
          "task_type": "learn"
        }
      ]
    }`;

    const result = await this.safeCall(() => model.generateContent(prompt));
    const parsed = parseGeminiJson<{ tasks: any[] }>(result.response.text());
    return parsed.tasks || [];
  }
}
