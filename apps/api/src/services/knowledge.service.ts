import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/pool.js';
import { loadAppEnv } from '../config/env.js';

const env = loadAppEnv();
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface UpsertDocumentArgs {
  id?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export class KnowledgeService {
  private async embedText(text: string): Promise<number[]> {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const resp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    // `resp.data[0].embedding` should be an array of numbers
    return (resp.data?.[0]?.embedding as number[]) || [];
  }

  async upsertDocument(args: UpsertDocumentArgs): Promise<string> {
    const pool = getPool();
    const docId = args.id || uuidv4();
    const embedding = await this.embedText(args.content);

    // Convert embedding to Postgres VECTOR literal like: [0.1,0.2,...]
    const vecStr = '[' + embedding.join(',') + ']';

    const sql = `
      INSERT INTO documents (id, content, metadata, embedding, updated_at)
      VALUES ($1, $2, $3::jsonb, $4::vector, now())
      ON CONFLICT (id) DO UPDATE
      SET content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          embedding = EXCLUDED.embedding,
          updated_at = now()
    `;

    await pool.query(sql, [docId, args.content, JSON.stringify(args.metadata || {}), vecStr]);

    return docId;
  }

  async semanticSearch(queryText: string, topK = 5) {
    const pool = getPool();

    const qEmb = await this.embedText(queryText);
    const qVecStr = '[' + qEmb.join(',') + ']';

    // Use <-> (Euclidean) or <#> (cosine) depending on your pgvector setup.
    const sql = `
      SELECT id, content, metadata, embedding <-> $1::vector AS distance
      FROM documents
      ORDER BY distance
      LIMIT $2
    `;

    const res = await pool.query(sql, [qVecStr, topK]);
    return res.rows.map((r: any) => ({
      id: r.id,
      content: r.content,
      metadata: r.metadata,
      score: r.distance,
    }));
  }
}

export default KnowledgeService;
