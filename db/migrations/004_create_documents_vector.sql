-- 创建 pgvector extension 并新增 documents 表用于存储文档与 embedding
-- 运行方式：在 Postgres 上执行此 SQL（确保具有 superuser 或能创建 extension 的权限）

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding VECTOR(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 可选索引（对于较大数据集请根据需要调整）
-- CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
