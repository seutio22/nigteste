-- Renomeia coluna alinhada ao negócio (Qtd de usuários no cadastro de demandas)
ALTER TABLE "Demanda" RENAME COLUMN "periodicidade" TO "qtdUsuarios";
