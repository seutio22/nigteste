-- Adicionar coluna timeline à tabela Project
ALTER TABLE Project ADD COLUMN timeline TEXT DEFAULT '{}';
